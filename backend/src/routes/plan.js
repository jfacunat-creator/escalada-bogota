const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");

router.get("/my", authenticate, async (req, res) => {
  if (req.user.rol !== "escalador") {
    return res.status(403).json({ error: "Solo escaladores tienen planes de entrenamiento" });
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         e.nombre,
         e.estado,
         p.nivel,
         c2.trimestre
       FROM escalador e
       LEFT JOIN inscripcion  i  ON i.escalador_id = e.id  AND i.estado = 'activa'
       LEFT JOIN grupo      c  ON c.id = i.grupo_id
       LEFT JOIN ciclo        c2 ON c2.id = c.ciclo_id
       LEFT JOIN programa     p  ON p.id = c.programa_id
       WHERE e.usuario_id = $1
       ORDER BY i.created_at DESC
       LIMIT 1`,
      req.user.id
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Perfil de escalador no encontrado" });
    }

    const esc = rows[0];

    if (esc.estado !== "activo") {
      return res.status(403).json({
        error: "Acceso inactivo",
        estado: esc.estado,
        nombre: esc.nombre,
      });
    }

    if (!esc.trimestre || !esc.nivel) {
      return res.status(404).json({
        error: "Sin inscripción activa. Habla con tu entrenador.",
        nombre: esc.nombre,
      });
    }

    const trimestre = `T${esc.trimestre}`;
    const nivel     = esc.nivel;

    const planRes = await prisma.$queryRawUnsafe(
      `SELECT trimestre, nivel, semanas
       FROM plan_contenido
       WHERE trimestre = $1 AND nivel = $2`,
      trimestre, nivel
    );

    if (!planRes.length) {
      return res.status(404).json({
        error: `Plan ${trimestre} ${nivel} no encontrado en la base de datos`,
      });
    }

    const testSesionesRes = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.tipo, s.fecha, s.numero_sesion
       FROM sesion s
       JOIN inscripcion i ON i.grupo_id = s.grupo_id AND i.escalador_id = (
         SELECT id FROM escalador WHERE usuario_id = $1 LIMIT 1
       ) AND i.estado = 'activa'
       WHERE s.tipo = 'test'
       ORDER BY s.numero_sesion ASC`,
      req.user.id
    ).catch(() => []);

    const testSesiones = testSesionesRes.map((s, idx) => ({
      id:         s.id,
      tipo:       idx === 0 ? 'entrada' : 'salida',
      fecha:      s.fecha,
      semanaCode: idx === 0 ? 'S0' : 'S12',
    }));

    return res.json({
      trimestre,
      nivel,
      nombre: esc.nombre,
      semanas: planRes[0].semanas,
      testSesiones,
    });

  } catch (err) {
    console.error("[GET /api/plan/my]", err.message);
    return res.status(500).json({ error: "Error al cargar el plan" });
  }
});

module.exports = router;
