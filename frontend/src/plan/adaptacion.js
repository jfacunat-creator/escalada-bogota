/**
 * frontend/src/plan/adaptacion.js
 * Motor de adaptación: el plan reacciona a lo que el escalador registra.
 *
 *  2.1 Sobrecarga por PSE: PSE real ≥ objetivo + 2 en 2 sesiones registradas
 *      consecutivas → la semana siguiente baja un 20% las series.
 *  2.2 Semáforo de dolor: nivel 3 → sustituciones por zona; nivel 4+ → se
 *      suspenden los ejercicios que cargan esa zona (override registrado).
 *  2.3 Regleta: el tiempo aguantado en la última sesión de hangboard
 *      sugiere bajar o subir 2 mm.
 */
import { ZONAS, fmtRangoKg } from './perfil';

const REDUCCION = 0.8;
const REGLETAS = [10, 12, 15, 18, 20, 22, 25, 30];

// ─── ORDEN Y PSE ─────────────────────────────────────────
export function ordenSesiones(semanas) {
  return semanas.flatMap(w => w.sesiones.map(s => ({ key: `${w.id}_${s.num}`, week: w.id, sd: s })));
}

/** "7–8" → 8 (el máximo del rango objetivo). */
export function parsePse(v) {
  if (v === null || v === undefined || v === '') return null;
  const nums = String(v).match(/\d+(?:[.,]\d+)?/g);
  return nums ? Math.max(...nums.map(n => Number(n.replace(',', '.')))) : null;
}

export function esSobrecarga(pseReal, pseObjetivo) {
  const r = parsePse(pseReal);
  const o = parsePse(pseObjetivo);
  return r !== null && o !== null && r - o >= 2;
}

/**
 * @returns { sobrecargas: Set<key>, reducciones: { [weekId]: { origen, sesiones: [k1, k2] } } }
 */
export function evaluarSobrecarga(semanas, logs) {
  const orden = ordenSesiones(semanas);
  const registradas = orden.filter(o => logs[o.key]?.pse !== undefined && logs[o.key]?.pse !== '');
  const sobrecargas = new Set(
    registradas.filter(o => esSobrecarga(logs[o.key].pse, logs[o.key].pse_objetivo ?? o.sd.pse)).map(o => o.key),
  );
  const reducciones = {};
  for (let i = 1; i < registradas.length; i++) {
    const a = registradas[i - 1], b = registradas[i];
    if (!sobrecargas.has(a.key) || !sobrecargas.has(b.key)) continue;
    const idx = semanas.findIndex(w => w.id === b.week);
    const siguiente = semanas[idx + 1];
    if (siguiente && !reducciones[siguiente.id]) {
      reducciones[siguiente.id] = { origen: b.week, sesiones: [a.key, b.key] };
    }
  }
  return { sobrecargas, reducciones };
}

// ─── DOLOR ───────────────────────────────────────────────
const GRUPO_LABEL = { dedos: 'dedos', codo: 'codo', hombro: 'hombro', espalda: 'espalda' };

/**
 * Dolor vigente al abrir una sesión: máximo por zona entre el último registro
 * anterior (en orden del plan) y el dolor activo declarado en el perfil.
 */
export function dolorVigente(semanas, logs, week, session, perfil) {
  const orden = ordenSesiones(semanas);
  const idx = orden.findIndex(o => o.week === week && o.sd.num === session);
  const previo = orden.slice(0, Math.max(idx, 0)).reverse().find(o => logs[o.key]?.pse);
  const lg = previo ? logs[previo.key] : null;

  const zonas = ZONAS.map(z => {
    const enLog = Number(lg?.[`p_${z.label}`] ?? 0);
    const enPerfil = Number(perfil?.lesionesActivas?.[z.key] ?? 0);
    return { ...z, nivel: Math.max(enLog, enPerfil), fuente: enLog >= enPerfil && lg ? previo.key : 'perfil' };
  });
  const grupos = {};
  for (const z of zonas) {
    if (!grupos[z.grupo] || z.nivel > grupos[z.grupo].nivel) grupos[z.grupo] = { nivel: z.nivel, zona: z.label, fuente: z.fuente };
  }
  return { zonas, grupos, previo: previo?.key || null };
}

