import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Loader2 } from 'lucide-react';
import { IconoRoca, IconoPresa, IconoSemaforo, IconoCronometro, IconoEscalador, IconoCuerda } from '../components/Icons';

const metricaConfig = {
  fuerza_dedos_kg: { label: 'Fuerza de dedos', Icon: IconoPresa, color: '#D4AF37' },
  grado_max_boulder: { label: 'Grado máximo', Icon: IconoRoca, color: '#c084fc' },
  resistencia_seg: { label: 'Resistencia', Icon: IconoCronometro, color: '#60a5fa' },
  flexibilidad_cm: { label: 'Flexibilidad', Icon: IconoCuerda, color: '#22c55e' },
  tecnica_caida: { label: 'Técnica de caída', Icon: IconoEscalador, color: '#f59e0b' },
  lectura_vias: { label: 'Lectura de vías', Icon: IconoRoca, color: '#ef4444' },
};

function MetricaCard({ metrica, data }) {
  const cfg = metricaConfig[metrica] || { label: metrica, Icon: IconoPresa, color: '#A09A8C' };
  const { puntos, tendencia, unidad } = data;
  const ultimo = puntos[puntos.length - 1];
  const chartData = puntos.map(p => ({ name: `${p.ciclo} ${p.tipo === 'entrada' ? 'E' : 'S'}`, valor: p.valor }));

  return (
    <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: cfg.color + '15', color: cfg.color }}><cfg.Icon style={{ width: '18px', height: '18px' }} /></div>
          <div>
            <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem' }}>{cfg.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#A09A8C' }}>{cfg.desc || metrica}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.4rem', color: cfg.color }}>{ultimo.valor} <span style={{ fontSize: '0.75rem', color: '#A09A8C' }}>{unidad}</span></div>
          {tendencia && <div style={{ fontSize: '0.78rem', fontWeight: 600, color: tendencia.mejoro ? '#22c55e' : '#ef4444' }}>{tendencia.mejoro ? '↑' : '↓'} {Math.abs(tendencia.cambioPct)}%</div>}
        </div>
      </div>
      {puntos.length >= 2 && (
        <div style={{ padding: '12px 8px' }}>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs><linearGradient id={`g-${metrica}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={cfg.color} stopOpacity={0.2} /><stop offset="95%" stopColor={cfg.color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px', color: '#F0EDE8' }} />
              <Area type="monotone" dataKey="valor" stroke={cfg.color} strokeWidth={2.5} fill={`url(#g-${metrica})`} dot={{ r: 4, fill: cfg.color, strokeWidth: 2, stroke: '#1c1c1c' }} />
            </AreaChart>
          </ResponsiveContainer>
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
    if (user?.escalador?.id) api.getProgreso(user.escalador.id).then(setProgreso).catch(console.error).finally(() => setLoading(false));
    else setLoading(false);
  }, [user?.escalador?.id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const hayDatos = progreso?.hayDatos;
  const metricas = progreso?.metricas || {};
  const evaluaciones = progreso?.evaluaciones || [];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Mi Progreso</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Curvas de progreso trimestre a trimestre</p>
      </div>
      {!hayDatos ? (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoRoca style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: '#A09A8C', marginBottom: '8px' }}>Aún no tienes evaluaciones</h3>
          <p style={{ color: '#666', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>Las evaluaciones se realizan al inicio y final de cada ciclo. Tu entrenador registrará los resultados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="prog-grid">
          <style>{`@media(max-width:900px){.prog-grid{grid-template-columns:1fr!important}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metricas).map(([k, d]) => <MetricaCard key={k} metrica={k} data={d} />)}
          </div>
          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '18px', height: 'fit-content' }}>
            <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '14px' }}>Historial</div>
            {evaluaciones.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #242424' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ev.tipo === 'entrada' ? '#3a2e0a' : '#0a2e1a', color: ev.tipo === 'entrada' ? '#D4AF37' : '#22c55e', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {ev.tipo === 'entrada' ? 'E' : 'S'}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#F0EDE8', fontWeight: 500 }}>Test de {ev.tipo} · {ev.ciclo}</div>
                  <div style={{ fontSize: '0.75rem', color: '#A09A8C' }}>{ev.programa}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
