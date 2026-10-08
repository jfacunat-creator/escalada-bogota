const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { tarifas, SQL_SIN_PAGAR_DESDE_HOY } = require("../utils/pagos");
const { todosLosMeses, mesEnCurso } = require("../utils/meses");
const { generarSesiones, borrarSesiones, tieneAsistencia } = require("../utils/sesiones");

const router = express.Router();

const err = (status, message) => Object.assign(new Error(message), { status });
function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (/ciclo_codigo_key|ciclo_anio_trimestre_key|23505/.test(e.message || "")) {
    return res.status(409).json({ error: "Ya existe un ciclo con ese año y trimestre" });
  }
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}
const texto = (v) => (v === undefined ? undefined : (String(v).trim() || null));
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}/.test(String(v || "")) && !isNaN(new Date(v));

// ─── GET /catalogos/tarifas (público: la landing muestra los precios reales) ──
router.get("/tarifas", async (req, res) => {
  try { res.json(await tarifas()); } catch (e) { manejarError(res, e, "GET /catalogos/tarifas"); }
});

// ─── PUT /catalogos/tarifas/:modalidad ────────────────────
// Cambia la tarifa mensual y actualiza las mensualidades aún no pagadas desde el mes en curso.
router.put("/tarifas/:modalidad", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { modalidad } = req.params;
    if (!["autonomo", "acompanado"].includes(modalidad)) throw err(400, "Modalidad inválida");
    const precio = parseFloat(req.body.precioMensual);
    if (!(precio > 0)) throw err(400, "La tarifa debe ser mayor a 0");
    const actualizados = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO tarifa (modalidad, precio_mensual, updated_at) VALUES ($1::"ModalidadPlan", $2, NOW())
         ON CONFLICT (modalidad) DO UPDATE SET precio_mensual = EXCLUDED.precio_mensual, updated_at = NOW()`,
        modalidad, precio
      );
      return tx.$executeRawUnsafe(
        `UPDATE pago p SET monto = $2, updated_at = NOW()
         FROM inscripcion i, grupo g, ciclo ci
         WHERE p.inscripcion_id = i.id AND i.grupo_id = g.id AND ci.id = g.ciclo_id AND g.modalidad = $1::"ModalidadPlan"
           AND ${SQL_SIN_PAGAR_DESDE_HOY}`,
        modalidad, precio
      );
    });
    res.json({ tarifas: await tarifas(), mensualidadesActualizadas: actualizados });
  } catch (e) { manejarError(res, e, "PUT /catalogos/tarifas"); }
});

// ─── GET /catalogos/programas ─────────────────────────────
router.get("/programas", async (req, res) => {
  try {
    const { poblacion, nivel } = req.query;
    let sql = "SELECT * FROM programa WHERE activo = true";
    const params = [];
    if (poblacion) { params.push(poblacion); sql += ` AND poblacion::text = $${params.length}`; }
    if (nivel) { params.push(nivel); sql += ` AND nivel::text = $${params.length}`; }
    sql += " ORDER BY poblacion, nivel, nombre";
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) { manejarError(res, e, "GET /catalogos/programas"); }
});

// ─── PUT /catalogos/programas/:id ─────────────────────────
router.put("/programas/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { nombre, descripcion, incluyeFisio, incluyeNutricion } = req.body;
    const sets = [], params = [];
    const set = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
    if (nombre !== undefined) { if (!String(nombre).trim()) throw err(400, "El nombre no puede quedar vacío"); set("nombre", String(nombre).trim()); }
    if (descripcion !== undefined) set("descripcion", texto(descripcion));
    if (incluyeFisio !== undefined) set("incluye_fisio", !!incluyeFisio);
    if (incluyeNutricion !== undefined) set("incluye_nutricion", !!incluyeNutricion);
    if (!sets.length) throw err(400, "Nada que actualizar");
    params.push(req.params.id);
    const r = await prisma.$queryRawUnsafe(`UPDATE programa SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, ...params);
    if (!r.length) throw err(404, "Programa no encontrado");
    res.json(r[0]);
  } catch (e) { manejarError(res, e, "PUT /catalogos/programas/:id"); }
});

