import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, Search, ChevronRight } from 'lucide-react';
import { IconoCohorte, IconoCronometro, IconoMuro, IconoEscalador } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };

const horarioLabel = {
  lun_mie_18_20: 'Lun y Mié · 18:00–20:00', lun_mie_20_22: 'Lun y Mié · 20:00–22:00',
  mar_jue_18_20: 'Mar y Jue · 18:00–20:00', mar_jue_20_22: 'Mar y Jue · 20:00–22:00',
  sab_dom_9_11: 'Sáb y Dom · 9:00–11:00',
};

export default function MisGruposPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');

  useEffect(() => {
    if (user?.entrenador?.id)
      api.getEntrenador(user.entrenador.id).then(setData).catch(console.error).finally(() => setLoading(false));
    else setLoading(false);
  }, [user?.entrenador?.id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} /></div>;

  const grupos = (data?.grupos || []).filter(g => !buscar || g.programa_nombre?.toLowerCase().includes(buscar.toLowerCase()) || g.muro_nombre?.toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mis Grupos</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>{data?.grupos?.length || 0} grupos activos · Haz click para ver escaladores, sesiones y asistencia</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: C.text2 }} />
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar grupo..."
          style={{ width: '100%', maxWidth: '360px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px 10px 36px', color: C.text, fontFamily: 'Poppins', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {grupos.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoCohorte style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <p style={{ color: C.text2, fontFamily: 'Poppins' }}>{buscar ? 'Sin resultados' : 'No tienes grupos asignados.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {grupos.map(g => (
            <button key={g.id} onClick={() => navigate(`/app/mis-grupos/${g.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.accent}40`; e.currentTarget.style.background = '#242424'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
              <div style={{ padding: '12px', background: 'rgba(212,175,55,0.1)', borderRadius: '10px', flexShrink: 0 }}>
                <IconoCohorte style={{ width: '22px', height: '22px', color: C.accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.05rem', color: C.text, marginBottom: '4px' }}>{g.programa_nombre}</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconoCronometro style={{ width: '12px', height: '12px' }} />{horarioLabel[g.horario] || g.horario}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconoMuro style={{ width: '12px', height: '12px' }} />{g.muro_nombre}</span>
                  <span>{g.ciclo_codigo}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.accent }}>{g.inscritos || 0}/{g.cupo_maximo}</div>
                  <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins' }}>inscritos</div>
                </div>
                <ChevronRight size={18} color={C.text2} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
