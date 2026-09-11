import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { IconoRoca } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

const SEM_COLOR = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };

const METRICAS_CFG = {
  barras_lastre_kg:          { label: 'Barras con máximo lastre',       sub: 'T2 · 1RM dominada con lastre',             color: '#D4AF37' },
  suspensiones_20mm_kg:      { label: 'Suspensiones 20mm + lastre',     sub: 'T4 · Isométrica en regleta 20mm',          color: '#f59e0b' },
  repeticiones_regleta_rep:  { label: 'Repeticiones en regleta',        sub: 'T5 · Reps al fallo en regleta',            color: '#60a5fa' },
  resistencia_continua_seg:  { label: 'Resistencia continua',           sub: 'T6 · Suspensión isométrica máxima',        color: '#818cf8' },
  campus_movimientos:        { label: 'Campus movimientos',             sub: 'T7 · Movimientos totales en tabla campus', color: '#34d399' },
  grado_critico_un:          { label: 'Grado crítico',                  sub: 'T9 · Grado máximo encadenado al 70%',     color: '#c084fc' },
  powerslab_d_cm:            { label: 'Powerslab Derecho',              sub: 'Alcance máximo brazo derecho',             color: '#f87171' },
  powerslab_i_cm:            { label: 'Powerslab Izquierdo',            sub: 'Alcance máximo brazo izquierdo',           color: '#fb923c' },
  circuito_min:              { label: 'Circuito estándar',              sub: 'Tiempo de completación del circuito',      color: '#a3e635' },
};

function cfg(metrica) {
  return METRICAS_CFG[metrica] || { label: metrica.replace(/_/g, ' '), sub: '', color: '#A09A8C' };
}

function MetricaCard({ metrica, data }) {
  const c = cfg(metrica);
  const { puntos = [], unidad = '' } = data;
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  const semColor = ultimo ? (SEM_COLOR[ultimo.semaforo] || C.text2) : C.text2;
  const cambioPct = puntos.length >= 2 && primero.valor !== 0
    ? Math.round(((ultimo.valor - primero.valor) / primero.valor) * 100)
    : null;
  const mejoro = cambioPct !== null && cambioPct > 0;
  const igual = cambioPct === 0;

  const chartData = puntos.map(p => ({
    name: `${p.ciclo?.replace('2026-', '') ?? ''} ${p.tipo === 'entrada' ? '▼' : '▲'}`,
    valor: p.valor,
    label: p.tipo === 'entrada' ? 'Entrada' : 'Salida',
  }));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: semColor, flexShrink: 0 }} />
            <div style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem' }}>{c.label}</div>
          </div>
          {c.sub && <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '2px', marginLeft: '18px', fontFamily: 'Poppins' }}>{c.sub}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: semColor, lineHeight: 1 }}>
            {ultimo?.valor} <span style={{ fontSize: '0.72rem', color: C.text2 }}>{unidad}</span>
          </div>
          {cambioPct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: igual ? C.text2 : (mejoro ? '#22c55e' : '#ef4444'), fontFamily: 'Poppins', marginTop: '2px' }}>
              {igual ? <Minus size={12} /> : (mejoro ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
              {Math.abs(cambioPct)}%
            </div>
          )}
        </div>
      </div>

      {puntos.length >= 2 ? (
        <div style={{ padding: '6px 4px 2px' }}>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${metrica}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#555' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#555' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '11px', color: C.text }}
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
        <div style={{ padding: '10px 18px', fontSize: '0.75rem', color: '#3a3a3a', fontFamily: 'Poppins' }}>
          Curva disponible con ≥ 2 evaluaciones
        </div>
      )}
    </div>
  );
}