// ─── GET /catalogos/ciclos ────────────────────────────────
// Cada ciclo trae sus 3 meses (fechas de inicio y fin y mes calendario aproximado).
router.get("/ciclos", async (req, res) => {
  try {
    const { anio } = req.query;
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM grupo g WHERE g.ciclo_id = c.id) AS grupos,
                      (SELECT json_agg(json_build_object('mes', cm.mes, 'clave', cm.clave,
                                'fecha_inicio', cm.fecha_inicio, 'fecha_fin', cm.fecha_fin,
                                'periodo', to_char(cm.periodo, 'YYYY-MM')) ORDER BY cm.mes)
                         FROM ciclo_mes cm WHERE cm.ciclo_id = c.id) AS meses
               FROM ciclo c`;
    const params = [];
    if (anio) { params.push(parseInt(anio)); sql += ` WHERE anio = $${params.length}`; }
    sql += " ORDER BY anio DESC, trimestre DESC";
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) { manejarError(res, e, "GET /catalogos/ciclos"); }
});

// ─── GET /catalogos/meses ─────────────────────────────────
// Meses de servicio de todos los ciclos (selector de periodo de pagos y estadísticas).
router.get("/meses", authenticate, authorize("admin", "entrenador"), async (req, res) => {
  try {
    res.json({ meses: await todosLosMeses(), enCurso: await mesEnCurso() });
  } catch (e) { manejarError(res, e, "GET /catalogos/meses"); }
});

// Un ciclo se vende en 3 meses de 4 semanas más la semana S0: 13 semanas.
function avisoDuracion(fechaInicio, fechaFin) {
  const dias = Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 86400000) + 1;
  return dias === 91 ? null
    : `El ciclo dura ${dias} días; los 3 meses están pensados para 13 semanas (91 días): Mes 1 = S0–S4, Mes 2 = S5–S8, Mes 3 = S9–S12.`;
}

function validarCiclo({ anio, trimestre, fechaInicio, fechaFin, semanaEmpalme }) {
  const a = parseInt(anio), t = parseInt(trimestre);
  if (!(a >= 2024 && a <= 2100)) throw err(400, "Año inválido");
  if (!(t >= 1 && t <= 4)) throw err(400, "El trimestre debe ser 1, 2, 3 o 4");
  if (!esFecha(fechaInicio) || !esFecha(fechaFin)) throw err(400, "Fechas de inicio y fin obligatorias");
  if (new Date(fechaFin) <= new Date(fechaInicio)) throw err(400, "La fecha de fin debe ser posterior al inicio");
  const empalme = semanaEmpalme && esFecha(semanaEmpalme) ? semanaEmpalme : null;
  if (empalme && (new Date(empalme) < new Date(fechaInicio) || new Date(empalme) > new Date(fechaFin))) {
    throw err(400, "La semana de empalme debe estar dentro del ciclo");
  }
  // Por defecto el empalme es la última semana del ciclo.
  const porDefecto = new Date(new Date(fechaFin).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  return { a, t, codigo: `${a}-T${t}`, empalme: empalme || porDefecto };
}

// ─── POST /catalogos/ciclos ───────────────────────────────
router.post("/ciclos", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { a, t, codigo, empalme } = validarCiclo(req.body);
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO ciclo (codigo, anio, trimestre, fecha_inicio, fecha_fin, semana_empalme)
       VALUES ($1, $2, $3, $4::date, $5::date, $6::date) RETURNING *`,
      codigo, a, t, req.body.fechaInicio, req.body.fechaFin, empalme
    );
    const aviso = avisoDuracion(req.body.fechaInicio, req.body.fechaFin);
    res.status(201).json({ ...r[0], avisos: aviso ? [aviso] : [] });
  } catch (e) { manejarError(res, e, "POST /catalogos/ciclos"); }
});

