const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const {
  DIA_VENCIMIENTO, tarifas, periodoDe, sincronizarPagos, generarMensualidades, aplicarEfectosDePago,
} = require("../utils/pagos");

const WOMPI_BASE = process.env.WOMPI_ENV === "production"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const METODOS = ["transferencia", "efectivo", "wompi"];
const ESTADOS = ["pendiente", "pagado", "vencido"];

const router = express.Router();
router.use(authenticate);

function manejarError(res, err, ruta) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(`Error ${ruta}:`, err);
  res.status(500).json({ error: "Error interno" });
}

// ─── GET /pagos/config ────────────────────────────────────
// Lo que el frontend necesita para mostrar opciones reales (sin botones de adorno).
router.get("/config", async (req, res) => {
  try {
    res.json({ wompi: !!WOMPI_PRIVATE_KEY, tarifas: await tarifas(), diaVencimiento: DIA_VENCIMIENTO });
  } catch (err) { manejarError(res, err, "GET /pagos/config"); }
});

// ─── GET /pagos/resumen?periodo=AAAA-MM ───────────────────
router.get("/resumen", authorize("admin"), async (req, res) => {
  try {
    await sincronizarPagos();
    const periodo = periodoDe(req.query.periodo || new Date());
    const mes = await prisma.$queryRawUnsafe(
      `SELECT
         COALESCE(SUM(monto), 0)                                   AS esperado,
         COALESCE(SUM(monto) FILTER (WHERE estado = 'pagado'), 0)  AS recaudado,
         COUNT(*) FILTER (WHERE estado = 'pagado')                 AS pagados,
         COUNT(*) FILTER (WHERE estado = 'pendiente')              AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'vencido')                AS vencidos
       FROM pago WHERE periodo = $1::date`,
      periodo
    );
    const global = await prisma.$queryRawUnsafe(
      `SELECT
         (SELECT COUNT(*) FROM inscripcion WHERE estado = 'activa') AS inscripciones_activas,
         COALESCE((SELECT SUM(monto) FROM pago WHERE estado = 'vencido'), 0) AS deuda_vencida,
         (SELECT COUNT(*) FROM pago WHERE estado = 'vencido') AS pagos_vencidos`
    );
    const m = mes[0], g = global[0];
    const esperado = parseFloat(m.esperado), recaudado = parseFloat(m.recaudado);
    res.json({
      periodo: periodo.slice(0, 7),
      esperado, recaudado,
      pagados: m.pagados, pendientes: m.pendientes, vencidos: m.vencidos,
      tasa_recaudo: esperado > 0 ? Math.round((recaudado / esperado) * 100) : 0,
      inscripciones_activas: g.inscripciones_activas,
      deuda_vencida: parseFloat(g.deuda_vencida),
      pagos_vencidos: g.pagos_vencidos,
    });
  } catch (err) { manejarError(res, err, "GET /pagos/resumen"); }
});