export default function MiProgresoPage() {
  const { user } = useAuth();
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.escalador?.id) {
      api.getProgreso(user.escalador.id)
        .then(setProgreso)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.escalador?.id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} />
    </div>
  );

  const evaluaciones = progreso?.evaluaciones || [];
  const metricas = progreso?.metricas || {};
  const todasMetricas = Object.entries(metricas);
  const n = evaluaciones.length;

  // Estadísticas del semáforo global
  const conteoSem = { verde: 0, amarillo: 0, rojo: 0 };
  todasMetricas.forEach(([, d]) => {
    const sem = d.puntos?.[d.puntos.length - 1]?.semaforo;
    if (sem in conteoSem) conteoSem[sem]++;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mi Progreso</h1>
        <p style={{ color: C.text2, fontSize: '0.88rem', fontFamily: 'Poppins' }}>
          Resultados de evaluaciones · Protocolo de tests T2 / T4 / T5 / T6 / T7 / T9
        </p>
      </div>

      {n === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoRoca style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text2, marginBottom: '8px' }}>Aún sin evaluaciones</h3>
          <p style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', maxWidth: '400px', margin: '0 auto' }}>
            Las evaluaciones se realizan al inicio y final de cada ciclo. Tu entrenador registrará los resultados del protocolo de fuerza y resistencia.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen semáforo */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { key: 'verde',    label: 'Óptimo',    bg: '#052010', border: '#22c55e30' },
              { key: 'amarillo', label: 'En proceso', bg: '#1a1200', border: '#f59e0b30' },
              { key: 'rojo',     label: 'Por mejorar',bg: '#200505', border: '#ef444430' },
            ].map(s => conteoSem[s.key] > 0 && (
              <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: SEM_COLOR[s.key] }} />
                <span style={{ fontSize: '0.82rem', color: SEM_COLOR[s.key], fontFamily: 'Poppins', fontWeight: 600 }}>{conteoSem[s.key]}</span>
                <span style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>{s.label}</span>
              </div>
            ))}
            {n < 2 && (
              <div style={{ background: '#0a0a14', border: '1px solid #D4AF3720', borderRadius: '8px', padding: '8px 16px', fontSize: '0.78rem', color: '#D4AF3799', fontFamily: 'Poppins' }}>
                ℹ️ Las curvas de progreso aparecen con ≥ 2 evaluaciones
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="prog-grid">
            <style>{`@media(max-width:900px){.prog-grid{grid-template-columns:1fr!important}}`}</style>

            {/* Tarjetas de métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {todasMetricas.length > 0
                ? todasMetricas.map(([k, d]) => <MetricaCard key={k} metrica={k} data={d} />)
                : <div style={{ color: C.text2, fontFamily: 'Poppins', padding: '20px' }}>Sin métricas registradas.</div>
              }
            </div>

            {/* Panel lateral */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Historial */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '14px', fontFamily: 'Poppins' }}>
                  Historial · {n} evaluación{n !== 1 ? 'es' : ''}
                </div>
                {evaluaciones.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < evaluaciones.length - 1 ? '1px solid #242424' : 'none' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: ev.tipo === 'entrada' ? '#3a2e0a' : '#0a2e1a',
                      color: ev.tipo === 'entrada' ? C.accent : '#22c55e',
                      fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Antonio',
                    }}>
                      {ev.tipo === 'entrada' ? 'ENT' : 'SAL'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', color: C.text, fontWeight: 500, fontFamily: 'Poppins' }}>
                        {ev.tipo === 'entrada' ? 'Test de entrada' : 'Test de salida'} · {ev.ciclo}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins' }}>
                        {ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : ev.programa}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla resumen de valores */}
              {todasMetricas.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '14px', fontFamily: 'Poppins' }}>
                    Valores actuales
                  </div>
                  {todasMetricas.map(([k, d], i) => {
                    const c = cfg(k);
                    const ultimo = d.puntos?.[d.puntos.length - 1];
                    const semColor = ultimo ? (SEM_COLOR[ultimo.semaforo] || C.text2) : C.text2;
                    return (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < todasMetricas.length - 1 ? '1px solid #222' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: semColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: C.text, fontFamily: 'Poppins' }}>{c.label}</span>
                        </div>
                        <span style={{ fontFamily: 'Antonio', fontSize: '0.95rem', color: semColor }}>
                          {ultimo?.valor} <span style={{ fontSize: '0.65rem', color: C.text3 }}>{d.unidad}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
