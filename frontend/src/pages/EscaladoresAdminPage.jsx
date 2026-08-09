/**
 * EscaladoresAdminPage.jsx — Dashboard completo con filtros y drill-down.
 * Filtros: búsqueda, estado, rango etario, entrenador, nivel.
 * Drill-down: clic en fila abre detalle con inscripciones y pagos.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Search, X, ChevronRight } from 'lucide-react';
import { IconoEscalador, IconoPresa, IconoMuro, IconoCronometro } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

export default function EscaladoresAdminPage() {
  const [escaladores, setEscaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [rangoEtario, setRangoEtario] = useState('');
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => { load(); }, [buscar, estado, rangoEtario]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (estado) params.estado = estado;
      if (rangoEtario) params.rangoEtario = rangoEtario;
      setEscaladores(await api.getEscaladores(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  // KPIs
  const total = escaladores.length;
  const activos = escaladores.filter(e => e.estado === 'activo').length;
  const conGrupo = escaladores.filter(e => parseInt(e.grupos_activos) > 0).length;
  const conPagoPendiente = escaladores.filter(e => parseInt(e.pagos_pendientes) > 0).length;

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
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="congelado">Congelado</option>
        </select>
        <select value={rangoEtario} onChange={e => setRangoEtario(e.target.value)} className="input-dark" style={{ width: 'auto', minWidth: '130px' }}>
          <option value="">Todos los rangos</option>
          <option value="adulto">Adultos</option>
          <option value="menor_6_9">Menor 6–9</option>
          <option value="menor_10_12">Menor 10–12</option>
          <option value="menor_13_15">Menor 13–15</option>
        </select>
        {(buscar || estado || rangoEtario) && (
          <button onClick={() => { setBuscar(''); setEstado(''); setRangoEtario(''); }}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>✕ Limpiar</button>
        )}
      </div>

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
                  {/* Grupo */}
                  {parseInt(e.grupos_activos) > 0
                    ? <span style={{ fontSize: '0.72rem', color: '#22c55e', background: '#0b1910', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Poppins', fontWeight: 600, flexShrink: 0 }}>
                        {e.programa_activo?.split(' ')[0] || 'Inscrito'}
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
                          {[
                            ['Teléfono', detalle.telefono || '—'],
                            ['Contacto emergencia', detalle.contacto_emergencia || '—'],
                            ['Peso', detalle.peso_kg ? `${detalle.peso_kg} kg` : '—'],
                            ['Estado', detalle.estado],
                            ['Total pagado', fmt(e.total_pagado || 0)],
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
                                  background: insc.estado === 'activa' ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)',
                                  color: insc.estado === 'activa' ? '#22c55e' : '#666',
                                }}>{insc.estado}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>
                                {insc.ciclo} · {insc.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'} · {insc.muro}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: C.accent, fontFamily: 'Antonio', marginTop: '4px' }}>{fmt(insc.precio_ciclo)}</div>
                            </div>
                          )) : (
                            <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem', padding: '12px' }}>Sin inscripciones registradas.</div>
                          )}
                        </div>
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
    </div>
  );
}
