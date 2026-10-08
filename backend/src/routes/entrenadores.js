const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { SQL_MES_VIGENTE } = require("../utils/meses");

const router = express.Router();
router.use(authenticate);

const err = (status, message) => Object.assign(new Error(message), { status });
function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (/usuario_email_key|23505/.test(e.message || "")) return res.status(409).json({ error: "Ese email ya está registrado" });
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}
const texto = (v) => (v === undefined ? undefined : (String(v).trim() || null));

// ─── POST /entrenadores ───────────────────────────────────
router.post("/", authorize("admin"), [
  body("email").isEmail(),
  body("nombre").notEmpty().trim(),
  body("password").isLength({ min: 6 }),
  body("maxGrupos").optional().isInt({ min: 1, max: 20 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const campo = errors.array()[0].path;
    const msg = { email: "Email inválido", nombre: "El nombre es obligatorio", password: "La contraseña debe tener mínimo 6 caracteres", maxGrupos: "Máximo de grupos entre 1 y 20" };
    return res.status(400).json({ error: msg[campo] || "Datos inválidos" });
  }

  try {
    const { email, nombre, apellido, password, especialidad, maxGrupos, telefono, licenciaLey181 } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const entrenador = await prisma.$transaction(async (tx) => {
      const dup = await tx.$queryRawUnsafe("SELECT id FROM usuario WHERE lower(email) = lower($1)", email);
      if (dup.length) throw err(409, "Ese email ya está registrado");
      const u = await tx.$queryRawUnsafe(
        `INSERT INTO usuario (email, password_hash, rol) VALUES (lower($1), $2, 'entrenador') RETURNING id, email`,
        email.trim(), passwordHash
      );
      const r = await tx.$queryRawUnsafe(
        `INSERT INTO entrenador (usuario_id, nombre, apellido, especialidad, max_grupos, telefono, licencia_ley181)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        u[0].id, nombre.trim(), texto(apellido) ?? null, texto(especialidad) ?? null,
        parseInt(maxGrupos) || 4, texto(telefono) ?? null, texto(licenciaLey181) ?? null
      );
      return { ...r[0], email: u[0].email, activo: true };
    });
    res.status(201).json(entrenador);
  } catch (e) { manejarError(res, e, "POST /entrenadores"); }
});

// ─── GET /entrenadores ────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT e.*, u.email, u.activo,
              (SELECT COUNT(*) FROM grupo g
               WHERE g.entrenador_id = e.id AND g.estado IN ('abierta', 'en_curso')) AS grupos_activos,
              (SELECT COUNT(*) FROM grupo g WHERE g.entrenador_id = e.id) AS grupos_total,
              (SELECT COUNT(DISTINCT i.escalador_id)
               FROM inscripcion i JOIN grupo g ON i.grupo_id = g.id
               WHERE g.entrenador_id = e.id AND i.estado = 'activa') AS total_escaladores
       FROM entrenador e
       JOIN usuario u ON e.usuario_id = u.id
       ORDER BY u.activo DESC, e.nombre`
    );
    res.json(result);
  } catch (e) { manejarError(res, e, "GET /entrenadores"); }
});

// ─── GET /entrenadores/:id ────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol === "escalador") return res.status(403).json({ error: "Sin acceso" });
    if (req.user.rol === "entrenador" && req.user.entrenador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }

    const ent = await prisma.$queryRawUnsafe(
      `SELECT e.*, u.email, u.activo FROM entrenador e JOIN usuario u ON e.usuario_id = u.id WHERE e.id = $1`, id
    );
    if (!ent.length) return res.status(404).json({ error: "Entrenador no encontrado" });

    const grupos = await prisma.$queryRawUnsafe(
      `SELECT g.*, p.nombre AS programa_nombre, p.nivel,
              ci.codigo AS ciclo_codigo, ci.fecha_inicio, ci.fecha_fin, m.nombre AS muro_nombre,
              (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos,
              -- Mes del ciclo en curso: inscritos ese mes (con mensualidad) y cuántos la pagaron.
              cm.mes AS mes_vigente, cm.fecha_inicio AS mes_inicio, cm.fecha_fin AS mes_fin,
              (SELECT COUNT(*) FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
                 WHERE i.grupo_id = g.id AND pa.mes = cm.mes) AS mes_inscritos,
              (SELECT COUNT(*) FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
                 WHERE i.grupo_id = g.id AND pa.mes = cm.mes AND pa.estado = 'pagado') AS mes_pagados
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN ciclo_mes cm ON cm.ciclo_id = ci.id AND cm.mes = ${SQL_MES_VIGENTE()}
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       WHERE g.entrenador_id = $1 AND g.estado IN ('abierta', 'en_curso')
       ORDER BY ci.fecha_inicio DESC`,
      id
    );

    const stats = await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(DISTINCT g.id) FILTER (WHERE g.estado IN ('abierta','en_curso')) AS grupos_activos,
         COUNT(DISTINCT i.escalador_id) AS escaladores_activos,
         COUNT(DISTINCT i.escalador_id) FILTER (WHERE EXISTS (
           SELECT 1 FROM pago pa WHERE pa.inscripcion_id = i.id AND pa.estado = 'pagado' AND pa.mes = ${SQL_MES_VIGENTE()}
         )) AS escaladores_mes_pagado,
         COUNT(DISTINCT g.id) AS total_grupos_historico
       FROM grupo g
       JOIN ciclo ci ON ci.id = g.ciclo_id
       LEFT JOIN inscripcion i ON i.grupo_id = g.id AND i.estado = 'activa'
       WHERE g.entrenador_id = $1`,
      id
    );

    res.json({ ...ent[0], grupos, stats: stats[0] });
  } catch (e) { manejarError(res, e, "GET /entrenadores/:id"); }
});

// ─── PUT /entrenadores/:id ────────────────────────────────
// Edita datos del entrenador y de su usuario (email, activo).
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const { nombre, apellido, especialidad, maxGrupos, telefono, licenciaLey181, email, activo } = req.body;
    const sets = [], params = [];
    const set = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };

    if (nombre !== undefined) {
      if (!String(nombre).trim()) return res.status(400).json({ error: "El nombre no puede quedar vacío" });
      set("nombre", String(nombre).trim());
    }
    if (apellido !== undefined) set("apellido", texto(apellido));
    if (especialidad !== undefined) set("especialidad", texto(especialidad));
    if (telefono !== undefined) set("telefono", texto(telefono));
    if (licenciaLey181 !== undefined) set("licencia_ley181", texto(licenciaLey181));
    if (maxGrupos !== undefined) {
      const n = parseInt(maxGrupos);
      if (!(n >= 1 && n <= 20)) return res.status(400).json({ error: "Máximo de grupos entre 1 y 20" });
      set("max_grupos", n);
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (!sets.length && email === undefined && activo === undefined) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ent = await tx.$queryRawUnsafe(
        `SELECT e.usuario_id, e.max_grupos,
                (SELECT COUNT(*) FROM grupo g WHERE g.entrenador_id = e.id AND g.estado IN ('abierta','en_curso')) AS activos
         FROM entrenador e WHERE e.id = $1`, req.params.id
      );
      if (!ent.length) throw err(404, "Entrenador no encontrado");
      if (maxGrupos !== undefined && parseInt(maxGrupos) < Number(ent[0].activos)) {
        throw err(400, `Tiene ${ent[0].activos} grupos activos: el máximo no puede ser menor`);
      }
      if (activo === false && Number(ent[0].activos) > 0) {
        throw err(400, `Tiene ${ent[0].activos} grupo(s) activo(s). Reasígnalos antes de desactivarlo.`);
      }
      let fila;
      if (sets.length) {
        sets.push("updated_at = NOW()");
        params.push(req.params.id);
        fila = (await tx.$queryRawUnsafe(
          `UPDATE entrenador SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, ...params
        ))[0];
      }
      if (email !== undefined) {
        const dup = await tx.$queryRawUnsafe(
          "SELECT id FROM usuario WHERE lower(email) = lower($1) AND id <> $2", String(email).trim(), ent[0].usuario_id
        );
        if (dup.length) throw err(409, "Ese email ya está registrado");
        await tx.$executeRawUnsafe(
          "UPDATE usuario SET email = lower($1), updated_at = NOW() WHERE id = $2", String(email).trim(), ent[0].usuario_id
        );
      }
      if (activo !== undefined) {
        await tx.$executeRawUnsafe(
          "UPDATE usuario SET activo = $1, updated_at = NOW() WHERE id = $2", !!activo, ent[0].usuario_id
        );
      }
      const r = await tx.$queryRawUnsafe(
        `SELECT e.*, u.email, u.activo FROM entrenador e JOIN usuario u ON u.id = e.usuario_id WHERE e.id = $1`, req.params.id
      );
      return r[0] || fila;
    });
    res.json(result);
  } catch (e) { manejarError(res, e, "PUT /entrenadores/:id"); }
});