/** Zonas que carga un bloque: de la ficha si existe, si no por el nombre. */
export function zonasBloque(b) {
  if (b.ficha?.zonas) return b.ficha.zonas;
  const n = b.n.toLowerCase();
  if (/campus/.test(n)) return ['dedos', 'codo', 'hombro'];
  if (/exc[eé]ntrico|tracci[oó]n|dominada|bloqueo/.test(n)) return ['codo', 'hombro'];
  if (/suspensi|regleta|hang|t4|t6/.test(n)) return ['dedos'];
  if (/boulder|bloque al|continuidad|circuito|powerslab|contacto/.test(n)) return ['dedos'];
  if (/core|abdominal|plancha/.test(n)) return ['espalda'];
  return [];
}

// ─── REGLETA ─────────────────────────────────────────────
const esHangboard = b => /suspensi/i.test(b.n) || b.params.some(([k]) => /^regleta$/i.test(k));
const mm = v => { const m = String(v ?? '').match(/(\d+(?:[.,]\d+)?)\s*mm/i) || String(v ?? '').match(/^\s*(\d+(?:[.,]\d+)?)\s*$/); return m ? Number(m[1].replace(',', '.')) : null; };
const seg = v => { const m = String(v ?? '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };

/** Último registro de hangboard anterior a esta sesión con regleta y tiempo. */
export function regletaPrevia(semanas, logs, week, session) {
  const orden = ordenSesiones(semanas);
  const idx = orden.findIndex(o => o.week === week && o.sd.num === session);
  const previo = orden.slice(0, Math.max(idx, 0)).reverse().find(o => seg(logs[o.key]?.tiempo) !== null);
  if (!previo) return null;
  const lg = logs[previo.key];
  const regleta = mm(lg.regleta);
  const tiempo = seg(lg.tiempo);
  if (tiempo > 8) return { key: previo.key, regleta, tiempo, accion: 'bajar', nueva: regleta ? regleta - 2 : null };
  if (tiempo < 6) return { key: previo.key, regleta, tiempo, accion: 'subir', nueva: regleta ? regleta + 2 : null };
  return { key: previo.key, regleta, tiempo, accion: 'mantener', nueva: regleta };
}

function regletaMasGrande(valor, pasos) {
  const base = mm(valor);
  if (!base) return null;
  const i = REGLETAS.findIndex(r => r >= base);
  return REGLETAS[Math.min((i < 0 ? REGLETAS.length - 1 : i) + pasos, REGLETAS.length - 1)];
}

// ─── REDUCCIÓN DE VOLUMEN ────────────────────────────────
const reducir = n => Math.ceil(n * REDUCCION);

function reducirSeries(valor) {
  const limpio = String(valor).replace(/\s*\([^)]*\)/g, '');
  const nuevo = limpio.replace(/(^|[^S\d])(\d+)(?![\d,.]*\s*(?:seg|min|mm|kg|%|rep|mov))/g, (_, pre, n) => `${pre}${reducir(Number(n))}`);
  return nuevo === limpio ? null : `${nuevo} · −20% (antes ${limpio})`;
}

function reducirParams(params) {
  let cambio = false;
  const out = params.map(([k, v]) => {
    if (/^series$/i.test(k)) {
      const r = reducirSeries(v);
      if (r) { cambio = true; return [k, r]; }
    } else if (!/descanso|tiempo|duraci/i.test(k)) {
      const m = String(v).match(/^(\d+)\s*×/);
      if (m) { cambio = true; return [k, String(v).replace(/^(\d+)/, reducir(Number(m[1])))+ ' · −20%']; }
    }
    return [k, v];
  });
  return cambio ? out : params;
}

// ─── APLICAR ─────────────────────────────────────────────
/**
 * @param bloques   salida de personalizarBloques
 * @param ctx       { reduccion, dolor, regleta, calc, override }
 * @returns         { bloques, alertas: { naranja?, amarillo: [], rojo: [] } }
 */
export function aplicarAdaptaciones(bloques, { reduccion, dolor, regleta, calc, override }) {
  const g = dolor?.grupos || {};
  const rojos = Object.entries(g).filter(([, v]) => v.nivel >= 4).map(([grupo, v]) => ({ grupo, ...v }));
  const amarillos = Object.entries(g).filter(([, v]) => v.nivel === 3).map(([grupo, v]) => ({ grupo, ...v }));
  const gruposRojos = new Set(rojos.map(r => r.grupo));
  const nivel = grupo => g[grupo]?.nivel ?? 0;

  const out = bloques.map(b0 => {
    if (b0.oculto) return b0;
    let b = { ...b0, avisos: [...(b0.avisos || [])] };
    const zonas = zonasBloque(b);

    // 2.2 · Rojo: suspendido salvo override
    const tocaRojo = zonas.filter(z => gruposRojos.has(z));
    if (tocaRojo.length) {
      const txt = tocaRojo.map(z => `${GRUPO_LABEL[z]} (nivel ${nivel(z)})`).join(', ');
      if (!override) return { ...b, bloqueado: true, motivoBloqueo: `Suspendido por dolor en ${txt}. Consulta fisioterapia antes de hacerlo.` };
      b.avisos.unshift(`🔴 Lo haces bajo tu responsabilidad con dolor en ${txt}.`);
    }

    // 2.2 · Amarillo: sustituciones por zona
    if (nivel('codo') === 3 && /exc[eé]ntrico/i.test(b.n)) {
      return { ...b, bloqueado: true, motivoBloqueo: 'Eliminado en esta sesión por dolor nivel 3 en codo.' };
    }
    if (nivel('hombro') === 3 && /bloqueos? din[aá]mic/i.test(b.n)) {
      return { ...b, bloqueado: true, motivoBloqueo: 'Eliminado en esta sesión por dolor nivel 3 en hombro.' };
    }
    if (nivel('codo') === 3 && /tracci[oó]n con lastre/i.test(b.n) && calc?.lastreTraccion) {
      const { min, max } = calc.lastreTraccion;
      b.params = b.params.map(([k, v]) => /^lastre$/i.test(k)
        ? [k, `${fmtRangoKg(min * 0.7, max * 0.7)} · −30% por dolor en codo (normal: ${fmtRangoKg(min, max)})`]
        : [k, v]);
      b.avisos.push('🟡 Lastre reducido un 30% por dolor nivel 3 en codo.');
    }
    if (nivel('hombro') === 3 && /campus/i.test(b.n)) {
      b.avisos.push('🟡 Dolor nivel 3 en hombro: reduce el campus a la mitad de series y evita los rebotes.');
    }
    if (nivel('dedos') === 3 && esHangboard(b)) {
      const reg = b.params.find(([k]) => /^regleta$/i.test(k));
      const mayor = reg && regletaMasGrande(reg[1], 2);
      b.avisos.push(`🟡 Dolor nivel 3 en dedos: usa ${mayor ? `regleta de ${mayor} mm (2 tamaños más grande)` : 'una regleta 2 tamaños más grande'} o agarre abierto en vez de arqueado.`);
    }

    // 2.3 · Sugerencia de regleta
    if (regleta && regleta.accion !== 'mantener' && esHangboard(b) && /suspensi/i.test(b.n)) {
      const [w, s] = regleta.key.split('_');
      b.avisos.push(regleta.accion === 'bajar'
        ? `💡 En ${w}·S${s} aguantaste ${regleta.tiempo} seg (más de 8). Considera bajar a ${regleta.nueva ? `${regleta.nueva} mm` : 'una regleta 2 mm más pequeña'}.`
        : `💡 En ${w}·S${s} no llegaste a 6 seg (${regleta.tiempo} seg). Considera subir a ${regleta.nueva ? `${regleta.nueva} mm` : 'una regleta 2 mm más grande'}.`);
    }

    // 2.1 · Reducción de volumen
    if (reduccion) b.params = reducirParams(b.params);
    return b;
  });

  return {
    bloques: out,
    alertas: {
      naranja: reduccion ? `⚠️ Volumen reducido un 20% por sobrecarga detectada en ${reduccion.origen} (${reduccion.sesiones.map(k => k.replace('_', '·S')).join(' y ')}: PSE real ≥2 sobre el objetivo).` : null,
      amarillo: amarillos,
      rojo: rojos,
    },
  };
}
