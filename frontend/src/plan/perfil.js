/**
 * frontend/src/plan/perfil.js
 * Perfil del escalador + parámetros derivados para personalizar el plan.
 *
 * Persistencia: localStorage, clave plan_profile_{user.id}
 * (mismo mecanismo que los logs de sesión: plan_logs_{user.id}).
 */

// ─── ZONAS DE DOLOR ──────────────────────────────────────
// key del perfil ↔ etiqueta usada en los logs de sesión (p_<etiqueta>)
export const ZONAS = [
  { key: 'dedosD',  label: 'Dedos D',  grupo: 'dedos'   },
  { key: 'dedosI',  label: 'Dedos I',  grupo: 'dedos'   },
  { key: 'codoD',   label: 'Codo D',   grupo: 'codo'    },
  { key: 'codoI',   label: 'Codo I',   grupo: 'codo'    },
  { key: 'hombroD', label: 'Hombro D', grupo: 'hombro'  },
  { key: 'hombroI', label: 'Hombro I', grupo: 'hombro'  },
  { key: 'espalda', label: 'Espalda',  grupo: 'espalda' },
];

export const PERFIL_VACIO = {
  nombre: '', peso: '', edad: '', genero: '',
  t2: '', t4: '', t5: '', t6: '', t7: '', t9: '',
  powerslabD: '', powerslabI: '', circuito: '',
  gradoMaxVista: '', gradoMaxBloque: '', anosCampus: '',
  lesionesActivas: Object.fromEntries(ZONAS.map(z => [z.key, 0])),
};

// Campos mínimos para usar el plan personalizado
export const CAMPOS_REQUERIDOS = [
  ['peso', 'Peso'], ['edad', 'Edad'], ['t2', 'T2'], ['t4', 'T4'], ['gradoMaxVista', 'Grado máximo a vista'],
];

const storageKey = userId => `plan_profile_${userId}`;

export function cargarPerfil(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { ...PERFIL_VACIO, ...p, lesionesActivas: { ...PERFIL_VACIO.lesionesActivas, ...p.lesionesActivas } };
  } catch {
    return null;
  }
}

export function guardarPerfil(userId, perfil) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ ...perfil, actualizado: new Date().toISOString() }));
}

const vacio = v => v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v));

export function camposFaltantes(perfil) {
  if (!perfil) return CAMPOS_REQUERIDOS.map(([, l]) => l);
  return CAMPOS_REQUERIDOS.filter(([k]) => vacio(perfil[k])).map(([, l]) => l);
}

export const perfilCompleto = perfil => camposFaltantes(perfil).length === 0;

// Pre-llenado desde el registro del test S0 (sesión 1) si existe.
// Claves t_<metrica> definidas en PRUEBAS_TEST de PlanTrackerPage.
const METRICA_A_PERFIL = {
  barras_lastre_kg: 't2',
  suspensiones_20mm_kg: 't4',
  repeticiones_regleta_rep: 't5',
  resistencia_continua_seg: 't6',
  campus_movimientos: 't7',
  grado_critico_un: 't9',
  powerslab_d_cm: 'powerslabD',
  powerslab_i_cm: 'powerslabI',
  circuito_min: 'circuito',
};

export function perfilDesdeTestS0(logs) {
  const s0 = logs?.S0_1;
  if (!s0) return {};
  const out = {};
  for (const [metrica, campo] of Object.entries(METRICA_A_PERFIL)) {
    const v = s0[`t_${metrica}`];
    if (!vacio(v) && !isNaN(parseFloat(v))) out[campo] = parseFloat(v);
  }
  return out;
}

// ─── ESCALAS DE GRADO ────────────────────────────────────
export const ESCALA_VIA = [
  '4a', '4b', '4c', '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+', '9c',
];

export const ESCALA_BLOQUE = [
  '4', '4+', '5', '5+',
  '6A', '6A+', '6B', '6B+', '6C', '6C+',
  '7A', '7A+', '7B', '7B+', '7C', '7C+',
  '8A', '8A+', '8B', '8B+', '8C', '8C+',
  '9A',
];

function normalizarGrado(grado, escala) {
  const g = String(grado || '').trim().replace(/\s+/g, '');
  return escala === ESCALA_BLOQUE ? g.toUpperCase() : g.toLowerCase();
}

/**
 * Resta n grados en la escala indicada ('via' francesa o 'bloque' Fontainebleau).
 * Cada paso de la escala (incluido el "+") cuenta como 1 grado.
 * Devuelve null si el grado no es reconocible.
 */
export function restarGrados(grado, n, tipo = 'via') {
  const escala = tipo === 'bloque' ? ESCALA_BLOQUE : ESCALA_VIA;
  const idx = escala.indexOf(normalizarGrado(grado, escala));
  if (idx < 0) return null;
  return escala[Math.max(0, idx - n)];
}

export function gradoValido(grado, tipo = 'via') {
  return restarGrados(grado, 0, tipo) !== null;
}

// ─── CÁLCULOS ────────────────────────────────────────────
const num = v => (vacio(v) ? null : Number(v));
// Lastre redondeado a 0,5 kg (discos de 0,5/1,25/2,5 kg)
export const redondearCarga = kg => Math.round(kg * 2) / 2;
export const fmtKg = kg => `${String(redondearCarga(kg)).replace('.', ',')} kg`;
export const fmtRangoKg = (a, b) =>
  redondearCarga(a) === redondearCarga(b)
    ? fmtKg(a)
    : `${String(redondearCarga(a)).replace('.', ',')}–${fmtKg(b)}`;

/** Parámetros derivados del perfil. Devuelve null si no hay perfil. */
export function calcularParametros(perfil) {
  if (!perfil) return null;
  const t2 = num(perfil.t2);
  const edad = num(perfil.edad);
  const esMayor40 = edad !== null && edad >= 40;
  const les = perfil.lesionesActivas || {};
  const pctExc = esMayor40 ? [0.25, 0.30] : [0.50, 0.60];

  return {
    t2,
    t4: num(perfil.t4),
    circuito: num(perfil.circuito),
    lastreTraccion: t2 === null ? null : { min: redondearCarga(t2 * 0.80), max: redondearCarga(t2 * 0.85) },
    lastreExcentrico: t2 === null ? null : {
      min: redondearCarga(t2 * pctExc[0]),
      max: redondearCarga(t2 * pctExc[1]),
      pct: pctExc.map(p => Math.round(p * 100)),
    },

    gradoMaxVista: perfil.gradoMaxVista || null,
    gradoMaxBloque: perfil.gradoMaxBloque || null,
    gradoContinuidad: restarGrados(perfil.gradoMaxVista, 2),
    gradoBoulder85: restarGrados(perfil.gradoMaxBloque, 1, 'bloque'),
    gradoBoulder90: perfil.gradoMaxBloque ? normalizarGrado(perfil.gradoMaxBloque, ESCALA_BLOQUE) : null,
    gradoTecnica: restarGrados(perfil.gradoMaxVista, 3),
    gradoCapilarizacion: restarGrados(perfil.gradoMaxVista, 4),
    gradoRecuperacion: restarGrados(perfil.gradoMaxVista, 3),

    campusApto:
      (num(perfil.anosCampus) ?? 0) >= 3 &&
      (les.dedosD ?? 0) <= 2 && (les.dedosI ?? 0) <= 2 &&
      (les.codoD ?? 0) <= 2 && (les.codoI ?? 0) <= 2,

    protocoloMayor40: esMayor40,
  };
}
