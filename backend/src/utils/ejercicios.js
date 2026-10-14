// Catálogo de ejercicios con video guía.
//
// El plan (plan_contenido) no tiene ids de ejercicio: cada sesión trae bloques con nombre libre
// ("Bloque 1 · Suspensiones máximas", "Antagonistas reforzados"…). Cada ejercicio del catálogo
// declara frases que, si aparecen en el nombre del bloque, lo identifican. Gana el PRIMERO de la
// lista que coincida, así que los más específicos van antes (p. ej. "suspensiones de mantenimiento"
// antes que "suspension"). Los de movilidad no tienen frases: los usa la rutina de movilidad de Mi Plan
// por su id (mov_<id>).
//
// Los videos viven en la tabla ejercicio_video (clave → enlace). Ver prisma/sql/2026-10-14_videos_ejercicios.sql
// y scripts/cargar-videos-ejercicios.js.

const E = (clave, nombre, categoria, frases = []) => ({ clave, nombre, categoria, frases });

const CATALOGO = [
  // Tests (protocolos de medición)
  E("test_traccion_lastre", "Test · Tracción máxima con lastre", "Tests", ["t2 — traccion maxima"]),
  E("test_suspension_lastre", "Test · Suspensión 5 s con lastre", "Tests", ["t4 — suspension"]),
  E("test_dominadas", "Test · Máximo de dominadas", "Tests", ["t5 — maximo dominadas", "test t5"]),
  E("test_suspension_sin_lastre", "Test · Suspensión máxima sin lastre", "Tests", ["t6 — suspension", "test t6"]),
  E("test_campus", "Test · Campus máximo de movimientos", "Tests", ["t7 — campus"]),
  E("test_abdominales", "Test · Abdominales en suspensión", "Tests", ["t9 — abdominales"]),
  E("test_rubrica_horst", "Test · Rúbrica técnica de Hörst", "Tests", ["rubrica"]),

  // Fuerza de dedos
  E("suspension_mantenimiento", "Suspensiones de mantenimiento", "Fuerza de dedos",
    ["suspensiones de mantenimiento", "suspensiones mantenimiento", "activacion de dedos", "suspensiones reducidas", "suspensiones de activacion"]),
  E("suspension_intermitente", "Suspensiones intermitentes", "Fuerza de dedos", ["suspensiones intermitentes"]),
  E("suspension_maxima", "Suspensiones máximas", "Fuerza de dedos", ["suspension"]),
  E("isometrico", "Isométrico máximo", "Fuerza de dedos", ["isometrico"]),
  E("intermitente", "Intermitente en presas", "Fuerza de dedos", ["intermitente"]),

  // Tracción
  E("traccion_lastre", "Tracción con lastre", "Tracción", ["traccion con lastre", "traccion maxima con lastre"]),
  E("excentrico", "Excéntrico de tracción", "Tracción", ["excentrico"]),
  E("bloqueo_asistido", "Bloqueos a 1 brazo asistidos", "Tracción", ["bloqueos 1 brazo", "bloqueo asistido"]),
  E("bloqueo_dinamico", "Bloqueos dinámicos", "Tracción", ["bloqueos dinamicos"]),
  E("contrastes", "Contrastes de tracción", "Tracción", ["contrastes"]),
  E("traccion_explosiva", "Tracciones explosivas", "Tracción", ["tracciones explosivas", "explosivas"]),
  E("densidad_tracciones", "Densidad de tracciones", "Tracción", ["densidad de tracciones", "densidad tracciones", "tracciones en densidad", "densidad"]),
  E("tracciones", "Tracciones", "Tracción", ["tracciones"]),

  // Potencia
  E("campus", "Campus board", "Potencia", ["campus", "powerslab"]),
  E("fuerza_contacto", "Fuerza de contacto en muro", "Potencia", ["fuerza de contacto"]),
  E("lanzamientos", "Lanzamientos y dinámicos", "Potencia", ["lanzamiento", "dinamico"]),

  // Compensación
  E("antagonistas", "Antagonistas", "Compensación", ["antagonista", "press neutro", "remo invertido"]),
  E("core", "Core", "Compensación", ["core", "abdominales", "elevaciones de piernas"]),
  E("fisica_general", "Física general", "Compensación", ["fisica general", "fisica de mantenimiento"]),
  E("foam_rolling", "Foam rolling de antebrazos", "Compensación", ["foam rolling"]),
  E("calentamiento", "Calentamiento", "Compensación", ["calentamiento"]),
  E("estiramientos", "Movilidad y estiramientos largos", "Compensación", ["movilidad", "estiramientos"]),

  // Resistencia
  E("circuito_estandar", "Circuito estándar", "Resistencia", ["circuito estandar"]),
  E("circuito_general", "Circuito general (peso corporal)", "Resistencia", ["circuito general", "circuito fr"]),
  E("circuitos", "Circuitos en muro", "Resistencia", ["circuito"]),
  E("continuidad", "Continuidad", "Resistencia", ["continuidad", "travesia", "capilarizacion"]),

  // Boulder
  E("boulder_coordinacion", "Boulder de coordinación", "Boulder", ["boulder coordinacion"]),
  E("boulder_intensidad", "Boulder de intensidad (85–100%)", "Boulder",
    ["boulder al limite", "boulder 85", "boulder al 85", "boulder al 9", "boulder fisico", "bloque al limite", "bloque al maximo", "bloque al 85", "bloque al 9", "bloque fino"]),

  // Técnica
  E("caida_primero", "Caída en primero", "Técnica", ["caida en primero", "caida voluntaria", "ultima cinta"]),
  E("caida_controlada", "Caída controlada", "Técnica", ["caida"]),
  E("pies_silenciosos", "Pies silenciosos", "Técnica", ["pies silenciosos"]),
  E("agarres_basicos", "Los 3 agarres básicos", "Técnica", ["agarres basicos", "reconocimiento de agarres"]),
  E("flag", "Flag lateral", "Técnica", ["flag"]),
  E("cambio_pie", "Cambio de pie", "Técnica", ["cambio de pie"]),
  E("talonaje", "Talonaje y empotres de pie", "Técnica", ["talonaje"]),
  E("lolotte", "Lolotte (rodilla adentro)", "Técnica", ["lolotte"]),
  E("placa", "Técnica en placa", "Técnica", ["placa"]),
  E("desplome", "Técnica en desplome", "Técnica", ["desplome"]),
  E("diedro", "Técnica en diedro", "Técnica", ["diedro"]),
  E("lectura", "Lectura de vías (4 pasos)", "Técnica", ["lectura"]),
  E("a_vista", "Escalada a vista", "Técnica", ["a vista"]),
  E("memorizacion", "Memorización de vías", "Técnica", ["memorizacion"]),
  E("reposos_activos", "Reposos activos", "Técnica", ["reposo"]),
  E("ritmo", "Ritmo de escalada", "Técnica", ["ritmo"]),
  E("economia", "Economía de movimiento", "Técnica", ["economia", "brazos extendidos"]),
  E("betas", "Betas múltiples", "Técnica", ["beta"]),
  E("tecnica_filmada", "Técnica filmada y análisis de video", "Técnica", ["filmada", "analisis de video"]),
  E("tactica_watts", "Táctica de intentos (Watts)", "Técnica", ["watts"]),
  E("visualizacion", "Visualización", "Técnica", ["visualizacion"]),
  E("escalada_suave", "Escalada suave / regenerativa", "Técnica", ["escalada suave", "escalada placentera", "regenerativo", "tecnica suave"]),

  // Rutina de movilidad de Mi Plan (por id, sin frases)
  E("mov_wgs", "World's Greatest Stretch", "Movilidad"),
  E("mov_frog", "Frog Pose", "Movilidad"),
  E("mov_disloc", "Dislocaciones de hombro", "Movilidad"),
  E("mov_rotex", "Rotaciones externas de hombro", "Movilidad"),
  E("mov_jeff", "Jefferson Curl", "Movilidad"),
  E("mov_cossack", "Cossack Squat", "Movilidad"),
  E("mov_pect", "Liberación pectoral menor", "Movilidad"),
  E("mov_muneca", "Flexores de antebrazo y muñeca", "Movilidad"),
];

