import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoCohorte, IconoCronometro, IconoCheck, IconoFalta, IconoEscalador, IconoMuro, IconoPresa } from '../components/Icons';

export default function AsistenciaPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [escaladores, setEscaladores] = useState([]);
  const [asistenciaData, setAsistenciaData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [showResumen, setShowResumen] = useState(false);

  useEffect(() => {
    if (user?.entrenador?.id) {
      api.getEntrenador(user.entrenador.id).then(setProfile).catch(console.error).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.entrenador?.id]);

  const selectGrupo = async (grupo) => {
    setSelectedGrupo(grupo);
    setSelectedSesion(null);
    setShowResumen(false);
    try {
      const ses = await api.getSesiones(grupo.id);
      setSesiones(ses);
    } catch (err) { console.error(err); }
  };

  const generarSesiones = async () => {
    if (!selectedGrupo) return;
    setGenerando(true);
    try {
      await api.generarSesiones(selectedGrupo.id);
      const ses = await api.getSesiones(selectedGrupo.id);
      setSesiones(ses);
    } catch (err) { alert(err.error || 'Error generando sesiones'); }
    finally { setGenerando(false); }
  };

  const selectSesion = async (sesion) => {
    setSelectedSesion(sesion);
    setSaved(false);
    setShowResumen(false);
    try {
      const detail = await api.getSesion(sesion.id);
      // Cargar escaladores inscritos en el grupo
      const params = { cohorteId: selectedGrupo.id };
      const escList = await api.getEscaladores(params);
      setEscaladores(escList);
      // Mapear asistencia existente
      const aData = {};
      for (const a of detail.asistencia || []) {
        aData[a.escalador_id] = { asistio: a.asistio, observaciones: a.observaciones || '' };
      }
      for (const e of escList) {
        if (!aData[e.id]) aData[e.id] = { asistio: true, observaciones: '' };
      }
      setAsistenciaData(aData);
    } catch (err) { console.error(err); }
  };

  const toggleAsistencia = (id) => {
    setAsistenciaData(p => ({ ...p, [id]: { ...p[id], asistio: !p[id].asistio } }));
    setSaved(false);
  };

  const setObs = (id, text) => {
    setAsistenciaData(p => ({ ...p, [id]: { ...p[id], observaciones: text } }));
  };

  const guardar = async () => {
    if (!selectedSesion) return;
    setSaving(true);
    try {
      const registros = Object.entries(asistenciaData).map(([escaladorId, d]) => ({
        escaladorId, asistio: d.asistio, observaciones: d.observaciones || undefined
      }));
      await api.registrarAsistencia(selectedSesion.id, registros);
      setSaved(true);
      const ses = await api.getSesiones(selectedGrupo.id);
      setSesiones(ses);
    } catch (err) { alert(err.error || 'Error guardando'); }
    finally { setSaving(false); }
  };

  const loadResumen = async () => {
    if (!selectedGrupo) return;
    try {
      const data = await api.getResumenAsistencia(selectedGrupo.id);
      setResumen(data);
      setShowResumen(true);
      setSelectedSesion(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const grupos = profile?.grupos || [];
  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>Registro de Asistencia</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Selecciona grupo → sesión → registra</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }} className="asis-grid">
        <style>{`@media(max-width:768px){.asis-grid{grid-template-columns:1fr!important}}`}</style>

        {/* Panel izquierdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de grupo */}
          <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>Mis Grupos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {grupos.length === 0 ? (
                <p style={{ color: '#A09A8C', fontSize: '0.85rem', padding: '8px' }}>Sin grupos asignados</p>
              ) : grupos.map(g => (
                <button key={g.id} onClick={() => selectGrupo(g)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                    background: selectedGrupo?.id === g.id ? 'rgba(212,175,55,0.12)' : 'transparent',
                    border: selectedGrupo?.id === g.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedGrupo?.id !== g.id) e.currentTarget.style.background = '#242424'; }}
                  onMouseLeave={e => { if (selectedGrupo?.id !== g.id) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.85rem' }}>{g.programa_nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: '#A09A8C', marginTop: '2px' }}>{g.horario} · {g.muro_nombre}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sesiones */}
          {selectedGrupo && (
            <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Sesiones</div>
                <button onClick={loadResumen}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600 }}>
                  Resumen
                </button>
              </div>
              {sesiones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <p style={{ color: '#A09A8C', fontSize: '0.85rem', marginBottom: '12px' }}>Sin sesiones</p>
                  <button onClick={generarSesiones} disabled={generando} className="btn-primary" style={{ fontSize: '0.82rem', padding: '8px 16px' }}>
                    {generando ? 'Generando...' : 'Generar sesiones'}
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {sesiones.map(s => {
                    const fecha = new Date(s.fecha);
                    const fechaStr = s.fecha?.split('T')[0];
                    const esHoy = fechaStr === hoy;
                    const tieneAsist = parseInt(s.asistentes) > 0;
                    return (
                      <button key={s.id} onClick={() => selectSesion(s)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: selectedSesion?.id === s.id ? 'rgba(212,175,55,0.12)' : esHoy ? 'rgba(245,158,11,0.08)' : 'transparent',
                          border: selectedSesion?.id === s.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                          cursor: 'pointer', transition: 'background 0.12s', fontSize: '0.82rem',
                        }}
                        onMouseEnter={e => { if (selectedSesion?.id !== s.id) e.currentTarget.style.background = '#242424'; }}
                        onMouseLeave={e => { if (selectedSesion?.id !== s.id) e.currentTarget.style.background = esHoy ? 'rgba(245,158,11,0.08)' : 'transparent'; }}>
                        <span>
                          <span style={{ color: '#D4AF37', fontFamily: 'Antonio, sans-serif', marginRight: '6px' }}>#{s.numero_sesion}</span>
                          <span style={{ color: '#A09A8C' }}>
                            {fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {tieneAsist && <span style={{ fontSize: '0.72rem', color: '#22c55e' }}>{s.asistentes}/{s.registros}</span>}
                          {esHoy && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div>
          {showResumen ? (
            <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#F0EDE8', marginBottom: '20px' }}>
                Resumen — {selectedGrupo?.programa_nombre}
              </h3>
              {resumen.length === 0 ? (
                <p style={{ color: '#A09A8C' }}>Sin datos de asistencia registrados.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2e2e2e' }}>
                      {['Escalador', 'Sesiones', 'Asistencias', '%', 'Garantía'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Escalador' ? 'left' : 'center', fontSize: '0.72rem', color: '#A09A8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map(r => {
                      const pct = parseFloat(r.porcentaje) || 0;
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1e1e1e' }}>
                          <td style={{ padding: '12px', color: '#F0EDE8', fontWeight: 500, fontSize: '0.9rem' }}>{r.nombre} {r.apellido}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#A09A8C' }}>{r.total_sesiones}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#A09A8C' }}>{r.asistencias}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {pct >= 80 ? <IconoCheck style={{ width: '20px', height: '20px', color: '#22c55e', margin: '0 auto' }} />
                              : <IconoFalta style={{ width: '20px', height: '20px', color: '#2e2e2e', margin: '0 auto' }} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : selectedSesion ? (
            <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '24px' }}>
              {/* Header sesión */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#F0EDE8' }}>Sesión #{selectedSesion.numero_sesion}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#A09A8C', marginTop: '2px' }}>
                    {new Date(selectedSesion.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}{selectedSesion.hora_inicio?.substring(0, 5)} – {selectedSesion.hora_fin?.substring(0, 5)}
                  </p>
                </div>
                <button onClick={guardar} disabled={saving} className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                    background: saved ? '#22c55e' : undefined, color: saved ? '#fff' : undefined }}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <IconoCheck style={{ width: '16px', height: '16px' }} /> : null}
                  {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar asistencia'}
                </button>
              </div>

              {/* Lista de escaladores */}
              {escaladores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <IconoEscalador style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 8px' }} />
                  <p style={{ color: '#A09A8C' }}>Sin escaladores inscritos en este grupo.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {escaladores.map(e => {
                    const d = asistenciaData[e.id] || { asistio: true, observaciones: '' };
                    return (
                      <div key={e.id} style={{
                        borderRadius: '10px', padding: '14px 16px',
                        border: `1px solid ${d.asistio ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        background: d.asistio ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={() => toggleAsistencia(e.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}>
                              {d.asistio
                                ? <IconoCheck style={{ width: '28px', height: '28px', color: '#22c55e' }} />
                                : <IconoFalta style={{ width: '28px', height: '28px', color: '#ef4444' }} />}
                            </button>
                            <div>
                              <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem' }}>{e.nombre} {e.apellido}</div>
                              <div style={{ fontSize: '0.75rem', color: '#A09A8C' }}>{e.estado}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: d.asistio ? '#22c55e' : '#ef4444' }}>
                            {d.asistio ? 'Presente' : 'Ausente'}
                          </span>
                        </div>
                        {!d.asistio && (
                          <input value={d.observaciones} onChange={ev => setObs(e.id, ev.target.value)}
                            placeholder="Observación (dolor, aviso previo...)"
                            className="input-dark" style={{ marginTop: '10px', fontSize: '0.82rem' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
              <IconoCronometro style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
              <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#A09A8C', marginBottom: '8px' }}>Selecciona una sesión</h3>
              <p style={{ color: '#666', fontSize: '0.85rem' }}>Elige un grupo y luego una sesión para registrar asistencia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
