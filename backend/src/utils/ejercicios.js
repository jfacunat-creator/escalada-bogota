// Catálogo de ejercicios con video guía.
//
// 1. Ejercicios del plan de grabación (plan/ejerciciosT1.json, importado de T1_Avanzado_Plan_de_Grabacion_v2.xlsx):
//    61 ejercicios con código T1-CAT-NN, que es también la clave del video (T1-CAL-03 ↔ T1-CAL-03-*.mp4).
//    Cubren T1 Avanzado y gran parte de los demás mesociclos y niveles.
// 2. Ejercicios técnicos de otros niveles (clave en minúsculas) y la rutina de movilidad de Mi Plan (mov_<id>).
//
// El plan (plan_contenido) no tiene ids de ejercicio: cada sesión trae bloques con nombre libre. REGLAS asigna a
// un bloque uno o más ejercicios según frases de su nombre; gana la PRIMERA regla que coincida, así que las más
// específicas van antes. El calentamiento, la vuelta a la calma y los conceptos generales no son bloques: se
// muestran como rutinas (rutinas()).
//
// Los videos viven en la tabla ejercicio_video (clave → enlace). Ver prisma/sql/2026-10-14_videos_ejercicios.sql
// y scripts/cargar-videos-ejercicios.js.

const T1 = require("../plan/ejerciciosT1.json").ejercicios;

const CATEGORIA_T1 = {
  GEN: "Conceptos", CAL: "Calentamiento", VCA: "Vuelta a la calma", FUE: "Fuerza", CAM: "Campus",
  ANT: "Antagonistas", COR: "Core", ESC: "Escalada", REC: "Recuperación", TST: "Tests",
};
const faseDe = donde => Number((String(donde || "").match(/Fase (\d)/) || [])[1]) || null;

const E = (clave, nombre, categoria) => ({ clave, nombre, categoria });

