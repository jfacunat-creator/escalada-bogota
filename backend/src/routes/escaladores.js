const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { estado, rangoEtario, buscar, cohorteId } = req.query;
    let sql = `
      SELECT e.*, u.email, u.activo as usuario_activo,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado='activa') as grupos_activos
      FROM escalador e JOIN usuario u ON e.usuario_id = u.id WHERE 1=1`;
    const params = [];
    if (estado) { params.push(estado); sql += ` AND e.estado = $${params.length}`; }
    if (rangoEtario) { params.push(rangoEtario); sql += ` AND e.rango_etario = $${params.length}`; }
    if (buscar) { params.push(`%${buscar}%`); sql += ` AND (e.nombre ILIKE $${params.length} OR e.apellido ILIKE $${params.length})`; }
    if (cohorteId) { params.push(cohorteId); sql += ` AND EXISTS (SELECT 1 FROM inscripcion i WHERE i.escalador_id=e.id AND i.cohorte_id=$${params.length} AND i.estado='activa')`; }
    if (req.user.rol === "entrenador") { params.push(req.user.entrenador.id); sql += ` AND EXISTS (SELECT 1 FROM inscripcion i JOIN cohorte co ON i.cohorte_id=co.id WHERE i.escalador_id=e.id AND co.entrenador_id=$${params.length} AND i.estado='activa')`; }
    sql += " ORDER BY e.nombre, e.apellido";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id)
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    const result = await db(
      `SELECT e.*, u.email FROM escalador e JOIN usuario u ON e.usuario_id=u.id WHERE e.id=$1`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: "Escalador no encontrado" });
    const inscripciones = await db(
      `SELECT i.*, p.nombre as programa, ci.codigo as ciclo, m.nombre as muro, co.horario, co.modalidad
       FROM inscripcion i JOIN cohorte co ON i.cohorte_id=co.id JOIN programa p ON co.programa_id=p.id
       JOIN ciclo ci ON co.ciclo_id=ci.id JOIN muro_aliado m ON co.muro_id=m.id
       WHERE i.escalador_id=$1 ORDER BY i.created_at DESC`, [id]);
    res.json({ ...result.rows[0], inscripciones: inscripciones.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

router.put("/:id", [body("nombre").optional().trim(), body("apellido").optional().trim(), body("telefono").optional().trim()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { id } = req.params;
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id)
      return res.status(403).json({ error: "Solo puedes editar tu propio perfil" });
    const { nombre, apellido, pesoKg, telefono, contactoEmergencia } = req.body;
    const sets = [], params = [];
    if (nombre) { params.push(nombre); sets.push(`nombre=$${params.length}`); }
    if (apellido) { params.push(apellido); sets.push(`apellido=$${params.length}`); }
    if (pesoKg !== undefined) { params.push(pesoKg); sets.push(`peso_kg=$${params.length}`); }
    if (telefono !== undefined) { params.push(telefono); sets.push(`telefono=$${params.length}`); }
    if (contactoEmergencia) { params.push(contactoEmergencia); sets.push(`contacto_emergencia=$${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });
    params.push(id);
    const result = await db(`UPDATE escalador SET ${sets.join(',')} WHERE id=$${params.length} RETURNING *`, params);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

router.patch("/:id/estado", authorize("admin"), [body("estado").isIn(["activo","inactivo","congelado"])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    await db("UPDATE escalador SET estado=$1 WHERE id=$2", [req.body.estado, req.params.id]);
    res.json({ message: `Estado cambiado a ${req.body.estado}` });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

module.exports = router;
