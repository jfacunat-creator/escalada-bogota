import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoCohorte, IconoEscalador, IconoPresa, IconoCronometro, IconoMuro } from '../components/Icons';

function StatCard({ icon: Icon, label, value, color = '#D4AF37' }) {
  return (
    <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ padding: '10px', borderRadius: '10px', background: color + '18', color }}>
        <Icon style={{ width: '22px', height: '22px' }} />
      </div>
      <div>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.8rem', color: '#F0EDE8', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: '0.8rem', color: '#A09A8C', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function EntrenadorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrenador?.id) {
      api.getEntrenador(user.entrenador.id).then(setData).catch(console.error).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.entrenador?.id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const stats = data?.stats || {};
  const grupos = data?.grupos || [];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>
          Bienvenido, {data?.nombre || user?.entrenador?.nombre}
        </h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Panel de entrenador · {data?.licencia_ley181}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={IconoCohorte} label="Grupos activos" value={stats.grupos_activos || 0} color="#D4AF37" />
        <StatCard icon={IconoEscalador} label="Escaladores activos" value={stats.escaladores_activos || 0} color="#9E721D" />
        <StatCard icon={IconoCronometro} label="Grupos histórico" value={stats.total_grupos_historico || 0} color="#A09A8C" />
        <StatCard icon={IconoPresa} label="Máx. grupos" value={data?.max_grupos || 6} color="#A09A8C" />
      </div>

      {/* Grupos activos */}
      <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#F0EDE8', marginBottom: '16px' }}>
        Mis Grupos Activos
      </h2>

      {grupos.length === 0 ? (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <IconoCohorte style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <p style={{ color: '#A09A8C' }}>No tienes grupos asignados en este ciclo.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {grupos.map(g => (
            <div key={g.id} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', background: '#4A2F0F', borderBottom: '1px solid #5a3a14' }}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.05rem', color: '#F0EDE8' }}>{g.programa_nombre}</div>
                <div style={{ fontSize: '0.75rem', color: '#D4AF37', marginTop: '2px' }}>{g.ciclo_codigo} · {g.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}</div>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#A09A8C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconoCronometro style={{ width: '14px', height: '14px' }} /> {g.horario}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#A09A8C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconoMuro style={{ width: '14px', height: '14px' }} /> {g.muro_nombre}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #2e2e2e' }}>
                  <span style={{ fontSize: '0.85rem', color: '#A09A8C' }}>Inscritos</span>
                  <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: parseInt(g.inscritos) >= g.cupo_maximo ? '#f87171' : '#D4AF37' }}>
                    {g.inscritos}/{g.cupo_maximo}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info personal */}
      <div style={{ marginTop: '32px', background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: '#F0EDE8', marginBottom: '16px' }}>Mis datos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {[['Email', data?.email], ['Teléfono', data?.telefono || '—'], ['Licencia Ley 181', data?.licencia_ley181 || '—'], ['Desde', data?.fecha_ingreso ? new Date(data.fecha_ingreso).toLocaleDateString('es-CO') : '—']].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{k}</div>
              <div style={{ fontSize: '0.9rem', color: '#F0EDE8', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
