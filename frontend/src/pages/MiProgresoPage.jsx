/**
 * MiProgresoPage.jsx
 * Muestra las métricas de evaluación del escalador a lo largo del tiempo.
 * Métricas válidas per protocolo Hörst: fuerza máxima, fuerza crítica, resistencia.
 * Técnica de caída y flexibilidad NO se evalúan numéricamente en este protocolo.
 * Requiere mínimo 2 evaluaciones para mostrar comparación.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { IconoRoca, IconoPresa, IconoCronometro } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

// Solo métricas que realmente se miden con el protocolo Hörst
const METRICAS = {
  fuerza_dedos_kg: {
    label: 'Fuerza máxima de dedos',
    sub: 'T2 · Bidigital / T4 · Cuatriditigal',
    Icon: IconoPresa,
    color: '#D4AF37',
    unidad: 'kg',
    desc: 'Máximo de fuerza en fingerboard. Referencia: >20 kg = avanzado adulto.',
  },
  resistencia_seg: {
    label: 'Resistencia de agarre',
    sub: 'T5 · Intermitente · T6 · Continuo',
    Icon: IconoCronometro,
    color: '#60a5fa',
    unidad: 'seg',
    desc: 'Tiempo sostenido al 60% del máximo. Referencia: >60 seg = intermedio.',
  },
  lectura_vias: {
    label: 'Eficiencia de movimiento',
    sub: 'T8 · Grado máximo · T9 · Grado crítico',
    Icon: IconoRoca,
    color: '#c084fc',
    unidad: 'pts',
    desc: 'Escala 1–10 evaluada por el entrenador en sesión de vías.',
  },
};

function MetricaCard({ metrica, data }) {
  const cfg = METRICAS[metrica] || { label: metrica, Icon: IconoPresa, color: '#A09A8C', unidad: '' };
  const { puntos = [], tendencia } = data;
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  const chartData = puntos.map((p, i) => ({
    name: `${p.ciclo?.replace('2026-', '')} ${p.tipo === 'entrada' ? '▼' : '▲'}`,
    valor: p.valor,
    label: p.tipo === 'entrada' ? 'Entrada' : 'Salida',
  }));
  const mejora = ultimo && primero && ultimo.valor > primero.valor;
  const cambioPct = primero && primero.valor > 0
    ? Math.round(((ultimo.valor - primero.valor) / primero.valor) * 100)
    : null;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid #242424`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: cfg.color + '15', color: cfg.color, flexShrink: 0 }}>
            <cfg.Icon style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: C.text, fontSize: '0.9rem' }}>{cfg.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '1px', fontFamily: 'Poppins' }}>{cfg.sub}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.6rem', color: cfg.color, lineHeight: 1 }}>
            {ultimo?.valor} <span style={{ fontSize: '0.75rem', color: C.text2 }}>{cfg.unidad}</span>
          </div>
          {cambioPct !== null && (
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: mejora ? '#22c55e' : '#ef4444', fontFamily: 'Poppins', marginTop: '2px' }}>
              {mejora ? '↑' : '↓'} {Math.abs(cambioPct)}% vs inicio
            </div>
          )}
        </div>
      </div>

      {puntos.length >= 2 ? (
        <div style={{ padding: '8px 4px' }}>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${metrica}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px', color: C.text }}
                formatter={(v, _, p) => [`${v} ${cfg.unidad}`, p.payload.label]}
              />
              <Area type="monotone" dataKey="valor" stroke={cfg.color} strokeWidth={2.5}
                fill={`url(#g-${metrica})`}
                dot={{ r: 5, fill: cfg.color, strokeWidth: 2, stroke: '#1c1c1c' }}
                activeDot={{ r: 7 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ padding: '14px 20px', fontSize: '0.8rem', color: C.text3, fontFamily: 'Poppins' }}>
          Un solo registro — se mostrará la curva cuando haya ≥ 2 evaluaciones.
        </div>
      )}

      <div style={{ padding: '8px 20px 14px', fontSize: '0.75rem', color: '#444', fontFamily: 'Poppins', lineHeight: 1.5 }}>
        {cfg.desc}
      </div>
    </div>
  );
}

function SemaforoRow({ metrica, data }) {
  const cfg = METRICAS[metrica] || {};
  const ultimo = data.puntos?.[data.puntos.length - 1];
  if (!ultimo) return null;
  const sem = ultimo.semaforo;
  const semColor = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid #242424` }}>
      <div style={{ fontSize: '0.85rem', color: C.text, fontFamily: 'Poppins' }}>{cfg.label || metrica}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: semColor[sem] || '#555', flexShrink: 0 }} />
        <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: semColor[sem] || C.text2 }}>
          {ultimo.valor} <span style={{ fontSize: '0.7rem', color: C.text3 }}>{data.unidad}</span>
        </div>
      </div>
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
  // Solo mostrar las métricas del protocolo Hörst (filtramos tecnica_caida y flexibilidad)
  const metricasValidas = Object.entries(metricas).filter(([k]) => METRICAS[k]);
  const n = evaluaciones.length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mi Progreso</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
          Protocolo Hörst · Batería de tests T2 / T4 / T5 / T6 / T8 / T9
        </p>
      </div>

      {n === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoRoca style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text2, marginBottom: '8px' }}>Aún sin evaluaciones</h3>
          <p style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', maxWidth: '400px', margin: '0 auto' }}>
            Las evaluaciones se realizan al inicio y final de cada ciclo. Tu entrenador registrará los resultados con el protocolo de fuerza máxima y fuerza crítica.
          </p>
        </div>
      ) : (
        <>
          {n < 2 && (
            <div style={{ background: '#1a1200', border: '1px solid #D4AF3730', borderRadius: '8px', padding: '10px 16px', marginBottom: '20px', fontFamily: 'Poppins', fontSize: '0.82rem', color: '#D4AF37' }}>
              ℹ️ Con 1 evaluación puedes ver tu estado actual. Las curvas de progreso aparecen cuando tengas 2 o más evaluaciones (inicio + fin de ciclo).
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="prog-grid">
            <style>{`@media(max-width:900px){.prog-grid{grid-template-columns:1fr!important}}`}</style>

            {/* Curvas de progreso */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {metricasValidas.length > 0
                ? metricasValidas.map(([k, d]) => <MetricaCard key={k} metrica={k} data={d} />)
                : <div style={{ color: C.text2, fontFamily: 'Poppins', padding: '20px', textAlign: 'center' }}>Sin métricas registradas aún.</div>
              }
            </div>

            {/* Panel lateral */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Historial de tests */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '14px', fontFamily: 'Poppins' }}>
                  Historial · {n} test{n !== 1 ? 's' : ''}
                </div>
                {evaluaciones.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid #242424` }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: ev.tipo === 'entrada' ? '#3a2e0a' : '#0a2e1a',
                      color: ev.tipo === 'entrada' ? C.accent : '#22c55e',
                      fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Antonio',
                    }}>
                      {ev.tipo === 'entrada' ? 'E' : 'S'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: C.text, fontWeight: 500, fontFamily: 'Poppins' }}>
                        {ev.tipo === 'entrada' ? 'Entrada' : 'Salida'} · {ev.ciclo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>
                        {ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : ev.programa}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Semáforo actual */}
              {metricasValidas.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '14px', fontFamily: 'Poppins' }}>
                    Estado actual
                  </div>
                  {metricasValidas.map(([k, d]) => <SemaforoRow key={k} metrica={k} data={d} />)}
                </div>
              )}

              {/* Nota protocolo */}
              <div style={{ background: '#0a0a0a', border: `1px solid #1e293b`, borderRadius: '10px', padding: '14px 16px', fontSize: '0.75rem', color: '#475569', fontFamily: 'Poppins', lineHeight: 1.7 }}>
                <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Protocolo de evaluación</div>
                T2 · Bidigital · T4 · Cuatridigital · T5 · Intermitente<br />
                T6 · Continuo · T8 · Grado máx. · T9 · Grado crítico<br />
                <span style={{ color: '#334155' }}>Técnica de caída: observacional. Flexibilidad: no cuantificada en esta etapa.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
