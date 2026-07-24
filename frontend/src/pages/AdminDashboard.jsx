import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoPlanEntreno, IconoCronometro, IconoMuro, IconoRoca, IconoCohorte, IconoEscalador } from '../components/Icons';

function Stat({ icon: Icon, label, value, color = '#D4AF37' }) {
  return (
    <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ padding: '10px', borderRadius: '10px', background: color + '18', color }}><Icon style={{ width: '22px', height: '22px' }} /></div>
      <div>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.8rem', color: '#F0EDE8', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: '#A09A8C', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [programas, setProgramas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [muros, setMuros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProgramas().then(setProgramas).catch(() => {}),
      api.getCiclos().then(setCiclos).catch(() => {}),
      api.getMuros().then(setMuros).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Panel de Administración</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Vista general del negocio</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        <Stat icon={IconoPlanEntreno} label="Programas" value={programas.length} color="#D4AF37" />
        <Stat icon={IconoCronometro} label="Ciclos" value={ciclos.length} color="#9E721D" />
        <Stat icon={IconoMuro} label="Muros aliados" value={muros.length} color="#22c55e" />
        <Stat icon={IconoRoca} label="Ciclo activo" value={ciclos[0]?.codigo || '—'} color="#A09A8C" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="admin-grid">
        <style>{`@media(max-width:768px){.admin-grid{grid-template-columns:1fr!important}}`}</style>

        {/* Muros */}
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#D4AF37', marginBottom: '16px' }}>Muros Aliados</h2>
          {muros.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #242424' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)' }}><IconoMuro style={{ width: '18px', height: '18px', color: '#D4AF37' }} /></div>
                <div>
                  <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem' }}>{m.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: '#A09A8C' }}>{m.direccion}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: '#D4AF37' }}>{m.zonas_disponibles} zonas</div>
                <div style={{ fontSize: '0.72rem', color: m.convenio_activo ? '#22c55e' : '#ef4444' }}>{m.convenio_activo ? 'Convenio activo' : 'Sin convenio'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ciclos */}
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#9E721D', marginBottom: '16px' }}>Ciclos</h2>
          {ciclos.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #242424' }}>
              <div>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1rem', color: '#F0EDE8' }}>{c.codigo}</div>
                <div style={{ fontSize: '0.78rem', color: '#A09A8C' }}>
                  {new Date(c.fecha_inicio).toLocaleDateString('es-CO')} → {new Date(c.fecha_fin).toLocaleDateString('es-CO')}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#A09A8C' }}>Empalme: {new Date(c.semana_empalme).toLocaleDateString('es-CO')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
