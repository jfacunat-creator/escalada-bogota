/**
 * Carga en la BD el material bibliográfico que consulta la AI:
 *   - fuente_fragmento: secciones de los libros (según src/fuentes/mapa-temas.json)
 *   - fuente_guia:      guías completas T1–T4 × nivel
 *
 * El texto NO vive en el repo (derechos de autor). Se lee de FUENTES_DIR, que debe contener:
 *   libros/horst_paginas.json, libros/obrado_paginas.json  (array de páginas, extraídas del PDF)
 *   guias/T{1-4}_{Iniciacion|Intermedio|Avanzado}_Guia_Completa.md
 *
 * Uso: FUENTES_DIR=/ruta/a/Fuentes_AI npm run fuentes:cargar
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");
const { claveFragmento } = require("../src/utils/ajustesAI");

const DIR = process.env.FUENTES_DIR;
if (!DIR) {
  console.error("Falta FUENTES_DIR (carpeta con libros/ y guias/).");
  process.exit(1);
}
const mapa = require("../src/fuentes/mapa-temas.json");

const limpiar = t => t.replace(/-\n(\w)/g, "$1").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

async function main() {
  const libros = {};
  for (const k of Object.keys(mapa.libros)) {
    libros[k] = JSON.parse(fs.readFileSync(path.join(DIR, "libros", `${k}_paginas.json`), "utf8"));
  }

  const fuentes = [...mapa.siempre, ...Object.values(mapa.temas).flatMap(t => t.fuentes)];
  const vistos = new Set();
  for (const f of fuentes) {
    const clave = claveFragmento(f);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const [a, b] = f.paginas;
    const paginas = libros[f.libro];
    if (!paginas || b > paginas.length) throw new Error(`Páginas fuera de rango en ${clave}`);
    const texto = [];
    for (let p = a; p <= b; p++) texto.push(`[p.${p}] ${limpiar(paginas[p - 1] || "")}`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO fuente_fragmento (clave, libro, seccion, pag_ini, pag_fin, texto, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (clave) DO UPDATE SET libro = EXCLUDED.libro, seccion = EXCLUDED.seccion,
         pag_ini = EXCLUDED.pag_ini, pag_fin = EXCLUDED.pag_fin, texto = EXCLUDED.texto, updated_at = now()`,
      clave, f.libro, f.seccion, a, b, texto.join("\n")
    );
  }
  console.log(`fuente_fragmento: ${vistos.size} secciones`);

  const RE_GUIA = /^(T[1-4])_(Iniciacion|Intermedio|Avanzado)_Guia_Completa\.md$/i;
  let guias = 0;
  for (const archivo of fs.readdirSync(path.join(DIR, "guias"))) {
    const m = archivo.match(RE_GUIA);
    if (!m) continue;
    const texto = fs.readFileSync(path.join(DIR, "guias", archivo), "utf8");
    await prisma.$executeRawUnsafe(
      `INSERT INTO fuente_guia (trimestre, nivel, texto, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (trimestre, nivel) DO UPDATE SET texto = EXCLUDED.texto, updated_at = now()`,
      m[1].toUpperCase(), m[2].toLowerCase(), texto
    );
    guias++;
  }
  console.log(`fuente_guia: ${guias} guías`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.message); process.exit(1); });