// ─── GET /pagos ───────────────────────────────────────────
router.get("/", async (req, res) => {
  if (req.user.rol !== "admin" && req.user.rol !== "escalador") {
    return res.status(403).json({ error: "Sin acceso" });
  }
  try {
    await sincronizarPagos();
    const { estado, grupoId, periodo, modalidad, inscripcionId } = req.query;
    let sql = `
      SELECT pg.*, to_char(pg.periodo, 'YYYY-MM') AS periodo_mes,
             e.nombre, e.apellido, e.id AS escalador_id,
             i.estado AS inscripcion_estado,
             pr.nombre AS programa, pr.nivel,
             g.modalidad, g.horario, g.id AS grupo_id,
             ci.codigo AS ciclo
      FROM pago pg
      JOIN inscripcion i ON pg.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN grupo g ON i.grupo_id = g.id
      JOIN programa pr ON g.programa_id = pr.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      WHERE 1=1`;
    const params = [];
    if (estado)        { params.push(estado);              sql += ` AND pg.estado::text = $${params.length}`; }
    if (grupoId)       { params.push(grupoId);             sql += ` AND i.grupo_id = $${params.length}`; }
    if (inscripcionId) { params.push(inscripcionId);       sql += ` AND pg.inscripcion_id = $${params.length}`; }
    if (modalidad)     { params.push(modalidad);           sql += ` AND g.modalidad::text = $${params.length}`; }
    if (periodo)       { params.push(periodoDe(periodo));  sql += ` AND pg.periodo = $${params.length}::date`; }
    if (req.user.rol === "escalador") {
      params.push(req.user.escalador.id);
      sql += ` AND i.escalador_id = $${params.length}`;
    }
    sql += " ORDER BY pg.periodo DESC, e.nombre, e.apellido";
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (err) { manejarError(res, err, "GET /pagos"); }
});

// ─── POST /pagos/generar { periodo } ─────────────────────
// Crea las mensualidades pendientes del mes para todas las inscripciones activas.
router.post("/generar", authorize("admin"), async (req, res) => {
  try {
    const periodo = periodoDe(req.body.periodo || new Date());
    const creadas = await generarMensualidades(periodo);
    res.json({ message: `${creadas} mensualidad(es) generada(s) para ${periodo.slice(0, 7)}`, creadas });
  } catch (err) { manejarError(res, err, "POST /pagos/generar"); }
});

// ─── POST /pagos ──────────────────────────────────────────
// Registra el pago de UN mes de una inscripción. Si la mensualidad de ese mes ya existe
// (pendiente/vencida) se marca como pagada; si no, se crea pagada.
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { inscripcionId, periodo, monto, metodo, referencia, fechaPago } = req.body;
    if (!inscripcionId) return res.status(400).json({ error: "inscripcionId es requerido" });
    if (metodo && !METODOS.includes(metodo)) return res.status(400).json({ error: "Método inválido" });
    if (monto !== undefined && monto !== "" && !(parseFloat(monto) > 0)) return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    const mes = periodoDe(periodo || new Date());

    const pago = await prisma.$transaction(async (tx) => {
      const insc = await tx.$queryRawUnsafe(
        `SELECT i.id, t.precio_mensual FROM inscripcion i
         JOIN grupo g ON g.id = i.grupo_id JOIN tarifa t ON t.modalidad = g.modalidad
         WHERE i.id = $1`,
        inscripcionId
      );
      if (!insc.length) throw Object.assign(new Error("Inscripción no encontrada"), { status: 404 });
      const valor = monto ? parseFloat(monto) : parseFloat(insc[0].precio_mensual);

      const existente = await tx.$queryRawUnsafe(
        "SELECT id, estado FROM pago WHERE inscripcion_id = $1 AND periodo = $2::date", inscripcionId, mes
      );
      if (existente[0]?.estado === "pagado") {
        throw Object.assign(new Error(`La mensualidad de ${mes.slice(0, 7)} ya está pagada`), { status: 409 });
      }
      const fila = existente.length
        ? await tx.$queryRawUnsafe(
            `UPDATE pago SET estado = 'pagado', monto = $1, metodo = $2::"MetodoPago", referencia = $3,
                    fecha_pago = COALESCE($4::date, CURRENT_DATE), updated_at = NOW()
             WHERE id = $5 RETURNING *`,
            valor, metodo || "transferencia", referencia || null, fechaPago || null, existente[0].id
          )
        : await tx.$queryRawUnsafe(
            `INSERT INTO pago (inscripcion_id, monto, estado, metodo, referencia, periodo, fecha_pago, fecha_vencimiento)
             VALUES ($1, $2, 'pagado', $3::"MetodoPago", $4, $5::date, COALESCE($6::date, CURRENT_DATE), $5::date + ($7::int - 1))
             RETURNING *`,
            inscripcionId, valor, metodo || "transferencia", referencia || null, mes, fechaPago || null, DIA_VENCIMIENTO
          );
      await aplicarEfectosDePago(fila[0].id, tx);
      return fila[0];
    });
    res.status(201).json(pago);
  } catch (err) { manejarError(res, err, "POST /pagos"); }
});

