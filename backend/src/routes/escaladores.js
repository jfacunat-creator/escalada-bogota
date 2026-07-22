const express = require("express");
const { body, param, validationResult } = require("express-validator");
const prisma = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ─── GET /escaladores ────────────────────────────────────
// Admin y entrenadores ven la lista de escaladores
router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { estado, rangoEtario, buscar } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (rangoEtario) where.rangoEtario = rangoEtario;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: "insensitive" } },
        { apellido: { contains: buscar, mode: "insensitive" } },
      ];
    }

    // Si es entrenador, solo ve escaladores de SUS cohortes
    if (req.user.rol === "entrenador") {
      where.inscripciones = {
        some: {
          cohorte: { entrenadorId: req.user.entrenador.id },
          estado: "activa",
        },
      };
    }

    const escaladores = await prisma.escalador.findMany({
      where,
      include: {
        usuario: { select: { email: true, activo: true } },
        responsable: true,
        inscripciones: {
          where: { estado: "activa" },
          include: {
            cohorte: {
              include: { programa: true, ciclo: true },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    res.json(escaladores);
  } catch (err) {
    console.error("Error listando escaladores:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /escaladores/:id ────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Escalador solo puede ver su propio perfil
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }

    const escalador = await prisma.escalador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true } },
        responsable: true,
        inscripciones: {
          include: {
            cohorte: {
              include: { programa: true, ciclo: true, muro: true, entrenador: true },
            },
            pagos: true,
          },
          orderBy: { fechaInscripcion: "desc" },
        },
        evaluaciones: {
          include: { resultados: true },
          orderBy: { fecha: "desc" },
        },
        consentimientos: {
          where: { vigente: true },
        },
      },
    });

    if (!escalador) {
      return res.status(404).json({ error: "Escalador no encontrado" });
    }

    res.json(escalador);
  } catch (err) {
    console.error("Error obteniendo escalador:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PUT /escaladores/:id ────────────────────────────────
router.put(
  "/:id",
  [
    body("nombre").optional().trim().notEmpty(),
    body("apellido").optional().trim().notEmpty(),
    body("pesoKg").optional().isFloat({ min: 20, max: 200 }),
    body("telefono").optional().trim(),
    body("contactoEmergencia").optional().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      // Solo el propio escalador o admin pueden editar
      if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
        return res.status(403).json({ error: "Solo puedes editar tu propio perfil" });
      }

      const { nombre, apellido, pesoKg, telefono, contactoEmergencia } = req.body;

      const actualizado = await prisma.escalador.update({
        where: { id },
        data: {
          ...(nombre && { nombre }),
          ...(apellido && { apellido }),
          ...(pesoKg !== undefined && { pesoKg }),
          ...(telefono !== undefined && { telefono }),
          ...(contactoEmergencia && { contactoEmergencia }),
        },
      });

      res.json(actualizado);
    } catch (err) {
      console.error("Error actualizando escalador:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── PATCH /escaladores/:id/estado ───────────────────────
// Solo admin puede cambiar estado (activo/inactivo/congelado)
router.patch(
  "/:id/estado",
  authorize("admin"),
  [body("estado").isIn(["activo", "inactivo", "congelado"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { estado } = req.body;

      const actualizado = await prisma.escalador.update({
        where: { id },
        data: { estado },
      });

      res.json({
        message: `Estado cambiado a ${estado}`,
        escalador: actualizado,
      });
    } catch (err) {
      console.error("Error cambiando estado:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

module.exports = router;
