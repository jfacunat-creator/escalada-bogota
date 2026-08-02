/**
 * RRHHPage.jsx
 * Gestión de RRHH: contratos, parafiscales, ausencias y simulador de costo.
 */

import { useState, useEffect } from 'react';
import { Loader2, Plus, X, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';
import api from '../services/api';
import { IconoCuerda, IconoEscalador } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', accent2: '#9E721D', sidebar: '#4A2F0F', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

function formatCOP(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }
function formatFecha(d) { return d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

const TIPO_CONTRATO = {
  prestacion_servicios: 'Prestación de servicios',
  termino_fijo: 'Término fijo',
  indefinido: 'Indefinido',
  obra_labor: 'Obra o labor',
};

const ESTADO_CONTRATO = {
  activo:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  terminado: { color: '#666',    bg: 'rgba(100,100,100,0.1)' },
  suspendido:{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Stat Card ──────────────────────────────────────────────────────────────
function Stat({ label, value, color = C.accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.4rem', color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: C.text2, marginTop: '2px', fontFamily: 'Poppins' }}>{label}</div>
    </div>
  );
}

// ─── Modal Crear Contrato ───────────────────────────────────────────────────
function ModalContrato({ open, onClose, onCreado, entrenadores }) {
  const [form, setForm] = useState({ entrenadorId: '', tipo: 'prestacion_servicios', fechaInicio: '', fechaFin: '', salarioBase: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.entrenadorId || !form.fechaInicio || !form.salarioBase) {
      setError('Completa los campos obligatorios.'); return;
    }
    setLoading(true); setError(null);
    try {
      await api.request('/rrhh/contratos', { method: 'POST', body: JSON.stringify(form) });
      onCreado(); onClose();
      setForm({ entrenadorId: '', tipo: 'prestacion_servicios', fechaInicio: '', fechaFin: '', salarioBase: '', notas: '' });
    } catch (err) { setError(err?.error || 'Error al crear el contrato.'); }
    finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '28px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: C.text }}>Nuevo Contrato</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2 }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Entrenador *</label>
            <select value={form.entrenadorId} onChange={e => set('entrenadorId', e.target.value)} className="input-dark" style={{ width: '100%' }}>
              <option value="">Seleccionar...</option>
              {entrenadores.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Tipo de contrato *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="input-dark" style={{ width: '100%' }}>
              {Object.entries(TIPO_CONTRATO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Inicio *</label>
              <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} className="input-dark" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Fin</label>
              <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} className="input-dark" style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Salario base mensual (COP) *</label>
            <input type="number" value={form.salarioBase} onChange={e => set('salarioBase', e.target.value)} placeholder="Ej: 2000000" className="input-dark" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Notas</label>
            <input type="text" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Opcional" className="input-dark" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Simulador inline */}
        {form.salarioBase && parseFloat(form.salarioBase) > 0 && (() => {
          const s = parseFloat(form.salarioBase);
          const pf = { salud: Math.round(s * 0.085), pension: Math.round(s * 0.12), arl: Math.round(s * 0.0696), caja: Math.round(s * 0.04) };
          const totalPf = pf.salud + pf.pension + pf.arl + pf.caja;
          const costo154 = Math.round(s * 1.54);
          return (
            <div style={{ background: '#252525', borderRadius: '8px', padding: '12px 14px', marginTop: '12px', fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins' }}>
              <div style={{ fontSize: '0.68rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Simulador de costo</div>
              {[['Salud (8.5%)', pf.salud], ['Pensión (12%)', pf.pension], ['ARL clase V (6.96%)', pf.arl], ['Caja (4%)', pf.caja]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>{k}</span><span style={{ color: C.text }}>{formatCOP(v)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${C.border}`, marginTop: '4px', fontWeight: 600 }}>
                <span>Total parafiscales</span><span style={{ color: '#f59e0b' }}>{formatCOP(totalPf)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${C.border}`, fontWeight: 700, fontSize: '0.9rem' }}>
                <span>Costo total (×1.54)</span><span style={{ color: C.accent }}>{formatCOP(costo154)}</span>
              </div>
            </div>
          );
        })()}

        {error && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: '#fca5a5' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '8px', background: 'transparent', color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#3a3a2a' : C.accent, color: '#121212', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : 'Crear contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function RRHHPage() {
  const [tab, setTab] = useState('contratos');
  const [contratos, setContratos] = useState([]);
  const [parafiscales, setParafiscales] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [generando, setGenerando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [c, p, r, e] = await Promise.all([
        api.request('/rrhh/contratos'),
        api.request('/rrhh/parafiscales'),
        api.request('/rrhh/resumen'),
        api.getEntrenadores(),
      ]);
      setContratos(c); setParafiscales(p); setResumen(r); setEntrenadores(e);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstadoContrato = async (id, estado) => {
    try { await api.request(`/rrhh/contratos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); cargar(); }
    catch (err) { alert(err?.error || 'Error'); }
  };

  const generarParafiscales = async () => {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();
    setGenerando(true);
    try {
      const result = await api.request('/rrhh/parafiscales/generar', { method: 'POST', body: JSON.stringify({ mes, anio }) });
      alert(`${result.message}\n${result.omitidos.length > 0 ? `Omitidos (ya existían): ${result.omitidos.join(', ')}` : ''}`);
      cargar();
    } catch (err) { alert(err?.error || 'Error'); }
    finally { setGenerando(false); }
  };

  const pagarParafiscal = async (id) => {
    try { await api.request(`/rrhh/parafiscales/${id}/pagar`, { method: 'PATCH' }); cargar(); }
    catch (err) { alert(err?.error || 'Error'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Recursos Humanos</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Contratos, nómina y parafiscales</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowCrear(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: C.accent, color: '#121212', fontFamily: 'Antonio, sans-serif', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} /> Nuevo contrato
          </button>
          <button onClick={generarParafiscales} disabled={generando} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem', cursor: 'pointer' }}>
            {generando ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Generar parafiscales del mes
          </button>
        </div>
      </div>

      {/* Dashboard stats */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <Stat label="Contratos activos" value={resumen.contratos_activos} color="#22c55e" />
          <Stat label="Nómina mensual" value={formatCOP(resumen.nomina_mensual)} />
          <Stat label="Costo total (×1.54)" value={formatCOP(resumen.costo_total_mensual)} color="#f59e0b" />
          <Stat label="Parafiscales pendientes" value={formatCOP(resumen.parafiscales_pendientes)} color={parseFloat(resumen.parafiscales_pendientes) > 0 ? '#ef4444' : '#22c55e'} />
          <Stat label="Parafiscales pagados" value={formatCOP(resumen.parafiscales_pagados)} color="#22c55e" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: C.surface, borderRadius: '8px', padding: '4px', width: 'fit-content', border: `1px solid ${C.border}` }}>
        {[['contratos', 'Contratos'], ['parafiscales', 'Parafiscales']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: tab === k ? C.sidebar : 'transparent', color: tab === k ? C.accent : C.text2, fontFamily: 'Poppins' }}>{l}</button>
        ))}
      </div>

      {/* Tab: Contratos */}
      {tab === 'contratos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {contratos.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: C.text2 }}>
              <IconoCuerda style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
              <p style={{ fontFamily: 'Poppins', fontSize: '0.9rem' }}>Sin contratos registrados.</p>
            </div>
          ) : contratos.map(c => {
            const est = ESTADO_CONTRATO[c.estado] || ESTADO_CONTRATO.activo;
            return (
              <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: '#252525', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: C.text }}>{c.entrenador_nombre}</div>
                    <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>{c.entrenador_email}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, background: est.bg, color: est.color, textTransform: 'capitalize' }}>{c.estado}</span>
                </div>
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: C.text2, fontFamily: 'Poppins' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tipo</span><span style={{ color: C.text, fontWeight: 600 }}>{TIPO_CONTRATO[c.tipo] || c.tipo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Salario base</span><span style={{ color: C.accent, fontWeight: 700 }}>{formatCOP(c.salario_base)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Costo total (×1.54)</span><span style={{ color: '#f59e0b', fontWeight: 600 }}>{formatCOP(parseFloat(c.salario_base) * 1.54)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vigencia</span><span style={{ color: C.text }}>{formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)}</span>
                  </div>
                  {c.notas && <div style={{ fontSize: '0.78rem', color: C.text3, fontStyle: 'italic', borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>{c.notas}</div>}
                </div>
                {c.estado === 'activo' && (
                  <div style={{ padding: '0 18px 14px', display: 'flex', gap: '6px' }}>
                    <button onClick={() => cambiarEstadoContrato(c.id, 'suspendido')} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontFamily: 'Poppins' }}>Suspender</button>
                    <button onClick={() => cambiarEstadoContrato(c.id, 'terminado')} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontFamily: 'Poppins' }}>Terminar</button>
                  </div>
                )}
                {c.estado === 'suspendido' && (
                  <div style={{ padding: '0 18px 14px' }}>
                    <button onClick={() => cambiarEstadoContrato(c.id, 'activo')} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontFamily: 'Poppins' }}>Reactivar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Parafiscales */}
      {tab === 'parafiscales' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          {parafiscales.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins' }}>Sin registros. Usa "Generar parafiscales del mes" para crear los del periodo actual.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#242424' }}>
                    {['Entrenador', 'Periodo', 'Base', 'Salud', 'Pensión', 'ARL V', 'Caja', 'Total', 'Estado', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === '' ? 'center' : 'left', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Poppins' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parafiscales.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid rgba(46,46,46,0.5)` }}>
                      <td style={{ padding: '10px 12px', color: C.text, fontWeight: 600, fontSize: '0.85rem' }}>{p.entrenador_nombre}</td>
                      <td style={{ padding: '10px 12px', color: C.text2, fontSize: '0.85rem' }}>{MESES[p.mes - 1]} {p.anio}</td>
                      <td style={{ padding: '10px 12px', color: C.text, fontSize: '0.85rem' }}>{formatCOP(p.salario_base)}</td>
                      <td style={{ padding: '10px 12px', color: C.text2, fontSize: '0.82rem' }}>{formatCOP(p.salud)}</td>
                      <td style={{ padding: '10px 12px', color: C.text2, fontSize: '0.82rem' }}>{formatCOP(p.pension)}</td>
                      <td style={{ padding: '10px 12px', color: C.text2, fontSize: '0.82rem' }}>{formatCOP(p.arl)}</td>
                      <td style={{ padding: '10px 12px', color: C.text2, fontSize: '0.82rem' }}>{formatCOP(p.caja)}</td>
                      <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>{formatCOP(p.total)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, background: p.estado_pago === 'pagado' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: p.estado_pago === 'pagado' ? '#22c55e' : '#f59e0b' }}>
                          {p.estado_pago === 'pagado' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {p.estado_pago}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {p.estado_pago === 'pendiente' && (
                          <button onClick={() => pagarParafiscal(p.id)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontFamily: 'Poppins' }}>Pagar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalContrato open={showCrear} onClose={() => setShowCrear(false)} onCreado={cargar} entrenadores={entrenadores} />
    </div>
  );
}
