import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2, CreditCard, BookOpen } from 'lucide-react';
import { IconoMuro, IconoCronometro, IconoEscalador, IconoCheck, IconoFalta } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };
const tipoColor  = { regular: '#D4AF37', juego_cierre: '#c084fc', test: '#f59e0b', checkpoint_fest: '#ef4444' };
const tipoLabel  = { regular: 'Sesión', juego_cierre: 'Juego', test: 'Test', checkpoint_fest: 'Fest' };
const horarioLabel = {
  lun_mie_18_20: 'Lun y Mié · 18:00–20:00', lun_mie_20_22: 'Lun y Mié · 20:00–22:00',
  mar_jue_18_20: 'Mar y Jue · 18:00–20:00', mar_jue_20_22: 'Mar y Jue · 20:00–22:00',
  sab_dom_7_9:   'Sáb y Dom · 7:00–9:00',   sab_dom_9_11:  'Sáb y Dom · 9:00–11:00',
  sab_dom_11_13: 'Sáb y Dom · 11:00–13:00',
};

export default function MiGrupoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]     = useState(null);
  const [sesiones, setSesiones]   = useState([]);
  const [asistencia, setAsistencia] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const p = await api.getMe();
      setProfile(p);
      const insc = p.escalador?.inscripciones || [];
      const act  = insc.find(i => i.estado === 'activa') || insc[0];
      if (act?.cohorte?.id) {
        const [ses, asis] = await Promise.all([
          api.getSesiones(act.cohorte.id).catch(() => []),
          api.getAsistenciaEscalador(p.escalador.id, act.cohorte.id).catch(() => null),
        ]);
        setSesiones(ses || []);
        setAsistencia(asis);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} />
    </div>
  );

  const insc  = profile?.escalador?.inscripciones?.find(i => i.estado === 'activa');
  const grupo = insc?.cohorte;
  const res   = asistencia?.resumen || { total: 0, asistencias: 0, faltas: 0, porcentaje: 0 };
  const hoy   = new Date().toISOString().split('T')[0];

  const asistMap = {};
  if (asistencia?.registros) for (const r of asistencia.registros) asistMap[r.fecha?.split('T')[0]] = r;

  // Calcular semana y sesión actual
  const sesionesOrdenadas = [...sesiones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const sesionHoy     = sesionesOrdenadas.find(s => s.fecha?.split('T')[0] === hoy);
  const proximaSesion = sesionesOrdenadas.find(s => s.fecha?.split('T')[0] > hoy);
  const sesionActual  = sesionHoy || proximaSesion;
  const sesionesPassadas = sesionesOrdenadas.filter(s => s.fecha?.split('T')[0] < hoy).length;
  // Semana = cada 2 sesiones (horarios de lun/mié o mar/jue)
  const semanaActual  = sesionActual ? Math.ceil(sesionActual.numero_sesion / 2) : null;
  const totalSemanas  = sesionesOrdenadas.length > 0 ? Math.ceil(sesionesOrdenadas.length / 2) : null;

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
        <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>{grupo.programa?.nombre}</p>
      </div>

      {/* Info del grupo */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: '#4A2F0F', padding: '16px 20px' }}>
          <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text }}>{grupo.programa?.nombre}</div>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: C.accent, marginTop: '3px' }}>
            {grupo.ciclo?.codigo} · {grupo.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}
          </div>
          {grupo.ciclo?.fechaInicio && (
            <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: C.text2, marginTop: '4px' }}>
              {new Date(grupo.ciclo.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              {' – '}
              {new Date(grupo.ciclo.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: C.text2, fontFamily: 'Poppins' }}>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <IconoCronometro style={{ width: '14px', height: '14px' }} />
            {horarioLabel[grupo.horario] || grupo.horario}
          </span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <IconoMuro style={{ width: '14px', height: '14px' }} />
            {grupo.muro?.nombre}
          </span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <IconoEscalador style={{ width: '14px', height: '14px' }} />
            Entrenador: {grupo.entrenador?.nombre || '—'}
          </span>
        </div>
      </div>

      {/* Semana / sesión actual */}
      {sesionActual && (
        <div style={{ background: '#1a1400', border: `1px solid ${C.accent}30`, borderLeft: `3px solid ${C.accent}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>
              {sesionHoy ? 'Sesión de hoy' : 'Próxima sesión'}
            </div>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text }}>
              Sesión #{sesionActual.numero_sesion}
              {semanaActual && <span style={{ fontSize: '1rem', color: C.text2, fontFamily: 'Poppins', fontWeight: 400, marginLeft: '12px' }}>Semana {semanaActual}{totalSemanas ? ` / ${totalSemanas}` : ''}</span>}
            </div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: C.text2, marginTop: '2px' }}>
              {new Date(sesionActual.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{sesionActual.hora_inicio?.substring(0, 5)}–{sesionActual.hora_fin?.substring(0, 5)}
            </div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Poppins', background: tipoColor[sesionActual.tipo] + '20', color: tipoColor[sesionActual.tipo] }}>
            {tipoLabel[sesionActual.tipo]}
          </span>
        </div>
      )}

      {/* Stats asistencia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }} className="mis-stats">
        <style>{`@media(max-width:600px){.mis-stats{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        {[
          [sesiones.length,         'Total sesiones', C.text2],
          [res.asistencias,         'Asistencias',    '#22c55e'],
          [res.faltas,              'Faltas',          '#ef4444'],
          [res.porcentaje + '%',    'Asistencia',      res.porcentaje >= 80 ? '#22c55e' : '#f59e0b'],
        ].map(([v, l, c]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: c }}>{v}</div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2, marginTop: '2px' }}>{l}</div>
            {l === 'Asistencia' && res.porcentaje >= 80 && (
              <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: '#22c55e', marginTop: '2px' }}>✓ Garantía activa</div>
            )}
          </div>
        ))}
      </div>

      {/* Accesos rápidos a otros módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/app/mis-pagos')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}>
          <CreditCard style={{ width: '22px', height: '22px', color: C.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.88rem', color: C.text }}>Mis Pagos</div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: C.text2, marginTop: '2px' }}>Ver mensualidades y estado de pago</div>
          </div>
        </button>
        <button onClick={() => navigate('/app/contenido')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}>
          <BookOpen style={{ width: '22px', height: '22px', color: '#818cf8', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.88rem', color: C.text }}>Contenido del Ciclo</div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: C.text2, marginTop: '2px' }}>Planes, videos y material de apoyo</div>
          </div>
        </button>
      </div>

      {/* Lista de sesiones */}
      <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>
        Sesiones del ciclo
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sesiones.length === 0 ? (
          <p style={{ color: C.text2, fontFamily: 'Poppins', padding: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
            Las sesiones aún no han sido generadas.
          </p>
        ) : sesionesOrdenadas.map(s => {
          const fs  = s.fecha?.split('T')[0];
          const a   = asistMap[fs];
          const past  = fs < hoy;
          const today = fs === hoy;
          const d   = new Date(s.fecha);
          const semana = Math.ceil(s.numero_sesion / 2);

          return (
            <div key={s.id} style={{ background: today ? '#1a1400' : '#242424', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: today ? `1px solid ${C.accent}40` : '1px solid transparent' }}>
              {/* Fecha */}
              <div style={{ textAlign: 'center', width: '38px', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.65rem', color: C.text2, textTransform: 'capitalize' }}>
                  {d.toLocaleDateString('es-CO', { weekday: 'short' })}
                </div>
                <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.text }}>{d.getDate()}</div>
              </div>

              {/* Info sesión */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: tipoColor[s.tipo] + '20', color: tipoColor[s.tipo], fontFamily: 'Poppins' }}>
                    {tipoLabel[s.tipo]}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'Poppins' }}>
                    #{s.numero_sesion} · Sem {semana}
                  </span>
                  {today && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: `${C.accent}15`, color: C.accent, fontFamily: 'Poppins' }}>Hoy</span>}
                </div>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text2, marginTop: '2px' }}>
                  {s.hora_inicio?.substring(0, 5)}–{s.hora_fin?.substring(0, 5)}
                </div>
              </div>

              {/* Asistencia */}
              <div style={{ flexShrink: 0 }}>
                {a ? (
                  a.asistio
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontFamily: 'Poppins', fontSize: '0.78rem', fontWeight: 500 }}><IconoCheck style={{ width: '14px', height: '14px' }} />Asistió</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontFamily: 'Poppins', fontSize: '0.78rem', fontWeight: 500 }}><IconoFalta style={{ width: '14px', height: '14px' }} />Falta</span>
                ) : past
                  ? <span style={{ color: '#444', fontFamily: 'Poppins', fontSize: '0.78rem' }}>Sin registro</span>
                  : <span style={{ color: '#333', fontFamily: 'Poppins', fontSize: '0.78rem' }}>Próxima</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
