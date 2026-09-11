import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2, CreditCard, BookOpen, ChevronDown, ChevronUp, ClipboardList, CheckCircle2 } from 'lucide-react';
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

// Definición de las pruebas del protocolo (fuente de verdad)
const PRUEBAS_TEST = [
  { id: 'barras_lastre_kg',         label: 'T2 · Barras con máximo lastre',    unidad: 'kg',  desc: '1RM dominada con lastre adicional en barra' },
  { id: 'suspensiones_20mm_kg',     label: 'T4 · Suspensiones en regleta 20mm',unidad: 'kg',  desc: 'Máximo lastre en suspensión isométrica 20mm' },
  { id: 'repeticiones_regleta_rep', label: 'T5 · Repeticiones en regleta',     unidad: 'rep', desc: 'Reps al fallo en regleta (yema de dedos)' },
  { id: 'resistencia_continua_seg', label: 'T6 · Resistencia continua',        unidad: 'seg', desc: 'Tiempo máximo de suspensión continua en regleta' },
  { id: 'campus_movimientos',       label: 'T7 · Campus movimientos',           unidad: 'mov', desc: 'Total de movimientos en tabla campus' },
  { id: 'grado_critico_un',         label: 'T9 · Grado crítico',               unidad: 'un',  desc: 'Grado de vía encadenado al 70% de intentos' },
  { id: 'powerslab_d_cm',           label: 'Powerslab Derecho',                unidad: 'cm',  desc: 'Alcance máximo brazo derecho en Powerslab' },
  { id: 'powerslab_i_cm',           label: 'Powerslab Izquierdo',              unidad: 'cm',  desc: 'Alcance máximo brazo izquierdo en Powerslab' },
  { id: 'circuito_min',             label: 'Circuito estándar',                unidad: 'min', desc: 'Tiempo de completación del circuito' },
];

const SEM_OPTIONS = [
  { value: 'verde',    label: 'Óptimo',     bg: '#052010', border: '#22c55e60', color: '#22c55e' },
  { value: 'amarillo', label: 'Regular',    bg: '#1a1200', border: '#f59e0b60', color: '#f59e0b' },
  { value: 'rojo',     label: 'Por mejorar',bg: '#200505', border: '#ef444460', color: '#ef4444' },
];

