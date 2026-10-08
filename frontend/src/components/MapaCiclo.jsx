// Mapa del ciclo: el porqué del plan. Objetivo del mesociclo → de cada mes → de cada semana,
// sobre la curva de carga planificada (PSE) de las 13 semanas. Acompaña al CalendarioPlan en Mi Grupo.
// Objetivos: plan/objetivos.js · Curva: plan.curva (GET /plan/my).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { objetivosDe } from '../plan/objetivos';
import { fmtRango } from './ui';

const C = { surface: '#1c1c1c', surface2: '#232323', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

// Paleta de fases validada (dataviz validate_palette, modo oscuro sobre #1c1c1c). El pico usa el color de carga.
const TIPO = {
  test:        { label: 'Test',        color: '#4c8df6' },
  descarga:    { label: 'Descarga',    color: '#12a594' },
  carga:       { label: 'Carga',       color: '#b08a1c' },
  pico:        { label: 'Pico de carga', color: '#b08a1c' },
  rendimiento: { label: 'Rendimiento', color: '#b764e8' },
};
const LEYENDA = ['test', 'carga', 'descarga', 'rendimiento'];
const MESES = [{ mes: 1, desde: 0, n: 5 }, { mes: 2, desde: 5, n: 4 }, { mes: 3, desde: 9, n: 4 }];
const NIVEL = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado' };
const N = 13;
const ALTO = 132; // px del área de la curva

// "6–7" → 6.5 · "8" → 8
const pseNum = v => {
  const n = String(v ?? '').match(/\d+(\.\d+)?/g)?.map(Number) || [];
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};
const yDe = pse => 100 - (pse / 10) * 82 - 6; // % desde arriba

// Curva suave (Catmull-Rom → Bézier) en un viewBox de 0–1300 × 0–100.
function trazo(puntos) {
  const p = puntos.map(([x, y]) => [x * 100, y]);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const semanaActual = (inicio) => {
  if (!inicio) return null;
  const dias = Math.floor((Date.now() - new Date(`${inicio}T00:00:00Z`).getTime()) / 86400000);
  return dias < 0 || dias >= 7 * N ? null : Math.floor(dias / 7);
};

export default function MapaCiclo({ plan }) {
  const navigate = useNavigate();
  const obj = objetivosDe(plan?.nivel, plan?.trimestre);
  const hoy = semanaActual(plan?.meses?.find(m => m.mes === 1)?.fechaInicio);
  const [sel, setSel] = useState(hoy ?? 0);
  const [hover, setHover] = useState(null);
  if (!plan || !obj) return null;

  const semanas = Array.from({ length: N }, (_, i) => {
    const id = `S${i}`;
    const pse = plan.curva?.find(w => w.id === id)?.pse ?? plan.semanas?.find(w => w.id === id)?.pse;
    const enPlan = plan.semanas?.find(w => w.id === id);
    return { i, id, pse, ...obj.semanas[id], sesiones: enPlan?.sesiones?.length || null, abrible: !!enPlan && !enPlan.historica };
  });
  // Semanas sin PSE heredan la anterior para no cortar la curva
  let ultimo = 3;
  const ys = semanas.map(w => { const n = pseNum(w.pse); if (n != null) ultimo = n; return yDe(ultimo); });
  const puntos = semanas.map((w, i) => [i + 0.5, ys[i]]);
  const linea = trazo(puntos);
  const area = `${linea} L${(N - 0.5) * 100},100 L50,100 Z`;

  const activa = hover ?? sel;
  const w = semanas[activa];
  const mesW = MESES.find(m => activa >= m.desde && activa < m.desde + m.n);
  const mesVigente = hoy == null ? plan.mesVigente : MESES.find(m => hoy >= m.desde && hoy < m.desde + m.n)?.mes;
  const infoMes = plan.meses?.find(m => m.mes === mesW.mes);
  const col = TIPO[w.tipo] || TIPO.carga;
  const pct = i => `${((i + 0.5) / N) * 100}%`;

  return (
    <section style={{ marginBottom: '24px' }} aria-label="Mapa del ciclo">
      <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>
        Mapa de tu ciclo · por qué haces lo que haces
      </div>
      <div style={{ background: `linear-gradient(180deg, #211d12 0%, ${C.surface} 38%)`, border: `1px solid ${C.border}`, borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)' }}>

        {/* 1 · Mesociclo */}
        <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: C.accent, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
          Mesociclo {plan.trimestre} · {NIVEL[plan.nivel] || plan.nivel} · 13 semanas
        </div>
        <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: C.text, lineHeight: 1.1, margin: '6px 0 8px' }}>{obj.titulo}</h2>
        <p style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text2, lineHeight: 1.6, maxWidth: '680px', margin: 0 }}>{obj.objetivo}</p>

        {/* 2 · Meses (alineados con sus semanas) */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`, gap: '0 4px', marginTop: '22px' }}>
          {MESES.map(m => {
            const vig = m.mes === mesVigente, foco = m.mes === mesW.mes;
            return (
              <button key={m.mes} onClick={() => setSel(vig && hoy != null ? hoy : m.desde)} style={{
                gridColumn: `${m.desde + 1} / span ${m.n}`, textAlign: 'left', cursor: 'pointer', minWidth: 0,
                padding: '8px 10px', borderRadius: '10px', border: `1px solid ${foco ? C.accent + '70' : C.border}`,
                background: foco ? C.accent + '14' : C.surface2, transition: 'all 0.15s',
              }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.62rem', color: foco ? C.accent : C.text3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Mes {m.mes}{vig ? ' · ahora' : ''}
                </div>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: foco ? C.text : C.text2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obj.meses[m.mes - 1].titulo}
                </div>
              </button>
            );
          })}
        </div>

        {/* 3 · Semanas: curva de carga planificada */}
        <div style={{ position: 'relative', height: `${ALTO}px`, marginTop: '10px' }} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${N * 100} 100`} preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
            <defs>
              <linearGradient id="mapa-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity="0.28" />
                <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[5, 9].map(x => <line key={x} x1={x * 100} x2={x * 100} y1="0" y2="100" stroke={C.border} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
            <path d={area} fill="url(#mapa-area)" />
            <path d={linea} fill="none" stroke={C.accent} strokeWidth="2" strokeOpacity="0.85" vectorEffect="non-scaling-stroke" />
            {hoy != null && <line x1={(hoy + 0.5) * 100} x2={(hoy + 0.5) * 100} y1="0" y2="100" stroke={C.text} strokeOpacity="0.35" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
          </svg>

          {hoy != null && (
            <div style={{ position: 'absolute', left: pct(hoy), top: '-2px', transform: 'translateX(-50%)', background: C.text, color: '#121212', fontFamily: 'Poppins', fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              HOY
            </div>
          )}

          {/* Puntos (HTML para que sigan redondos al estirar el SVG) */}
          {semanas.map((s, i) => {
            const c = (TIPO[s.tipo] || TIPO.carga).color;
            const on = i === activa, pico = s.tipo === 'pico';
            const tam = on ? 16 : pico ? 13 : 10;
            return (
              <div key={s.id} style={{
                position: 'absolute', left: pct(i), top: `${ys[i]}%`, width: tam, height: tam, transform: 'translate(-50%, -50%)',
                borderRadius: '50%', background: c, boxShadow: `0 0 0 2px ${C.surface}${on ? `, 0 0 0 5px ${c}55` : ''}`,
                opacity: hoy != null && i < hoy && !on ? 0.5 : 1, transition: 'all 0.15s', pointerEvents: 'none',
              }} />
            );
          })}

          {/* Zonas de toque: una columna por semana */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)` }}>
            {semanas.map((s, i) => (
              <button key={s.id} onClick={() => setSel(i)} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                aria-label={`${s.id} · ${s.fase}: ${s.objetivo}`} aria-pressed={i === sel}
                style={{ background: i === activa ? '#ffffff08' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`, marginTop: '6px' }}>
          {semanas.map((s, i) => (
            <div key={s.id} style={{ textAlign: 'center', fontFamily: 'Antonio, sans-serif', fontSize: '0.8rem', color: i === activa ? C.text : C.text3, fontWeight: i === activa ? 700 : 400 }}>
              {s.id}
            </div>
          ))}
        </div>

        {/* Detalle: objetivo del mes y de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px', marginTop: '18px' }}>
          <div style={{ background: C.surface2, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.66rem', color: C.text3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Objetivo del mes {mesW.mes} · S{mesW.desde}–S{mesW.desde + mesW.n - 1}{infoMes ? ` · ${fmtRango(infoMes.fechaInicio, infoMes.fechaFin)}` : ''}
            </div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: C.text, margin: '4px 0' }}>{obj.meses[mesW.mes - 1].titulo}</div>
            <p style={{ fontFamily: 'Poppins', fontSize: '0.84rem', color: C.text2, lineHeight: 1.55, margin: 0 }}>{obj.meses[mesW.mes - 1].objetivo}</p>
          </div>
          <div style={{ background: C.surface2, borderRadius: '12px', padding: '14px 16px', borderLeft: `3px solid ${col.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Poppins', fontSize: '0.66rem', color: C.text3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Objetivo de la semana {w.id}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Poppins', fontSize: '0.68rem', color: C.text2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />{col.label}
              </span>
              {activa === hoy && <span style={{ fontFamily: 'Poppins', fontSize: '0.62rem', fontWeight: 700, color: '#121212', background: C.text, borderRadius: '10px', padding: '1px 7px' }}>ESTA SEMANA</span>}
            </div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: C.text, margin: '4px 0' }}>{w.fase}</div>
            <p style={{ fontFamily: 'Poppins', fontSize: '0.84rem', color: C.text2, lineHeight: 1.55, margin: 0 }}>{w.objetivo}</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px', fontFamily: 'Poppins', fontSize: '0.74rem', color: C.text3 }}>
              {w.pse && <span>Carga PSE {w.pse}</span>}
              {w.sesiones && <span>{w.sesiones} sesiones</span>}
              {w.abrible && (
                <button onClick={() => navigate(`/app/mi-plan?semana=${w.id}`)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.76rem', fontWeight: 600, padding: 0 }}>
                  Ver sesiones →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px', fontFamily: 'Poppins', fontSize: '0.7rem', color: C.text2 }}>
          {LEYENDA.map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPO[t].color }} />{TIPO[t].label}
            </span>
          ))}
          <span style={{ color: C.text3 }}>Punto grande = pico de carga · La altura de la curva es la carga planificada (PSE)</span>
        </div>
      </div>
    </section>
  );
}
