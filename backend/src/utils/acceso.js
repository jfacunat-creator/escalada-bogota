const prisma = require("../config/prisma");

// ¿Puede el usuario ver los datos de entrenamiento de este escalador?
// escalador → el propio · entrenador → escaladores con inscripción activa en sus grupos · admin → todos
async function puedeVerEscalador(user, escaladorId) {
  if (user.rol === "admin") return true;
  if (user.rol === "escalador") return user.escalador?.id === escaladorId;
  if (user.rol === "entrenador" && user.entrenador?.id) {
    const r = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
       WHERE i.escalador_id = $1::uuid AND g.entrenador_id = $2::uuid AND i.estado = 'activa' LIMIT 1`,
      escaladorId, user.entrenador.id
    );
    return r.length > 0;
  }
  return false;
}

module.exports = { puedeVerEscalador };
