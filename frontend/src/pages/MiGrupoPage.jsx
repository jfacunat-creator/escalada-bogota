import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoMuro, IconoCronometro, IconoEscalador, IconoCheck, IconoFalta, IconoPlanEntreno } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };
const tipoColor = { regular: '#D4AF37', juego_cierre: '#c084fc', test: '#f59e0b', checkpoint_fest: '#ef4444' };
const tipoLabel = { regular: 'Sesión', juego_cierre: 'Juego', test: 'Test', checkpoint_fest: 'Fest' };
const horarioLabel = { lun_mie_18_20: 'Lun y Mié · 18:00–20:00', lun_mie_20_22: 'Lun y Mié · 20:00–22:00', mar_jue_18_20: 'Mar y Jue · 18:00–20:00', mar_jue_20_22: 'Mar y Jue · 20:00–22:00', sab_dom_9_11: 'Sáb y Dom · 9:00–11:00' };

function PagosTab({ inscripcion }) {
  if (!inscripcion) return null;
  const pagos = inscripcion.pagos || [];
  const estadoColor = { pagado: '#22c55e', pendiente: '#f59e0b', vencido: '#ef4444' };
  const estadoLabel = { pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido' };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.text }}>Pagos del ciclo</div>
        <div style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: C.accent }}>
          Total: ${inscripcion.precio_ciclo?.toLocaleString('es-CO') || '—'}
        </div>
      </div>
      {pagos.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>
          No hay registros de pago aún.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Poppins', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#242424' }}>
              {['Fecha', 'Monto', 'Método', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: C.text2, fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((p, i) => (
              <tr key={p.id || i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 16px', color: C.text2 }}>{p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO') : '—'}</td>
                <td style={{ padding: '10px 16px', color: C.text }}>${p.monto?.toLocaleString('es-CO')}</td>
                <td style={{ padding: '10px 16px', color: C.text2, textTransform: 'capitalize' }}>{p.metodo || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    background: (estadoColor[p.estado] || '#666') + '20', color: estadoColor[p.estado] || '#666' }}>
                    {estadoLabel[p.estado] || p.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function MiGrupoPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [asistencia, setAsistencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sesiones');
  const [contenido, setContenido] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const p = await api.getMe();
      setProfile(p);
      const insc = p.escalador?.inscripciones || [];
      const act = insc.find(i => i.estado === 'activa') || insc[0];
      if (act?.cohorte) {
        const [ses, asis, cont] = await Promise.all([
          api.getSesiones(act.cohorte.id),
          api.getAsistenciaEscalador(p.escalador.id, act.cohorte.id),
          api.getContenido({ cicloId: act.cohorte.ciclo?.id, programaId: act.cohorte.programa?.id }).catch(() => []),
        ]);
        setSesiones(ses); setAsistencia(asis); setContenido(cont || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} /></div>;

  const insc = profile?.escalador?.inscripciones?.find(i => i.estado === 'activa');
  const grupo = insc?.cohorte;
  const res = asistencia?.resumen || { total: 0, asistencias: 0, faltas: 0, porcentaje: 0 };
  const hoy = new Date().toISOString().split('T')[0];
  const asistMap = {};
  if (asistencia?.registros) for (const r of asistencia.registros) asistMap[r.fecha?.split('T')[0]] = r;

  if (!grupo) return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
      <IconoMuro style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
      <h3 style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text2, marginBottom: '8px' }}>Sin grupo activo</h3>
      <p style={{ color: '#666', fontFamily: 'Poppins', fontSize: '0.85rem' }}>Contacta al equipo para inscribirte en el próximo ciclo.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mi Grupo</h1>
        <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>{grupo.programa?.nombre || insc.programa}</p>
      </div>

      {/* Info del grupo */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: '#4A2F0F', padding: '16px 20px' }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text }}>{grupo.programa?.nombre || insc.programa}</div>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: C.accent, marginTop: '3px' }}>
          {grupo.ciclo?.codigo || insc.ciclo} · {grupo.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: '#A09A8C', marginTop: '4px' }}>
          {grupo.ciclo?.fecha_inicio ? `${new Date(grupo.ciclo.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} – ${new Date(grupo.ciclo.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
        </div>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: C.text2, fontFamily: 'Poppins' }}>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><IconoCronometro style={{ width: '14px', height: '14px' }} />{horarioLabel[grupo.horario] || grupo.horario}</span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><IconoMuro style={{ width: '14px', height: '14px' }} />{insc.muro || grupo.muro?.nombre}</span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><IconoEscalador style={{ width: '14px', height: '14px' }} />Entrenador: {grupo.entrenador?.nombre || '—'}</span>
        </div>
      </div>

      {/* Stats asistencia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }} className="mis-stats">
        <style>{`@media(max-width:600px){.mis-stats{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        {[[sesiones.length, 'Total sesiones', C.text2], [res.asistencias, 'Asistencias', '#22c55e'], [res.faltas, 'Faltas', '#ef4444'], [res.porcentaje + '%', 'Asistencia', res.porcentaje >= 80 ? '#22c55e' : '#f59e0b']].map(([v, l, c]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: c }}>{v}</div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2, marginTop: '2px' }}>{l}</div>
            {l === 'Asistencia' && res.porcentaje >= 80 && <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: '#22c55e', marginTop: '2px' }}>✓ Garantía activa</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
        {[['sesiones', 'Sesiones'], ['pagos', 'Pagos'], ['contenido', 'Contenido del ciclo']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.85rem', fontWeight: tab === k ? 600 : 400, background: tab === k ? '#4A2F0F' : 'transparent', color: tab === k ? C.accent : C.text2, transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* Sesiones */}
      {tab === 'sesiones' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sesiones.length === 0 ? (
            <p style={{ color: C.text2, fontFamily: 'Poppins', padding: '20px', textAlign: 'center' }}>Las sesiones aún no han sido generadas.</p>
          ) : sesiones.map(s => {
            const fs = s.fecha?.split('T')[0]; const a = asistMap[fs];
            const past = fs < hoy; const today = fs === hoy;
            const d = new Date(s.fecha);
            return (
              <div key={s.id} style={{ background: '#242424', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: today ? `1px solid ${C.accent}40` : '1px solid transparent' }}>
                <div style={{ textAlign: 'center', width: '40px', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.68rem', color: C.text2, textTransform: 'capitalize' }}>{d.toLocaleDateString('es-CO', { weekday: 'short' })}</div>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: tipoColor[s.tipo] + '20', color: tipoColor[s.tipo], fontFamily: 'Poppins' }}>{tipoLabel[s.tipo]}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'Poppins' }}>#{s.numero_sesion}</span>
                    {today && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: `${C.accent}15`, color: C.accent, fontFamily: 'Poppins' }}>Hoy</span>}
                  </div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: C.text2, marginTop: '3px' }}>{s.hora_inicio?.substring(0, 5)} – {s.hora_fin?.substring(0, 5)}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {a ? (a.asistio ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e', fontFamily: 'Poppins', fontSize: '0.82rem', fontWeight: 500 }}><IconoCheck style={{ width: '15px', height: '15px' }} />Asistió</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontFamily: 'Poppins', fontSize: '0.82rem', fontWeight: 500 }}><IconoFalta style={{ width: '15px', height: '15px' }} />Falta</span>) : past ? <span style={{ color: '#444', fontFamily: 'Poppins', fontSize: '0.8rem' }}>Sin registro</span> : <span style={{ color: '#333', fontFamily: 'Poppins', fontSize: '0.8rem' }}>Próxima</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagos */}
      {tab === 'pagos' && (
        <PagosTab inscripcion={insc} />
      )}

      {/* Contenido del ciclo */}
      {tab === 'contenido' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contenido.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <IconoPlanEntreno style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 10px' }} />
              <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>El contenido de este ciclo aún no está cargado.</p>
            </div>
          ) : contenido.map((item, i) => (
            <div key={item.id || i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#4A2F0F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Antonio', fontSize: '0.9rem', color: C.accent }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{item.titulo}</div>
                <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px', textTransform: 'capitalize' }}>
                  {item.tipo} {item.duracion_seg ? `· ${Math.round(item.duracion_seg / 60)} min` : ''}
                </div>
              </div>
              {item.progreso_pct !== undefined && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'Antonio', color: item.progreso_pct >= 100 ? '#22c55e' : C.accent }}>
                    {item.progreso_pct || 0}%
                  </div>
                  <div style={{ width: '60px', height: '4px', background: '#2e2e2e', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ width: `${Math.min(item.progreso_pct || 0, 100)}%`, height: '100%', background: item.progreso_pct >= 100 ? '#22c55e' : C.accent, borderRadius: '2px' }} />
                  </div>
                </div>
              )}
              {item.archivo_url && (
                <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '6px 12px', borderRadius: '6px', background: '#4A2F0F', color: C.accent, fontSize: '0.78rem', fontFamily: 'Poppins', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                  Abrir →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
