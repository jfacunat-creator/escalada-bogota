// Borrado completo en orden de dependencias (hijos antes que padres). Sin esto los DELETE
// fallaban por llaves foráneas en cuanto el escalador/grupo tenía evaluaciones, remisiones, etc.
// Siempre dentro de una transacción.

async function borrarGrupo(tx, grupoId) {
  await tx.$executeRawUnsafe(
    `UPDATE remision SET evaluacion_id = NULL WHERE evaluacion_id IN (SELECT id FROM evaluacion WHERE grupo_id = $1)`, grupoId);
  await tx.$executeRawUnsafe(
    `DELETE FROM resultado_test WHERE evaluacion_id IN (SELECT id FROM evaluacion WHERE grupo_id = $1)`, grupoId);
  await tx.$executeRawUnsafe(`DELETE FROM evaluacion WHERE grupo_id = $1`, grupoId);
  await tx.$executeRawUnsafe(`DELETE FROM puntos_liga WHERE grupo_id = $1`, grupoId);
  await tx.$executeRawUnsafe(
    `DELETE FROM asistencia WHERE sesion_id IN (SELECT id FROM sesion WHERE grupo_id = $1)`, grupoId);
  await tx.$executeRawUnsafe(`DELETE FROM sesion WHERE grupo_id = $1`, grupoId);
  await tx.$executeRawUnsafe(
    `DELETE FROM pago WHERE inscripcion_id IN (SELECT id FROM inscripcion WHERE grupo_id = $1)`, grupoId);
  await tx.$executeRawUnsafe(`DELETE FROM inscripcion WHERE grupo_id = $1`, grupoId);
  await tx.$executeRawUnsafe(`DELETE FROM grupo WHERE id = $1`, grupoId);
}

// Devuelve los grupos donde el escalador tenía inscripción (para recontar cupos).
async function borrarEscalador(tx, escaladorId) {
  const usuario = await tx.$queryRawUnsafe(`SELECT usuario_id FROM escalador WHERE id = $1`, escaladorId);
  if (!usuario.length) return null;
  const grupos = await tx.$queryRawUnsafe(
    `SELECT DISTINCT grupo_id FROM inscripcion WHERE escalador_id = $1`, escaladorId);

  await tx.$executeRawUnsafe(`DELETE FROM asistencia WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM remision WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(
    `DELETE FROM resultado_test WHERE evaluacion_id IN (SELECT id FROM evaluacion WHERE escalador_id = $1)`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM evaluacion WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM puntos_liga WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM progreso_contenido WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM consentimiento WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM responsable WHERE escalador_id = $1`, escaladorId);
  await tx.$executeRawUnsafe(
    `DELETE FROM pago WHERE inscripcion_id IN (SELECT id FROM inscripcion WHERE escalador_id = $1)`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM inscripcion WHERE escalador_id = $1`, escaladorId);
  // registro_sesion, perfil_entrenamiento y plan_ai_* se borran en cascada.
  await tx.$executeRawUnsafe(`DELETE FROM escalador WHERE id = $1`, escaladorId);
  await tx.$executeRawUnsafe(`DELETE FROM usuario WHERE id = $1`, usuario[0].usuario_id);
  return grupos.map(g => g.grupo_id);
}

module.exports = { borrarGrupo, borrarEscalador };
