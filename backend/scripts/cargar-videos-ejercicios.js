/**
 * Carga en lote los videos guía de los ejercicios (tabla ejercicio_video).
 *
 * Entrada: un CSV con dos columnas, `clave,url` (con o sin encabezado). Las claves están en
 * src/utils/ejercicios.js y en Admin → Ejercicios. Para generar la plantilla con todas las claves:
 *   node scripts/cargar-videos-ejercicios.js --plantilla > videos.csv
 *
 * Por defecto solo VALIDA y muestra lo que haría. Para escribir en la BD (DATABASE_URL de .env):
 *   node scripts/cargar-videos-ejercicios.js videos.csv --aplicar
 */
require("dotenv").config();
const fs = require("fs");
const { CATALOGO, POR_CLAVE, parsearVideo } = require("../src/utils/ejercicios");

const args = process.argv.slice(2);

if (args.includes("--plantilla")) {
  console.log("clave,url,nombre (referencia; se ignora)");
  for (const e of CATALOGO) console.log(`${e.clave},,"${e.categoria} · ${e.nombre}"`);
  process.exit(0);
}

const archivo = args.find(a => !a.startsWith("--"));
if (!archivo) {
  console.error("Uso: node scripts/cargar-videos-ejercicios.js videos.csv [--aplicar]  ·  --plantilla para generar el CSV");
  process.exit(1);
}

const filas = fs.readFileSync(archivo, "utf8").split(/\r?\n/)
  .map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")))
  .filter(([clave, url]) => clave && url && clave !== "clave");

const validas = [], errores = [];
for (const [clave, url] of filas) {
  if (!POR_CLAVE.has(clave)) { errores.push(`${clave}: clave desconocida`); continue; }
  const v = parsearVideo(url);
  if (!v) { errores.push(`${clave}: enlace no válido (${url})`); continue; }
  validas.push({ clave, url, ...v });
}

for (const v of validas) console.log(`✓ ${v.clave.padEnd(28)} ${v.plataforma.padEnd(8)} ${v.url}`);
for (const e of errores) console.log(`✗ ${e}`);
console.log(`\n${validas.length} válidos · ${errores.length} con error · ${CATALOGO.length - validas.length} ejercicios sin video en este archivo`);

if (!args.includes("--aplicar")) {
  console.log("Modo prueba: no se escribió nada. Agrega --aplicar para cargarlos.");
  process.exit(errores.length ? 1 : 0);
}

(async () => {
  const prisma = require("../src/config/prisma");
  for (const v of validas) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ejercicio_video (clave, url, plataforma, video_id, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (clave) DO UPDATE SET url = EXCLUDED.url, plataforma = EXCLUDED.plataforma,
         video_id = EXCLUDED.video_id, updated_at = now()`,
      v.clave, v.url, v.plataforma, v.videoId
    );
  }
  console.log(`Cargados ${validas.length} videos.`);
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
