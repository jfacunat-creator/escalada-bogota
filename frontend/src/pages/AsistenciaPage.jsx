import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  CheckCircle2, XCircle, Loader2, Save, Users,
  ChevronDown, ChevronUp, Calendar, Clock,
  Mountain, AlertCircle, BarChart3
} from 'lucide-react';

export default function AsistenciaPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [selectedCohorte, setSelectedCohorte] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [escaladores, setEscaladores] = useState([]);
  const [asistenciaData, setAsistenciaData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [showResumen, setShowResumen] = useState(false);

  useEffect(() => {
    if (user?.entrenador?.id) {
      api.getEntrenador(user.entrenador.id).then(setProfile).catch(console.error).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.entrenador?.id]);

  const selectCohorte = async (cohorte) => {
    setSelectedCohorte(cohorte);
    setSelectedSesion(null);
    setSesiones([]);
    setShowResumen(false);

    try {
      const ses = await api.getSesiones(cohorte.id);
      setSesiones(ses);
    } catch (err) {
      console.error(err);
    }
  };

  const generarSesiones = async () => {
    if (!selectedCohorte) return;
    setGenerando(true);
    try {
      const result = await api.generarSesiones(selectedCohorte.id);
      alert(`${result.total} sesiones generadas (${result.primera} → ${result.ultima})`);
      const ses = await api.getSesiones(selectedCohorte.id);
      setSesiones(ses);
    } catch (err) {
      alert(err.error || 'Error generando sesiones');
    } finally {
      setGenerando(false);
    }
  };

  const selectSesion = async (sesion) => {
    setSelectedSesion(sesion);
    setSaved(false);
    setShowResumen(false);

    try {
      // Cargar escaladores de la cohorte y asistencia existente
      const [sesionDetail] = await Promise.all([
        api.getSesion(sesion.id),
      ]);

      // Obtener inscritos de la cohorte
      const inscritos = selectedCohorte.inscripciones || [];
      const escList = inscritos.map(i => i.escalador).filter(Boolean);
      setEscaladores(escList);

      // Mapear asistencia existente
      const aData = {};
      for (const a of sesionDetail.asistencia || []) {
        aData[a.escalador_id] = { asistio: a.asistio, observaciones: a.observaciones || '' };
      }
      // Inicializar los que no tienen registro
      for (const e of escList) {
        if (!aData[e.id]) {
          aData[e.id] = { asistio: true, observaciones: '' };
        }
      }
      setAsistenciaData(aData);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAsistencia = (escaladorId) => {
    setAsistenciaData(prev => ({
      ...prev,
      [escaladorId]: { ...prev[escaladorId], asistio: !prev[escaladorId].asistio },
    }));
    setSaved(false);
  };

  const setObservacion = (escaladorId, text) => {
    setAsistenciaData(prev => ({
      ...prev,
      [escaladorId]: { ...prev[escaladorId], observaciones: text },
    }));
  };

  const guardarAsistencia = async () => {
    if (!selectedSesion) return;
    setSaving(true);
    try {
      const registros = Object.entries(asistenciaData).map(([escaladorId, data]) => ({
        escaladorId,
        asistio: data.asistio,
        observaciones: data.observaciones || undefined,
      }));
      await api.registrarAsistencia(selectedSesion.id, registros);
      setSaved(true);
      // Refresh sesiones para actualizar contadores
      const ses = await api.getSesiones(selectedCohorte.id);
      setSesiones(ses);
    } catch (err) {
      alert(err.error || 'Error guardando asistencia');
    } finally {
      setSaving(false);
    }
  };

  const loadResumen = async () => {
    if (!selectedCohorte) return;
    try {
      const data = await api.getResumenAsistencia(selectedCohorte.id);
      setResumen(data);
      setShowResumen(true);
      setSelectedSesion(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  }

  const cohortes = profile?.cohortes || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Registro de Asistencia</h1>
        <p className="text-slate-500 mt-1">Selecciona cohorte → sesión → registra</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel izquierdo: Cohortes y Sesiones */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selector de cohorte */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Mis Cohortes</h3>
            <div className="space-y-2">
              {cohortes.map(c => (
                <button key={c.id} onClick={() => selectCohorte(c)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                    selectedCohorte?.id === c.id
                      ? 'bg-teal-50 border border-teal-200 text-teal-800'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}>
                  <p className="font-medium">{c.programa?.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.horario} · {c.muro?.nombre}</p>
                </button>
              ))}
              {cohortes.length === 0 && (
                <p className="text-sm text-slate-400 py-2">Sin cohortes asignadas</p>
              )}
            </div>
          </div>

          {/* Lista de sesiones */}
          {selectedCohorte && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Sesiones</h3>
                <div className="flex gap-1.5">
                  <button onClick={loadResumen}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-teal-700" title="Ver resumen">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {sesiones.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400 mb-3">Sin sesiones generadas</p>
                  <button onClick={generarSesiones} disabled={generando}
                    className="px-4 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 disabled:opacity-50">
                    {generando ? 'Generando...' : 'Generar sesiones del ciclo'}
                  </button>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {sesiones.map(s => {
                    const fecha = new Date(s.fecha);
                    const hoy = new Date().toISOString().split('T')[0];
                    const fechaStr = s.fecha?.split('T')[0];
                    const esHoy = fechaStr === hoy;

                    return (
                      <button key={s.id} onClick={() => selectSesion(s)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                          selectedSesion?.id === s.id
                            ? 'bg-teal-50 border border-teal-200'
                            : esHoy ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50 border border-transparent'
                        }`}>
                        <div>
                          <span className="font-medium text-slate-700">#{s.numero_sesion}</span>
                          <span className="text-slate-400 ml-2">
                            {fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {parseInt(s.asistentes) > 0 && (
                            <span className="text-xs text-green-600">{s.asistentes}/{s.registros}</span>
                          )}
                          {esHoy && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho: Registro o Resumen */}
        <div className="lg:col-span-8">
          {showResumen ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen de Asistencia — {selectedCohorte?.programa?.nombre}</h3>
              {resumen.length === 0 ? (
                <p className="text-slate-400">Sin datos de asistencia registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-medium">Escalador</th>
                      <th className="pb-2 font-medium text-center">Sesiones</th>
                      <th className="pb-2 font-medium text-center">Asistencias</th>
                      <th className="pb-2 font-medium text-center">%</th>
                      <th className="pb-2 font-medium text-center">Garantía</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map(r => {
                      const pct = parseFloat(r.porcentaje) || 0;
                      return (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 font-medium text-slate-700">{r.nombre} {r.apellido}</td>
                          <td className="py-3 text-center text-slate-600">{r.total_sesiones}</td>
                          <td className="py-3 text-center text-slate-600">{r.asistencias}</td>
                          <td className="py-3 text-center">
                            <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {pct >= 80 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : selectedSesion ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sesión #{selectedSesion.numero_sesion}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedSesion.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}
                    {selectedSesion.hora_inicio?.substring(0, 5)} – {selectedSesion.hora_fin?.substring(0, 5)}
                  </p>
                </div>
                <button onClick={guardarAsistencia} disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition ${
                    saved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-teal-700 hover:bg-teal-800 text-white'
                  } disabled:opacity-50`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
                </button>
              </div>

              {escaladores.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Sin escaladores inscritos en esta cohorte.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {escaladores.map(e => {
                    const data = asistenciaData[e.id] || { asistio: true, observaciones: '' };
                    return (
                      <div key={e.id} className={`rounded-lg border p-4 transition ${
                        data.asistio ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleAsistencia(e.id)}
                              className="transition">
                              {data.asistio ? (
                                <CheckCircle2 className="w-7 h-7 text-green-500" />
                              ) : (
                                <XCircle className="w-7 h-7 text-red-400" />
                              )}
                            </button>
                            <div>
                              <p className="font-medium text-slate-700">{e.nombre} {e.apellido}</p>
                              <p className="text-xs text-slate-400">{e.estado}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${data.asistio ? 'text-green-600' : 'text-red-500'}`}>
                            {data.asistio ? 'Presente' : 'Ausente'}
                          </span>
                        </div>
                        {!data.asistio && (
                          <input
                            type="text"
                            placeholder="Observación (dolor, lesión, aviso previo...)"
                            value={data.observaciones}
                            onChange={(ev) => setObservacion(e.id, ev.target.value)}
                            className="mt-3 w-full px-3 py-2 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Selecciona una sesión</h3>
              <p className="text-slate-500">Elige una cohorte y luego una sesión para registrar asistencia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
