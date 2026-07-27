import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import { IconoEscalador, IconoCronometro, IconoCheck, IconoFalta, IconoCohorte, IconoMagnesia, IconoCuerda } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };

const horarioLabel = {
  lun_mie_18_20: 'Lun y Mié · 18:00–20:00', lun_mie_20_22: 'Lun y Mié · 20:00–22:00',
  mar_jue_18_20: 'Mar y Jue · 18:00–20:00', mar_jue_20_22: 'Mar y Jue · 20:00–22:00',
  sab_dom_7_9: 'Sáb y Dom · 7:00–9:00', sab_dom_9_11: 'Sáb y Dom · 9:00–11:00', sab_dom_11_13: 'Sáb y Dom · 11:00–13:00',
};

const tipoColor = { regular: '#D4AF37', juego_cierre: '#c084fc', test: '#f59e0b', checkpoint_fest: '#ef4444' };
const tipoLabel = { regular: 'Sesión', juego_cierre: 'Juego', test: 'Test', checkpoint_fest: 'Fest' };

// ── PANEL DE ASISTENCIA (dentro de sesiones) ──────────────
function PanelAsistencia({ sesion, grupoId, onClose }) {
  const [escaladores, setEscaladores] = useState([]);
  const [asistData, setAsistData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [buscar, setBuscar] = useState('');

  useEffect(() => {
    Promise.all([
      api.getEscaladores({ cohorteId: grupoId }),
      api.getSesion(sesion.id),
    ]).then(([escs, detail]) => {
      setEscaladores(escs);
      const aData = {};
      for (const a of detail.asistencia || []) aData[a.escalador_id] = { asistio: a.asistio, obs: a.observaciones || '' };
      for (const e of escs) if (!aData[e.id]) aData[e.id] = { asistio: true, obs: '' };
      setAsistData(aData);
    }).catch(console.error);
  }, [sesion.id, grupoId]);

  const toggle = (id) => { setAsistData(p => ({ ...p, [id]: { ...p[id], asistio: !p[id].asistio } })); setSaved(false); };
  const setObs = (id, v) => setAsistData(p => ({ ...p, [id]: { ...p[id], obs: v } }));

  const guardar = async () => {
    setSaving(true);
    try {
      const registros = Object.entries(asistData).map(([escaladorId, d]) => ({ escaladorId, asistio: d.asistio, observaciones: d.obs || undefined }));
      await api.registrarAsistencia(sesion.id, registros);
      setSaved(true);
    } catch (err) { alert(err.error || 'Error'); }
    finally { setSaving(false); }
  };

  const filtrados = escaladores.filter(e => !buscar || `${e.nombre} ${e.apellido}`.toLowerCase().includes(buscar.toLowerCase()));
  const presentes = Object.values(asistData).filter(d => d.asistio).length;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header sesión */}
      <div style={{ background: '#4A2F0F', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: '#F0EDE8' }}>Sesión #{sesion.numero_sesion}</div>
          <div style={{ fontSize: '0.82rem', color: C.accent, marginTop: '2px' }}>
            {new Date(sesion.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · {sesion.hora_inicio?.substring(0, 5)}–{sesion.hora_fin?.substring(0, 5)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: '#22c55e' }}>{presentes}/{escaladores.length}</span>
          <button onClick={guardar} disabled={saving} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.85rem',
            background: saved ? '#22c55e' : C.accent, color: '#121212',
          }}>
            {saving ? '...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, fontSize: '1.2rem', padding: '4px' }}>✕</button>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.text2 }} />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar escalador..."
            style={{ width: '100%', background: '#242424', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px 8px 32px', color: C.text, fontFamily: 'Poppins', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '480px', overflowY: 'auto' }}>
        {filtrados.map(e => {
          const d = asistData[e.id] || { asistio: true, obs: '' };
          return (
            <div key={e.id} style={{ borderRadius: '8px', padding: '10px 14px', border: `1px solid ${d.asistio ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, background: d.asistio ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => toggle(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    {d.asistio
                      ? <IconoCheck style={{ width: '24px', height: '24px', color: '#22c55e' }} />
                      : <IconoFalta style={{ width: '24px', height: '24px', color: '#ef4444' }} />}
                  </button>
                  <span style={{ fontWeight: 600, color: C.text, fontSize: '0.9rem' }}>{e.nombre} {e.apellido}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: d.asistio ? '#22c55e' : '#ef4444' }}>
                  {d.asistio ? 'Presente' : 'Ausente'}
                </span>
              </div>
              {!d.asistio && (
                <input value={d.obs} onChange={ev => setObs(e.id, ev.target.value)} placeholder="Observación (dolor, aviso previo...)"
                  style={{ marginTop: '8px', width: '100%', background: '#242424', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '7px 10px', color: C.text, fontFamily: 'Poppins', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TAB SESIONES ──────────────────────────────────────────
function TabSesiones({ grupoId }) {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    api.getSesiones(grupoId).then(setSesiones).catch(console.error).finally(() => setLoading(false));
  }, [grupoId]);

  const generar = async () => {
    setGenerando(true);
    try { await api.generarSesiones(grupoId); const s = await api.getSesiones(grupoId); setSesiones(s); }
    catch (e) { alert(e.error || 'Error'); } finally { setGenerando(false); }
  };

  const hoy = new Date().toISOString().split('T')[0];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: C.accent, margin: '0 auto' }} /></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '16px' }} className="ses-layout">
      <style>{`@media(max-width:900px){.ses-layout{grid-template-columns:1fr!important}}`}</style>

      {/* Lista sesiones */}
      <div>
        {sesiones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: C.text2, marginBottom: '16px', fontFamily: 'Poppins', fontSize: '0.9rem' }}>No hay sesiones generadas para este grupo.</p>
            <button onClick={generar} disabled={generando} style={{ padding: '10px 24px', background: C.accent, color: '#121212', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700 }}>
              {generando ? 'Generando...' : 'Generar sesiones del ciclo'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sesiones.map(s => {
              const fs = s.fecha?.split('T')[0];
              const esHoy = fs === hoy;
              const isSelected = selected?.id === s.id;
              const tieneAsist = parseInt(s.asistentes) > 0;
              return (
                <button key={s.id} onClick={() => setSelected(isSelected ? null : s)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${isSelected ? `${C.accent}40` : esHoy ? 'rgba(245,158,11,0.25)' : C.border}`, background: isSelected ? 'rgba(212,175,55,0.08)' : esHoy ? 'rgba(245,158,11,0.05)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.accent, width: '32px' }}>#{s.numero_sesion}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: C.text, fontFamily: 'Poppins', fontWeight: 500 }}>
                        {new Date(s.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ color: tipoColor[s.tipo] }}>{tipoLabel[s.tipo]}</span>
                        <span>{s.hora_inicio?.substring(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tieneAsist && <span style={{ fontSize: '0.78rem', color: '#22c55e', fontFamily: 'Poppins' }}>{s.asistentes}/{s.registros}</span>}
                    {esHoy && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>
                      {isSelected ? 'Cerrar ▲' : 'Registrar →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel asistencia */}
      {selected && <PanelAsistencia sesion={selected} grupoId={grupoId} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── TAB ESCALADORES ───────────────────────────────────────
function TabEscaladores({ grupoId, isAdmin }) {
  const [escaladores, setEscaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [showRemitir, setShowRemitir] = useState(null);
  const [aliados, setAliados] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getEscaladores({ cohorteId: grupoId }).then(setEscaladores),
      fetch('/api/catalogos/aliados-salud', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()).then(setAliados).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [grupoId]);

  const cambiarEstado = async (id, estado) => {
    try { await api.cambiarEstadoInscripcion(id, estado); const e = await api.getEscaladores({ cohorteId: grupoId }); setEscaladores(e); }
    catch (err) { alert(err.error || 'Error'); }
  };

  const filtrados = escaladores.filter(e => !buscar || `${e.nombre} ${e.apellido} ${e.email || ''}`.toLowerCase().includes(buscar.toLowerCase()));

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: C.accent, margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ marginBottom: '14px', position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.text2 }} />
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre o email..."
          style={{ width: '100%', background: '#242424', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px 10px 36px', color: C.text, fontFamily: 'Poppins', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {filtrados.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>
          {buscar ? 'Sin resultados para esa búsqueda' : 'Sin escaladores inscritos en este grupo'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtrados.map(e => (
            <div key={e.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconoEscalador style={{ width: '18px', height: '18px', color: C.text2 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: '0.9rem', fontFamily: 'Poppins' }}>{e.nombre} {e.apellido}</div>
                    <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>{e.email || e.telefono || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins',
                    background: e.estado === 'activo' ? 'rgba(34,197,94,0.1)' : e.estado === 'congelado' ? 'rgba(245,158,11,0.1)' : 'rgba(100,100,100,0.1)',
                    color: e.estado === 'activo' ? '#22c55e' : e.estado === 'congelado' ? '#f59e0b' : '#666',
                  }}>{e.estado}</span>
                  {(isAdmin || true) && (
                    <>
                      {e.estado === 'activo' && (
                        <button onClick={() => cambiarEstado(e.inscripciones?.[0]?.id || e.id, 'congelada')}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins', fontWeight: 500, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                          Congelar
                        </button>
                      )}
                      {e.estado === 'congelado' && (
                        <button onClick={() => cambiarEstado(e.inscripciones?.[0]?.id || e.id, 'activa')}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins', fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                          Reactivar
                        </button>
                      )}
                      <button onClick={() => setShowRemitir(e)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins', fontWeight: 500, background: 'transparent', color: C.text2 }}>
                        Remitir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal remitir */}
      {showRemitir && (
        <div onClick={() => setShowRemitir(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1c1c1c', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '340px' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.text, marginBottom: '4px' }}>Remitir escalador</div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.85rem', color: C.text2, marginBottom: '16px' }}>{showRemitir.nombre} {showRemitir.apellido}</div>
            {aliados.length === 0 ? <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>Sin aliados de salud disponibles.</p> : aliados.map(a => (
              <button key={a.id} onClick={() => { alert(`Remisión a ${a.nombre} registrada (pendiente implementación completa)`); setShowRemitir(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', marginBottom: '8px', textAlign: 'left' }}>
                {a.tipo === 'fisioterapia' ? <IconoCuerda style={{ width: '18px', height: '18px', color: '#f43f5e' }} /> : <IconoMagnesia style={{ width: '18px', height: '18px', color: '#22c55e' }} />}
                <div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.85rem', fontWeight: 600, color: C.text }}>{a.nombre}</div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: C.text2, textTransform: 'capitalize' }}>{a.tipo}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setShowRemitir(null)} style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'Poppins', color: C.text2 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB RESUMEN ASISTENCIA ────────────────────────────────
function TabResumen({ grupoId }) {
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getResumenAsistencia(grupoId).then(setResumen).catch(console.error).finally(() => setLoading(false));
  }, [grupoId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: C.accent, margin: '0 auto' }} /></div>;
  if (resumen.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>Sin datos de asistencia registrados.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Escalador', 'Sesiones', 'Asistencias', '%', 'Garantía ≥80%'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Escalador' ? 'left' : 'center', fontSize: '0.72rem', color: C.text2, fontWeight: 600, fontFamily: 'Poppins', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resumen.map(r => {
            const pct = parseFloat(r.porcentaje) || 0;
            return (
              <tr key={r.id} style={{ borderBottom: `1px solid rgba(46,46,46,0.5)` }}>
                <td style={{ padding: '12px', color: C.text, fontWeight: 600, fontFamily: 'Poppins', fontSize: '0.88rem' }}>{r.nombre} {r.apellido}</td>
                <td style={{ padding: '12px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.88rem' }}>{r.total_sesiones}</td>
                <td style={{ padding: '12px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.88rem' }}>{r.asistencias}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {pct >= 80
                    ? <IconoCheck style={{ width: '20px', height: '20px', color: '#22c55e', margin: '0 auto' }} />
                    : <IconoFalta style={{ width: '20px', height: '20px', color: '#2e2e2e', margin: '0 auto' }} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────
export default function GrupoDetallePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grupo, setGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sesiones');

  const isAdmin = user?.rol === 'admin';
  const backTo = isAdmin ? '/app/grupos' : '/app/mis-grupos';

  useEffect(() => {
    api.getCohorte(id).then(setGrupo).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', background: '#121212', minHeight: '60vh' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;
  if (!grupo) return <div style={{ padding: '60px', textAlign: 'center', color: '#A09A8C', fontFamily: 'Poppins' }}>Grupo no encontrado.</div>;

  const tabs = [
    { id: 'sesiones', label: 'Sesiones y asistencia' },
    { id: 'escaladores', label: 'Escaladores' },
    { id: 'resumen', label: 'Resumen asistencia' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={() => navigate(backTo)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#A09A8C', fontFamily: 'Poppins', fontSize: '0.85rem', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={16} /> Volver a grupos
      </button>

      {/* Header */}
      <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ background: '#4A2F0F', padding: '18px 22px' }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: '#F0EDE8' }}>{grupo.programa_nombre}</div>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: '#D4AF37', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>{grupo.ciclo_codigo}</span>
            <span>{horarioLabel[grupo.horario] || grupo.horario}</span>
            <span>{grupo.muro_nombre}</span>
            <span style={{ color: '#22c55e' }}>{grupo.inscritos_actual || 0}/{grupo.cupo_maximo} cupos</span>
          </div>
        </div>
        {grupo.entrenador_nombre && (
          <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#A09A8C', fontFamily: 'Poppins', borderTop: '1px solid #2e2e2e' }}>
            <IconoEscalador style={{ width: '14px', height: '14px' }} /> Entrenador: {grupo.entrenador_nombre}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#1c1c1c', borderRadius: '10px', padding: '4px', marginBottom: '20px', border: '1px solid #2e2e2e', width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontFamily: 'Poppins', fontSize: '0.85rem', fontWeight: tab === t.id ? 600 : 400,
            background: tab === t.id ? '#4A2F0F' : 'transparent',
            color: tab === t.id ? '#D4AF37' : '#A09A8C',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contenido del tab */}
      <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '20px' }}>
        {tab === 'sesiones' && <TabSesiones grupoId={id} />}
        {tab === 'escaladores' && <TabEscaladores grupoId={id} isAdmin={isAdmin} />}
        {tab === 'resumen' && <TabResumen grupoId={id} />}
      </div>
    </div>
  );
}
