const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { generateTokens } = require("../utils/jwt");

const router = express.Router();

// ─── POST /auth/reset-escaladores — Endpoint temporal ────
// Resetea contraseñas de todos los escaladores usando bcrypt
// del entorno actual de producción. Protegido por token admin.
router.post("/reset-escaladores", async (req, res) => {
  const { adminSecret, nuevaPassword } = req.body;
  if (adminSecret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: "No autorizado" });
  }
  try {
    const hash = await bcrypt.hash(nuevaPassword || 'escalador2026', 12);
    const result = await db(
      "UPDATE usuario SET password_hash = $1 WHERE rol = 'escalador' RETURNING email",
      [hash]
    );
    res.json({
      message: `${result.rows.length} escaladores actualizados`,
      emails: result.rows.map(r => r.email),
      hash
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /auth/register ─────────────────────────────────
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("nombre").trim().notEmpty(),
    body("apellido").trim().notEmpty(),
    body("fechaNacimiento").isISO8601(),
    body("contactoEmergencia").trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password, nombre, apellido, fechaNacimiento, pesoKg, telefono, contactoEmergencia } = req.body;

      // Verificar duplicado
      const existe = await db("SELECT id FROM usuario WHERE email = $1", [email]);
      if (existe.rows.length > 0) {
        return res.status(409).json({ error: "Este email ya está registrado" });
      }

      // Calcular rango etario
      const nacimiento = new Date(fechaNacimiento);
      const edad = new Date().getFullYear() - nacimiento.getFullYear();
      let rangoEtario = "adulto";
      if (edad < 10) rangoEtario = "menor_6_9";
      else if (edad < 13) rangoEtario = "menor_10_12";
      else if (edad < 16) rangoEtario = "menor_13_15";

      // Crear usuario
      const userResult = await db(
        `INSERT INTO usuario (email, password_hash, rol) VALUES ($1, $2, 'escalador') RETURNING id, email, rol`,
        [email, await bcrypt.hash(password, 12)]
      );
      const usuario = userResult.rows[0];

      // Crear escalador
      const escResult = await db(
        `INSERT INTO escalador (usuario_id, nombre, apellido, fecha_nacimiento, rango_etario, peso_kg, telefono, contacto_emergencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, nombre, apellido, rango_etario, estado`,
        [usuario.id, nombre, apellido, nacimiento, rangoEtario, pesoKg || null, telefono || null, contactoEmergencia]
      );

      const tokens = generateTokens(usuario);

      res.status(201).json({
        message: "Registro exitoso",
        usuario: { ...usuario, escalador: escResult.rows[0] },
        ...tokens,
      });
    } catch (err) {
      console.error("Error en registro:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ─── POST /auth/login ────────────────────────────────────
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const result = await db(
        `SELECT u.*, e.id as esc_id, e.nombre as esc_nombre, e.apellido as esc_apellido,
                e.rango_etario, e.estado as esc_estado,
                t.id as ent_id, t.nombre as ent_nombre, t.licencia_ley181
         FROM usuario u
         LEFT JOIN escalador e ON e.usuario_id = u.id
         LEFT JOIN entrenador t ON t.usuario_id = u.id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const row = result.rows[0];

      if (!row.activo) {
        return res.status(403).json({ error: "Cuenta desactivada" });
      }

      const passwordValido = await bcrypt.compare(password, row.password_hash);
      if (!passwordValido) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const tokens = generateTokens({ id: row.id, email: row.email, rol: row.rol });

      const perfil = { id: row.id, email: row.email, rol: row.rol };
      if (row.esc_id) {
        perfil.escalador = {
          id: row.esc_id, nombre: row.esc_nombre, apellido: row.esc_apellido,
          rangoEtario: row.rango_etario, estado: row.esc_estado,
        };
      }
      if (row.ent_id) {
        perfil.entrenador = {
          id: row.ent_id, nombre: row.ent_nombre, licenciaLey181: row.licencia_ley181,
        };
      }

      res.json({ message: "Login exitoso", usuario: perfil, ...tokens });
    } catch (err) {
      console.error("Error en login:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ─── POST /auth/refresh ──────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const result = await db("SELECT id, email, rol, activo FROM usuario WHERE id = $1", [decoded.id]);

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: "Usuario no válido" });
    }

    const tokens = generateTokens(result.rows[0]);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Refresh token inválido o expirado" });
  }
});

// ─── GET /auth/me ────────────────────────────────────────
router.get("/me", require("../middleware/auth").authenticate, async (req, res) => {
  try {
    const result = await db(
      `SELECT u.id, u.email, u.rol,
              e.id as esc_id, e.nombre, e.apellido, e.rango_etario, e.estado as esc_estado, e.telefono, e.contacto_emergencia,
              t.id as ent_id, t.nombre as ent_nombre, t.licencia_ley181, t.max_grupos
       FROM usuario u
       LEFT JOIN escalador e ON e.usuario_id = u.id
       LEFT JOIN entrenador t ON t.usuario_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const row = result.rows[0];
    const perfil = { id: row.id, email: row.email, rol: row.rol };

    if (row.esc_id) {
      perfil.escalador = {
        id: row.esc_id, nombre: row.nombre, apellido: row.apellido,
        rangoEtario: row.rango_etario, estado: row.esc_estado,
        telefono: row.telefono, contactoEmergencia: row.contacto_emergencia,
      };
    }
    if (row.ent_id) {
      perfil.entrenador = {
        id: row.ent_id, nombre: row.ent_nombre,
        licenciaLey181: row.licencia_ley181, maxGrupos: row.max_grupos,
      };
    }

    res.json(perfil);
  } catch (err) {
    console.error("Error en /me:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
