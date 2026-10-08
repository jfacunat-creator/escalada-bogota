/**
 * frontend/src/plan/personalizar.js
 * Convierte una sesión del plan (JSON de plan_contenido) en una sesión
 * personalizada: fichas de ejecución + valores calculados desde el perfil.
 */
import { restarGrados, fmtRangoKg, fmtKg } from './perfil';

const RE_SALIDA_PCT = /\+(\d+)\s*[–-]\s*(\d+)%\s*vs\s*S0/i;
const RE_SALIDA_CIRC = /\+(\d+)%\s*(?:de\s*)?movimientos\s*vs\s*S0/i;

const RE_PCT_T2 = /(\d+)\s*(?:[–-]\s*(\d+))?\s*%\s*de\s*(?:tu\s*)?T2(?:\s*en\s*S0)?/i;
const RE_EJEMPLO = /\s*\(ej:[^)]*\)/i;
const RE_GRADOS = /(\d)(?:\s*[–-]\s*(\d))?\s*grados?\s*(?:bajo|por debajo de)\s*tu\s*máximo(\s*de\s*bloque|\s*a\s*vista)?/i;
const RE_MISMO_QUE = /Mismo que (S[67])/i;

const esExcentrico = b => /exc[eé]ntrico/i.test(b.n);
const esCampus = b => /campus/i.test(b.n);
const esBoulder = b => /boulder|bloque al|formato competencia/i.test(b.n);

function lastreDesdePct(valor, b, calc) {
  const m = valor.match(RE_PCT_T2);
  if (!m || calc.t2 === null) return null;
  const a = Number(m[1]);
  const z = Number(m[2] || m[1]);
  const resto = valor.replace(RE_EJEMPLO, '').replace(m[0], '').trim();

  if (esExcentrico(b) && calc.lastreExcentrico) {
    const { min, max, pct } = calc.lastreExcentrico;
    const nota = calc.protocoloMayor40 ? ' · mitad por tener 40 años o más' : '';
    return `${fmtRangoKg(min, max)} · ${pct[0]}–${pct[1]}% de tu T2 (${fmtKg(calc.t2)})${nota}${resto ? ` ${resto}` : ''}`;
  }
  const pctTxt = a === z ? `${a}%` : `${a}–${z}%`;
  return `${fmtRangoKg(calc.t2 * a / 100, calc.t2 * z / 100)} · ${pctTxt} de tu T2 (${fmtKg(calc.t2)})${resto ? ` ${resto}` : ''}`;
}

function gradoDesdeTexto(valor, calc) {
  const m = valor.match(RE_GRADOS);
  if (!m) return null;
  const tipo = /bloque/i.test(m[3] || '') ? 'bloque' : 'via';
  const max = tipo === 'bloque' ? calc.gradoMaxBloque : calc.gradoMaxVista;
  if (!max) return null;
  const n1 = Number(m[1]);
  const n2 = m[2] ? Number(m[2]) : null;
  // "4–5 grados bajo" → rango del más fácil (−5) al más difícil (−4)
  const g = n2
    ? `${restarGrados(max, Math.max(n1, n2), tipo)}–${restarGrados(max, Math.min(n1, n2), tipo)}`
    : restarGrados(max, n1, tipo);
  if (!g || g.includes('null')) return null;
  return valor.replace(m[0], `${g} (${m[0]}: ${max})`);
}

function gradoBoulderOrientativo(b, calc) {
  if (!calc.gradoMaxBloque) return null;
  const txt = [b.n, ...b.params.filter(([k]) => /intensidad/i.test(k)).map(([, v]) => v)].join(' ');
  if (/límite|competencia/i.test(txt)) return `${calc.gradoBoulder90} o más — tu máximo de bloque`;
  if (/85\s*[–-]\s*90%|90%/.test(txt)) return `${calc.gradoBoulder85}–${calc.gradoBoulder90}`;
  if (/85%/.test(txt)) return calc.gradoBoulder85;
  return null;
}

