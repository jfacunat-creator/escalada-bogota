const express = require("express");
const { randomUUID } = require("crypto");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /sesiones?grupoId=xxx ────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { grupoId } = req.query;
    if (!grupoId) {
      return res.status(400).json({ error: "grupoId es requerido" });
    }

    // Escalador: solo puede ver sesiones de grupos donde tiene inscripción activa
    if (req.user.rol === "escalador") {
      const check = await db(
        "SELECT id FROM inscripcion WHERE grupo_id=$1 AND escalador_id=$2 AND estado='activa'",
        [grupoId, req.user.escalador.id]
      );
      if (!check.rows.length) return res.status(403).json({ error: "Sin inscripción activa en este grupo" });
    }

    // Entrenador: solo puede ver sesiones de sus grupos
    if (req.user.rol === "entrenador") {
      const check = await db(
        "SELECT id FROM grupo WHERE id=$1 AND entrenador_id=$2",
        [grupoId, req.user.entrenador?.id]
      );
      if (!check.rows.length) return res.status(403).json({ error: "Grupo no encontrado o sin acceso" });
    }

    const result = await db(
      `SELECT s.*, g.modalidad, p.nombre AS programa,
              (SELECT COUNT(*) FROM asistencia a WHERE a.sesion_id = s.id) AS total_asistencias
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       WHERE s.grupo_id = $1
       ORDER BY s.fecha ASC, s.hora_inicio ASC`,
      [grupoId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /sesiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /sesiones/generar — Generar sesiones para un grupo ─────────────────
// Debe ir ANTES de /:id para que Express no lo interprete como un UUID
router.post("/generar", authorize("admin", "entrenador"), async (req, res) => {
  const { grupoId } = req.body;
  if (!grupoId) return res.status(400).json({ error: "grupoId requerido" });

  try {
    const grupoRes = await db(
      `SELECT g.horario, g.estado,
              ci.fecha_inicio, ci.fecha_fin,
              p.nivel
       FROM grupo g
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN programa p ON g.programa_id = p.id
       WHERE g.id = $1`,
      [grupoId]
    );
    if (!grupoRes.rows.length) return res.status(404).json({ error: "Grupo no encontrado" });

    const existentes = await db("SELECT COUNT(*) AS n FROM sesion WHERE grupo_id = $1", [grupoId]);
    if (parseInt(existentes.rows[0].n) > 0) {
      return res.status(409).json({ error: "Este grupo ya tiene sesiones generadas" });
    }

    const { horario, fecha_inicio, fecha_fin, nivel } = grupoRes.rows[0];

    const HORARIO_MAP = {
      lun_mie_18_20: { days: [1, 3], inicio: '18:00', fin: '20:00' },
      lun_mie_20_22: { days: [1, 3], inicio: '20:00', fin: '22:00' },
      mar_jue_18_20: { days: [2, 4], inicio: '18:00', fin: '20:00' },
      mar_jue_20_22: { days: [2, 4], inicio: '20:00', fin: '22:00' },
      sab_dom_7_9:   { days: [6, 0], inicio: '07:00', fin: '09:00' },
      sab_dom_9_11:  { days: [6, 0], inicio: '09:00', fin: '11:00' },
      sab_dom_11_13: { days: [6, 0], inicio: '11:00', fin: '13:00' },
    };

    const fechas = [];
    let horaInicio, horaFin;

    if (horario) {
      const info = HORARIO_MAP[horario];
      if (!info) return res.status(400).json({ error: "Horario no reconocido: " + horario });

      horaInicio = info.inicio;
      horaFin = info.fin;

      const cur = new Date(fecha_inicio);
      cur.setUTCHours(0, 0, 0, 0);
      const finDate = new Date(fecha_fin);
      while (cur <= finDate) {
        if (info.days.includes(cur.getUTCDay())) {
          fechas.push(cur.toISOString().split('T')[0]);
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      // Grupo autónomo sin horario: distribuir sesiones uniformemente en el ciclo
      horaInicio = '08:00';
      horaFin = '20:00';
      const TARGET = 26;
      const msInicio = new Date(fecha_inicio).getTime();
      const msFin = new Date(fecha_fin).getTime();
      const totalDays = Math.floor((msFin - msInicio) / 86400000);
      const step = Math.max(1, Math.floor(totalDays / TARGET));
      const cur = new Date(fecha_inicio);
      cur.setUTCHours(0, 0, 0, 0);
      const finDate = new Date(fecha_fin);
      while (cur <= finDate && fechas.length < TARGET) {
        fechas.push(cur.toISOString().split('T')[0]);
        cur.setUTCDate(cur.getUTCDate() + step);
      }
    }

    if (fechas.length === 0) return res.status(400).json({ error: "No hay fechas válidas para este horario en el rango del ciclo" });

    // Tipo por posición: test de entrada (1ª), test de salida (última), juego al ~60%, checkpoint_fest avanzado al ~30%
    const total = fechas.length;
    const getTipo = (i) => {
      if (i === 0) return 'test';
      if (i === total - 1) return 'test';
      if (i === Math.floor(total * 0.6)) return 'juego_cierre';
      if (nivel === 'avanzado' && i === Math.floor(total * 0.3)) return 'checkpoint_fest';
      return 'regular';
    };

    // INSERT en bulk — Prisma no pone DEFAULT uuid en la DB, hay que generarlo en app
    const paramSets = [];
    const vals = [];
    fechas.forEach((fecha, i) => {
      const b = i * 7;
      paramSets.push(`($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7})`);
      vals.push(randomUUID(), grupoId, fecha, horaInicio, horaFin, i + 1, getTipo(i));
    });

    await db(
      `INSERT INTO sesion (id, grupo_id, fecha, hora_inicio, hora_fin, numero_sesion, tipo) VALUES ${paramSets.join(', ')}`,
      vals
    );

    res.status(201).json({ message: `${total} sesiones generadas`, total });
  } catch (err) {
    console.error("Error POST /sesiones/generar:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/:id ────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              ci.codigo AS ciclo, m.nombre AS muro, ent.nombre AS entrenador
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error GET /sesiones/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/entrenador/:entrenadorId ────────────────
router.get("/entrenador/:entrenadorId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              m.nombre AS muro, ci.codigo AS ciclo,
              g.id AS grupo_id
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       WHERE g.entrenador_id = $1
         AND g.estado IN ('abierta', 'en_curso')
       ORDER BY s.fecha ASC`,
      [req.params.entrenadorId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
