const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { pool, query: db } = require("../config/database");
const { generateTokens } = require("../utils/jwt");

const router = express.Router();

// ─── POST /auth/reset-escaladores — Endpoint temporal ────
router.post("/reset-escaladores", async (req, res) => {
  const { adminSecret, nuevaPassword } = req.body;
  if (adminSecret !== process.env.JWT_SECRET)
    return res.status(403).json({ error: "No autorizado" });
  try {
    const hash = await bcrypt.hash(nuevaPassword || "escalador2026", 12);
    const result = await db(
      "UPDATE usuario SET password_hash = $1 WHERE rol = 'escalador' RETURNING email",
      [hash]
    );
    res.json({
      message: `${result.rows.length} escaladores actualizados`,
      emails: result.rows.map((r) => r.email),
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
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password, nombre, apellido, fechaNacimiento, pesoKg, telefono, contactoEmergencia } = req.body;

    // Calcular rango etario
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const edad =
      hoy.getFullYear() -
      nacimiento.getFullYear() -
      (hoy < new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate()) ? 1 : 0);

    let rangoEtario = "adulto";
    if (edad < 10) rangoEtario = "menor_6_9";
    else if (edad < 13) rangoEtario = "menor_10_12";
    else if (edad < 16) rangoEtario = "menor_13_15";

    // FIX: usar transacción para que usuario + escalador sean atómicos.
    // Si falla el INSERT de escalador, el usuario no queda huérfano en la BD.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verificar email duplicado
      const existe = await client.query(
        "SELECT id FROM usuario WHERE email = $1",
        [email]
      );
      if (existe.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Este email ya está registrado" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // FIX: incluir updated_at = NOW() por si la columna no tiene DEFAULT
      // en el esquema SQL (Prisma maneja @updatedAt en el cliente, no en la DB).
      const userResult = await client.query(
        `INSERT INTO usuario (id, email, password_hash, rol, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'escalador', NOW())
         RETURNING id, email, rol`,
        [email, passwordHash]
      );
      const usuario = userResult.rows[0];

      // FIX: incluir updated_at = NOW() en escalador también
      const escResult = await client.query(
        `INSERT INTO escalador
           (id, usuario_id, nombre, apellido, fecha_nacimiento, rango_etario,
            peso_kg, telefono, contacto_emergencia, estado, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'activo', NOW())
         RETURNING id, nombre, apellido, rango_etario, estado, created_at`,
        [
          usuario.id,
          nombre,
          apellido,
          nacimiento,
          rangoEtario,
          pesoKg || null,
          telefono || null,
          contactoEmergencia,
        ]
      );

      await client.query("COMMIT");

      const tokens = generateTokens(usuario);
      res.status(201).json({
        message: "Registro exitoso",
        usuario: { ...usuario, escalador: escResult.rows[0] },
        ...tokens,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      // Log detallado en servidor para diagnóstico
      console.error("Error en registro — detalle:", {
        message: err.message,
        code: err.code,
        detail: err.detail,
        table: err.table,
        column: err.column,
        constraint: err.constraint,
      });
      // En desarrollo exponer el mensaje real; en producción respuesta genérica
      res.status(500).json({ error: "Error interno del servidor" });
    } finally {
      client.release();
    }
  }
);

// ─── POST /auth/login ────────────────────────────────────
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
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
      if (result.rows.length === 0)
        return res.status(401).json({ error: "Credenciales inválidas" });
      const row = result.rows[0];
      if (!row.activo)
        return res.status(403).json({ error: "Cuenta desactivada" });
      if (!(await bcrypt.compare(password, row.password_hash)))
        return res.status(401).json({ error: "Credenciales inválidas" });
      const tokens = generateTokens({ id: row.id, email: row.email, rol: row.rol });
      const perfil = { id: row.id, email: row.email, rol: row.rol };
      if (row.esc_id)
        perfil.escalador = {
          id: row.esc_id,
          nombre: row.esc_nombre,
          apellido: row.esc_apellido,
          rangoEtario: row.rango_etario,
          estado: row.esc_estado,
        };
      if (row.ent_id)
        perfil.entrenador = {
          id: row.ent_id,
          nombre: row.ent_nombre,
          licenciaLey181: row.licencia_ley181,
        };
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
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token requerido" });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const result = await db(
      "SELECT id, email, rol, activo FROM usuario WHERE id = $1",
      [decoded.id]
    );
    if (result.rows.length === 0 || !result.rows[0].activo)
      return res.status(401).json({ error: "Usuario no válido" });
    res.json(generateTokens(result.rows[0]));
  } catch {
    res.status(401).json({ error: "Refresh token inválido o expirado" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────
router.get(
  "/me",
  require("../middleware/auth").authenticate,
  async (req, res) => {
    try {
      const userRes = await db(
        `SELECT u.id, u.email, u.rol,
                e.id as esc_id, e.nombre, e.apellido, e.rango_etario,
                e.estado as esc_estado, e.telefono, e.contacto_emergencia,
                e.created_at as esc_created,
                t.id as ent_id, t.nombre as ent_nombre, t.licencia_ley181, t.max_grupos
         FROM usuario u
         LEFT JOIN escalador e ON e.usuario_id = u.id
         LEFT JOIN entrenador t ON t.usuario_id = u.id
         WHERE u.id = $1`,
        [req.user.id]
      );
      const row = userRes.rows[0];
      const perfil = { id: row.id, email: row.email, rol: row.rol };

      if (row.esc_id) {
        const inscRes = await db(
          `SELECT
             i.id, i.estado, i.fecha_inscripcion, i.precio_ciclo, i.descuento_aplicado,
             g.id   AS grupo_id,    g.modalidad,     g.horario,
             g.estado AS grupo_estado, g.cupo_maximo, g.inscritos_actual,
             p.id    AS prog_id,      p.nombre AS prog_nombre, p.nivel,
             p.descripcion AS prog_desc, p.incluye_fisio, p.incluye_nutricion,
             ci.id   AS ciclo_id,     ci.codigo AS ciclo_codigo,
             ci.fecha_inicio,         ci.fecha_fin,      ci.semana_empalme,
             m.id    AS muro_id,      m.nombre  AS muro_nombre, m.direccion AS muro_dir,
             ent.id  AS entrenador_id, ent.nombre AS entrenador_nombre
           FROM inscripcion i
           JOIN grupo g     ON i.grupo_id      = g.id
           JOIN programa p  ON g.programa_id   = p.id
           JOIN ciclo ci    ON g.ciclo_id      = ci.id
           JOIN muro_aliado m ON g.muro_id     = m.id
           JOIN entrenador ent ON g.entrenador_id = ent.id
           WHERE i.escalador_id = $1
           ORDER BY i.fecha_inscripcion DESC`,
          [row.esc_id]
        );
        const pagosRes = await db(
          `SELECT pa.id, pa.inscripcion_id, pa.monto, pa.fecha_pago,
                  pa.fecha_vencimiento, pa.metodo, pa.estado, pa.referencia
           FROM pago pa
           JOIN inscripcion i ON pa.inscripcion_id = i.id
           WHERE i.escalador_id = $1
           ORDER BY pa.created_at DESC`,
          [row.esc_id]
        );
        const pagosByInsc = {};
        for (const p of pagosRes.rows) {
          if (!pagosByInsc[p.inscripcion_id]) pagosByInsc[p.inscripcion_id] = [];
          pagosByInsc[p.inscripcion_id].push({
            id: p.id,
            monto: parseFloat(p.monto),
            fechaPago: p.fecha_pago,
            fechaVencimiento: p.fecha_vencimiento,
            metodo: p.metodo,
            estado: p.estado,
            referencia: p.referencia,
          });
        }
        const inscripciones = inscRes.rows.map((r) => ({
          id: r.id,
          estado: r.estado,
          fechaInscripcion: r.fecha_inscripcion,
          precioCiclo: parseFloat(r.precio_ciclo),
          descuentoAplicado: r.descuento_aplicado,
          pagos: pagosByInsc[r.id] || [],
          cohorte: {
            id: r.grupo_id,
            modalidad: r.modalidad,
            horario: r.horario,
            estado: r.grupo_estado,
            cupoMaximo: r.cupo_maximo,
            inscritosActual: r.inscritos_actual,
            programa: {
              id: r.prog_id,
              nombre: r.prog_nombre,
              nivel: r.nivel,
              descripcion: r.prog_desc,
              incluyeFisio: r.incluye_fisio,
              incluyeNutricion: r.incluye_nutricion,
            },
            ciclo: {
              id: r.ciclo_id,
              codigo: r.ciclo_codigo,
              fechaInicio: r.fecha_inicio,
              fechaFin: r.fecha_fin,
              semanaEmpalme: r.semana_empalme,
            },
            muro: { id: r.muro_id, nombre: r.muro_nombre, direccion: r.muro_dir },
            entrenador: { id: r.entrenador_id, nombre: r.entrenador_nombre },
          },
        }));

        perfil.escalador = {
          id: row.esc_id,
          nombre: row.nombre,
          apellido: row.apellido,
          rangoEtario: row.rango_etario,
          estado: row.esc_estado,
          telefono: row.telefono,
          contactoEmergencia: row.contacto_emergencia,
          createdAt: row.esc_created,
          inscripciones,
        };
      }

      if (row.ent_id) {
        perfil.entrenador = {
          id: row.ent_id,
          nombre: row.ent_nombre,
          licenciaLey181: row.licencia_ley181,
          maxGrupos: row.max_grupos,
        };
      }

      res.json(perfil);
    } catch (err) {
      console.error("Error en /me:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

module.exports = router;
