/**
 * Verifica que el plan base (plan_contenido) esté completo, para que el escalador nunca vea
 * una sesión sin series, sin contenido o con un bloque vacío.
 *
 * Revisa los 12 planes (T1–T4 × 3 niveles):
 *   1. Sesiones sin bloques (salvo "No hay sesión" o una sesión libre con nota).
 *   2. Bloques sin ningún parámetro (en la app no se pueden abrir: solo se ve el nombre).
 *      Bloques con series que no dicen cuánto se hace en cada serie (movimientos, reps, tiempo…).
 *   3. Con FUENTES_DIR: cada valor de "Series" de la guía completa debe aparecer en la sesión
 *      correspondiente de la BD (tablas verticales "| Series | 4 |" y horizontales con columna Series).
 *
 * Uso:  FUENTES_DIR=/ruta/a/Fuentes_AI npm run plan:verificar
 * Sale con código 1 si encuentra problemas.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");

const NIVEL = { Iniciacion: "iniciacion", Intermedio: "intermedio", Avanzado: "avanzado" };
const norm = t => String(t)
  .replace(/[*_`]/g, "").replace(/[“”«»]/g, '"').replace(/[‘’´]/g, "'")
  .replace(/\s+/g, " ").trim().toLowerCase();
const celdas = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
const esSeparador = l => /^[\s|:-]+$/.test(l);

// Valores de "Series" de cada sesión de una guía: { "S5_1": ["2 (menos de la mitad de S4)", ...] }
function seriesDeLaGuia(texto) {
  const out = {};
  const partes = texto.split(/^## (S\d+) · SESI[ÓO]N (\d+).*$/m);
  for (let i = 1; i < partes.length; i += 3) {
    const cuerpo = partes[i + 2].split(/^#{1,2} (?!#)/m)[0];
    const valores = [];
    const lineas = cuerpo.split("\n");
    for (let k = 0; k < lineas.length; k++) {
      if (!lineas[k].trim().startsWith("|")) continue;
      const tabla = [];
      while (k < lineas.length && lineas[k].trim().startsWith("|")) {
        if (!esSeparador(lineas[k])) tabla.push(celdas(lineas[k]));
        k++;
      }
      const [cab, ...filas] = tabla;
      if (!cab) continue;
      const col = cab.findIndex(c => /^series$/i.test(norm(c)));
      if (col >= 0) filas.forEach(f => f[col] && valores.push(f[col]));
      else filas.forEach(f => /^series$/i.test(norm(f[0])) && f[1] && valores.push(f[1]));
    }
    if (valores.length) out[`${partes[i]}_${partes[i + 1]}`] = valores;
  }
  return out;
}

async function main() {
  // Misma lectura que usa la app para mostrar "N series × X por serie" (frontend/src/plan/lectura.js)
  const { leerDosis } = await import("../../frontend/src/plan/lectura.js");
  const planes = await prisma.$queryRawUnsafe(
    `SELECT trimestre, nivel, semanas FROM plan_contenido ORDER BY nivel, trimestre`
  );
  const problemas = [];

  for (const p of planes) {
    for (const w of p.semanas) {
      for (const s of w.sesiones || []) {
        const donde = `${p.trimestre} ${p.nivel} ${w.id} sesión ${s.num} (${s.name})`;
        const libre = /no hay sesi/i.test(s.name) || (!!s.note && /sin estructura|libre/i.test(s.name + s.note));
        if (!(s.blocks || []).length && !libre) problemas.push(`${donde}: sin bloques`);
        for (const b of s.blocks || []) {
          if (!(b.params || []).length) problemas.push(`${donde} · ${b.n}: bloque vacío`);
          const dosis = leerDosis(b.params || []);
          if (dosis && !dosis.completa) {
            problemas.push(`${donde} · ${b.n}: tiene series pero no dice cuánto se hace en cada una (movimientos, repeticiones, tiempo, ciclos o intentos por serie)`);
          }
        }
      }
    }
  }

  const DIR = process.env.FUENTES_DIR;
  if (DIR) {
    // T1 Avanzado se cargó a mano y se edita aparte (fichas): sus valores pueden diferir de la guía a propósito.
    for (const archivo of fs.readdirSync(path.join(DIR, "guias"))) {
      const m = archivo.match(/^(T[1-4])_(Iniciacion|Intermedio|Avanzado)_Guia_Completa\.md$/i);
      if (!m || (m[1] === "T1" && m[2] === "Avanzado")) continue;
      const plan = planes.find(p => p.trimestre === m[1] && p.nivel === NIVEL[m[2]]);
      if (!plan) { problemas.push(`${m[1]} ${NIVEL[m[2]]}: plan no está en la BD`); continue; }
      const guia = seriesDeLaGuia(fs.readFileSync(path.join(DIR, "guias", archivo), "utf8"));
      for (const [clave, valores] of Object.entries(guia)) {
        const [sem, num] = clave.split("_");
        const s = plan.semanas.find(w => w.id === sem)?.sesiones?.find(x => x.num === Number(num));
        if (!s) continue;
        const texto = norm((s.blocks || []).flatMap(b => [b.n, ...(b.params || []).flat()]).join(" | "));
        for (const v of valores) {
          if (!texto.includes(norm(v))) {
            problemas.push(`${plan.trimestre} ${plan.nivel} ${sem} sesión ${num}: falta "Series: ${v}" de la guía`);
          }
        }
      }
    }
  } else {
    console.log("(Sin FUENTES_DIR: no se compara contra las guías, solo se revisan sesiones y bloques vacíos.)");
  }

  if (problemas.length) {
    console.log(`✗ ${problemas.length} problema(s):`);
    problemas.forEach(x => console.log("  - " + x));
    process.exitCode = 1;
  } else {
    console.log(`✓ Plan completo: ${planes.length} planes revisados, sin sesiones ni bloques vacíos${DIR ? " y con todas las series de las guías" : ""}.`);
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => process.exit());
