const { randomUUID } = require("crypto");

const HORARIO_MAP = {
  lun_mie_18_20: { days: [1, 3], inicio: "18:00", fin: "20:00" },
  lun_mie_20_22: { days: [1, 3], inicio: "20:00", fin: "22:00" },
  mar_jue_18_20: { days: [2, 4], inicio: "18:00", fin: "20:00" },
  mar_jue_20_22: { days: [2, 4], inicio: "20:00", fin: "22:00" },
  sab_dom_7_9:   { days: [6, 0], inicio: "07:00", fin: "09:00" },
  sab_dom_9_11:  { days: [6, 0], inicio: "09:00", fin: "11:00" },
  sab_dom_11_13: { days: [6, 0], inicio: "11:00", fin: "13:00" },
};

const err = (status, message) => Object.assign(new Error(message), { status });

// Genera las sesiones del ciclo para el grupo según su horario (acompañado) o repartidas
// en el ciclo (autónomo). Falla si el grupo ya tiene sesiones.
async function generarSesiones(tx, grupoId) {
  const g = await tx.$queryRawUnsafe(
    `SELECT g.horario, ci.fecha_inicio, ci.fecha_fin, p.nivel::text AS nivel
     FROM grupo g JOIN ciclo ci ON g.ciclo_id = ci.id JOIN programa p ON g.programa_id = p.id
     WHERE g.id = $1`,
    grupoId
  );
  if (!g.length) throw err(404, "Grupo no encontrado");
  const existentes = await tx.$queryRawUnsafe("SELECT COUNT(*) AS n FROM sesion WHERE grupo_id = $1", grupoId);
  if (Number(existentes[0].n) > 0) throw err(409, "Este grupo ya tiene sesiones generadas");

  const { horario, fecha_inicio, fecha_fin, nivel } = g[0];
  const fechas = [];
  let horaInicio, horaFin;
  const cur = new Date(fecha_inicio);
  cur.setUTCHours(0, 0, 0, 0);
  const finDate = new Date(fecha_fin);

  if (horario) {
    const info = HORARIO_MAP[horario];
    if (!info) throw err(400, "Horario no reconocido: " + horario);
    horaInicio = info.inicio;
    horaFin = info.fin;
    while (cur <= finDate) {
      if (info.days.includes(cur.getUTCDay())) fechas.push(cur.toISOString().split("T")[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else {
    horaInicio = "08:00";
    horaFin = "20:00";
    const TARGET = 26;
    const totalDays = Math.floor((finDate - cur) / 86400000);
    const step = Math.max(1, Math.floor(totalDays / TARGET));
    while (cur <= finDate && fechas.length < TARGET) {
      fechas.push(cur.toISOString().split("T")[0]);
      cur.setUTCDate(cur.getUTCDate() + step);
    }
  }
  if (fechas.length === 0) throw err(400, "No hay fechas válidas para este horario en el rango del ciclo");

  const total = fechas.length;
  const getTipo = (i) => {
    if (i === 0 || i === total - 1) return "test";
    if (i === Math.floor(total * 0.6)) return "juego_cierre";
    if (nivel === "avanzado" && i === Math.floor(total * 0.3)) return "checkpoint_fest";
    return "regular";
  };

  const paramSets = [];
  const vals = [];
  fechas.forEach((fecha, i) => {
    const b = i * 7;
    paramSets.push(`($${b + 1}::uuid, $${b + 2}::uuid, $${b + 3}::date, $${b + 4}::time, $${b + 5}::time, $${b + 6}::int, $${b + 7}::"TipoSesion")`);
    vals.push(randomUUID(), grupoId, fecha, horaInicio, horaFin, i + 1, getTipo(i));
  });
  await tx.$executeRawUnsafe(
    `INSERT INTO sesion (id, grupo_id, fecha, hora_inicio, hora_fin, numero_sesion, tipo) VALUES ${paramSets.join(", ")}`,
    ...vals
  );
  return total;
}

// Borra las sesiones del grupo y su asistencia.
async function borrarSesiones(tx, grupoId) {
  await tx.$executeRawUnsafe(
    "DELETE FROM asistencia WHERE sesion_id IN (SELECT id FROM sesion WHERE grupo_id = $1)", grupoId
  );
  const r = await tx.$queryRawUnsafe("DELETE FROM sesion WHERE grupo_id = $1 RETURNING id", grupoId);
  return r.length;
}

async function tieneAsistencia(tx, grupoId) {
  const r = await tx.$queryRawUnsafe(
    "SELECT 1 FROM asistencia a JOIN sesion s ON s.id = a.sesion_id WHERE s.grupo_id = $1 LIMIT 1", grupoId
  );
  return r.length > 0;
}

module.exports = { HORARIO_MAP, generarSesiones, borrarSesiones, tieneAsistencia };
