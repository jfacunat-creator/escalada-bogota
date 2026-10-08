/**
 * EscaladoresAdminPage.jsx — Dashboard completo con filtros y drill-down.
 * Filtros: búsqueda, estado, rango etario, entrenador, nivel.
 * Drill-down: clic en fila abre detalle con inscripciones y pagos.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2, Search, ChevronRight, Trash2 } from 'lucide-react';
import { IconoEscalador, IconoPresa, IconoMuro, IconoCronometro } from '../components/Icons';
import { Btn, Modal, Field, Input, Select, Aviso, Badge, fmtMes, fmtRango, ESTADO_PAGO, ESTADO_INSC, MODALIDAD, NIVEL } from '../components/ui';

const ESTADO_ESC = { activo: 'Activo', pendiente: 'Pendiente de activación', congelado: 'Congelado', inactivo: 'Inactivo' };

function ModalEditarEscalador({ escalador, onClose, onGuardado }) {
  const [form, setForm] = useState({
    nombre: escalador.nombre || '', apellido: escalador.apellido || '', email: escalador.email || '',
    telefono: escalador.telefono || '', contactoEmergencia: escalador.contacto_emergencia || '',
    fechaNacimiento: escalador.fecha_nacimiento?.slice(0, 10) || '', pesoKg: escalador.peso_kg ?? '',
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const guardar = async () => {
    setGuardando(true); setError(null);
    try { await api.updateEscalador(escalador.id, form); onGuardado(); onClose(); }
    catch (e) { setError(e.error); } finally { setGuardando(false); }
  };
  return (
    <Modal title={`Editar · ${escalador.nombre} ${escalador.apellido}`} onClose={onClose} footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Btn>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Nombre" required><Input value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Field>
          <Field label="Apellido" required><Input value={form.apellido} onChange={e => set('apellido', e.target.value)} /></Field>
        </div>
        <Field label="Email (usuario de ingreso)" required><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Teléfono"><Input value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Field>
          <Field label="Peso (kg)"><Input type="number" value={form.pesoKg} onChange={e => set('pesoKg', e.target.value)} /></Field>
        </div>
        <Field label="Contacto de emergencia" required><Input value={form.contactoEmergencia} onChange={e => set('contactoEmergencia', e.target.value)} /></Field>
        <Field label="Fecha de nacimiento" hint="Recalcula el rango de edad (adulto / menor)."><Input type="date" value={form.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} /></Field>
      </div>
      <Aviso>{error}</Aviso>
    </Modal>
  );
}

function ModalInscribir({ escalador, onClose, onHecho }) {
  const [grupos, setGrupos] = useState(null);
  const [grupoId, setGrupoId] = useState('');
  const [mes, setMes] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    api.getGruposDisponibles().then(g => {
      const aptos = g.filter(x => (escalador.rango_etario === 'adulto') === (x.poblacion === 'adulto') && (!escalador.nivel || x.nivel === escalador.nivel));
      setGrupos(aptos); setGrupoId(aptos[0]?.id || '');
    }).catch(e => setError(e.error));
  }, [escalador]);
  const g = grupos?.find(x => x.id === grupoId);
  useEffect(() => { setMes(g ? String(g.mes_entrada) : ''); }, [g]);
  const inscribir = async () => {
    setGuardando(true); setError(null);
    try { await api.crearInscripcion({ escaladorId: escalador.id, grupoId, mes: Number(mes) || undefined }); onHecho(); onClose(); }
    catch (e) { setError(e.error); } finally { setGuardando(false); }
  };
  return (
    <Modal title={`Inscribir · ${escalador.nombre} ${escalador.apellido}`} onClose={onClose} footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn onClick={inscribir} disabled={!grupoId || guardando}>{guardando ? 'Inscribiendo…' : 'Inscribir'}</Btn>
    </>}>
      {!grupos ? <Loader2 className="animate-spin" style={{ color: C.accent }} />
        : grupos.length === 0 ? <div style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>
            No hay grupos abiertos {escalador.nivel ? `de nivel ${NIVEL[escalador.nivel]}` : ''} para su rango de edad. Crea uno en Grupos.
          </div>
        : <>
          <Field label="Grupo" required>
            <Select value={grupoId} onChange={e => setGrupoId(e.target.value)}>
              {grupos.map(x => <option key={x.id} value={x.id}>{x.programa_nombre} · {x.ciclo_codigo} · {MODALIDAD[x.modalidad]} · {x.entrenador_nombre} ({x.inscritos_actual}/{x.cupo_maximo})</option>)}
            </Select>
          </Field>
          {g && (
            <div style={{ marginTop: '12px' }}>
              <Field label="Mes del ciclo en que entra" hint="El servicio se paga por mes (4 semanas). Solo verá el plan de los meses que pague.">
                <Select value={mes} onChange={e => setMes(e.target.value)}>
                  {(g.meses || []).filter(m => m.mes >= g.mes_entrada).map(m => (
                    <option key={m.mes} value={m.mes}>Mes {m.mes} · {fmtRango(m.fechaInicio, m.fechaFin)}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          {g && <div style={{ fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins', marginTop: '10px', lineHeight: 1.6 }}>
            Mensualidad: <strong style={{ color: C.accent }}>{fmt(g.precio_mensual)}</strong>. Queda inscrito como <strong>activo</strong> con la mensualidad del mes {mes} pendiente.
            {!escalador.nivel && <> Su nivel quedará como <strong>{NIVEL[g.nivel]}</strong>.</>}
          </div>}
        </>}
      <Aviso>{error}</Aviso>
    </Modal>
  );
}

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

export default function EscaladoresAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const NIVEL_LABEL = { iniciacion: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  const NIVEL_COLOR = { iniciacion: '#22c55e', intermedio: '#D4AF37', avanzado: '#ef4444' };

  const [escaladores, setEscaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [rangoEtario, setRangoEtario] = useState('');
  const [nivel, setNivel] = useState('');
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editar, setEditar] = useState(null);
  const [inscribir, setInscribir] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [buscar, estado, rangoEtario, nivel]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (estado) params.estado = estado;
      if (rangoEtario) params.rangoEtario = rangoEtario;
      if (nivel) params.nivel = nivel;
      setEscaladores(await api.getEscaladores(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteEscalador(confirmDelete.id);
      setConfirmDelete(null);
      setSelected(null);
      setDetalle(null);
      load();
    } catch (err) {
      setError(err?.error || 'Error al eliminar');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDetalle = async (id) => {
    if (selected === id) { setSelected(null); setDetalle(null); return; }
    setSelected(id);
    setLoadingDetalle(true);
    try {
      const d = await api.getEscalador(id);
      setDetalle(d);
    } catch (err) { console.error(err); setDetalle(null); }
    finally { setLoadingDetalle(false); }
  };

  const recargarDetalle = async (id) => {
    load();
    if (selected === id) setDetalle(await api.getEscalador(id));
  };

  const cambiarNivel = async (escaladorId, nuevoNivel) => {
    setError(null); setAvisos([]);
    try {
      const r = await api.asignarNivel(escaladorId, nuevoNivel);
      setAvisos(r.avisos || []);
      await recargarDetalle(escaladorId);
    } catch (err) { setError(err?.error || 'Error al cambiar nivel'); }
  };

  const cambiarEstado = async (escaladorId, nuevoEstado) => {
    setError(null); setAvisos([]);
    try {
      const r = await api.cambiarEstadoEscalador(escaladorId, nuevoEstado);
      setAvisos(r.avisos || []);
      await recargarDetalle(escaladorId);
    } catch (err) { setError(err?.error || 'Error al cambiar estado'); }
  };

  const cambiarEstadoInscripcion = async (inscId, escaladorId, nuevo) => {
    setError(null); setAvisos([]);
    try { await api.cambiarEstadoInscripcion(inscId, nuevo); await recargarDetalle(escaladorId); }
    catch (err) { setError(err?.error || 'Error al cambiar la inscripción'); }
  };

  // KPIs
  const total = escaladores.length;
  const activos = escaladores.filter(e => e.estado === 'activo').length;
  const conGrupo = escaladores.filter(e => parseInt(e.grupos_activos) > 0).length;
  const conPagoPendiente = escaladores.filter(e => parseInt(e.pagos_pendientes) > 0).length;
  const conReserva = escaladores.filter(e => parseInt(e.reservas_pendientes) > 0).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Escaladores</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>{total} registros</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          [total, 'Registrados', C.text2, IconoEscalador],
          [activos, 'Activos', '#22c55e', IconoPresa],
          [conGrupo, 'Con grupo', C.accent, IconoMuro],
          [conReserva, 'Cupos reservados', conReserva > 0 ? '#D4AF37' : '#22c55e', IconoCronometro],
          [conPagoPendiente, 'Pago pendiente', conPagoPendiente > 0 ? '#f59e0b' : '#22c55e', IconoCronometro],
        ].map(([v, l, color, Icon]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '7px', borderRadius: '7px', background: color + '18', color, flexShrink: 0 }}><Icon style={{ width: '16px', height: '16px' }} /></div>
            <div>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: C.text, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.7rem', color: C.text2, fontFamily: 'Poppins' }}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', color: C.text2 }} />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre..."
            className="input-dark" style={{ paddingLeft: '36px', width: '100%' }} />
        </div>
        <select value={estado} onChange={e => setEstado(e.target.value)} className="input-dark" style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="congelado">Congelado</option>
        </select>
        <select value={rangoEtario} onChange={e => setRangoEtario(e.target.value)} className="input-dark" style={{ width: 'auto', minWidth: '130px' }}>
          <option value="">Todos los rangos</option>
          <option value="adulto">Adultos</option>
        </select>
        <select value={nivel} onChange={e => setNivel(e.target.value)} className="input-dark" style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Todos los niveles</option>
          <option value="iniciacion">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
        {(buscar || estado || rangoEtario || nivel) && (
          <button onClick={() => { setBuscar(''); setEstado(''); setRangoEtario(''); setNivel(''); }}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>✕ Limpiar</button>
        )}
      </div>

      <Aviso tipo="ok" onClose={() => setAvisos([])}>{avisos}</Aviso>
      <Aviso onClose={() => setError(null)}>{error}</Aviso>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {escaladores.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '48px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins' }}>Sin resultados</div>
          ) : escaladores.map(e => {
            const isOpen = selected === e.id;
            return (
              <div key={e.id} style={{ background: C.surface, border: `1px solid ${isOpen ? C.accent + '40' : C.border}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                {/* Fila principal */}
                <div onClick={() => openDetalle(e.id)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onMouseEnter={ev => !isOpen && (ev.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={ev => !isOpen && (ev.currentTarget.style.background = 'transparent')}>
                  {/* Avatar */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Antonio', fontSize: '0.9rem', color: C.accent, flexShrink: 0 }}>
                    {e.nombre?.charAt(0)}{e.apellido?.charAt(0)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: '0.9rem', fontFamily: 'Poppins' }}>{e.nombre} {e.apellido}</div>
                    <div style={{ fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins' }}>{e.email}</div>
                  </div>
                  {/* Rango */}
                  <span style={{ fontSize: '0.75rem', color: C.accent, background: '#3a2e0a', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, fontFamily: 'Poppins', flexShrink: 0 }}>
                    {e.rango_etario === 'adulto' ? 'Adulto' : e.rango_etario?.replace('menor_', 'M').replace('_', '–')}
                  </span>
                  {/* Nivel */}
                  {e.nivel
                    ? <span style={{ fontSize: '0.72rem', color: NIVEL_COLOR[e.nivel] || C.accent, background: (NIVEL_COLOR[e.nivel] || C.accent) + '18', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, fontFamily: 'Poppins', flexShrink: 0 }}>
                        {NIVEL_LABEL[e.nivel] || e.nivel}
                      </span>
                    : isAdmin && <span style={{ fontSize: '0.72rem', color: C.text3, background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', flexShrink: 0 }}>
                        Sin nivel
                      </span>
                  }
                  {/* Reserva pendiente */}
                  {parseInt(e.reservas_pendientes) > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#D4AF37', background: '#D4AF3720', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>
                      Cupo reservado
                    </span>
                  )}
                  {/* Grupo */}
                  {parseInt(e.grupos_activos) > 0
                    ? <span style={{ fontSize: '0.72rem', color: '#22c55e', background: '#0b1910', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>
                        En grupo
                      </span>
                    : <span style={{ fontSize: '0.72rem', color: C.text3, background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', flexShrink: 0 }}>Sin grupo</span>}
                  {/* Pagos */}
                  {parseInt(e.pagos_pendientes) > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>
                      {e.pagos_pendientes} pend.
                    </span>
                  )}
                  {/* Estado */}
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: e.estado === 'activo' ? '#22c55e' : e.estado === 'congelado' ? '#f59e0b' : '#666', flexShrink: 0 }} />
                  <ChevronRight size={14} style={{ color: C.text3, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  {isAdmin && (
                    <button onClick={ev => { ev.stopPropagation(); setConfirmDelete(e); }} title="Eliminar escalador" style={{
                      background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer',
                      borderRadius: '6px', padding: '5px 7px', flexShrink: 0,
                    }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Detalle expandible */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px' }}>
                    {loadingDetalle ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader2 className="animate-spin" style={{ width: '20px', height: '20px', color: C.accent }} /></div>
                    ) : detalle ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="esc-det">
                        <style>{`@media(max-width:700px){.esc-det{grid-template-columns:1fr!important}}`}</style>
                        {/* Info personal */}
                        <div>
                          <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px', fontFamily: 'Poppins' }}>Datos personales</div>
                          {isAdmin && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid #1a1a1a` }}>
                              <span style={{ fontSize: '0.82rem', color: C.text2, fontFamily: 'Poppins' }}>Nivel</span>
                              <select
                                value={detalle.nivel || ''}
                                onChange={e => e.target.value && cambiarNivel(detalle.id, e.target.value)}
                                className="input-dark"
                                style={{ fontSize: '0.78rem', padding: '2px 6px', height: 'auto' }}
                              >
                                <option value="">Sin nivel</option>
                                <option value="iniciacion">Principiante</option>
                                <option value="intermedio">Intermedio</option>
                                <option value="avanzado">Avanzado</option>
                              </select>
                            </div>
                          )}
                          {isAdmin && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid #1a1a1a` }}>
                              <span style={{ fontSize: '0.82rem', color: C.text2, fontFamily: 'Poppins' }}>Estado</span>
                              <select value={detalle.estado} onChange={ev => cambiarEstado(detalle.id, ev.target.value)} className="input-dark" style={{ fontSize: '0.78rem', padding: '2px 6px', height: 'auto' }}>
                                {Object.entries(ESTADO_ESC).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                              </select>
                            </div>
                          )}
                          {[
                            ['Teléfono', detalle.telefono ? <a href={`tel:${detalle.telefono}`} style={{ color: C.accent }}>{detalle.telefono}</a> : '—'],
                            ['Contacto emergencia', detalle.contacto_emergencia || '—'],
                            ['Nacimiento', detalle.fecha_nacimiento ? new Date(detalle.fecha_nacimiento).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—'],
                            ['Peso', detalle.peso_kg ? `${detalle.peso_kg} kg` : '—'],
                            // Menor de edad: consentimiento del representante legal (Ley 1098/2006)
                            ...(detalle.es_menor ? [
                              ['Consentimiento menor', detalle.consentimiento
                                ? <span style={{ color: C.ok }}>Firmado {new Date(detalle.consentimiento.firmado_at || detalle.consentimiento.fecha_firma).toLocaleDateString('es-CO')}</span>
                                : <span style={{ color: C.warn }}>Pendiente</span>],
                              ...(detalle.consentimiento ? [
                                ['Representante', `${detalle.consentimiento.nombre_completo} (${detalle.consentimiento.parentesco})`],
                                ['Documento repr.', `${detalle.consentimiento.tipo_documento || 'CC'} ${detalle.consentimiento.cedula}`],
                                ['Teléfono repr.', <a href={`tel:${detalle.consentimiento.telefono}`} style={{ color: C.accent }}>{detalle.consentimiento.telefono}</a>],
                              ] : []),
                            ] : []),
                            ...(isAdmin ? [] : [['Estado', ESTADO_ESC[detalle.estado] || detalle.estado]]),
                            ...(isAdmin ? [['Total pagado', fmt(e.total_pagado || 0)]] : []),
                            ['Entrenador', e.entrenador_activo || '—'],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid #1a1a1a`, fontSize: '0.82rem', fontFamily: 'Poppins' }}>
                              <span style={{ color: C.text2 }}>{k}</span>
                              <span style={{ color: C.text }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {/* Inscripciones */}
                        <div>
                          <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px', fontFamily: 'Poppins' }}>Inscripciones</div>
                          {detalle.inscripciones?.length > 0 ? detalle.inscripciones.map(insc => (
                            <div key={insc.id} style={{ background: '#242424', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{insc.programa}</span>
                                <span style={{
                                  fontSize: '0.7rem', padding: '1px 7px', borderRadius: '20px', fontWeight: 600, fontFamily: 'Poppins',
                                  background: insc.estado === 'activa' ? 'rgba(34,197,94,0.1)' : insc.estado === 'reservada' ? 'rgba(212,175,55,0.1)' : 'rgba(100,100,100,0.1)',
                                  color: insc.estado === 'activa' ? '#22c55e' : insc.estado === 'reservada' ? '#D4AF37' : '#666',
                                }}>{ESTADO_INSC[insc.estado]?.label || insc.estado}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>
                                {insc.ciclo} · {insc.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'} · {insc.muro}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: C.accent, fontFamily: 'Antonio', marginTop: '4px' }}>{fmt(insc.precio_mensual)} / mes</div>
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                  {insc.estado === 'activa' && <Btn small variant="secondary" onClick={() => cambiarEstadoInscripcion(insc.id, detalle.id, 'congelada')}>Congelar</Btn>}
                                  {insc.estado === 'congelada' && <Btn small variant="secondary" onClick={() => cambiarEstadoInscripcion(insc.id, detalle.id, 'activa')}>Reactivar</Btn>}
                                  {['activa', 'reservada', 'congelada'].includes(insc.estado) && <Btn small variant="secondary" onClick={() => cambiarEstadoInscripcion(insc.id, detalle.id, 'cancelada')}>Cancelar inscripción</Btn>}
                                </div>
                              )}
                            </div>
                          )) : (
                            <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem', padding: '12px' }}>Sin inscripciones registradas.</div>
                          )}
                        </div>
                        {isAdmin && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              <Btn small variant="secondary" onClick={() => setEditar(detalle)}>Editar datos</Btn>
                              {!detalle.inscripciones?.some(i => ['activa', 'reservada'].includes(i.estado)) && (
                                <Btn small variant="dark" onClick={() => setInscribir(detalle)}>Inscribir en un grupo</Btn>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px', fontFamily: 'Poppins' }}>Mensualidades</div>
                            {detalle.pagos?.length ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {detalle.pagos.map(p => (
                                  <div key={p.id} style={{ background: '#242424', borderRadius: '8px', padding: '6px 10px', fontFamily: 'Poppins', fontSize: '0.78rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ color: C.text }} title={fmtRango(p.mes_inicio, p.mes_fin)}>{p.mes_clave || fmtMes(p.periodo_mes)}</span>
                                    <span style={{ color: C.text2 }}>{fmt(p.monto)}</span>
                                    <Badge color={ESTADO_PAGO[p.estado].color}>{ESTADO_PAGO[p.estado].label}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.82rem' }}>Sin mensualidades.</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem' }}>Error cargando detalle.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editar && <ModalEditarEscalador escalador={editar} onClose={() => setEditar(null)} onGuardado={() => recargarDetalle(editar.id)} />}
      {inscribir && <ModalInscribir escalador={inscribir} onClose={() => setInscribir(null)} onHecho={() => recargarDetalle(inscribir.id)} />}

      {/* Confirm delete escalador */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.surface, border: '1px solid #ef444440', borderRadius: '14px',
            padding: '28px', maxWidth: '400px', width: '100%',
          }}>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#ef4444', marginBottom: '8px' }}>Eliminar escalador</div>
            <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem', marginBottom: '16px' }}>
              Se eliminará a <strong style={{ color: C.text }}>{confirmDelete.nombre} {confirmDelete.apellido}</strong> junto con todas sus inscripciones, pagos y registros de asistencia.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent',
                color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Poppins',
              }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700,
              }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
