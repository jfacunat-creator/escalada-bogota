/**
 * frontend/src/plan/lectura.js
 * Hace que la dosis de cada bloque se lea sin ambigüedad: "2 series × 30 movimientos seguidos ·
 * 5 min de descanso entre series", con etiquetas que dicen explícitamente qué va por serie.
 *
 * Solo cambia cómo se MUESTRA el bloque: los datos (plan_contenido) conservan sus etiquetas
 * originales porque los ajustes AI aprobados se aplican buscando la etiqueta exacta.
 */

const RE_SERIES = /^series$/i;
const RE_MOV = /^(movimientos|mov\/serie|movimientos por serie|movimientos del circuito)$/i;
const RE_REPS = /^(reps?|reps?\/serie|reps? por serie|repeticiones|repeticiones por serie)$/i;
const RE_TIEMPO = /^(tiempo|tiempo\/serie|tiempo por serie|tiempo de trabajo|tiempo\/reps|reps\/tiempo|duración|duración por serie|tiempo por problema)$/i;
const RE_OTRO_POR_SERIE = /^(.+?) por serie$/i;   // "Lanzamientos por serie", "Caídas por serie"…
const RE_CIRCUITO = /^circuito$/i;
const RE_DESCANSO = /^(descanso|descanso entre series)$/i;

const ETIQUETAS = [
  [RE_MOV, 'Movimientos por serie'],
  [RE_REPS, 'Repeticiones por serie'],
  [/^(tiempo|tiempo\/serie|tiempo por serie)$/i, 'Tiempo por serie'],
  [/^(duración|duración por serie)$/i, 'Duración por serie'],
  [/^descanso$/i, 'Descanso entre series'],
];

// Quita aclaraciones entre paréntesis ("2 (menos que en S4)" → "2"), salvo que el número esté dentro: "(máx − 2) reps"
const sinParentesis = v => {
  const limpio = String(v).replace(/\s*\([^)]*\)/g, '').trim();
  return /\d/.test(limpio) || !/\d/.test(String(v)) ? limpio : String(v).trim();
};
const esNumero = v => /^\d+(?:[,.]\d+)?(?:\s*[–-]\s*\d+(?:[,.]\d+)?)?$/.test(v);

// "2 (menos de la mitad de S4)" → "2" · "3 · −20% (antes 4)" → "3" · "2 por brazo · 4 totales" → igual
// Devuelve { texto, dosisCompleta }: dosisCompleta = el valor ya dice cuánto se hace ("3 × 15 rep", "6 caídas").
function cantidadSeries(v) {
  const corto = sinParentesis(v).split(' · ')[0].trim();
  const m = corto.match(/^(\d+(?:\s*[–-]\s*\d+)?)\s*(.*)$/);
  if (!m) return null;
  const [, n, resto] = m;
  const palabra = n === '1' ? 'serie' : 'series';
  if (!resto || /^[—–-]/.test(resto)) return { texto: `${n} ${palabra}` };   // "10 — MÁXIMO del bloque"
  if (/^serie/i.test(resto)) return { texto: corto, dosisCompleta: /máxim/i.test(resto) };   // test: "1 serie máxima"
  if (/^×/.test(resto)) return { texto: `${n} ${palabra} ${resto}`, dosisCompleta: true };
  if (/^(por|única|únicas)\b/i.test(resto)) return { texto: `${n} ${palabra} ${resto}` };
  return { texto: corto, dosisCompleta: true };   // "6 caídas — desde 1 m…"
}

