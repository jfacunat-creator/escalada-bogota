import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoPresa, IconoRoca, IconoCohorte, IconoCronometro, IconoMuro, IconoEscalador } from '../components/Icons';

function Stat({ icon: Icon, label, value, color = '#D4AF37' }) {
  return (
    <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ padding: '10px', borderRadius: '10px', background: color + '18', color }}><Icon style={{ width: '20px', height: '20px' }} /></div>
      <div>
        <div style={{ fontSize: '0.78rem', color: '#A09A8C' }}>{label}</div>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.4rem', color: '#F0EDE8', lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
}

export default function EscaladorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const esc = user?.escalador;

  useEffect(() => {
    Promise.all([
      api.getMe().then(setProfile).catch(() => {}),
      api.getProgramas().then(setProgramas).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const inscripciones = profile?.escalador?.inscripciones || [];
  const activa = inscripciones.find(i => i.estado === 'activa');
  const estadoLabel = { activo: 'Activo', inactivo: 'Inactivo', congelado: 'Congelado' };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Hola, {esc?.nombre || 'Escalador'}</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Bienvenido a tu plataforma de entrenamiento</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <Stat icon={IconoPresa} label="Estado" value={estadoLabel[esc?.estado] || 'Activo'} color={esc?.estado === 'activo' ? '#22c55e' : '#f59e0b'} />
        <Stat icon={IconoRoca} label="Nivel" value={esc?.rangoEtario === 'adulto' ? 'Adulto' : esc?.rangoEtario?.replace('menor_', 'Menor ')} />
        <Stat icon={IconoCohorte} label="Grupo activo" value={activa ? 'Sí' : 'No inscrito'} color={activa ? '#D4AF37' : '#A09A8C'} />
        <Stat icon={IconoCronometro} label="Ciclo" value={activa?.cohorte?.ciclo?.codigo || '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="esc-grid">
        <style>{`@media(max-width:768px){.esc-grid{grid-template-columns:1fr!important}}`}</style>

        {activa ? (
          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#4A2F0F', padding: '16px 20px' }}>
              <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#F0EDE8' }}>{activa.cohorte?.programa?.nombre || activa.programa || 'Mi Grupo'}</div>
              <div style={{ fontSize: '0.8rem', color: '#D4AF37', marginTop: '2px' }}>{activa.cohorte?.ciclo?.codigo || activa.ciclo || ''} · {activa.cohorte?.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}</div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#A09A8C' }}><IconoCronometro style={{ width: '15px', height: '15px' }} /> {activa.cohorte?.horario || activa.horario || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#A09A8C' }}><IconoMuro style={{ width: '15px', height: '15px' }} /> {activa.cohorte?.muro?.nombre || activa.muro || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#A09A8C' }}><IconoEscalador style={{ width: '15px', height: '15px' }} /> Entrenador: {activa.cohorte?.entrenador?.nombre || '—'}</div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <IconoMuro style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
            <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#A09A8C', marginBottom: '8px' }}>No estás inscrito en ningún grupo</h3>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>Contacta al equipo para inscribirte en el próximo ciclo.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>Mi Perfil</div>
            {[['Nombre', `${esc?.nombre} ${esc?.apellido}`], ['Estado', estadoLabel[esc?.estado]], ['Teléfono', profile?.escalador?.telefono || '—']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #242424', fontSize: '0.85rem' }}>
                <span style={{ color: '#A09A8C' }}>{k}</span>
                <span style={{ color: '#F0EDE8', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>Programas disponibles</div>
            {programas.filter(p => p.poblacion === 'adulto').map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #242424', fontSize: '0.85rem' }}>
                <span style={{ color: '#F0EDE8' }}>{p.nombre}</span>
                <span style={{ color: '#A09A8C', fontSize: '0.78rem' }}>{p.duracion_semanas || 13} sem</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