function TestForm({ sesion, onSuccess, onCancel }) {
  const [valores, setValores] = useState(() => {
    const init = {};
    PRUEBAS_TEST.forEach(p => { init[p.id] = { valor: '', semaforo: 'verde' }; });
    return init;
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const setValor = (id, v) => setValores(prev => ({ ...prev, [id]: { ...prev[id], valor: v } }));
  const setSem   = (id, s) => setValores(prev => ({ ...prev, [id]: { ...prev[id], semaforo: s } }));

  const handleSubmit = async () => {
    const resultados = PRUEBAS_TEST
      .filter(p => valores[p.id].valor !== '' && !isNaN(parseFloat(valores[p.id].valor)))
      .map(p => ({ metrica: p.id, valor: parseFloat(valores[p.id].valor), unidad: p.unidad, semaforo: valores[p.id].semaforo }));

    if (resultados.length === 0) { setError('Ingresa al menos un resultado antes de guardar.'); return; }

    setGuardando(true);
    setError('');
    try {
      await api.registrarMiTest(sesion.id, resultados);
      onSuccess();
    } catch (e) {
      setError(e.error || e.message || 'Error al guardar. Intenta de nuevo.');
    } finally { setGuardando(false); }
  };

  return (
    <div style={{ background: '#0e0e0e', border: '1px solid #f59e0b30', borderRadius: '10px', padding: '16px', margin: '8px 0' }}>
      <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: '#f59e0b', marginBottom: '4px' }}>
        Registrar resultados del test
      </div>
      <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: C.text2, marginBottom: '16px' }}>
        Ingresa los valores que obtuviste. Deja en blanco las pruebas que no realizaste.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {PRUEBAS_TEST.map(p => (
          <div key={p.id} style={{ background: '#181818', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.82rem', color: C.text }}>{p.label}</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: '#555', marginTop: '2px' }}>{p.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="—"
                  value={valores[p.id].valor}
                  onChange={e => setValor(p.id, e.target.value)}
                  style={{ width: '80px', padding: '6px 8px', background: '#111', border: '1px solid #333', borderRadius: '6px', color: C.text, fontFamily: 'Antonio', fontSize: '1rem', textAlign: 'right' }}
                />
                <span style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: '#555', width: '28px' }}>{p.unidad}</span>
              </div>
            </div>
            {valores[p.id].valor !== '' && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {SEM_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setSem(p.id, s.value)}
                    style={{ flex: 1, padding: '4px 6px', borderRadius: '6px', border: `1px solid ${valores[p.id].semaforo === s.value ? s.border : '#333'}`, background: valores[p.id].semaforo === s.value ? s.bg : 'transparent', color: valores[p.id].semaforo === s.value ? s.color : '#555', fontFamily: 'Poppins', fontSize: '0.68rem', fontWeight: valores[p.id].semaforo === s.value ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: '12px', padding: '8px 12px', background: '#200505', border: '1px solid #ef444440', borderRadius: '6px', color: '#ef4444', fontFamily: 'Poppins', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button onClick={handleSubmit} disabled={guardando}
          style={{ flex: 1, padding: '10px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.85rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
          {guardando ? 'Guardando…' : 'Guardar resultados'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function MiGrupoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [sesiones, setSesiones]     = useState([]);
  const [asistencia, setAsistencia] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [testAbierto, setTestAbierto] = useState(null); // sesionId con form abierto
  const [testsCompletados, setTestsCompletados] = useState(new Set()); // sesionIds ya registrados

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const p = await api.getMe();
      setProfile(p);
      const insc = p.escalador?.inscripciones || [];
      const act  = insc.find(i => i.estado === 'activa') || insc[0];
      if (act?.cohorte?.id) {
        const [ses, asis, evaluaciones] = await Promise.all([
          api.getSesiones(act.cohorte.id).catch(() => []),
          api.getAsistenciaEscalador(p.escalador.id, act.cohorte.id).catch(() => null),
          api.getEvaluaciones({ escaladorId: p.escalador.id }).catch(() => []),
        ]);
        setSesiones(ses || []);
        setAsistencia(asis);
        // Marcar sesiones de test ya completadas por fecha
        const fechasConEval = new Set((evaluaciones || []).map(e => e.fecha?.split('T')[0]));
        const completados = new Set();
        (ses || []).forEach(s => {
          if (s.tipo === 'test' && fechasConEval.has(s.fecha?.split('T')[0])) {
            completados.add(s.id);
          }
        });
        setTestsCompletados(completados);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleTestSuccess = (sesionId) => {
    setTestAbierto(null);
    setTestsCompletados(prev => new Set([...prev, sesionId]));
    navigate('/app/mi-progreso');
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

  const sesionesOrdenadas = [...sesiones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const sesionHoy     = sesionesOrdenadas.find(s => s.fecha?.split('T')[0] === hoy);
  const proximaSesion = sesionesOrdenadas.find(s => s.fecha?.split('T')[0] > hoy);
  const sesionActual  = sesionHoy || proximaSesion;
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
              {new Date((grupo.ciclo.fechaInicio?.split('T')[0] ?? grupo.ciclo.fechaInicio) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              {' – '}
              {new Date((grupo.ciclo.fechaFin?.split('T')[0] ?? grupo.ciclo.fechaFin) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* Banner sesión actual */}
      {sesionActual && (
        <div style={{ background: '#1a1400', border: `1px solid ${C.accent}30`, borderLeft: `3px solid ${sesionActual.tipo === 'test' ? '#f59e0b' : C.accent}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>
              {sesionHoy ? 'Sesión de hoy' : 'Próxima sesión'}
            </div>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text }}>
              Sesión #{sesionActual.numero_sesion}
              {semanaActual && <span style={{ fontSize: '1rem', color: C.text2, fontFamily: 'Poppins', fontWeight: 400, marginLeft: '12px' }}>Semana {semanaActual}{totalSemanas ? ` / ${totalSemanas}` : ''}</span>}
            </div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: C.text2, marginTop: '2px' }}>
              {new Date((sesionActual.fecha?.split('T')[0] ?? sesionActual.fecha) + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{sesionActual.hora_inicio?.substring(0, 5)}–{sesionActual.hora_fin?.substring(0, 5)}
            </div>
            {sesionActual.tipo === 'test' && !testsCompletados.has(sesionActual.id) && (
              <button
                onClick={() => setTestAbierto(sesionActual.id)}
                style={{ marginTop: '10px', padding: '7px 14px', background: '#f59e0b20', border: '1px solid #f59e0b60', borderRadius: '7px', color: '#f59e0b', fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={14} /> Registrar resultados del test
              </button>
            )}
            {sesionActual.tipo === 'test' && testsCompletados.has(sesionActual.id) && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontFamily: 'Poppins', fontSize: '0.8rem' }}>
                <CheckCircle2 size={14} /> Test registrado · <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/app/mi-progreso')}>Ver progreso</span>
              </div>
            )}
          </div>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Poppins', background: tipoColor[sesionActual.tipo] + '20', color: tipoColor[sesionActual.tipo] }}>
            {tipoLabel[sesionActual.tipo]}
          </span>
        </div>
      )}

      {/* Formulario de test si está abierto */}
      {testAbierto && (
        <TestForm
          sesion={sesiones.find(s => s.id === testAbierto)}
          onSuccess={() => handleTestSuccess(testAbierto)}
          onCancel={() => setTestAbierto(null)}
        />
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

      {/* Accesos rápidos */}
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
          const fs    = s.fecha?.split('T')[0];
          const a     = asistMap[fs];
          const past  = fs < hoy;
          const today = fs === hoy;
          const d     = new Date((s.fecha?.split('T')[0] ?? s.fecha) + 'T12:00:00');
          const semana = Math.ceil(s.numero_sesion / 2);
          const esTest = s.tipo === 'test';
          const testDone = testsCompletados.has(s.id);
          const testOpen = testAbierto === s.id;
          const puedoRegistrar = esTest && !testDone && (today || (past && !testDone));

          return (
            <div key={s.id}>
              <div style={{
                background: today ? '#1a1400' : (esTest && !testDone ? '#130e00' : '#242424'),
                borderRadius: '8px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
                border: today ? `1px solid ${C.accent}40` : (esTest ? '1px solid #f59e0b20' : '1px solid transparent'),
              }}>
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
                    {testDone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: '#22c55e', fontFamily: 'Poppins' }}><CheckCircle2 size={11} /> Registrado</span>}
                  </div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text2, marginTop: '2px' }}>
                    {s.hora_inicio?.substring(0, 5)}–{s.hora_fin?.substring(0, 5)}
                  </div>
                </div>

                {/* Acción test o asistencia */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {puedoRegistrar && (
                    <button
                      onClick={() => setTestAbierto(testOpen ? null : s.id)}
                      style={{ padding: '4px 8px', background: testOpen ? '#f59e0b30' : '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: '6px', color: '#f59e0b', fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ClipboardList size={11} />
                      {testOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                  {a ? (
                    a.asistio
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontFamily: 'Poppins', fontSize: '0.78rem', fontWeight: 500 }}><IconoCheck style={{ width: '14px', height: '14px' }} />Asistió</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontFamily: 'Poppins', fontSize: '0.78rem', fontWeight: 500 }}><IconoFalta style={{ width: '14px', height: '14px' }} />Falta</span>
                  ) : past
                    ? <span style={{ color: '#444', fontFamily: 'Poppins', fontSize: '0.78rem' }}>Sin registro</span>
                    : !puedoRegistrar ? <span style={{ color: '#333', fontFamily: 'Poppins', fontSize: '0.78rem' }}>Próxima</span> : null
                  }
                </div>
              </div>

              {/* Formulario de test expandible */}
              {testOpen && (
                <TestForm
                  sesion={s}
                  onSuccess={() => handleTestSuccess(s.id)}
                  onCancel={() => setTestAbierto(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
