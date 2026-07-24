import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoMuro, IconoCronometro, IconoCheck, IconoFalta } from '../components/Icons';

const tipoLabel = { regular: 'Sesión', juego_cierre: 'Juego', test: 'Test', checkpoint_fest: 'Fest' };
const tipoColor = { regular: '#D4AF37', juego_cierre: '#c084fc', test: '#f59e0b', checkpoint_fest: '#ef4444' };

export default function MisSesionesPage() {
  const { user } = useAuth();
  const [sesiones, setSesiones] = useState([]);
  const [asistencia, setAsistencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cohorteId, setCohorteId] = useState(null);
  const [cohorteName, setCohorteName] = useState('');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const p = await api.getMe();
      const insc = p.escalador?.inscripciones || [];
      const act = insc.find(i => i.estado === 'activa') || insc[0];
      if (act?.cohorte) {
        setCohorteId(act.cohorte.id);
        setCohorteName(act.cohorte.programa?.nombre || 'Mi Grupo');
        const [ses, asis] = await Promise.all([api.getSesiones(act.cohorte.id), api.getAsistenciaEscalador(p.escalador.id, act.cohorte.id)]);
        setSesiones(ses); setAsistencia(asis);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;
  if (!cohorteId) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <IconoMuro style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
      <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#A09A8C' }}>Sin grupo activo</h2>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>Inscríbete en un ciclo para ver tus sesiones.</p>
    </div>
  );

  const hoy = new Date().toISOString().split('T')[0];
  const asistMap = {};
  if (asistencia?.registros) for (const r of asistencia.registros) asistMap[r.fecha?.split('T')[0] || r.fecha] = r;
  const res = asistencia?.resumen || { total: 0, asistencias: 0, faltas: 0, porcentaje: 0 };

  const meses = {};
  for (const s of sesiones) {
    const f = new Date(s.fecha);
    const k = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    if (!meses[k]) meses[k] = { label: f.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }), items: [] };
    meses[k].items.push(s);
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Mis Sesiones</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{cohorteName}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }} className="ses-stats">
        <style>{`@media(max-width:600px){.ses-stats{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        {[
          [sesiones.length, 'Total', '#A09A8C'],
          [res.asistencias, 'Asistencias', '#22c55e'],
          [res.faltas, 'Faltas', '#ef4444'],
          [res.porcentaje + '%', 'Asistencia', res.porcentaje >= 80 ? '#22c55e' : '#f59e0b'],
        ].map(([v, l, c]) => (
          <div key={l} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.6rem', color: c, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: '0.75rem', color: '#A09A8C', marginTop: '4px' }}>{l}</div>
          </div>
        ))}
      </div>

      {Object.entries(meses).map(([k, m]) => (
        <div key={k} style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.72rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px', textTransform: 'capitalize' }}>{m.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {m.items.map(s => {
              const fs = s.fecha?.split('T')[0]; const a = asistMap[fs];
              const past = fs < hoy; const today = fs === hoy;
              const d = new Date(s.fecha);
              return (
                <div key={s.id} style={{
                  background: '#1c1c1c', borderRadius: '10px', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  border: today ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2e2e2e',
                }}>
                  <div style={{ textAlign: 'center', width: '44px', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#A09A8C', textTransform: 'capitalize' }}>{d.toLocaleDateString('es-CO', { weekday: 'short' })}</div>
                    <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#F0EDE8', lineHeight: 1 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: tipoColor[s.tipo] + '20', color: tipoColor[s.tipo] }}>{tipoLabel[s.tipo]}</span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>#{s.numero_sesion}</span>
                      {today && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>Hoy</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#A09A8C', marginTop: '4px' }}>{s.hora_inicio?.substring(0, 5)} – {s.hora_fin?.substring(0, 5)}</div>
                  </div>
                  <div>
                    {a ? (a.asistio
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '0.85rem', fontWeight: 500 }}><IconoCheck style={{ width: '18px', height: '18px' }} /> Asistió</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 500 }}><IconoFalta style={{ width: '18px', height: '18px' }} /> Falta</span>
                    ) : past
                      ? <span style={{ color: '#666', fontSize: '0.8rem' }}>Sin registro</span>
                      : <span style={{ color: '#444', fontSize: '0.8rem' }}>Próxima</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {sesiones.length === 0 && (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <IconoCronometro style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 8px' }} />
          <p style={{ color: '#A09A8C' }}>Las sesiones aún no han sido generadas para este grupo.</p>
        </div>
      )}
    </div>
  );
}