// ─── PUT /catalogos/ciclos/:id ────────────────────────────
// Cambiar las fechas regenera las sesiones de los grupos del ciclo que aún no tienen asistencia.
router.put("/ciclos/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { a, t, codigo, empalme } = validarCiclo(req.body);
    const resultado = await prisma.$transaction(async (tx) => {
      const prev = await tx.$queryRawUnsafe("SELECT fecha_inicio, fecha_fin FROM ciclo WHERE id = $1", req.params.id);
      if (!prev.length) throw err(404, "Ciclo no encontrado");
      const r = await tx.$queryRawUnsafe(
        `UPDATE ciclo SET codigo = $1, anio = $2, trimestre = $3, fecha_inicio = $4::date, fecha_fin = $5::date,
                semana_empalme = $6::date WHERE id = $7 RETURNING *`,
        codigo, a, t, req.body.fechaInicio, req.body.fechaFin, empalme, req.params.id
      );
      const avisos = [];
      const cambioFechas = prev[0].fecha_inicio.toISOString().slice(0, 10) !== String(req.body.fechaInicio).slice(0, 10)
        || prev[0].fecha_fin.toISOString().slice(0, 10) !== String(req.body.fechaFin).slice(0, 10);
      if (cambioFechas) {
        const grupos = await tx.$queryRawUnsafe(
          "SELECT DISTINCT g.id FROM grupo g JOIN sesion s ON s.grupo_id = g.id WHERE g.ciclo_id = $1", req.params.id
        );
        let regenerados = 0, conAsistencia = 0;
        for (const g of grupos) {
          if (await tieneAsistencia(tx, g.id)) { conAsistencia++; continue; }
          await borrarSesiones(tx, g.id);
          await generarSesiones(tx, g.id);
          regenerados++;
        }
        if (regenerados) avisos.push(`Sesiones regeneradas en ${regenerados} grupo(s)`);
        if (conAsistencia) avisos.push(`${conAsistencia} grupo(s) ya tienen asistencia: sus sesiones no se modificaron`);
        // Las fechas de los meses cambian: recalcula el mes calendario aproximado de sus pagos (trigger).
        await tx.$executeRawUnsafe(
          `UPDATE pago p SET mes = p.mes FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
           WHERE p.inscripcion_id = i.id AND g.ciclo_id = $1::uuid`,
          req.params.id
        );
        const aviso = avisoDuracion(req.body.fechaInicio, req.body.fechaFin);
        if (aviso) avisos.push(aviso);
      }
      return { ...r[0], avisos };
    });
    res.json(resultado);
  } catch (e) { manejarError(res, e, "PUT /catalogos/ciclos/:id"); }
});

// ─── DELETE /catalogos/ciclos/:id ─────────────────────────
router.delete("/ciclos/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const uso = await prisma.$queryRawUnsafe(
      `SELECT (SELECT COUNT(*) FROM grupo WHERE ciclo_id = $1) + (SELECT COUNT(*) FROM contenido_ciclo WHERE ciclo_id = $1) AS n`,
      req.params.id
    );
    if (Number(uso[0].n) > 0) throw err(409, "El ciclo tiene grupos o contenido asociado; no se puede eliminar");
    const r = await prisma.$queryRawUnsafe("DELETE FROM ciclo WHERE id = $1 RETURNING id", req.params.id);
    if (!r.length) throw err(404, "Ciclo no encontrado");
    res.json({ message: "Ciclo eliminado" });
  } catch (e) { manejarError(res, e, "DELETE /catalogos/ciclos/:id"); }
});

// ─── GET /catalogos/muros ─────────────────────────────────
// ?todos=1 (admin) incluye las sedes sin convenio activo.
router.get("/muros", async (req, res) => {
  try {
    const todos = req.query.todos === "1";
    const result = await prisma.$queryRawUnsafe(
      `SELECT m.*, (SELECT COUNT(*) FROM grupo g WHERE g.muro_id = m.id AND g.estado IN ('abierta','en_curso')) AS grupos_activos
       FROM muro_aliado m ${todos ? "" : "WHERE convenio_activo = true"} ORDER BY convenio_activo DESC, nombre`
    );
    res.json(result);
  } catch (e) { manejarError(res, e, "GET /catalogos/muros"); }
});

function datosMuro(b, parcial) {
  const d = {};
  if (!parcial || b.nombre !== undefined) { if (!String(b.nombre || "").trim()) throw err(400, "El nombre es obligatorio"); d.nombre = String(b.nombre).trim(); }
  if (!parcial || b.direccion !== undefined) { if (!String(b.direccion || "").trim()) throw err(400, "La dirección es obligatoria"); d.direccion = String(b.direccion).trim(); }
  if (b.contacto !== undefined) d.contacto = texto(b.contacto);
  if (b.zonasDisponibles !== undefined) {
    const z = parseInt(b.zonasDisponibles);
    if (!(z >= 0 && z <= 50)) throw err(400, "Zonas disponibles inválidas");
    d.zonas_disponibles = z;
  }
  if (b.convenioActivo !== undefined) d.convenio_activo = !!b.convenioActivo;
  return d;
}

