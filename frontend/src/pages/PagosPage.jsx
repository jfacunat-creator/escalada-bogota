/**
 * PagosPage.jsx — Mensualidades (admin).
 * Cada inscripción paga una tarifa por MES según su modalidad (autónomo / acompañado). El mes es
 * un mes del ciclo de su grupo (Mes 1 = S0–S4, Mes 2 = S5–S8, Mes 3 = S9–S12), con sus fechas.
 * Consume: /pagos, /pagos/resumen, /pagos/generar, /inscripciones, /catalogos/tarifas, /catalogos/meses
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import api from '../services/api';
import {
  C, fmtCOP, fmtFecha, fmtMes, fmtRango, MODALIDAD, ESTADO_PAGO, ESTADO_INSC,
  Btn, Modal, Field, Input, Select, Aviso, Badge, Confirmar, MesesChips,
} from '../components/ui';

const etiqueta = (m) => (m ? `${m.cicloCodigo} · Mes ${m.mes}` : '—');

const hoy = () => new Date().toISOString().slice(0, 10);

function Kpi({ label, value, color = C.text, sub }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
      <div style={{ fontFamily: 'Antonio', fontSize: '1.35rem', color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins', marginTop: '3px' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: C.text3, fontFamily: 'Poppins' }}>{sub}</div>}
    </div>
  );
}

// Mes sugerido para registrar: el primero sin pagar desde el mes en curso; si todos están pagados, el en curso.
function mesSugerido(i) {
  const est = i?.meses_estado || {};
  const vig = Number(i?.mes_vigente) || 1;
  return [vig, vig + 1, vig + 2].find(m => m <= 3 && est[m] !== 'pagado') || vig;
}

// Registrar el pago de un mes del ciclo (sobre una mensualidad existente o una inscripción).
function ModalRegistrarPago({ pago, inscripcion, tarifas, meses, onClose, onHecho }) {
  const montoBase = pago ? pago.monto : (tarifas?.[inscripcion?.modalidad] ?? '');
  const mesesCiclo = (meses || []).filter(m => m.cicloId === (pago?.ciclo_id || inscripcion?.ciclo_id)).sort((a, b) => a.mes - b.mes);
  const [form, setForm] = useState({
    mes: String(pago?.mes || mesSugerido(inscripcion)),
    monto: String(parseFloat(montoBase) || ''), metodo: 'transferencia', referencia: '', fechaPago: hoy(),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nombre = pago ? `${pago.nombre} ${pago.apellido}` : `${inscripcion.nombre} ${inscripcion.apellido}`;

  const guardar = async () => {
    if (!(parseFloat(form.monto) > 0)) { setError('Indica un monto mayor a 0'); return; }
    setGuardando(true); setError(null);
    try {
      if (pago) {
        await api.updatePago(pago.id, { estado: 'pagado', monto: parseFloat(form.monto), metodo: form.metodo, referencia: form.referencia, fechaPago: form.fechaPago });
      } else {
        await api.registrarPago({ inscripcionId: inscripcion.id, mes: Number(form.mes), monto: parseFloat(form.monto), metodo: form.metodo, referencia: form.referencia, fechaPago: form.fechaPago });
      }
      onHecho(); onClose();
    } catch (e) { setError(e.error); } finally { setGuardando(false); }
  };

  return (
    <Modal title={`Registrar pago · ${nombre}`} onClose={onClose} footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar pago'}</Btn>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Field label="Mes del ciclo que cubre" required hint={pago ? undefined : 'Pagar el mes da acceso al plan de ese mes. Si la mensualidad ya existe, se marca como pagada.'}>
          <Select value={form.mes} disabled={!!pago} onChange={e => set('mes', e.target.value)}>
            {(mesesCiclo.length ? mesesCiclo : [1, 2, 3].map(m => ({ mes: m }))).map(m => {
              const est = inscripcion?.meses_estado?.[m.mes];
              return (
                <option key={m.mes} value={m.mes}>
                  Mes {m.mes}{m.fechaInicio ? ` · ${fmtRango(m.fechaInicio, m.fechaFin)}` : ''}{est ? ` · ${ESTADO_PAGO[est]?.label.toLowerCase()}` : ''}
                </option>
              );
            })}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Monto (COP)" required><Input type="number" min="1" value={form.monto} onChange={e => set('monto', e.target.value)} /></Field>
          <Field label="Fecha de pago"><Input type="date" value={form.fechaPago} onChange={e => set('fechaPago', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Método">
            <Select value={form.metodo} onChange={e => set('metodo', e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </Select>
          </Field>
          <Field label="Referencia"><Input value={form.referencia} placeholder="Opcional" onChange={e => set('referencia', e.target.value)} /></Field>
        </div>
      </div>
      <Aviso>{error}</Aviso>
    </Modal>
  );
}

function TablaMensualidades({ sel, tarifas, meses, onCambio }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ estado: '', modalidad: '', buscar: '' });
  const [pagar, setPagar] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = { cicloId: sel.cicloId, mes: sel.mes };
    if (filtro.estado) params.estado = filtro.estado;
    if (filtro.modalidad) params.modalidad = filtro.modalidad;
    api.getPagos(params).then(setPagos).catch(e => setError(e.error)).finally(() => setLoading(false));
  }, [sel.cicloId, sel.mes, filtro.estado, filtro.modalidad]);
  useEffect(() => { cargar(); }, [cargar]);
  const refrescar = () => { cargar(); onCambio(); };

  const generar = async () => {
    setError(null); setAviso(null);
    try {
      const r = await api.generarMensualidades(sel.cicloId, sel.mes);
      setAviso(r.creadas ? `${r.creadas} mensualidad(es) generada(s) para ${etiqueta(sel)}` : `Todas las inscripciones activas del ciclo ya tenían su mensualidad del mes ${sel.mes}`);
      refrescar();
    }
    catch (e) { setError(e.error); }
  };

  const visibles = pagos.filter(p => !filtro.buscar || `${p.nombre} ${p.apellido}`.toLowerCase().includes(filtro.buscar.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: C.text2 }} />
          <input className="input-dark" style={{ width: '100%', paddingLeft: '34px' }} placeholder="Buscar escalador…"
            value={filtro.buscar} onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} />
        </div>
        <select className="input-dark" style={{ width: 'auto' }} value={filtro.estado} onChange={e => setFiltro(f => ({ ...f, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="vencido">Vencido</option>
          <option value="pagado">Pagado</option>
        </select>
        <select className="input-dark" style={{ width: 'auto' }} value={filtro.modalidad} onChange={e => setFiltro(f => ({ ...f, modalidad: e.target.value }))}>
          <option value="">Todas las modalidades</option>
          <option value="autonomo">Autónomo</option>
          <option value="acompanado">Acompañado</option>
        </select>
        <Btn variant="dark" onClick={generar} title="Crea la mensualidad pendiente de este mes a cada inscripción activa del ciclo que aún no la tenga. Quien pagó el mes anterior la recibe sola una semana antes.">
          Generar mensualidades del mes {sel.mes}
        </Btn>
      </div>
      <Aviso tipo="ok" onClose={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso onClose={() => setError(null)}>{error}</Aviso>

      {loading ? <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: C.accent, margin: '0 auto' }} /></div>
        : visibles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>
            No hay mensualidades de {etiqueta(sel)}{filtro.estado || filtro.modalidad || filtro.buscar ? ' con esos filtros' : ''}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px', fontFamily: 'Poppins', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.text2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  {['Escalador', 'Programa', 'Monto', 'Vence', 'Pago', 'Estado', ''].map(h => <th key={h} style={{ padding: '10px 8px', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibles.map(p => {
                  const est = ESTADO_PAGO[p.estado];
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid #242424` }}>
                      <td style={{ padding: '10px 8px', color: C.text, fontWeight: 600 }}>{p.nombre} {p.apellido}</td>
                      <td style={{ padding: '10px 8px', color: C.text2 }}>{p.programa}<div style={{ fontSize: '0.72rem', color: C.text3 }}>{MODALIDAD[p.modalidad]} · {p.ciclo}</div></td>
                      <td style={{ padding: '10px 8px', color: C.accent, fontFamily: 'Antonio', fontSize: '1rem' }}>{fmtCOP(p.monto)}</td>
                      <td style={{ padding: '10px 8px', color: p.estado === 'vencido' ? C.danger : C.text2 }}>{fmtFecha(p.fecha_vencimiento)}</td>
                      <td style={{ padding: '10px 8px', color: C.text2, fontSize: '0.78rem' }}>
                        {p.estado === 'pagado' ? <>{fmtFecha(p.fecha_pago)}<div style={{ color: C.text3 }}>{p.metodo}{p.referencia ? ` · ${p.referencia}` : ''}</div></> : '—'}
                      </td>
                      <td style={{ padding: '10px 8px' }}><Badge color={est.color}>{est.label}</Badge></td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {p.estado !== 'pagado'
                            ? <Btn small variant="ok" onClick={() => setPagar(p)}>Registrar pago</Btn>
                            : <Btn small variant="secondary" onClick={() => setConfirmar({ tipo: 'revertir', p })}>Anular pago</Btn>}
                          <Btn small variant="danger" title="Eliminar mensualidad" onClick={() => setConfirmar({ tipo: 'eliminar', p })}><Trash2 size={13} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {pagar && <ModalRegistrarPago pago={pagar} tarifas={tarifas} meses={meses} onClose={() => setPagar(null)} onHecho={refrescar} />}
      {confirmar?.tipo === 'eliminar' && (
        <Confirmar peligro titulo="Eliminar mensualidad" textoBoton="Eliminar" onClose={() => setConfirmar(null)}
          mensaje={<>Se eliminará la mensualidad del <strong style={{ color: C.text }}>mes {confirmar.p.mes}</strong> ({fmtRango(confirmar.p.mes_inicio, confirmar.p.mes_fin)}) de {confirmar.p.nombre} {confirmar.p.apellido} ({fmtCOP(confirmar.p.monto)}). Sin esa mensualidad no tiene inscripción ese mes.</>}
          onConfirm={async () => { await api.deletePago(confirmar.p.id); refrescar(); }} />
      )}
      {confirmar?.tipo === 'revertir' && (
        <Confirmar titulo="Anular pago" textoBoton="Volver a pendiente" onClose={() => setConfirmar(null)}
          mensaje={<>La mensualidad del mes {confirmar.p.mes} de {confirmar.p.nombre} {confirmar.p.apellido} vuelve a quedar <strong>pendiente</strong> y pierde el acceso al plan de ese mes.</>}
          onConfirm={async () => { await api.updatePago(confirmar.p.id, { estado: 'pendiente' }); refrescar(); }} />
      )}
    </div>
  );
}

function TablaInscripciones({ tarifas, meses, onCambio }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [pagar, setPagar] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getInscripciones(estado ? { estado } : undefined).then(setInscripciones).catch(e => setError(e.error)).finally(() => setLoading(false));
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);
  const refrescar = () => { cargar(); onCambio(); };

  const cambiarEstado = async (i, nuevo) => {
    setError(null);
    try { await api.cambiarEstadoInscripcion(i.id, nuevo); refrescar(); } catch (e) { setError(e.error); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <select className="input-dark" style={{ width: 'auto' }} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todas las inscripciones</option>
          {Object.entries(ESTADO_INSC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <Aviso onClose={() => setError(null)}>{error}</Aviso>
      {loading ? <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: C.accent, margin: '0 auto' }} /></div>
        : inscripciones.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins' }}>No hay inscripciones.</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px', fontFamily: 'Poppins', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.text2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  {['Escalador', 'Grupo', 'Tarifa / mes', 'Meses del ciclo', 'Debe', 'Estado', ''].map(h => <th key={h} style={{ padding: '10px 8px', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {inscripciones.map(i => {
                  const debe = parseFloat(i.total_pendiente) || 0;
                  const est = ESTADO_INSC[i.estado];
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #242424' }}>
                      <td style={{ padding: '10px 8px' }}><div style={{ color: C.text, fontWeight: 600 }}>{i.nombre} {i.apellido}</div><div style={{ fontSize: '0.72rem', color: C.text3 }}>{i.email}</div></td>
                      <td style={{ padding: '10px 8px', color: C.text2 }}>{i.programa}<div style={{ fontSize: '0.72rem', color: C.text3 }}>{MODALIDAD[i.modalidad]} · {i.ciclo}</div></td>
                      <td style={{ padding: '10px 8px', color: C.accent, fontFamily: 'Antonio', fontSize: '1rem' }}>{fmtCOP(i.precio_mensual)}</td>
                      <td style={{ padding: '10px 8px' }}><MesesChips estados={i.meses_estado || {}} vigente={Number(i.mes_vigente)} /></td>
                      <td style={{ padding: '10px 8px', color: debe > 0 ? C.danger : C.ok, fontWeight: 600 }}>{debe > 0 ? `${fmtCOP(debe)} (${i.pagos_pendientes})` : 'Al día'}</td>
                      <td style={{ padding: '10px 8px' }}><Badge color={est.color}>{est.label}</Badge></td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {['activa', 'reservada'].includes(i.estado) && <Btn small variant="ok" onClick={() => setPagar(i)}>Registrar pago</Btn>}
                          {i.estado === 'activa' && <Btn small variant="secondary" onClick={() => cambiarEstado(i, 'congelada')}>Congelar</Btn>}
                          {['congelada', 'cancelada', 'completada'].includes(i.estado) && <Btn small variant="secondary" onClick={() => cambiarEstado(i, 'activa')}>Reactivar</Btn>}
                          {['activa', 'reservada', 'congelada'].includes(i.estado) && (
                            <Btn small variant="secondary" onClick={() => setConfirmar({ tipo: 'cancelar', i })}>Cancelar</Btn>
                          )}
                          <Btn small variant="danger" title="Eliminar inscripción y sus pagos" onClick={() => setConfirmar({ tipo: 'eliminar', i })}><Trash2 size={13} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      {pagar && <ModalRegistrarPago inscripcion={pagar} tarifas={tarifas} meses={meses} onClose={() => setPagar(null)} onHecho={refrescar} />}
      {confirmar?.tipo === 'cancelar' && (
        <Confirmar titulo="Cancelar inscripción" textoBoton="Cancelar inscripción" peligro onClose={() => setConfirmar(null)}
          mensaje={<>{confirmar.i.nombre} {confirmar.i.apellido} deja el grupo {confirmar.i.programa}. Se liberan su cupo y sus mensualidades sin pagar desde el mes en curso del ciclo; las pagadas y las de meses anteriores se conservan.</>}
          onConfirm={async () => { await api.cambiarEstadoInscripcion(confirmar.i.id, 'cancelada'); refrescar(); }} />
      )}
      {confirmar?.tipo === 'eliminar' && (
        <Confirmar peligro titulo="Eliminar inscripción" textoBoton="Eliminar" onClose={() => setConfirmar(null)}
          mensaje={<>Se eliminará la inscripción de <strong style={{ color: C.text }}>{confirmar.i.nombre} {confirmar.i.apellido}</strong> junto con <strong>todo su historial de pagos</strong>. Si solo deja el grupo, usa “Cancelar”.</>}
          onConfirm={async () => { await api.deleteInscripcion(confirmar.i.id); refrescar(); }} />
      )}
    </div>
  );
}

export default function PagosPage() {
  const [tab, setTab] = useState('mensualidades');
  const [meses, setMeses] = useState([]);   // meses de todos los ciclos, del más reciente al más antiguo
  const [sel, setSel] = useState(null);     // { cicloId, mes, ... } mes del ciclo elegido
  const [resumen, setResumen] = useState(null);
  const [tarifas, setTarifas] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => { api.getTarifas().then(setTarifas).catch(() => {}); }, []);
  useEffect(() => {
    api.getMeses().then(r => {
      setMeses(r.meses);
      setSel(r.meses.find(m => m.cicloId === r.enCurso?.cicloId && m.mes === r.enCurso?.mes) || r.meses[0] || null);
    }).catch(() => setMeses([]));
  }, []);
  useEffect(() => {
    if (!sel) return;
    api.getResumenPagos({ cicloId: sel.cicloId, mes: sel.mes }).then(setResumen).catch(() => setResumen(null));
  }, [sel, version]);
  const onCambio = () => setVersion(v => v + 1);
  const idx = sel ? meses.findIndex(m => m.clave === sel.clave) : -1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Pagos</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
            Mensualidades · {tarifas ? <>Autónomo <strong style={{ color: C.accent }}>{fmtCOP(tarifas.autonomo)}</strong> / mes · Acompañado <strong style={{ color: C.accent }}>{fmtCOP(tarifas.acompanado)}</strong> / mes</> : '…'}
            {' · '}<Link to="/app/configuracion" style={{ color: C.accent }}>Editar tarifas</Link>
          </p>
        </div>
        {sel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '4px' }}>
            <button aria-label="Mes anterior" disabled={idx >= meses.length - 1} onClick={() => setSel(meses[idx + 1])} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', display: 'flex', padding: '6px', opacity: idx >= meses.length - 1 ? 0.3 : 1 }}><ChevronLeft size={18} /></button>
            <div style={{ minWidth: '170px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.05rem', color: C.text }}>{etiqueta(sel)}{sel.vigente ? ' · en curso' : ''}</div>
              <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: C.text2 }}>{fmtRango(sel.fechaInicio, sel.fechaFin)} · ≈ {fmtMes(sel.periodo)}</div>
            </div>
            <button aria-label="Mes siguiente" disabled={idx <= 0} onClick={() => setSel(meses[idx - 1])} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', display: 'flex', padding: '6px', opacity: idx <= 0 ? 0.3 : 1 }}><ChevronRight size={18} /></button>
          </div>
        )}
      </div>

      {!sel && <Aviso tipo="warn">No hay ciclos configurados. Crea uno en Configuración para empezar a cobrar mensualidades.</Aviso>}

      {sel && resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          <Kpi label="Inscritos este mes" value={resumen.inscritos} color={C.accent} sub={`${resumen.pagados} con el mes pagado`} />
          <Kpi label="Esperado del mes" value={fmtCOP(resumen.esperado)} />
          <Kpi label="Recaudado" value={fmtCOP(resumen.recaudado)} color={C.ok} sub={`${resumen.tasa_recaudo}% del esperado`} />
          <Kpi label="Pendientes" value={resumen.pendientes} color={resumen.pendientes > 0 ? C.warn : C.ok} />
          <Kpi label="Vencidas" value={resumen.vencidos} color={resumen.vencidos > 0 ? C.danger : C.ok} />
          <Kpi label="Deuda vencida (todos los meses)" value={fmtCOP(resumen.deuda_vencida)} color={resumen.deuda_vencida > 0 ? C.danger : C.ok} sub={`${resumen.pagos_vencidos} mensualidad(es)`} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '2px', background: C.surface, borderRadius: '10px', padding: '4px', marginBottom: '16px', border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {[['mensualidades', 'Mensualidades del mes'], ['inscripciones', 'Inscripciones']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.85rem',
            background: tab === k ? C.sidebar : 'transparent', color: tab === k ? C.accent : C.text2, fontWeight: tab === k ? 600 : 400,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
        {tab === 'mensualidades'
          ? (sel ? <TablaMensualidades sel={sel} tarifas={tarifas} meses={meses} onCambio={onCambio} /> : null)
          : <TablaInscripciones tarifas={tarifas} meses={meses} onCambio={onCambio} />}
      </div>
    </div>
  );
}