const POR_CLAVE = new Map(CATALOGO.map(e => [e.clave, e]));

const normalizar = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Nombre de bloque → ejercicio del catálogo (o null).
function ejercicioDeBloque(nombre) {
  const n = normalizar(nombre);
  if (!n) return null;
  return CATALOGO.find(e => e.frases.some(f => n.includes(f))) || null;
}

// Enlace de video → { plataforma, videoId } o null si no es válido.
// Recomendado: YouTube «No listado». También: Vimeo, Google Drive o un archivo MP4/WebM directo (https).
function parsearVideo(url) {
  let u;
  try { u = new URL(String(url || "").trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host === "youtu.be") return idValido(u.pathname.slice(1).split("/")[0], "youtube");
  if (["youtube.com", "youtube-nocookie.com"].includes(host)) {
    if (u.searchParams.get("v")) return idValido(u.searchParams.get("v"), "youtube");
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
    return m ? idValido(m[2], "youtube") : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,})(?:\/([0-9a-f]+))?/);
    // Videos no listados de Vimeo llevan un hash: vimeo.com/123456/abcd → "123456:abcd"
    return m ? { plataforma: "vimeo", videoId: m[2] ? `${m[1]}:${m[2]}` : m[1] } : null;
  }
  if (host === "drive.google.com") {
    const m = u.pathname.match(/\/file\/d\/([\w-]{10,})/) || (u.searchParams.get("id") ? [null, u.searchParams.get("id")] : null);
    return m ? { plataforma: "drive", videoId: m[1] } : null;
  }
  if (/\.(mp4|webm|m4v|mov)$/i.test(u.pathname)) return { plataforma: "archivo", videoId: u.href };
  return null;
}

