import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoCohorte, IconoMagnesia, IconoPresa } from '../components/Icons';

function formatCOP(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v); }

export default function PagosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inscripciones');
  const [inscripciones, setInscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPago, setShowPago] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: '', metodo: 'transferencia', referencia: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [tab]);
  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'inscripciones') { setInscripciones(await api.getInscripciones()); }
      else { const [p, r] = await Promise.all([api.getPagos(), api.getResumenPagos().catch(() => null)]); setPagos(p); setResumen(r); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handlePago = async (iid) => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return;
    setSaving(true);
    try { await api.registrarPago({ inscripcionId: iid, monto: parseFloat(pagoForm.monto), metodo: pagoForm.metodo, referencia: pagoForm.referencia || undefined }); setShowPago(null); setPagoForm({ monto: '', metodo: 'transferencia', referencia: '' }); loadData(); }
    catch (err) { alert(err.error || 'Error'); } finally { setSaving(false); }
  };

  const cambiarEstado = async (id, est) => { try { await api.cambiarEstadoInscripcion(id, est); loadData(); } catch (err) { alert(err.error || 'Error'); } };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Gestión Financiera</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Inscripciones y pagos por ciclo</p>
      </div>

      {resumen && tab === 'pagos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[[resumen.activas, 'Activas', '#D4AF37'], [formatCOP(resumen.ingresos_esperados), 'Esperado', '#A09A8C'], [formatCOP(resumen.ingresos_recibidos), 'Recaudado', '#22c55e'], [resumen.pagos_pendientes, 'Pendientes', '#f59e0b'], [resumen.tasa_recaudo + '%', 'Recaudo', resumen.tasa_recaudo >= 70 ? '#22c55e' : '#f59e0b']].map(([v, l, c]) => (
            <div key={l} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: c }}>{v}</div>
              <div style={{ fontSize: '0.72rem', color: '#A09A8C', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#1c1c1c', borderRadius: '8px', padding: '4px', width: 'fit-content', border: '1px solid #2e2e2e' }}>
        {[['inscripciones', 'Inscripciones'], ['pagos', 'Pagos']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: tab === k ? '#4A2F0F' : 'transparent', color: tab === k ? '#D4AF37' : '#A09A8C' }}>{l}</button>
        ))}
      </div>

      {tab === 'inscripciones' && (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
          {inscripciones.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}><IconoCohorte style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 8px' }} /><p style={{ color: '#A09A8C' }}>Sin inscripciones.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead><tr style={{ borderBottom: '1px solid #2e2e2e', background: '#242424' }}>
                  {['Escalador', 'Programa', 'Ciclo', 'Precio', 'Pagado', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#A09A8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{inscripciones.map(i => {
                  const pag = parseFloat(i.total_pagado) || 0; const pre = parseFloat(i.precio_ciclo) || 0; const sal = pre - pag;
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #242424' }} onMouseEnter={e => e.currentTarget.style.background = '#242424'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 14px' }}><div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.88rem' }}>{i.nombre} {i.apellido}</div><div style={{ fontSize: '0.75rem', color: '#666' }}>{i.email}</div></td>
                      <td style={{ padding: '12px 14px', color: '#A09A8C', fontSize: '0.85rem' }}>{i.programa}</td>
                      <td style={{ padding: '12px 14px', color: '#A09A8C', fontSize: '0.85rem' }}>{i.ciclo}</td>
                      <td style={{ padding: '12px 14px', color: '#F0EDE8', fontWeight: 600, fontSize: '0.85rem' }}>{formatCOP(pre)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 600, color: sal <= 0 ? '#22c55e' : '#f59e0b', fontSize: '0.85rem' }}>{formatCOP(pag)}</span>
                        {sal > 0 && <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>Debe: {formatCOP(sal)}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge-${i.estado === 'activa' ? 'green' : i.estado === 'congelada' ? 'amber' : i.estado === 'cancelada' ? 'red' : 'gold'}`}
                          style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500 }}>{i.estado}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setShowPago(i.id); setPagoForm({ monto: String(sal > 0 ? sal : pre), metodo: 'transferencia', referencia: '' }); }}
                            style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>+ Pago</button>
                          {i.estado === 'activa' && <button onClick={() => cambiarEstado(i.id, 'congelada')} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Congelar</button>}
                          {i.estado === 'congelada' && <button onClick={() => cambiarEstado(i.id, 'activa')} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Reactivar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal pago */}
      {showPago && (
        <div onClick={() => setShowPago(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: '#F0EDE8', marginBottom: '16px' }}>Registrar Pago</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#A09A8C', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Monto (COP)</label><input type="number" value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} className="input-dark" /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#A09A8C', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Método</label><select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })} className="input-dark"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option></select></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#A09A8C', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Referencia</label><input type="text" value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} className="input-dark" placeholder="Opcional" /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowPago(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2e2e2e', background: 'transparent', color: '#A09A8C', cursor: 'pointer', fontSize: '0.88rem' }}>Cancelar</button>
              <button onClick={() => handlePago(showPago)} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'pagos' && (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
          {pagos.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}><IconoMagnesia style={{ width: '40px', height: '40px', color: '#2e2e2e', margin: '0 auto 8px' }} /><p style={{ color: '#A09A8C' }}>Sin pagos.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead><tr style={{ borderBottom: '1px solid #2e2e2e', background: '#242424' }}>
                  {['Escalador', 'Programa', 'Monto', 'Método', 'Referencia', 'Fecha', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', color: '#A09A8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{pagos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #242424' }}>
                    <td style={{ padding: '12px 14px', color: '#F0EDE8', fontWeight: 500, fontSize: '0.88rem' }}>{p.nombre} {p.apellido}</td>
                    <td style={{ padding: '12px 14px', color: '#A09A8C', fontSize: '0.85rem' }}>{p.programa}</td>
                    <td style={{ padding: '12px 14px', color: '#F0EDE8', fontWeight: 600 }}>{formatCOP(p.monto)}</td>
                    <td style={{ padding: '12px 14px', color: '#A09A8C', fontSize: '0.85rem', textTransform: 'capitalize' }}>{p.metodo || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#666', fontSize: '0.8rem' }}>{p.referencia || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#A09A8C', fontSize: '0.85rem' }}>{p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO') : '—'}</td>
                    <td style={{ padding: '12px 14px' }}><span className={`badge-${p.estado === 'pagado' ? 'green' : p.estado === 'pendiente' ? 'amber' : 'red'}`} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500 }}>{p.estado}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
