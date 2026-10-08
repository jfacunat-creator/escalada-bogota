import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { IconoRoca } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

const SEM_COLOR = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };
const SEM_LABEL = { verde: 'Óptimo', amarillo: 'En proceso', rojo: 'Por mejorar' };

const METRICAS_CFG = {
  barras_lastre_kg:          { label: 'Barras con máximo lastre',       sub: 'T2 · 1RM dominada con lastre',             color: '#D4AF37' },
  suspensiones_20mm_kg:      { label: 'Suspensiones 20mm + lastre',     sub: 'T4 · Isométrica en regleta 20mm',          color: '#f59e0b' },
  repeticiones_regleta_rep:  { label: 'Máximo dominadas',               sub: 'T5 · Dominadas seguidas sin lastre',       color: '#60a5fa' },
  resistencia_continua_seg:  { label: 'Resistencia continua',           sub: 'T6 · Suspensión isométrica máxima',        color: '#818cf8' },
  campus_movimientos:        { label: 'Campus movimientos',             sub: 'T7 · Movimientos totales en tabla campus', color: '#34d399' },
  grado_critico_un:          { label: 'Abdominales en suspensión',      sub: 'T9 · Reps con control',                    color: '#c084fc' },
  powerslab_d_cm:            { label: 'Powerslab Derecho',              sub: 'Alcance máximo brazo derecho',             color: '#f87171' },
  powerslab_i_cm:            { label: 'Powerslab Izquierdo',            sub: 'Alcance máximo brazo izquierdo',           color: '#fb923c' },
  circuito_min:              { label: 'Circuito estándar',              sub: 'Movimientos completados en 1 intento',     color: '#a3e635' },
};
const ORDEN_METRICAS = Object.keys(METRICAS_CFG);

function cfg(metrica) {
  return METRICAS_CFG[metrica] || { label: metrica.replace(/_/g, ' '), sub: '', color: '#A09A8C' };
}

// Fechas "AAAA-MM-DD" (sin hora) → texto local sin desfase de zona horaria
const fmtFecha = (f, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  f ? new Date(f + 'T12:00:00Z').toLocaleDateString('es-CO', { timeZone: 'UTC', ...opts }) : '—';
const fmtCorta = f => fmtFecha(f, { day: '2-digit', month: 'short', year: '2-digit' });
const tipoTest = t => (t === 'entrada' ? 'Test de entrada' : t === 'salida' ? 'Test de salida' : 'Test');

const hoyISO = () => new Date().toISOString().slice(0, 10);
const restarMeses = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };
const RANGOS = [
  { id: 'todo', label: 'Todo' },
  { id: '3',    label: '3 meses' },
  { id: '6',    label: '6 meses' },
  { id: '12',   label: '12 meses' },
  { id: 'custom', label: 'Personalizado' },
];

const etiqueta = { fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontFamily: 'Poppins' };
const inputFecha = { padding: '6px 8px', background: '#111', border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontFamily: 'Poppins', fontSize: '0.78rem', colorScheme: 'dark' };

