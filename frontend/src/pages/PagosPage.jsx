import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoPresa, IconoMagnesia, IconoCohorte, IconoCuerda, IconoCheck, IconoFalta } from '../components/Icons';

const estadoInscColor = {
  activa: 'bg-green-100 text-green-700',
  congelada: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-red-100 text-red-700',
  completada: 'bg-teal-100 text-teal-700',
};
const estadoPagoColor = {
  pagado: 'bg-green-100 text-green-700',
  pendiente: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
};

function formatCOP(val) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
}

export default function PagosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inscripciones');
  const [inscripciones, setInscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNuevoPago, setShowNuevoPago] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: '', metodo: 'transferencia', referencia: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.rol === 'admin';
  const isEntrenador = user?.rol === 'entrenador';

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'inscripciones') {
        const data = await api.getInscripciones();
        setInscripciones(data);
      } else {
        const [p, r] = await Promise.all([api.getPagos(), isAdmin ? api.getResumenPagos() : Promise.resolve(null)]);
        setPagos(p);
        setResumen(r);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRegistrarPago = async (inscripcionId) => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return;
    setSaving(true);
    try {
      await api.registrarPago({
        inscripcionId,
        monto: parseFloat(pagoForm.monto),
        metodo: pagoForm.metodo,
        referencia: pagoForm.referencia || undefined,
      });
      setShowNuevoPago(null);
      setPagoForm({ monto: '', metodo: 'transferencia', referencia: '' });
      loadData();
    } catch (err) { alert(err.error || 'Error registrando pago'); }
    finally { setSaving(false); }
  };

  const handleCambiarEstadoInsc = async (id, estado) => {
    try {
      await api.cambiarEstadoInscripcion(id, estado);
      loadData();
    } catch (err) { alert(err.error || 'Error'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestión Financiera</h1>
        <p className="text-slate-500 mt-1">Inscripciones y pagos por ciclo</p>
      </div>

      {/* Resumen admin */}
      {resumen && tab === 'pagos' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{resumen.activas}</p>
            <p className="text-xs text-slate-500">Inscrip. activas</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-lg font-bold text-slate-700">{formatCOP(resumen.ingresos_esperados)}</p>
            <p className="text-xs text-slate-500">Esperado</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-lg font-bold text-green-600">{formatCOP(resumen.ingresos_recibidos)}</p>
            <p className="text-xs text-slate-500">Recaudado</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{resumen.pagos_pendientes}</p>
            <p className="text-xs text-slate-500">Pendientes</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${resumen.tasa_recaudo >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{resumen.tasa_recaudo}%</p>
            <p className="text-xs text-slate-500">Recaudo</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {[['inscripciones', 'Inscripciones'], ['pagos', 'Pagos']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Inscripciones */}
      {tab === 'inscripciones' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {inscripciones.length === 0 ? (
            <div className="p-10 text-center">
              <IconoCohorte className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No hay inscripciones registradas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3 font-medium">Escalador</th>
                    <th className="px-4 py-3 font-medium">Programa</th>
                    <th className="px-4 py-3 font-medium">Ciclo</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Pagado</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.map(i => {
                    const pagado = parseFloat(i.total_pagado) || 0;
                    const precio = parseFloat(i.precio_ciclo) || 0;
                    const saldo = precio - pagado;
                    return (
                      <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{i.nombre} {i.apellido}</p>
                          <p className="text-xs text-slate-400">{i.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{i.programa}</td>
                        <td className="px-4 py-3 text-slate-600">{i.ciclo}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{formatCOP(precio)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${saldo <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            {formatCOP(pagado)}
                          </span>
                          {saldo > 0 && <p className="text-xs text-red-500">Debe: {formatCOP(saldo)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoInscColor[i.estado]}`}>{i.estado}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => { setShowNuevoPago(i.id); setPagoForm({ monto: String(saldo > 0 ? saldo : precio), metodo: 'transferencia', referencia: '' }); }}
                              className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium hover:bg-teal-100 transition">
                              + Pago
                            </button>
                            {isAdmin && i.estado === 'activa' && (
                              <button onClick={() => handleCambiarEstadoInsc(i.id, 'congelada')}
                                className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium hover:bg-amber-100 transition">
                                Congelar
                              </button>
                            )}
                            {isAdmin && i.estado === 'congelada' && (
                              <button onClick={() => handleCambiarEstadoInsc(i.id, 'activa')}
                                className="px-2.5 py-1 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 transition">
                                Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal pago */}
      {showNuevoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNuevoPago(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-4">Registrar Pago</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 block mb-1">Monto (COP)</label>
                <input type="number" value={pagoForm.monto} onChange={e => setPagoForm({...pagoForm, monto: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">Método</label>
                <select value={pagoForm.metodo} onChange={e => setPagoForm({...pagoForm, metodo: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">Referencia / No. transferencia</label>
                <input type="text" value={pagoForm.referencia} onChange={e => setPagoForm({...pagoForm, referencia: e.target.value})}
                  placeholder="Opcional" className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNuevoPago(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={() => handleRegistrarPago(showNuevoPago)} disabled={saving}
                className="flex-1 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagos */}
      {tab === 'pagos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {pagos.length === 0 ? (
            <div className="p-10 text-center">
              <IconoMagnesia className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No hay pagos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3 font-medium">Escalador</th>
                    <th className="px-4 py-3 font-medium">Programa</th>
                    <th className="px-4 py-3 font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Método</th>
                    <th className="px-4 py-3 font-medium">Referencia</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">{p.nombre} {p.apellido}</td>
                      <td className="px-4 py-3 text-slate-600">{p.programa}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatCOP(p.monto)}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{p.metodo || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoPagoColor[p.estado]}`}>{p.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
