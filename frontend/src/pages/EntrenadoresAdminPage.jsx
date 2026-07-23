import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoCuerda, IconoCohorte, IconoEscalador } from '../components/Icons';

export default function EntrenadoresAdminPage() {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEntrenadores().then(setEntrenadores).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>Entrenadores</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{entrenadores.length} entrenadores registrados</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: '#D4AF37' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {entrenadores.map(e => (
            <div key={e.id} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', background: '#242424', borderBottom: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#4A2F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconoCuerda style={{ width: '22px', height: '22px', color: '#D4AF37' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: '#F0EDE8' }}>{e.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: e.activo ? '#4ade80' : '#f87171' }}>{e.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', color: '#A09A8C' }}>{e.email}</div>
                {e.telefono && <div style={{ fontSize: '0.82rem', color: '#A09A8C' }}>{e.telefono}</div>}
                <div style={{ fontSize: '0.8rem', color: '#9E721D' }}>Lic. {e.licencia_ley181 || '—'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid #2e2e2e' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: '#D4AF37' }}>{e.grupos_activos || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: '#A09A8C' }}>Grupos activos</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: '#9E721D' }}>{e.total_escaladores || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: '#A09A8C' }}>Escaladores</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#A09A8C' }}>
                  <span>Máx. grupos</span>
                  <span style={{ color: '#D4AF37', fontWeight: 600 }}>{e.max_grupos}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
