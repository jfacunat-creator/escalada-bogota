const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /sesiones?cohorteId=xxx ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cohorteId } = req.query;
    if (!cohorteId) return res.status(400).json({ error: "cohorteId requerido" });

    // Verificar acceso: escalador solo ve sesiones de sus cohortes
    if (req.user.rol === "escalador") {
      const check = await db(
        "SELECT 1 FROM inscripcion WHERE escalador_id = $1 AND cohorte_id = $2 AND estado = 'activa'",
        [req.user.escalador.id, cohorteId]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: "No estás inscrito en esta cohorte" });
    }

    // Entrenador solo ve sesiones de sus cohortes
    if (req.user.rol === "entrenador") {
      const check = await db(
        "SELECT 1 FROM cohorte WHERE id = $1 AND entrenador_id = $2",
        [cohorteId, req.user.entrenador.id]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: "Esta cohorte no es tuya" });
    }

    const result = await db(
      `SELECT s.*,
              (SELECT COUNT(*) FROM asistencia a WHERE a.sesion_id = s.id AND a.asistio = true) as asistentes,
              (SELECT COUNT(*) FROM asistencia a WHERE a.sesion_id = s.id) as registros
       FROM sesion s
       WHERE s.cohorte_id = $1
       ORDER BY s.numero_sesion ASC`,
      [cohorteId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error listando sesiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /sesiones/generar — Genera las ~26 sesiones de un ciclo ──
router.post(
  "/generar",
  authorize("admin", "entrenador"),
  [body("cohorteId").isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { cohorteId } = req.body;

      // Obtener cohorte con ciclo
      const cohRes = await db(
        `SELECT c.*, ci.fecha_inicio, ci.fecha_fin, c.horario
         FROM cohorte c JOIN ciclo ci ON c.ciclo_id = ci.id
         WHERE c.id = $1`,
        [cohorteId]
      );
      if (cohRes.rows.length === 0) return res.status(404).json({ error: "Cohorte no encontrada" });

      const coh = cohRes.rows[0];

      // Verificar que no haya sesiones ya generadas
      const existing = await db("SELECT COUNT(*) as n FROM sesion WHERE cohorte_id = $1", [cohorteId]);
      if (parseInt(existing.rows[0].n) > 0) {
        return res.status(409).json({ error: `Ya hay ${existing.rows[0].n} sesiones generadas para esta cohorte` });
      }

      // Parsear horario: "lun_mie_18_20" → días [1,3], hora 18:00-20:00
      const horarioMap = {
        lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0
      };
      const parts = coh.horario.split("_");
      const dias = [];
      const horas = [];
      for (const p of parts) {
        if (horarioMap[p] !== undefined) dias.push(horarioMap[p]);
        else horas.push(parseInt(p));
      }

      const horaInicio = `${String(horas[0] || 18).padStart(2, "0")}:00`;
      const horaFin = `${String(horas[1] || 20).padStart(2, "0")}:00`;

      // Generar fechas
      const inicio = new Date(coh.fecha_inicio);
      const fin = new Date(coh.fecha_fin);
      const sesiones = [];
      let num = 1;
      const current = new Date(inicio);

      while (current <= fin) {
        if (dias.includes(current.getDay())) {
          const fecha = current.toISOString().split("T")[0];
          // Última sesión (semana 12-13) es checkpoint fest
          const tipo = num >= 25 ? "checkpoint_fest" : (num === 1 || num === 2 ? "test" : "regular");
          sesiones.push({ cohorteId, fecha, horaInicio, horaFin, num, tipo });
          num++;
        }
        current.setDate(current.getDate() + 1);
      }

      // Insertar en batch
      for (const s of sesiones) {
        await db(
          `INSERT INTO sesion (cohorte_id, fecha, hora_inicio, hora_fin, numero_sesion, tipo)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [s.cohorteId, s.fecha, s.horaInicio, s.horaFin, s.num, s.tipo]
        );
      }

      res.status(201).json({
        message: `${sesiones.length} sesiones generadas`,
        total: sesiones.length,
        primera: sesiones[0]?.fecha,
        ultima: sesiones[sesiones.length - 1]?.fecha,
      });
    } catch (err) {
      console.error("Error generando sesiones:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── GET /sesiones/:id ───────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*,
              c.programa_id, c.entrenador_id, c.horario,
              p.nombre as programa_nombre,
              m.nombre as muro_nombre
       FROM sesion s
       JOIN cohorte c ON s.cohorte_id = c.id
       JOIN programa p ON c.programa_id = p.id
       JOIN muro_aliado m ON c.muro_id = m.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Sesión no encontrada" });

    // Traer asistencia
    const asistencia = await db(
      `SELECT a.*, e.nombre, e.apellido
       FROM asistencia a
       JOIN escalador e ON a.escalador_id = e.id
       WHERE a.sesion_id = $1
       ORDER BY e.nombre`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], asistencia: asistencia.rows });
  } catch (err) {
    console.error("Error obteniendo sesión:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PUT /sesiones/:id/notas ─────────────────────────────
router.put(
  "/:id/notas",
  authorize("entrenador", "admin"),
  [body("notas").isString()],
  async (req, res) => {
    try {
      await db("UPDATE sesion SET notas_entrenador = $1 WHERE id = $2", [req.body.notas, req.params.id]);
      res.json({ message: "Notas actualizadas" });
    } catch (err) {
      console.error("Error actualizando notas:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

module.exports = router;