function idValido(id, plataforma) {
  return /^[\w-]{6,20}$/.test(id || "") ? { plataforma, videoId: id } : null;
}

module.exports = { CATALOGO, POR_CLAVE, normalizar, ejercicioDeBloque, parsearVideo };

// Videos cargados: Map clave → { plataforma, videoId }. Tabla pequeña (un registro por ejercicio).
async function videosPorClave(db) {
  const rows = await db.$queryRawUnsafe("SELECT clave, plataforma, video_id FROM ejercicio_video").catch(() => []);
  return new Map(rows.map(r => [r.clave, { plataforma: r.plataforma, videoId: r.video_id }]));
}

// Adjunta { clave, nombre, video } a cada bloque reconocido de una semana del plan.
function conEjercicios(w, videos) {
  return {
    ...w,
    sesiones: (w.sesiones || []).map(s => ({
      ...s,
      blocks: (s.blocks || []).map(b => {
        const ref = e => {
          if (!e) return undefined;
          const video = videos.get(e.clave);
          return { clave: e.clave, nombre: e.nombre, ...(video ? { video } : {}) };
        };
        const ejercicio = ref(ejercicioDeBloque(b.n));
        // Si el escalador no es apto para campus, el frontend sustituye el bloque (ficha.noApto): su video también.
        const ejercicioNoApto = b.ficha?.noApto ? ref(ejercicioDeBloque(b.ficha.noApto.n)) : undefined;
        return ejercicio || ejercicioNoApto ? { ...b, ejercicio, ejercicioNoApto } : b;
      }),
    })),
  };
}

module.exports.videosPorClave = videosPorClave;
module.exports.conEjercicios = conEjercicios;