const CATALOGO = [
  ...T1.map(e => ({
    clave: e.clave, nombre: e.nombre, categoria: CATEGORIA_T1[e.clave.split("-")[1]] || "Otros",
    dosis: e.dosis || null, donde: e.donde || null, fase: faseDe(e.donde),
  })),
  // Técnica y cualidades de otros niveles que no están en el plan de grabación de T1 Avanzado
  E("suspension_intermitente", "Suspensiones intermitentes", "Otros niveles"),
  E("isometrico", "Isométrico máximo", "Otros niveles"),
  E("intermitente", "Intermitente en presas", "Otros niveles"),
  E("contrastes", "Contrastes de tracción", "Otros niveles"),
  E("traccion_explosiva", "Tracciones explosivas", "Otros niveles"),
  E("densidad_tracciones", "Densidad de tracciones", "Otros niveles"),
  E("lanzamientos", "Lanzamientos y dinámicos", "Otros niveles"),
  E("fisica_general", "Física general", "Otros niveles"),
  E("circuito_general", "Circuito general (peso corporal)", "Otros niveles"),
  E("caida_primero", "Caída en primero", "Otros niveles"),
  E("caida_controlada", "Caída controlada", "Otros niveles"),
  E("pies_silenciosos", "Pies silenciosos", "Otros niveles"),
  E("agarres_basicos", "Los 3 agarres básicos", "Otros niveles"),
  E("flag", "Flag lateral", "Otros niveles"),
  E("cambio_pie", "Cambio de pie", "Otros niveles"),
  E("talonaje", "Talonaje y empotres de pie", "Otros niveles"),
  E("lolotte", "Lolotte (rodilla adentro)", "Otros niveles"),
  E("placa", "Técnica en placa", "Otros niveles"),
  E("desplome", "Técnica en desplome", "Otros niveles"),
  E("diedro", "Técnica en diedro", "Otros niveles"),
  E("lectura", "Lectura de vías (4 pasos)", "Otros niveles"),
  E("a_vista", "Escalada a vista", "Otros niveles"),
  E("memorizacion", "Memorización de vías", "Otros niveles"),
  E("reposos_activos", "Reposos activos", "Otros niveles"),
  E("ritmo", "Ritmo de escalada", "Otros niveles"),
  E("economia", "Economía de movimiento", "Otros niveles"),
  E("visualizacion", "Visualización del proyecto", "Otros niveles"),
  E("escalada_suave", "Escalada suave / regenerativa", "Otros niveles"),
  // Rutina de movilidad de Mi Plan (por id)
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
const rango = (pref, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${pref}-${String(a + i).padStart(2, "0")}`);
const R = (frases, claves) => ({ frases, claves });

// Bloque → ejercicios. Orden = prioridad (la primera que coincide gana).
const REGLAS = [
  // Tests
  R(["t2 — traccion maxima"], ["T1-TST-01"]),
  R(["t4 — suspension"], ["T1-TST-02"]),
  R(["t5 — maximo dominadas", "test t5"], ["T1-TST-03"]),
  R(["t6 — suspension", "test t6"], ["T1-TST-04"]),
  R(["t7 — campus"], ["T1-TST-05"]),
  R(["t9 — abdominales"], ["T1-TST-06"]),
  R(["powerslab"], ["T1-TST-07"]),
  R(["circuito estandar"], ["T1-TST-08"]),
  R(["rubrica"], ["T1-ESC-07"]),

  // Dedos
  R(["suspensiones de mantenimiento", "suspensiones mantenimiento", "activacion de dedos", "suspensiones reducidas", "suspensiones de activacion"], ["T1-FUE-02", "T1-GEN-03"]),
  R(["suspensiones intermitentes"], ["suspension_intermitente", "T1-GEN-02"]),
  R(["suspension"], ["T1-FUE-01", "T1-GEN-02", "T1-GEN-04"]),
  R(["isometrico"], ["isometrico"]),
  R(["intermitente"], ["intermitente"]),

  // Tracción
  R(["traccion con lastre", "traccion maxima con lastre"], ["T1-FUE-04", "T1-FUE-03"]),
  R(["excentrico"], ["T1-FUE-07", "T1-FUE-03"]),
  R(["bloqueos 1 brazo", "bloqueo asistido"], ["T1-FUE-05"]),
  R(["bloqueos dinamicos"], ["T1-FUE-06"]),
  R(["contrastes"], ["contrastes"]),
  R(["tracciones explosivas", "explosivas"], ["traccion_explosiva"]),
  R(["densidad"], ["densidad_tracciones", "T1-FUE-03"]),
  R(["tracciones", "mantenimiento de fuerza"], ["T1-FUE-03"]),

  // Campus y potencia
  R(["campus (aptos) o fuerza de contacto"], ["T1-CAM-02", "T1-CAM-04"]),
  R(["fuerza de contacto"], ["T1-CAM-04"]),
  R(["alcances + empujes", "alcances y empujes"], ["T1-CAM-02"]),
  R(["rebotes"], ["T1-CAM-03"]),
  R(["campus — alcances", "campus: alcances"], ["T1-CAM-01"]),
  R(["campus"], ["T1-CAM-02", "T1-CAM-01", "T1-CAM-03"]),
  R(["lanzamiento", "dinamico"], ["lanzamientos"]),

  // Compensación y recuperación
  R(["press neutro"], ["T1-ANT-04"]),
  R(["antagonista", "remo invertido"], ["T1-ANT-01", "T1-ANT-02", "T1-ANT-03"]),
  R(["elevaciones de piernas", "abdominales"], ["T1-COR-03"]),
  R(["core"], ["T1-COR-01", "T1-COR-03", "T1-COR-02"]),
  R(["fisica general", "fisica de mantenimiento"], ["fisica_general"]),
  R(["foam rolling"], ["T1-REC-01"]),
  R(["calentamiento"], rango("T1-CAL", 1, 10)),
  R(["movilidad", "estiramientos"], rango("T1-VCA", 1, 8)),

  // Escalada: resistencia
  R(["circuito general", "circuito fr"], ["circuito_general"]),
  R(["circuito"], ["T1-ESC-08"]),
  R(["capilarizacion", "travesia muy facil"], ["T1-ESC-02"]),
  R(["continuidad", "travesia"], ["T1-ESC-01"]),

  // Escalada: boulder, táctica y rendimiento
  R(["boulder coordinacion"], ["T1-ESC-04"]),
  R(["boulder fisico"], ["T1-ESC-05", "T1-ESC-03"]),
  R(["formato competencia", "lectura previa"], ["T1-ESC-09"]),
  R(["boulder al limite", "boulder 85", "boulder al 85", "boulder al 9", "bloque al limite", "bloque al maximo", "bloque al 85", "bloque al 9", "bloque fino"], ["T1-ESC-03"]),
  R(["watts"], ["T1-ESC-12"]),
  R(["simulacion", "simulacro", "trabajo por secciones", "secciones criticas"], ["T1-ESC-11"]),
  R(["trabajo tactico", "3 metodos", "beta"], ["T1-ESC-10"]),
  R(["punto debil", "tecnica fina", "tecnica suave"], ["T1-ESC-06"]),
  R(["filmada", "analisis de video"], ["T1-ESC-07"]),

  // Técnica (otros niveles)
  R(["caida en primero", "caida voluntaria", "ultima cinta"], ["caida_primero"]),
  R(["caida"], ["caida_controlada"]),
  R(["pies silenciosos"], ["pies_silenciosos"]),
  R(["agarres basicos", "reconocimiento de agarres"], ["agarres_basicos"]),
  R(["flag"], ["flag"]),
  R(["cambio de pie"], ["cambio_pie"]),
  R(["talonaje"], ["talonaje"]),
  R(["lolotte"], ["lolotte"]),
  R(["placa"], ["placa"]),
  R(["desplome"], ["desplome"]),
  R(["diedro"], ["diedro"]),
  R(["lectura"], ["lectura"]),
  R(["a vista"], ["a_vista"]),
  R(["memorizacion"], ["memorizacion"]),
  R(["reposo"], ["reposos_activos"]),
  R(["ritmo"], ["ritmo"]),
  R(["economia", "brazos extendidos"], ["economia"]),
  R(["visualizacion"], ["visualizacion"]),
  R(["escalada suave", "escalada placentera", "regenerativo"], ["escalada_suave"]),
];

const normalizar = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Nombre de bloque → claves de ejercicios (la principal primero), o [] si no se reconoce.
function ejerciciosDeBloque(nombre) {
  const n = normalizar(nombre);
  if (!n) return [];
  return REGLAS.find(r => r.frases.some(f => n.includes(f)))?.claves || [];
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

// Videos cargados: Map clave → { plataforma, videoId }. Tabla pequeña (un registro por ejercicio).
async function videosPorClave(db) {
  const rows = await db.$queryRawUnsafe("SELECT clave, plataforma, video_id FROM ejercicio_video").catch(() => []);
  return new Map(rows.map(r => [r.clave, { plataforma: r.plataforma, videoId: r.video_id }]));
}

// { clave, nombre, dosis?, fase?, video? } para el frontend.
function ref(clave, videos) {
  const e = POR_CLAVE.get(clave);
  if (!e) return null;
  const video = videos.get(clave);
  return { clave, nombre: e.nombre, ...(e.dosis ? { dosis: e.dosis } : {}), ...(e.fase ? { fase: e.fase } : {}), ...(video ? { video } : {}) };
}

// Adjunta `ejercicios` (lista) a cada bloque reconocido de una semana del plan.
function conEjercicios(w, videos) {
  const lista = nombre => ejerciciosDeBloque(nombre).map(c => ref(c, videos)).filter(Boolean);
  return {
    ...w,
    sesiones: (w.sesiones || []).map(s => ({
      ...s,
      blocks: (s.blocks || []).map(b => {
        const ejercicios = lista(b.n);
        // Si el escalador no es apto para campus, el frontend sustituye el bloque (ficha.noApto): sus videos también.
        const ejerciciosNoApto = b.ficha?.noApto ? lista(b.ficha.noApto.n) : [];
        return ejercicios.length || ejerciciosNoApto.length
          ? { ...b, ...(ejercicios.length ? { ejercicios } : {}), ...(ejerciciosNoApto.length ? { ejerciciosNoApto } : {}) }
          : b;
      }),
    })),
  };
}

// Rutinas que no son bloques del plan. En iniciación no se cuelga de la regleta (cero trabajo de dedos).
function rutinas(videos, nivel) {
  const de = (pref, filtro = () => true) => CATALOGO.filter(e => e.clave.startsWith(pref) && filtro(e)).map(e => ref(e.clave, videos));
  return {
    calentamiento: de("T1-CAL-", e => !(nivel === "iniciacion" && e.clave === "T1-CAL-09")),
    vueltaCalma: de("T1-VCA-"),
    conceptos: de("T1-GEN-", e => !(nivel === "iniciacion" && e.clave === "T1-GEN-04")),
  };
}

module.exports = { CATALOGO, POR_CLAVE, REGLAS, normalizar, ejerciciosDeBloque, parsearVideo, videosPorClave, conEjercicios, rutinas };
