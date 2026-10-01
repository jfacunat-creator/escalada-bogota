/**
 * frontend/src/plan/progresion.js
 * Datos para el dashboard de progresión, objetivos del test de salida (S12)
 * y exportación del trimestre.
 */
import { ZONAS, fmtKg, fmtRangoKg } from './perfil';
import { ordenSesiones, parsePse, esSobrecarga } from './adaptacion';

// ─── DASHBOARD ───────────────────────────────────────────
export function seriePse(semanas, logs) {
  return ordenSesiones(semanas)
    .filter(o => logs[o.key]?.pse !== undefined && logs[o.key]?.pse !== '')
    .map(o => {
      const lg = logs[o.key];
      const objetivo = parsePse(lg.pse_objetivo ?? o.sd.pse);
      return {
        key: o.key,
        label: o.key.replace('_', '·S'),
        nombre: o.sd.name,
        real: Number(lg.pse),
        objetivo,
        sobrecarga: esSobrecarga(lg.pse, objetivo),
      };
    });
}

/** Máximo de dolor por zona y semana (solo semanas con registros). */
export function mapaDolor(semanas, logs) {
  return semanas
    .map(w => {
      const regs = w.sesiones.map(s => logs[`${w.id}_${s.num}`]).filter(lg => lg?.pse);
      if (!regs.length) return null;
      return {
        semana: w.id,
        sesiones: regs.length,
        zonas: Object.fromEntries(ZONAS.map(z => [z.key, Math.max(...regs.map(lg => Number(lg[`p_${z.label}`] ?? 0)))])),
      };
    })
    .filter(Boolean);
}

