const express = require("express");
const prisma = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ─── GET /entrenadores ───────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const entrenadores = await prisma.entrenador.findMany({
      include: {
        usuario: { select: { email: true, activo: true } },
        cohortes: {
          where: { estado: { in: ["abierta", "en_curso"] } },
          include: { programa: true, ciclo: true, muro: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    // Agregar conteo de grupos activos
    const result = entrenadores.map((e) => ({
      ...e,
      gruposActivos: e.cohortes.length,
      disponible: e.cohortes.length < e.maxGrupos,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error listando entrenadores:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /entrenadores/:id ───────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Entrenador solo puede ver su propio perfil
    if (req.user.rol === "entrenador" && req.user.entrenador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }

    const entrenador = await prisma.entrenador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true } },
        cohortes: {
          include: {
            programa: true,
            ciclo: true,
            muro: true,
            inscripciones: {
              where: { estado: "activa" },
              include: {
                escalador: {
                  select: { id: true, nombre: true, apellido: true, estado: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!entrenador) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    res.json(entrenador);
  } catch (err) {
    console.error("Error obteniendo entrenador:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /entrenadores/:id/escaladores ───────────────────
// Escaladores vinculados a las cohortes del entrenador
router.get("/:id/escaladores", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol === "entrenador" && req.user.entrenador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tus escaladores" });
    }

    const escaladores = await prisma.escalador.findMany({
      where: {
        inscripciones: {
          some: {
            estado: "activa",
            cohorte: { entrenadorId: id },
          },
        },
      },
      include: {
        usuario: { select: { email: true } },
        inscripciones: {
          where: {
            estado: "activa",
            cohorte: { entrenadorId: id },
          },
          include: {
            cohorte: {
              include: { programa: true, ciclo: true },
            },
            pagos: {
              select: { estado: true, monto: true },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    res.json(escaladores);
  } catch (err) {
    console.error("Error listando escaladores del entrenador:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