// ─── GET /pagos/:id ───────────────────────────────────────
router.get("/:id", authorize("admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT pg.*, to_char(pg.periodo, 'YYYY-MM') AS periodo_mes,
              e.nombre || ' ' || e.apellido AS escalador_nombre,
              p.nombre AS programa, ci.codigo AS ciclo,
              g.modalidad, g.horario, m.nombre AS muro
       FROM pago pg
       JOIN inscripcion i ON pg.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       WHERE pg.id = $1`,
      req.params.id
    );
    if (!result.length) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(result[0]);
  } catch (err) { manejarError(res, err, "GET /pagos/:id"); }
});

// ─── PATCH /pagos/:id ─────────────────────────────────────
router.patch("/:id", authorize("admin"), async (req, res) => {
  try {
    const { estado, referencia, metodo, monto, fechaPago, fechaVencimiento } = req.body;
    if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado inválido (pendiente | pagado | vencido)" });
    if (metodo && !METODOS.includes(metodo)) return res.status(400).json({ error: "Método inválido" });
    if (monto !== undefined && !(parseFloat(monto) > 0)) return res.status(400).json({ error: "El monto debe ser mayor a 0" });

    const sets = [], params = [];
    const set = (sql, v) => { params.push(v); sets.push(sql.replace("?", `$${params.length}`)); };
    if (estado) {
      set(`estado = ?::"EstadoPago"`, estado);
      if (estado === "pagado") set("fecha_pago = COALESCE(?::date, CURRENT_DATE)", fechaPago || null);
      else sets.push("fecha_pago = NULL");
    } else if (fechaPago) set("fecha_pago = ?::date", fechaPago);
    if (referencia !== undefined) set("referencia = ?", referencia || null);
    if (metodo) set(`metodo = ?::"MetodoPago"`, metodo);
    if (monto !== undefined) set("monto = ?", parseFloat(monto));
    if (fechaVencimiento) set("fecha_vencimiento = ?::date", fechaVencimiento);
    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });
    sets.push("updated_at = NOW()");

    const result = await prisma.$transaction(async (tx) => {
      params.push(req.params.id);
      const r = await tx.$queryRawUnsafe(
        `UPDATE pago SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, ...params
      );
      if (!r.length) throw Object.assign(new Error("Pago no encontrado"), { status: 404 });
      if (estado === "pagado") await aplicarEfectosDePago(r[0].id, tx);
      return r[0];
    });
    res.json(result);
  } catch (err) { manejarError(res, err, "PATCH /pagos/:id"); }
});

// ─── POST /pagos/:id/link-pago ────────────────────────────
router.post("/:id/link-pago", async (req, res) => {
  try {
    if (!WOMPI_PRIVATE_KEY) {
      return res.status(503).json({ error: "Pasarela de pago no configurada. Contacta al equipo." });
    }

    const pagoId = req.params.id;
    const pago = await prisma.$queryRawUnsafe(
      `SELECT pa.id, pa.monto, pa.estado, to_char(pa.periodo, 'YYYY-MM') AS periodo_mes,
              i.escalador_id, e.nombre, e.apellido, p.nombre AS programa
       FROM pago pa
       JOIN inscripcion i ON pa.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       WHERE pa.id = $1`,
      pagoId
    );
    if (!pago.length) return res.status(404).json({ error: "Pago no encontrado" });
    const p = pago[0];

    if (req.user.rol === "escalador" && req.user.escalador?.id !== p.escalador_id) {
      return res.status(403).json({ error: "Sin permiso sobre este pago" });
    }
    if (req.user.rol === "entrenador") return res.status(403).json({ error: "Sin acceso" });
    if (p.estado === "pagado") return res.status(400).json({ error: "Este pago ya fue procesado" });

    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WOMPI_PRIVATE_KEY}` },
      body: JSON.stringify({
        name: `${p.programa} · ${p.periodo_mes}`,
        description: `Mensualidad ${p.periodo_mes} de ${p.nombre} ${p.apellido} — EscaladaBogotá`,
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents: Math.round(parseFloat(p.monto) * 100),
        redirect_url: `${FRONTEND_URL}/app/mis-pagos?pago=${pagoId}&status=redirect`,
        sku: pagoId,
      }),
    });
    const wompiData = await wompiRes.json();
    if (!wompiRes.ok) {
      console.error("Error Wompi API:", wompiData);
      return res.status(502).json({ error: "Error al generar el link de pago. Intenta de nuevo." });
    }

    const linkId = wompiData.data.id;
    await prisma.$executeRawUnsafe(
      "UPDATE pago SET referencia = $1, updated_at = NOW() WHERE id = $2", `wompi_link:${linkId}`, pagoId
    );
    res.json({ payment_url: `https://checkout.wompi.co/l/${linkId}`, link_id: linkId, amount: parseFloat(p.monto) });
  } catch (err) { manejarError(res, err, "POST /pagos/:id/link-pago"); }
});

// ─── DELETE /pagos/:id ────────────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const r = await prisma.$queryRawUnsafe("DELETE FROM pago WHERE id = $1 RETURNING id", req.params.id);
    if (!r.length) return res.status(404).json({ error: "Pago no encontrado" });
    res.json({ message: "Pago eliminado" });
  } catch (err) { manejarError(res, err, "DELETE /pagos/:id"); }
});

module.exports = router;