// ─── Resumen por métrica (dentro del rango elegido) ───────
function MetricaCard({ metrica, unidad, puntos }) {
  const c = cfg(metrica);
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  const max = puntos.reduce((a, p) => (p.valor > a.valor ? p : a), puntos[0]);
  const min = puntos.reduce((a, p) => (p.valor < a.valor ? p : a), puntos[0]);
  const semColor = SEM_COLOR[ultimo.semaforo] || C.text2;
  const cambioPct = puntos.length >= 2 && primero.valor !== 0
    ? Math.round(((ultimo.valor - primero.valor) / primero.valor) * 100)
    : null;
  const igual = cambioPct === 0;
  const mejoro = cambioPct > 0;

  const chartData = puntos.map(p => ({ name: fmtCorta(p.fecha), valor: p.valor, label: `${tipoTest(p.tipo)} · ${fmtFecha(p.fecha)}` }));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: semColor, flexShrink: 0 }} />
            <div style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem', fontFamily: 'Poppins' }}>{c.label}</div>
          </div>
          {c.sub && <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '2px', marginLeft: '18px', fontFamily: 'Poppins' }}>{c.sub}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: semColor, lineHeight: 1 }}>
            {ultimo.valor} <span style={{ fontSize: '0.72rem', color: C.text2 }}>{unidad}</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: C.text3, fontFamily: 'Poppins', marginTop: '2px' }}>último · {fmtCorta(ultimo.fecha)}</div>
          {cambioPct !== null && (
            <div title="Cambio entre el primer y el último test del rango" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: igual ? C.text2 : (mejoro ? '#22c55e' : '#ef4444'), fontFamily: 'Poppins', marginTop: '2px' }}>
              {igual ? <Minus size={12} /> : (mejoro ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
              {Math.abs(cambioPct)}%
            </div>
          )}
        </div>
      </div>

      {/* Máximo y mínimo con la fecha del test */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #242424' }}>
        {[['Máximo', max, ArrowUp, '#22c55e'], ['Mínimo', min, ArrowDown, '#ef4444']].map(([l, p, Icon, col], i) => (
          <div key={l} style={{ padding: '8px 18px', borderLeft: i ? '1px solid #242424' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.66rem', color: C.text2, fontFamily: 'Poppins' }}>
              <Icon size={11} style={{ color: col }} /> {l}
            </div>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.05rem', color: C.text }}>
              {p.valor} <span style={{ fontSize: '0.65rem', color: C.text3 }}>{unidad}</span>
            </div>
            <div style={{ fontSize: '0.66rem', color: C.text3, fontFamily: 'Poppins' }}>{fmtFecha(p.fecha)}</div>
          </div>
        ))}
      </div>

      {puntos.length >= 2 ? (
        <div style={{ padding: '6px 4px 2px' }}>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={chartData} margin={{ top: 8, right: 14, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${metrica}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '11px', color: C.text }}
                labelFormatter={() => ''}
                formatter={(v, _, p) => [`${v} ${unidad}`, p.payload.label]}
              />
              <Area type="monotone" dataKey="valor" stroke={c.color} strokeWidth={2}
                fill={`url(#g-${metrica})`}
                dot={{ r: 4, fill: c.color, strokeWidth: 2, stroke: '#1c1c1c' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ padding: '10px 18px', fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins' }}>
          Un solo test en este rango · la curva aparece desde el segundo test
        </div>
      )}
    </div>
  );
}

// ─── Un test con sus resultados numéricos ─────────────────
function TestItem({ ev, numero, abierto, onToggle }) {
  const resultados = [...ev.resultados].sort((a, b) => ORDEN_METRICAS.indexOf(a.metrica) - ORDEN_METRICAS.indexOf(b.metrica));
  return (
    <div style={{ background: C.surface, border: `1px solid ${abierto ? C.accent + '60' : C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: ev.tipo === 'entrada' ? '#3a2e0a' : '#0a2e1a',
          color: ev.tipo === 'entrada' ? C.accent : '#22c55e',
          fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Antonio',
        }}>
          #{numero}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', color: C.text, fontWeight: 600, fontFamily: 'Poppins' }}>
            {fmtFecha(ev.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.74rem', color: C.text2, fontFamily: 'Poppins' }}>
            {tipoTest(ev.tipo)} · {ev.ciclo} · {ev.resultados.length} prueba{ev.resultados.length !== 1 ? 's' : ''}
          </div>
        </div>
        {abierto ? <ChevronUp size={16} color={C.text2} /> : <ChevronDown size={16} color={C.text2} />}
      </button>
      {abierto && (
        <div style={{ borderTop: '1px solid #242424', padding: '6px 18px 12px' }}>
          {resultados.map((r, i) => {
            const c = cfg(r.metrica);
            const col = SEM_COLOR[r.semaforo] || C.text2;
            return (
              <div key={r.metrica} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: i < resultados.length - 1 ? '1px solid #222' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: C.text, fontFamily: 'Poppins' }}>{c.label}</div>
                  {c.sub && <div style={{ fontSize: '0.68rem', color: C.text3, fontFamily: 'Poppins' }}>{c.sub}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.text }}>
                    {r.valor} <span style={{ fontSize: '0.68rem', color: C.text3 }}>{r.unidad}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.66rem', color: col, fontFamily: 'Poppins' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: col }} />
                    {SEM_LABEL[r.semaforo] || r.semaforo}
                  </div>
                </div>
              </div>
            );
          })}
          {ev.notas && (
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>📝 {ev.notas}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MiProgresoPage() {
  const { user } = useAuth();
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('resumen');
  const [rango, setRango] = useState('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    if (user?.escalador?.id) {
      api.getProgreso(user.escalador.id)
        .then(setProgreso)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.escalador?.id]);

  const evaluaciones = progreso?.evaluaciones || [];
  const n = evaluaciones.length;

  // Rango de fechas efectivo
  const [ini, fin] = rango === 'todo' ? ['', ''] : rango === 'custom' ? [desde, hasta] : [restarMeses(Number(rango)), hoyISO()];

  // Métricas con los puntos que caen dentro del rango
  const metricasRango = useMemo(() => {
    const out = [];
    for (const [k, d] of Object.entries(progreso?.metricas || {})) {
      const puntos = (d.puntos || []).filter(p => (!ini || p.fecha >= ini) && (!fin || p.fecha <= fin));
      if (puntos.length) out.push([k, d.unidad, puntos]);
    }
    return out.sort((a, b) => ORDEN_METRICAS.indexOf(a[0]) - ORDEN_METRICAS.indexOf(b[0]));
  }, [progreso, ini, fin]);
  const testsEnRango = evaluaciones.filter(e => (!ini || e.fecha >= ini) && (!fin || e.fecha <= fin));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mi Progreso</h1>
        <p style={{ color: C.text2, fontSize: '0.85rem', fontFamily: 'Poppins', maxWidth: '680px' }}>
          Resultados de tus tests físicos (protocolo T2 / T4 / T5 / T6 / T7 / T9 y Powerslab). Cada test es el que
          registras en la sesión de test del ciclo —o el que registra tu entrenador— y queda guardado con su fecha.
        </p>
      </div>

      {n === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoRoca style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text2, marginBottom: '8px' }}>Aún sin tests</h3>
          <p style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', maxWidth: '400px', margin: '0 auto' }}>
            Los tests se hacen al inicio (S0) y al final (S12) de cada ciclo. Al registrarlos aparecerán aquí con su fecha y resultados.
          </p>
        </div>
      ) : (
        <>
          {/* Selector de vista */}
          <div style={{ display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, marginBottom: 16, maxWidth: 420 }}>
            {[['resumen', '📈 Resumen'], ['tests', `🗂 Tests (${n})`]].map(([id, label]) => (
              <button key={id} onClick={() => setVista(id)}
                style={{ flex: 1, background: vista === id ? '#D4AF3718' : 'transparent', border: `1px solid ${vista === id ? C.accent : 'transparent'}`, borderRadius: 8, padding: '8px', cursor: 'pointer', color: vista === id ? C.accent : C.text2, fontSize: '0.8rem', fontWeight: vista === id ? 700 : 400, fontFamily: 'Poppins' }}>
                {label}
              </button>
            ))}
          </div>

          {vista === 'tests' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '760px' }}>
              {[...evaluaciones].reverse().map((ev, i) => (
                <TestItem key={ev.id} ev={ev} numero={n - i}
                  abierto={abierto === ev.id || (abierto === null && i === 0)}
                  onToggle={() => setAbierto(abierto === ev.id || (abierto === null && i === 0) ? '' : ev.id)} />
              ))}
            </div>
          ) : (
            <>
              {/* Filtro de rango de tiempo */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={etiqueta}>Rango</span>
                {RANGOS.map(r => (
                  <button key={r.id} onClick={() => setRango(r.id)}
                    style={{ padding: '5px 11px', borderRadius: '999px', border: `1px solid ${rango === r.id ? C.accent : C.border}`, background: rango === r.id ? '#D4AF3718' : 'transparent', color: rango === r.id ? C.accent : C.text2, fontFamily: 'Poppins', fontSize: '0.75rem', fontWeight: rango === r.id ? 700 : 400, cursor: 'pointer' }}>
                    {r.label}
                  </button>
                ))}
                {rango === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <input type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} style={inputFecha} aria-label="Desde" />
                    <span style={{ color: C.text3, fontSize: '0.75rem' }}>a</span>
                    <input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} style={inputFecha} aria-label="Hasta" />
                  </div>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>
                  {testsEnRango.length} de {n} test{n !== 1 ? 's' : ''}
                  {testsEnRango.length > 0 && ` · ${fmtCorta(testsEnRango[0].fecha)} – ${fmtCorta(testsEnRango[testsEnRango.length - 1].fecha)}`}
                </span>
              </div>

              {testsEnRango.length === 1 && (
                <div style={{ background: '#0a0a14', border: '1px solid #D4AF3725', borderRadius: '8px', padding: '9px 14px', marginBottom: '14px', fontSize: '0.78rem', color: '#D4AF37cc', fontFamily: 'Poppins' }}>
                  ℹ️ {n === 1
                    ? `Tienes un solo test (${fmtFecha(evaluaciones[0].fecha)}). Las curvas de progreso aparecen cuando registres el segundo.`
                    : 'En este rango hay un solo test. Amplía el rango para ver la curva de progreso.'}
                </div>
              )}

              {metricasRango.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>
                  No hay tests en este rango de fechas.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {metricasRango.map(([k, unidad, puntos]) => <MetricaCard key={k} metrica={k} unidad={unidad} puntos={puntos} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
