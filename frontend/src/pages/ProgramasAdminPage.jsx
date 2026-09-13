/**
 * ProgramasAdminPage.jsx — Catálogo de programas con detalle curricular.
 * Muestra: descripción, nivel, sesiones tipo, grupos activos en cada programa.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, ChevronDown, ChevronRight as ChevronRight2 } from 'lucide-react';
import { IconoPresa, IconoRoca, IconoEscalador } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

const NIVEL_COLOR = { iniciacion: '#22c55e', intermedio: '#D4AF37', avanzado: '#ef4444' };
const NIVEL_LABEL = { iniciacion: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

// Currículo detallado por nivel (fijo — estructura pedagógica del negocio)
const CURRICULO = {
  iniciacion: {
    objetivo: 'Desarrollar la base técnica y motriz sin trabajo de dedos. Cero campus ni lastre el primer año.',
    ratio: '1:8 adultos · 1:6 menores 6–9',
    estructura: [
      { semana: '1–2', tipo: 'test_entrada', titulo: 'Test de entrada · Baseline Hörst', detalle: 'T2/T4 fuerza máxima, T5/T6 resistencia, lectura de vías. Registro de valores de referencia individuales.' },
      { semana: '3–4', tipo: 'regular', titulo: 'Técnica de caída y lectura básica', detalle: 'Caída dinámica, micro-lectura de pies, contacto de mano abierta. Sin raspar.' },
      { semana: '5–6', tipo: 'regular', titulo: 'Repertorio motor · Movimientos base', detalle: 'Flage, rocking, drop-knee, mantle. Énfasis en control de caderas sobre el pie.' },
      { semana: '7–8', tipo: 'regular', titulo: 'Lectura táctica de vías', detalle: 'Secuenciación, descansos, gestión de esfuerzo. Boulder ≤ 5b.' },
      { semana: '9–10', tipo: 'regular', titulo: 'Resistencia de movimiento', detalle: 'Circuitos de volumen bajo intensidad. Sin entrenamiento de fuerza en dedos.' },
      { semana: '11–12', tipo: 'juego_cierre', titulo: 'Juego de cierre · Reto de ciclo', detalle: 'Competencia interna de lectura y fluidez. Celebración de logros del grupo.' },
      { semana: '13', tipo: 'test_salida', titulo: 'Test de salida · Comparación vs entrada', detalle: 'Misma batería T2/T4/T5/T6. Entrega de informe individual de progreso.' },
    ],
  },
  intermedio: {
    objetivo: 'Introducir trabajo de fuerza controlado y progresión por tamaño de presa. Test Hörst como referencia.',
    ratio: '1:8',
    estructura: [
      { semana: '1', tipo: 'test_entrada', titulo: 'Test de entrada · Batería completa', detalle: 'T2/T4/T5/T6/T8/T9. Grado máximo y grado crítico de boulder. Peso corporal.' },
      { semana: '2–4', tipo: 'regular', titulo: 'Fuerza máxima · Progresión por presa', detalle: 'Fingerboard 3×5 al 80% del máximo. Presa bidigital y cuatridigital alternadas.' },
      { semana: '5–6', tipo: 'regular', titulo: 'Fuerza crítica · Intermitente', detalle: 'Protocolo Eva López 7:3 intermitente. Adaptación anaeróbica láctico-oxidativa.' },
      { semana: '7–8', tipo: 'regular', titulo: 'Técnica avanzada', detalle: 'Aro, pinch, open-hand. Escalada de boulder 5c–6b con micro-restricciones.' },
      { semana: '9–10', tipo: 'regular', titulo: 'Volumen técnico', detalle: '4 vías × 4 intentos. Análisis en video de 1 vía por sesión.' },
      { semana: '11–12', tipo: 'juego_cierre', titulo: 'Flash challenge', detalle: 'Reto de flash en boulder. Análisis de lecturas en tiempo real.' },
      { semana: '13', tipo: 'test_salida', titulo: 'Test de salida · Análisis de progresión', detalle: 'Misma batería + comparación percentil con grupo. Recomendación de nivel para siguiente ciclo.' },
    ],
  },
  avanzado: {
    objetivo: 'Periodización con doble pico anual y efectos retardados. Fisio mensual y nutrición por fase incluidas.',
    ratio: '1:6',
    estructura: [
      { semana: '1', tipo: 'test_entrada', titulo: 'Test de entrada · Batería completa + composición', detalle: 'T2/T4/T5/T6/T8/T9. Composición corporal. Remisión a fisio si hay lesión activa.' },
      { semana: '2–3', tipo: 'regular', titulo: 'Bloque de fuerza máxima', detalle: 'Fingerboard al 90–100%. Series excéntricas. Recuperación 72h entre sesiones de dedos.' },
      { semana: '4', tipo: 'checkpoint_fest', titulo: 'Revisión fisioterapia', detalle: 'Sesión de fisio incluida. Ajuste de cargas según estado articular.' },
      { semana: '5–7', tipo: 'regular', titulo: 'Bloque de fuerza crítica', detalle: 'ARC + intermitente + continuo. Gestión de fatiga con diario de entrenamiento.' },
      { semana: '8', tipo: 'juego_cierre', titulo: 'Juego de potencia · Comp simulada', detalle: 'Formato competencia. Análisis post-evento con entrenador y fisio.' },
      { semana: '9–11', tipo: 'regular', titulo: 'Bloque técnico-táctico', detalle: 'Vías de 6c+–7b. Análisis de movimiento. Nutrición por fase: carga de hidratos periódica.' },
      { semana: '12', tipo: 'regular', titulo: 'Descarga activa', detalle: 'Volumen 40%, intensidad 60%. Revisión de nutrición y sueño.' },
      { semana: '13', tipo: 'test_salida', titulo: 'Test de salida + informe completo', detalle: 'Batería completa. Informe con fisio y nutricionista. Plan para el siguiente ciclo.' },
    ],
  },
};

const tipoColor = { test_entrada: '#D4AF37', test_salida: '#22c55e', regular: '#A09A8C', juego_cierre: '#c084fc', checkpoint_fest: '#ef4444' };
const tipoLabel = { test_entrada: 'Test entrada', test_salida: 'Test salida', regular: 'Sesión', juego_cierre: 'Juego cierre', checkpoint_fest: 'Checkpoint' };

export default function ProgramasAdminPage() {
  const [programas, setProgramas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [sesionesGrupo, setSesionesGrupo] = useState([]);
  const [semanaAbierta, setSemanaAbierta] = useState(null);

  useEffect(() => {
    Promise.all([api.getProgramas(), api.getGrupos({ estado: 'en_curso' })])
      .then(([p, g]) => { setProgramas(p); setGrupos(g); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Cuando se selecciona un programa, cargar sesiones del primer grupo activo
  useEffect(() => {
    setSesionesGrupo([]);
    setSemanaAbierta(null);
    if (!selected) return;
    const prog = programas.find(p => p.id === selected);
    if (!prog) return;
    const grupoActivo = grupos.find(g => g.programa_nombre === prog.nombre || g.programa_id === selected);
    if (!grupoActivo) return;
    api.getSesiones(grupoActivo.id).then(setSesionesGrupo).catch(() => setSesionesGrupo([]));
  }, [selected]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />
    </div>
  );

  const adultos = programas.filter(p => p.poblacion === 'adulto' && (!filtro || p.nivel === filtro));
  const menores = programas.filter(p => p.poblacion === 'menor' && (!filtro || p.nivel === filtro));
  const prog = selected ? programas.find(p => p.id === selected) : null;
  const curriculo = prog ? CURRICULO[prog.nivel] : null;
  const gruposDelProg = grupos.filter(g => g.programa_id === selected || g.programa_nombre === prog?.nombre);

  // Para un item de currículo, obtener las sesiones reales que caen en ese rango de semanas
  const getSesionesParaItem = (item) => {
    if (sesionesGrupo.length === 0 || !gruposDelProg.length) return [];
    const grupo = gruposDelProg[0];
    if (!grupo.fecha_inicio) return [];
    const inicio = new Date(grupo.fecha_inicio);

    // Parsear rango de semanas del item ("1", "2–4", "9–10", "13")
    const [semDesde, semHasta] = item.semana.includes('–')
      ? item.semana.split('–').map(Number)
      : [parseInt(item.semana), parseInt(item.semana)];

    const diaDesde = (semDesde - 1) * 7;
    const diaHasta = semHasta * 7;

    return sesionesGrupo.filter(s => {
      const fecha = new Date(s.fecha);
      const diff = Math.floor((fecha - inicio) / (1000 * 60 * 60 * 24));
      return diff >= diaDesde && diff < diaHasta;
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: '20px' }} className="prog-layout">
      <style>{`@media(max-width:900px){.prog-layout{grid-template-columns:1fr!important}}`}</style>

      {/* Lista de programas */}
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Programas</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>{programas.length} programas · Selecciona uno para ver el currículo detallado</p>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['', 'Todos'], ['iniciacion', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.8rem', fontWeight: 500, background: filtro === v ? C.accent : 'transparent', color: filtro === v ? '#121212' : C.text2, borderColor: filtro === v ? C.accent : C.border }}>{l}</button>
          ))}
        </div>

        {adultos.length > 0 && (
          <>
            <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px', fontFamily: 'Poppins' }}>Adultos</div>
            {adultos.map(p => <ProgramaRow key={p.id} p={p} selected={selected} onClick={() => setSelected(selected === p.id ? null : p.id)} grupos={grupos} />)}
          </>
        )}
        {menores.length > 0 && (
          <>
            <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '16px 0 8px', fontFamily: 'Poppins' }}>Menores</div>
            {menores.map(p => <ProgramaRow key={p.id} p={p} selected={selected} onClick={() => setSelected(selected === p.id ? null : p.id)} grupos={grupos} />)}
          </>
        )}
      </div>

      {/* Detalle del programa */}
      {selected && prog && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: NIVEL_COLOR[prog.nivel], fontWeight: 700, fontFamily: 'Poppins', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {NIVEL_LABEL[prog.nivel]} · {prog.poblacion === 'adulto' ? 'Adulto' : `Menor ${prog.rango_etario_menor?.replace('menor_', '').replace('_', '–')}`}
              </div>
              <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.6rem', color: C.text }}>{prog.nombre}</h2>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>

          {/* Descripción y características */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
            <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '14px' }}>{prog.descripcion}</p>
            {curriculo && (
              <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '10px' }}>
                <strong style={{ color: C.accent }}>Objetivo:</strong> {curriculo.objetivo}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', fontFamily: 'Poppins' }}>
              <span style={{ color: C.text2 }}>📅 {prog.duracion_semanas || 13} semanas · 3 sesiones/sem · ~39 sesiones</span>
              {curriculo && <span style={{ color: C.text2 }}>👥 Ratio {curriculo.ratio}</span>}
              {prog.incluye_fisio && <span style={{ color: '#22c55e' }}>✓ Fisio incluida</span>}
              {prog.incluye_nutricion && <span style={{ color: '#22c55e' }}>✓ Nutrición incluida</span>}
            </div>
          </div>

          {/* Grupos activos en este programa */}
          {gruposDelProg.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px', fontFamily: 'Poppins' }}>Grupos activos en este programa</div>
              {gruposDelProg.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid #242424`, fontSize: '0.85rem', fontFamily: 'Poppins' }}>
                  <span style={{ color: C.text }}>{g.ciclo_codigo} · {g.horario}</span>
                  <span style={{ color: C.text2 }}>{g.inscritos_actual}/{g.cupo_maximo} escaladores</span>
                </div>
              ))}
            </div>
          )}

          {/* Timeline de grupos */}
          {gruposDelProg.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px', fontFamily: 'Poppins' }}>Línea de tiempo</div>
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                {/* Línea vertical */}
                <div style={{ position: 'absolute', left: '7px', top: '4px', bottom: '4px', width: '2px', background: '#2e2e2e', borderRadius: '1px' }} />
                {gruposDelProg.map((g, i) => {
                  const inicio = g.fecha_inicio ? new Date(g.fecha_inicio) : null;
                  const fin = g.fecha_fin ? new Date(g.fecha_fin) : null;
                  const hoy = new Date();
                  const activo = g.estado === 'en_curso';
                  const dotColor = activo ? '#22c55e' : g.estado === 'abierta' ? '#60a5fa' : '#555';
                  return (
                    <div key={g.id} style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}>
                      {/* Dot */}
                      <div style={{ position: 'absolute', left: '-14px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: dotColor, border: activo ? '2px solid #22c55e40' : 'none' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>
                            {g.ciclo_codigo} · {g.horario}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px' }}>
                            {inicio ? inicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'} → {fin ? fin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            {' · '}{g.muro_nombre}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.accent }}>{g.inscritos_actual}/{g.cupo_maximo}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 600, fontFamily: 'Poppins', background: dotColor + '18', color: dotColor }}>
                            {g.estado === 'en_curso' ? 'En curso' : g.estado === 'abierta' ? 'Abierto' : g.estado}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar temporal */}
                      {inicio && fin && (
                        <div style={{ marginTop: '6px', height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: activo ? '#22c55e' : '#60a5fa',
                            width: `${Math.min(100, Math.max(0, ((hoy - inicio) / (fin - inicio)) * 100))}%`,
                            transition: 'width 0.5s',
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Currículo semana a semana — expandible con sesiones reales */}
          {curriculo && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins' }}>
                  Currículo · Semana por semana
                </span>
                {sesionesGrupo.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#22c55e', fontFamily: 'Poppins', fontWeight: 600 }}>
                    {sesionesGrupo.length} sesiones generadas
                  </span>
                )}
              </div>
              {curriculo.estructura.map((item, i) => {
                const sesItemRaw = getSesionesParaItem(item);
                const sesItem = sesItemRaw;
                const abierta = semanaAbierta === i;
                const hoy = new Date().toISOString().split('T')[0];

                return (
                  <div key={i} style={{ borderBottom: i < curriculo.estructura.length - 1 ? `1px solid #1a1a1a` : 'none' }}>
                    {/* Fila de semana — clickable */}
                    <button
                      onClick={() => setSemanaAbierta(abierta ? null : i)}
                      style={{ width: '100%', padding: '14px 18px', display: 'flex', gap: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#242424'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flexShrink: 0, width: '56px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: C.text3, fontFamily: 'Poppins' }}>Sem.</div>
                        <div style={{ fontFamily: 'Antonio', fontSize: '0.95rem', color: C.text2 }}>{item.semana}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '4px', fontWeight: 600, fontFamily: 'Poppins', background: tipoColor[item.tipo] + '20', color: tipoColor[item.tipo] }}>
                            {tipoLabel[item.tipo]}
                          </span>
                          <span style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem', fontFamily: 'Poppins' }}>{item.titulo}</span>
                          {sesItem.length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: 'Poppins', marginLeft: 'auto' }}>
                              {sesItem.length} ses.
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: C.text3 }}>
                        {abierta ? <ChevronDown size={16} /> : <ChevronRight2 size={16} />}
                      </div>
                    </button>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div style={{ borderTop: `1px solid #1a1a1a`, background: '#161616', padding: '16px 18px 16px 88px' }}>
                        {/* Contenido pedagógico — siempre visible */}
                        <p style={{ fontSize: '0.85rem', color: C.text2, fontFamily: 'Poppins', lineHeight: 1.7, marginBottom: sesItem.length > 0 ? '14px' : 0 }}>
                          {item.detalle}
                        </p>

                        {/* Fechas reales si el grupo ya tiene sesiones generadas */}
                        {sesItem.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ fontSize: '0.68rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins', marginBottom: '4px' }}>
                              Fechas del grupo
                            </div>
                            {sesItem.map(s => {
                              const fs = s.fecha?.split('T')[0];
                              const pasada = fs < hoy;
                              const esHoy = fs === hoy;
                              const tieneAsist = parseInt(s.asistentes || s.total_asistencias || 0) > 0;
                              return (
                                <div key={s.id} style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '7px 11px', borderRadius: '7px',
                                  background: esHoy ? 'rgba(245,158,11,0.07)' : 'rgba(36,36,36,0.6)',
                                  border: `1px solid ${esHoy ? 'rgba(245,158,11,0.2)' : '#252525'}`,
                                }}>
                                  <span style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: C.accent, width: '26px' }}>#{s.numero_sesion}</span>
                                  <span style={{ fontSize: '0.82rem', color: pasada ? C.text2 : C.text, fontFamily: 'Poppins', flex: 1 }}>
                                    {new Date(s.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    <span style={{ color: C.text3, marginLeft: '8px' }}>{s.hora_inicio?.substring(0, 5)}–{s.hora_fin?.substring(0, 5)}</span>
                                  </span>
                                  {esHoy && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
                                  {tieneAsist && <span style={{ fontSize: '0.7rem', color: '#22c55e', fontFamily: 'Poppins' }}>✓</span>}
                                  {pasada && !tieneAsist && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontFamily: 'Poppins' }}>sin registro</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramaRow({ p, selected, onClick, grupos }) {
  const activos = grupos.filter(g => g.programa_nombre === p.nombre || g.programa_id === p.id).length;
  return (
    <div onClick={onClick} style={{ background: selected === p.id ? '#3a2e0a' : C.surface, border: `1px solid ${selected === p.id ? C.accent + '60' : C.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: NIVEL_COLOR[p.nivel] || C.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{p.nombre}</div>
        <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', marginTop: '1px' }}>
          {NIVEL_LABEL[p.nivel]} · {p.duracion_semanas || 13} sem
        </div>
      </div>
      {activos > 0 && (
        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>
          {activos} activo{activos !== 1 ? 's' : ''}
        </span>
      )}
      <span style={{ color: C.text3, fontSize: '14px' }}>›</span>
    </div>
  );
}