function personalizarParams(b, calc) {
  return b.params.map(([k, v]) => {
    let valor = String(v ?? '');
    if (/^lastre$/i.test(k)) {
      const kg = lastreDesdePct(valor, b, calc);
      if (kg) return [k, kg];
      const ref = valor.match(RE_MISMO_QUE);
      if (ref && esExcentrico(b) && calc.lastreExcentrico) {
        const { min, max } = calc.lastreExcentrico;
        return [k, `${valor} · Referencia ${ref[1] === 'S6' ? 'S6' : 'S6–S7'}: ${fmtRangoKg(min, max)}`];
      }
    }
    // Test de salida S12: objetivos concretos desde la línea base S0
    const base = /^T2/i.test(k) ? calc.t2 : /^T4/i.test(k) ? calc.t4 : /circuito/i.test(k) ? calc.circuito : null;
    const pct = valor.match(RE_SALIDA_PCT);
    if (base !== null && pct && /kg|^T[24]/i.test(k)) {
      return [k, `${valor} → ${fmtRangoKg(base * (1 + pct[1] / 100), base * (1 + pct[2] / 100))} (S0: ${fmtKg(base)})`];
    }
    const circ = valor.match(RE_SALIDA_CIRC);
    if (base !== null && circ) return [k, `${valor} → ≥ ${Math.ceil(base * (1 + circ[1] / 100))} mov (S0: ${base} mov)`];
    const conGrado = gradoDesdeTexto(valor, calc);
    if (conGrado) valor = conGrado;
    return [k, valor];
  });
}

/**
 * @param plan    { trimestre, nivel }
 * @param semana  'S0'…'S12'
 * @param sd      sesión del JSON ({ num, name, blocks: [{ n, i, params, ficha? }] }).
 *                La ficha de ejecución la adjunta el backend solo en las semanas del mes pagado.
 * @param calc    calcularParametros(perfil) o null
 * @returns       bloques con { ...b, params, ficha, avisos, oculto, motivoOculto }
 */
export function personalizarBloques(plan, semana, sd, calc) {
  return (sd.blocks || []).map(b0 => {
    let b = { ...b0, params: [...(b0.params || [])], avisos: [], ficha: null, oculto: false };
    let ficha = b0.ficha || null;

    // Campus según aptitud (≥3 años y dolor ≤2 en dedos/codos)
    if (calc && esCampus(b) && !calc.campusApto) {
      if (/opción a/i.test(b.n)) {
        return { ...b, oculto: true, motivoOculto: 'No cumples los criterios de campus de tu perfil (≥3 años de campus y dolor ≤2 en dedos y codos). Haz la Opción B.' };
      }
      if (ficha?.noApto) {
        b = { ...b, n: ficha.noApto.n, params: ficha.noApto.params, avisos: ['Sustituye al campus porque tu perfil no cumple los criterios (≥3 años de campus y dolor ≤2 en dedos y codos).'] };
        ficha = ficha.noApto.ficha;
      } else {
        b.avisos.push('Tu perfil no cumple los criterios de campus (≥3 años y dolor ≤2 en dedos y codos). Consulta a tu entrenador o sustituye por fuerza de contacto en muro.');
      }
    }
    if (calc && /opción b/i.test(b.n) && /contacto/i.test(b.n) && !calc.campusApto) {
      b.avisos.push('Opción asignada según tu perfil.');
    }

    if (ficha) {
      if (ficha.quitar?.length) b.params = b.params.filter(([k]) => !ficha.quitar.includes(k));
      if (ficha.extra?.length) b.params = [...b.params, ...ficha.extra];
      b.ficha = ficha;
    }

    if (calc) {
      b.params = personalizarParams(b, calc);
      if (esBoulder(b)) {
        const g = gradoBoulderOrientativo(b, calc);
        if (g) b.params = [...b.params, ['Grado orientativo', g]];
      }
    }
    return b;
  });
}