// ─── POST /catalogos/muros ────────────────────────────────
router.post("/muros", authenticate, authorize("admin"), async (req, res) => {
  try {
    const d = datosMuro(req.body, false);
    const cols = Object.keys(d);
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO muro_aliado (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      ...Object.values(d)
    );
    res.status(201).json(r[0]);
  } catch (e) { manejarError(res, e, "POST /catalogos/muros"); }
});

// ─── PUT /catalogos/muros/:id ─────────────────────────────
router.put("/muros/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const d = datosMuro(req.body, true);
    if (!Object.keys(d).length) throw err(400, "Nada que actualizar");
    if (d.convenio_activo === false) {
      const g = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*) AS n FROM grupo WHERE muro_id = $1 AND estado IN ('abierta','en_curso')", req.params.id
      );
      if (Number(g[0].n) > 0) throw err(400, `La sede tiene ${g[0].n} grupo(s) activo(s). Muévelos a otra sede antes de desactivarla.`);
    }
    const cols = Object.keys(d);
    const r = await prisma.$queryRawUnsafe(
      `UPDATE muro_aliado SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")} WHERE id = $${cols.length + 1} RETURNING *`,
      ...Object.values(d), req.params.id
    );
    if (!r.length) throw err(404, "Sede no encontrada");
    res.json(r[0]);
  } catch (e) { manejarError(res, e, "PUT /catalogos/muros/:id"); }
});

// ─── GET /catalogos/aliados-salud ─────────────────────────
router.get("/aliados-salud", authenticate, authorize("admin", "entrenador"), async (req, res) => {
  try {
    const todos = req.query.todos === "1" && req.user.rol === "admin";
    res.json(await prisma.$queryRawUnsafe(
      `SELECT * FROM aliado_salud ${todos ? "" : "WHERE activo = true"} ORDER BY activo DESC, tipo, nombre`
    ));
  } catch (e) { manejarError(res, e, "GET /catalogos/aliados-salud"); }
});

function datosAliado(b, parcial) {
  const d = {};
  if (!parcial || b.nombre !== undefined) { if (!String(b.nombre || "").trim()) throw err(400, "El nombre es obligatorio"); d.nombre = String(b.nombre).trim(); }
  if (!parcial || b.tipo !== undefined) { if (!["fisioterapia", "nutricion"].includes(b.tipo)) throw err(400, "Tipo inválido (fisioterapia | nutricion)"); d.tipo = b.tipo; }
  if (b.direccion !== undefined) d.direccion = texto(b.direccion);
  if (b.contacto !== undefined) d.contacto = texto(b.contacto);
  if (b.activo !== undefined) d.activo = !!b.activo;
  return d;
}

// ─── POST /catalogos/aliados-salud ────────────────────────
router.post("/aliados-salud", authenticate, authorize("admin"), async (req, res) => {
  try {
    const d = datosAliado(req.body, false);
    const cols = Object.keys(d);
    const vals = cols.map((c, i) => (c === "tipo" ? `$${i + 1}::"TipoAliadoSalud"` : `$${i + 1}`));
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO aliado_salud (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING *`, ...Object.values(d)
    );
    res.status(201).json(r[0]);
  } catch (e) { manejarError(res, e, "POST /catalogos/aliados-salud"); }
});

// ─── PUT /catalogos/aliados-salud/:id ─────────────────────
router.put("/aliados-salud/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const d = datosAliado(req.body, true);
    const cols = Object.keys(d);
    if (!cols.length) throw err(400, "Nada que actualizar");
    const r = await prisma.$queryRawUnsafe(
      `UPDATE aliado_salud SET ${cols.map((c, i) => `${c} = $${i + 1}${c === "tipo" ? '::"TipoAliadoSalud"' : ""}`).join(", ")}
       WHERE id = $${cols.length + 1} RETURNING *`,
      ...Object.values(d), req.params.id
    );
    if (!r.length) throw err(404, "Aliado no encontrado");
    res.json(r[0]);
  } catch (e) { manejarError(res, e, "PUT /catalogos/aliados-salud/:id"); }
});

// ─── GET /catalogos/niveles — Valores del enum NivelPrograma ─────────────────
router.get("/niveles", authenticate, async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT enumlabel AS valor FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NivelPrograma')
       ORDER BY enumsortorder`
    );
    res.json(result.map(r => r.valor));
  } catch (e) { manejarError(res, e, "GET /catalogos/niveles"); }
});

module.exports = router;
