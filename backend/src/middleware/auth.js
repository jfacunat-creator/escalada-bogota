const jwt = require("jsonwebtoken");
const { query: db } = require("../config/database");

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db(
      `SELECT u.id, u.email, u.rol, u.activo,
              e.id as esc_id, t.id as ent_id
       FROM usuario u
       LEFT JOIN escalador e ON e.usuario_id = u.id
       LEFT JOIN entrenador t ON t.usuario_id = u.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: "Usuario no encontrado o inactivo" });
    }

    const row = result.rows[0];
    req.user = {
      id: row.id, email: row.email, rol: row.rol,
      escalador: row.esc_id ? { id: row.esc_id } : null,
      entrenador: row.ent_id ? { id: row.ent_id } : null,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "No autenticado" });
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ error: "No tienes permisos para esta acción" });
  }
  next();
};

module.exports = { authenticate, authorize };
