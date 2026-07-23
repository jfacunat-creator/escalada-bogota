const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", authorize("admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT e.*, u.email, u.activo,
              (SELECT COUNT(*) FROM cohorte co WHERE co.entrenador_id=e.id AND co.estado IN ('abierta','en_curso')) as grupos_activos,
              (SELECT COUNT(DISTINCT i.escalador_id) FROM inscripcion i JOIN cohorte co ON i.cohorte_id=co.id WHERE co.entrenador_id=e.id AND i.estado='activa') as total_escaladores
       FROM entrenador e JOIN usuario u ON e.usuario_id=u.id ORDER BY e.nombre`);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol === "entrenador" && req.user.entrenador?.id !== id)
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    const ent = await db(
      `SELECT e.*, u.email FROM entrenador e JOIN usuario u ON e.usuario_id=u.id WHERE e.id=$1`, [id]);
    if (!ent.rows.length) return res.status(404).json({ error: "Entrenador no encontrado" });
    const grupos = await db(
      `SELECT co.*, p.nombre as programa_nombre, p.nivel, ci.codigo as ciclo_codigo, m.nombre as muro_nombre,
              (SELECT COUNT(*) FROM inscripcion i WHERE i.cohorte_id=co.id AND i.estado='activa') as inscritos
       FROM cohorte co JOIN programa p ON co.programa_id=p.id JOIN ciclo ci ON co.ciclo_id=ci.id
       JOIN muro_aliado m ON co.muro_id=m.id
       WHERE co.entrenador_id=$1 AND co.estado IN ('abierta','en_curso')
       ORDER BY ci.fecha_inicio DESC`, [id]);
    const stats = await db(
      `SELECT
         COUNT(DISTINCT co.id) as grupos_activos,
         COUNT(DISTINCT i.escalador_id) as escaladores_activos,
         (SELECT COUNT(DISTINCT co2.id) FROM cohorte co2 WHERE co2.entrenador_id=$1) as total_grupos_historico
       FROM cohorte co
       LEFT JOIN inscripcion i ON i.cohorte_id=co.id AND i.estado='activa'
       WHERE co.entrenador_id=$1 AND co.estado IN ('abierta','en_curso')`, [id]);
    res.json({ ...ent.rows[0], grupos: grupos.rows, stats: stats.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

module.exports = router;