function porSerie(params) {
  const mov = params.find(([k]) => RE_MOV.test(k));
  if (mov) {
    const v = sinParentesis(mov[1]);
    return { texto: esNumero(v) ? `${v} movimientos seguidos` : v, continua: true, cantidad: v };
  }
  const reps = params.find(([k]) => RE_REPS.test(k));
  if (reps) {
    const v = sinParentesis(reps[1]) || String(reps[1]);
    return { texto: esNumero(v) ? `${v} repeticiones` : v };
  }
  const tiempo = params.find(([k]) => RE_TIEMPO.test(k));
  if (tiempo) return { texto: sinParentesis(tiempo[1]) || String(tiempo[1]) };
  const otro = params.find(([k]) => RE_OTRO_POR_SERIE.test(k));
  if (otro) {
    const v = sinParentesis(otro[1]);
    return { texto: esNumero(v) ? `${v} ${otro[0].match(RE_OTRO_POR_SERIE)[1].toLowerCase()}` : v };
  }
  const circ = params.find(([k]) => RE_CIRCUITO.test(k));
  if (circ) return { texto: `1 pasada completa a ${String(circ[1]).replace(/^El /, 'el ')}`, continua: true, circuito: true };
  return null;
}

/**
 * Lectura de una lista de parámetros [[etiqueta, valor]].
 * @returns null si no hay series; si hay: { resumen, aclaracion, params (con etiquetas explícitas), completa }
 *   completa = false cuando hay series pero no dice cuánto se hace en cada una.
 */
export function leerDosis(params = []) {
  const series = params.find(([k]) => RE_SERIES.test(k));
  if (!series) return null;
  const nSeries = cantidadSeries(series[1]);
  const serie = nSeries?.dosisCompleta ? null : porSerie(params);
  const descanso = params.find(([k]) => RE_DESCANSO.test(k));

  const partes = [];
  const minuscula = t => (/^[A-ZÁÉÍÓÚ][a-záéíóúñ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
  if (nSeries) partes.push(serie ? `${nSeries.texto} × ${minuscula(serie.texto)}` : nSeries.texto);
  if (descanso) {
    const d = sinParentesis(descanso[1]) || String(descanso[1]);
    partes.push(/entre/i.test(d) ? `descanso ${d}` : `${d} de descanso entre series`);
  }

  return {
    resumen: nSeries ? partes.join(' · ') : null,
    aclaracion: serie?.continua
      ? serie.circuito
        ? 'Cada serie es una pasada continua al circuito, sin soltarte del muro. Descansas solo entre series.'
        : `Cada serie es una pasada continua${esNumero(serie.cantidad) ? ` de ${serie.cantidad} movimientos` : ''}, sin soltarte del muro. Descansas solo entre series.`
      : null,
    params: params.map(([k, v]) => {
      const nueva = ETIQUETAS.find(([re]) => re.test(k));
      return [nueva ? nueva[1] : k, v];
    }),
    completa: !!serie || !!nSeries?.dosisCompleta,
  };
}

// "Series: 2 · Reps: 10 ciclos · Descanso: 5 min" (filas de tablas de ejercicios) → resumen legible
export function leerFilaEjercicio(valor) {
  const trozos = String(valor).split(' · ').map(t => t.match(/^([^:]{1,30}):\s*(.+)$/));
  if (!trozos.length || trozos.some(t => !t)) return null;
  const params = trozos.map(t => [t[1].trim(), t[2].trim()]);
  const dosis = leerDosis(params);
  if (!dosis?.resumen) return null;
  // Si la dosis no se pudo armar completa, se deja el valor original para no perder información
  if (!dosis.completa) return null;
  const resto = params.filter(([k]) => ![RE_SERIES, RE_MOV, RE_REPS, RE_TIEMPO, RE_DESCANSO, RE_OTRO_POR_SERIE].some(re => re.test(k)));
  return [dosis.resumen, ...resto.map(([k, v]) => `${k}: ${v}`)].join(' · ');
}

/** Bloque listo para mostrar: resumen bajo el nombre, aclaración y etiquetas explícitas. */
export function leerBloque(b) {
  const params = (b.params || []).map(([k, v]) => {
    const fila = k && /series:/i.test(String(v)) ? leerFilaEjercicio(v) : null;
    return fila ? [k, fila] : [k, v];
  });
  const dosis = leerDosis(params);
  return {
    resumen: dosis?.resumen || null,
    aclaracion: dosis?.aclaracion || null,
    params: dosis ? dosis.params : params,
  };
}
