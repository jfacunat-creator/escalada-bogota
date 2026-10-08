const prisma = require("../config/prisma");

// Consentimiento informado de menores (Ley 1098/2006). Si el escalador tiene menos de 18 años al
// registrarse o inscribirse, su representante legal diligencia el formato en la app: datos del
// representante (tabla responsable) + consentimiento tipo 'menores' firmado escribiendo su nombre.
// Ver prisma/sql/2026-10-09_consentimiento_y_videos.sql

const MAYORIA_EDAD = 18;
const TIPOS_DOC = ["CC", "CE", "PA"];
const PARENTESCOS = ["Madre", "Padre", "Tutor legal", "Otro"];

function edadDe(fechaNacimiento, hoy = new Date()) {
  const nac = new Date(fechaNacimiento);
  return hoy.getFullYear() - nac.getFullYear() -
    (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate()) ? 1 : 0);
}

const esMenor = fechaNacimiento => edadDe(fechaNacimiento) < MAYORIA_EDAD;

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Valida el formato enviado por el frontend. Devuelve { error } o { datos } normalizados.
function validarConsentimiento(c) {
  if (!c || typeof c !== "object") return { error: "Falta el consentimiento del representante legal" };
  const datos = {
    nombre: texto(c.representanteNombre, 200),
    tipoDoc: texto(c.tipoDocumento, 10),
    documento: texto(c.documento, 20),
    parentesco: texto(c.parentesco, 50),
    telefono: texto(c.telefono, 20),
    email: texto(c.email, 255) || null,
    firma: texto(c.firma, 200),
  };
  if (datos.nombre.length < 5) return { error: "Escribe el nombre completo del representante legal" };
  if (!TIPOS_DOC.includes(datos.tipoDoc)) return { error: "Tipo de documento del representante inválido" };
  if (!/^[A-Za-z0-9.-]{4,20}$/.test(datos.documento)) return { error: "Número de documento del representante inválido" };
  if (!PARENTESCOS.includes(datos.parentesco)) return { error: "Indica el parentesco del representante" };
  if (datos.telefono.replace(/\D/g, "").length < 7) return { error: "Teléfono del representante inválido" };
  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return { error: "Email del representante inválido" };
  if (c.aceptaProtocolo !== true) return { error: "El representante debe aceptar el consentimiento y el protocolo de menores" };
  // La firma es el nombre del representante escrito de nuevo: debe coincidir.
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  if (norm(datos.firma) !== norm(datos.nombre)) return { error: "La firma debe ser el nombre completo del representante, igual al escrito arriba" };
  return { datos };
}

// Guarda (o reemplaza) el representante y deja un único consentimiento de menores vigente.
async function guardarConsentimiento(tx, escaladorId, datos, ip) {
  const r = await tx.$queryRawUnsafe(
    `INSERT INTO responsable (escalador_id, nombre_completo, tipo_documento, cedula, telefono, parentesco, email)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (escalador_id) DO UPDATE SET
       nombre_completo = EXCLUDED.nombre_completo, tipo_documento = EXCLUDED.tipo_documento,
       cedula = EXCLUDED.cedula, telefono = EXCLUDED.telefono, parentesco = EXCLUDED.parentesco, email = EXCLUDED.email
     RETURNING id`,
    escaladorId, datos.nombre, datos.tipoDoc, datos.documento, datos.telefono, datos.parentesco, datos.email
  );
  await tx.$executeRawUnsafe(
    `UPDATE consentimiento SET vigente = false WHERE escalador_id = $1::uuid AND tipo = 'menores' AND vigente`,
    escaladorId
  );
  await tx.$executeRawUnsafe(
    `INSERT INTO consentimiento (escalador_id, responsable_id, tipo, fecha_firma, vigente, firma, firmado_at, ip, notas)
     VALUES ($1::uuid, $2::uuid, 'menores', CURRENT_DATE, true, $3, now(), $4, 'Formato digital diligenciado en la app')`,
    escaladorId, r[0].id, datos.firma, ip ? String(ip).slice(0, 64) : null
  );
}

// Consentimiento de menores vigente con los datos del representante (o null).
async function consentimientoVigente(escaladorId, db = prisma) {
  const r = await db.$queryRawUnsafe(
    `SELECT c.id, c.fecha_firma, c.firmado_at, c.firma, c.ip,
            r.nombre_completo, r.tipo_documento, r.cedula, r.telefono, r.parentesco, r.email
     FROM consentimiento c LEFT JOIN responsable r ON r.id = c.responsable_id
     WHERE c.escalador_id = $1::uuid AND c.tipo = 'menores' AND c.vigente
     ORDER BY c.created_at DESC LIMIT 1`,
    escaladorId
  );
  return r[0] || null;
}

module.exports = { MAYORIA_EDAD, edadDe, esMenor, validarConsentimiento, guardarConsentimiento, consentimientoVigente };