const numero = v => { const m = String(v ?? '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };

/** Sesiones con regleta/tiempo anotados. */
export function serieHangboard(semanas, logs) {
  return ordenSesiones(semanas)
    .filter(o => numero(logs[o.key]?.tiempo) !== null)
    .map(o => ({
      key: o.key,
      label: o.key.replace('_', '·S'),
      tiempo: numero(logs[o.key].tiempo),
      regleta: numero(logs[o.key].regleta),
    }));
}

// ─── TEST DE SALIDA ──────────────────────────────────────
/** ¿Esta sesión es la de test? S0 y S12, la sesión cuyo nombre contiene "test" (fallback: sesión 1). */
export function esSesionTest(semana, sd, wd) {
  if (semana !== 'S0' && semana !== 'S12') return false;
  const conTest = wd?.sesiones.find(s => /test/i.test(s.name));
  return conTest ? conTest.num === sd?.num : sd?.num === 1;
}

/**
 * Objetivos del trimestre por métrica (clave de PRUEBAS_TEST) a partir del perfil S0.
 * tipo: 'pct' (rango % de mejora), 'mejora' (> S0), null (solo comparación).
 */
const OBJETIVOS = {
  barras_lastre_kg:         { campo: 't2',         tipo: 'pct', min: 3, max: 5, unidad: 'kg' },
  suspensiones_20mm_kg:     { campo: 't4',         tipo: 'pct', min: 3, max: 5, unidad: 'kg' },
  repeticiones_regleta_rep: { campo: 't5',         tipo: null,  unidad: 'rep' },
  resistencia_continua_seg: { campo: 't6',         tipo: null,  unidad: 'seg' },
  campus_movimientos:       { campo: 't7',         tipo: 'mejora', unidad: 'mov' },
  grado_critico_un:         { campo: 't9',         tipo: null,  unidad: 'rep' },
  powerslab_d_cm:           { campo: 'powerslabD', tipo: 'mejora', unidad: 'cm' },
  powerslab_i_cm:           { campo: 'powerslabI', tipo: 'mejora', unidad: 'cm' },
  circuito_min:             { campo: 'circuito',   tipo: 'pct', min: 10, max: null, unidad: 'mov' },
};

const fmt = (n, unidad) => (unidad === 'kg' ? fmtKg(n) : `${Math.round(n * 10) / 10} ${unidad}`.replace('.', ','));

export function objetivoSalida(metrica, perfil) {
  const o = OBJETIVOS[metrica];
  const base = perfil?.[o?.campo];
  if (!o || base === '' || base === null || base === undefined) return null;
  const b = Number(base);
  let texto = `S0: ${fmt(b, o.unidad)}`;
  if (o.tipo === 'pct') {
    texto += o.max
      ? ` · Objetivo: ${o.unidad === 'kg' ? fmtRangoKg(b * (1 + o.min / 100), b * (1 + o.max / 100)) : `${fmt(b * (1 + o.min / 100), o.unidad)}–${fmt(b * (1 + o.max / 100), o.unidad)}`} (+${o.min}–${o.max}%)`
      : ` · Objetivo: ≥ ${fmt(Math.ceil(b * (1 + o.min / 100)), o.unidad)} (+${o.min}%)`;
  } else if (o.tipo === 'mejora') {
    texto += ` · Objetivo: > ${fmt(b, o.unidad)}`;
  }
  return { base: b, ...o, texto };
}

/** Delta vs S0 y si cumple el objetivo (null = sin objetivo definido). */
export function evaluarSalida(metrica, valor, perfil) {
  const obj = objetivoSalida(metrica, perfil);
  const v = Number(valor);
  if (!obj || valor === '' || isNaN(v)) return null;
  const diff = v - obj.base;
  const pct = obj.base !== 0 ? (diff / obj.base) * 100 : null;
  let cumple = null;
  if (obj.tipo === 'pct') cumple = pct !== null ? pct >= obj.min : diff > 0;
  if (obj.tipo === 'mejora') cumple = diff > 0;
  const signo = diff > 0 ? '+' : '';
  return {
    cumple,
    texto: pct !== null
      ? `${signo}${String(Math.round(pct * 10) / 10).replace('.', ',')}% vs S0 (${signo}${fmt(diff, obj.unidad)})`
      : `${signo}${fmt(diff, obj.unidad)} vs S0`,
  };
}

// ─── EXPORTACIÓN ─────────────────────────────────────────
const csvCelda = v => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportarCSV(semanas, logs, pruebas) {
  const cols = [
    'semana', 'sesion', 'nombre', 'fecha', 'pse_real', 'pse_objetivo', 'sobrecarga', 'completada',
    ...ZONAS.map(z => `dolor_${z.key}`), 'regleta', 'tiempo', 'override_dolor', 'notas',
    ...pruebas.map(p => `test_${p.id}`),
  ];
  const filas = ordenSesiones(semanas).filter(o => logs[o.key]).map(o => {
    const lg = logs[o.key];
    const obj = lg.pse_objetivo ?? o.sd.pse;
    return [
      o.week, o.sd.num, o.sd.name, lg.date, lg.pse, obj, lg.pse ? (esSobrecarga(lg.pse, obj) ? 'si' : 'no') : '',
      lg.completed ? 'si' : 'no',
      ...ZONAS.map(z => lg[`p_${z.label}`] ?? ''), lg.regleta, lg.tiempo,
      lg.override_dolor ? `${lg.override_dolor.ts} (${lg.override_dolor.zonas.map(z => `${z.zona} ${z.nivel}`).join(', ')})` : '',
      lg.notas,
      ...pruebas.map(p => lg[`t_${p.id}`] ?? ''),
    ];
  });
  return [cols, ...filas].map(f => f.map(csvCelda).join(',')).join('\n');
}

export function exportarJSON({ plan, perfil, logs, pruebas }) {
  const s0 = logs.S0_1 || {};
  const salidaKey = Object.keys(logs).find(k => k.startsWith('S12_') && pruebas.some(p => logs[k][`t_${p.id}`]));
  const s12 = salidaKey ? logs[salidaKey] : {};
  return JSON.stringify({
    exportado: new Date().toISOString(),
    plan: { trimestre: plan.trimestre, nivel: plan.nivel, escalador: plan.nombre },
    perfil,
    comparativa: pruebas.map(p => ({
      metrica: p.id, label: p.label, unidad: p.unidad,
      s0: perfil?.[OBJETIVOS[p.id]?.campo] ?? s0[`t_${p.id}`] ?? null,
      s12: s12[`t_${p.id}`] || null,
      resultado: evaluarSalida(p.id, s12[`t_${p.id}`] ?? '', perfil),
    })),
    sesiones: ordenSesiones(plan.semanas).filter(o => logs[o.key]).map(o => ({ key: o.key, nombre: o.sd.name, ...logs[o.key] })),
  }, null, 2);
}

export function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
