import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoCohorte, IconoEscalador, IconoCronometro, IconoMuro, IconoCheck, IconoFalta } from '../components/Icons';

export default function MisGruposPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [escaladoresPorGrupo, setEscaladoresPorGrupo] = useState({});

  useEffect(() => {
    if (user?.entrenador?.id)
      api.getEntrenador(user.entrenador.id).then(setData).catch(console.error).finally(() => setLoading(false));
    else setLoading(false);
  }, [user?.entrenador?.id]);

  const toggleGrupo = async (grupo) => {
    if (openId === grupo.id) { setOpenId(null); return; }
    setOpenId(grupo.id);
    if (!escaladoresPorGrupo[grupo.id]) {
      try {
        const esc = await api.getEscaladores({ cohorteId: grupo.id });
        setEscaladoresPorGrupo(p => ({ ...p, [grupo.id]: esc }));
      } catch (err) { console.error(err); }
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const grupos = data?.grupos || [];
  const horarioMap = {
    lun_mie_18_20: 'Lun y Mié · 18:00–20:00', lun_mie_20_22: 'Lun y Mié · 20:00–22:00',
    mar_jue_18_20: 'Mar y Jue · 18:00–20:00', mar_jue_20_22: 'Mar y Jue · 20:00–22:00',
    sab_dom_7_9: 'Sáb y Dom · 7:00–9:00', sab_dom_9_11: 'Sáb y Dom · 9:00–11:00', sab_dom_11_13: 'Sáb y Dom · 11:00–13:00',
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Mis Grupos</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{grupos.length} grupos activos</p>
      </div>

      {grupos.length === 0 ? (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoCohorte style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <p style={{ color: '#A09A8C' }}>No tienes grupos asignados en este ciclo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {grupos.map(g => {
            const isOpen = openId === g.id;
            const esc = escaladoresPorGrupo[g.id] || [];
            return (
              <div key={g.id} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header clickeable */}
                <button onClick={() => toggleGrupo(g)} style={{
                  width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: isOpen ? '#242424' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#1e1e1e'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)' }}>
                      <IconoCohorte style={{ width: '22px', height: '22px', color: '#D4AF37' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.05rem', color: '#F0EDE8' }}>{g.programa_nombre}</div>
                      <div style={{ fontSize: '0.78rem', color: '#A09A8C', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconoCronometro style={{ width: '12px', height: '12px' }} /> {horarioMap[g.horario] || g.horario}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconoMuro style={{ width: '12px', height: '12px' }} /> {g.muro_nombre}</span>
                        <span>{g.ciclo_codigo}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: '#D4AF37' }}>{g.inscritos}/{g.cupo_maximo}</span>
                    <span style={{ color: '#A09A8C', fontSize: '1.2rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                  </div>
                </button>

                {/* Detalle expandible */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #2e2e2e', padding: '16px 20px' }}>
                    {esc.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '0.85rem', padding: '8px' }}>Sin escaladores inscritos.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2e2e2e' }}>
                            {['Nombre', 'Email', 'Teléfono', 'Estado'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {esc.map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #1e1e1e' }}>
                              <td style={{ padding: '10px', color: '#F0EDE8', fontWeight: 500, fontSize: '0.88rem' }}>{e.nombre} {e.apellido}</td>
                              <td style={{ padding: '10px', color: '#A09A8C', fontSize: '0.82rem' }}>{e.email}</td>
                              <td style={{ padding: '10px', color: '#A09A8C', fontSize: '0.82rem' }}>{e.telefono || '—'}</td>
                              <td style={{ padding: '10px' }}>
                                <span className={`badge-${e.estado === 'activo' ? 'green' : e.estado === 'congelado' ? 'amber' : 'slate'}`}
                                  style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500 }}>{e.estado}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