// ─── DELETE /entrenadores/:id ─────────────────────────────
// Solo si no tiene grupos (los grupos guardan inscripciones, asistencia y pagos).
// Con grupos: reasignarlos o desactivarlo.
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const ent = await tx.$queryRawUnsafe(
        `SELECT usuario_id, (SELECT COUNT(*) FROM grupo g WHERE g.entrenador_id = e.id) AS grupos
         FROM entrenador e WHERE e.id = $1`, req.params.id
      );
      if (!ent.length) throw err(404, "Entrenador no encontrado");
      if (Number(ent[0].grupos) > 0) {
        throw err(409, `Tiene ${ent[0].grupos} grupo(s) con historial. Reasígnalos a otro entrenador o desactívalo en lugar de eliminarlo.`);
      }
      await tx.$executeRawUnsafe("UPDATE plan_ai_ajuste SET revisado_por = NULL WHERE revisado_por = $1", ent[0].usuario_id);
      await tx.$executeRawUnsafe("DELETE FROM entrenador WHERE id = $1", req.params.id);
      await tx.$executeRawUnsafe("DELETE FROM usuario WHERE id = $1", ent[0].usuario_id);
    });
    res.json({ message: "Entrenador eliminado" });
  } catch (e) { manejarError(res, e, "DELETE /entrenadores/:id"); }
});

module.exports = router;
