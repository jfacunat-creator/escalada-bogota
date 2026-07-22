import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Calendar, CheckCircle2, XCircle, Clock, Loader2,
  Mountain, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

const tipoLabel = {
  regular: 'Sesión',
  juego_cierre: 'Juego',
  test: 'Test',
  checkpoint_fest: 'CheckPoint Fest',
};

const tipoColor = {
  regular: 'bg-teal-50 text-teal-700 border-teal-200',
  juego_cierre: 'bg-purple-50 text-purple-700 border-purple-200',
  test: 'bg-amber-50 text-amber-700 border-amber-200',
  checkpoint_fest: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function MisSesionesPage() {
  const { user } = useAuth();
  const [sesiones, setSesiones] = useState([]);
  const [asistencia, setAsistencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cohorteId, setCohorteId] = useState(null);
  const [cohorteName, setCohorteName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await api.getMe();
      const inscripciones = profile.escalador?.inscripciones || [];
      const activa = inscripciones.find(i => i.estado === 'activa') || inscripciones[0];

      if (activa?.cohorte) {
        setCohorteId(activa.cohorte.id);
        setCohorteName(activa.cohorte.programa?.nombre || 'Mi Cohorte');
        const [ses, asis] = await Promise.all([
          api.getSesiones(activa.cohorte.id),
          api.getAsistenciaEscalador(profile.escalador.id, activa.cohorte.id),
        ]);
        setSesiones(ses);
        setAsistencia(asis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  }

  if (!cohorteId) {
    return (
      <div className="text-center py-20">
        <Mountain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Sin cohorte activa</h2>
        <p className="text-slate-500">Inscríbete en un ciclo para ver tus sesiones.</p>
      </div>
    );
  }

  const hoy = new Date().toISOString().split('T')[0];

  // Crear mapa de asistencia por fecha
  const asistenciaMap = {};
  if (asistencia?.registros) {
    for (const r of asistencia.registros) {
      const fecha = r.fecha?.split('T')[0] || r.fecha;
      asistenciaMap[fecha] = r;
    }
  }

  const resumen = asistencia?.resumen || { total: 0, asistencias: 0, faltas: 0, porcentaje: 0 };

  // Agrupar por mes
  const meses = {};
  for (const s of sesiones) {
    const fecha = new Date(s.fecha);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (!meses[key]) meses[key] = { label: fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }), sesiones: [] };
    meses[key].sesiones.push(s);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mis Sesiones</h1>
        <p className="text-slate-500 mt-1">{cohorteName}</p>
      </div>

      {/* Resumen de asistencia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{sesiones.length}</p>
          <p className="text-xs text-slate-500">Sesiones totales</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{resumen.asistencias}</p>
          <p className="text-xs text-slate-500">Asistencias</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{resumen.faltas}</p>
          <p className="text-xs text-slate-500">Faltas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className={`text-2xl font-bold ${resumen.porcentaje >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
            {resumen.porcentaje}%
          </p>
          <p className="text-xs text-slate-500">Asistencia</p>
          {resumen.porcentaje >= 80 && <p className="text-xs text-green-600 mt-1">✓ Garantía activa</p>}
        </div>
      </div>

      {/* Lista de sesiones agrupadas por mes */}
      {Object.entries(meses).map(([key, mes]) => (
        <div key={key} className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 capitalize">{mes.label}</h3>
          <div className="space-y-2">
            {mes.sesiones.map(s => {
              const fechaStr = s.fecha?.split('T')[0] || s.fecha;
              const asis = asistenciaMap[fechaStr];
              const esPasada = fechaStr < hoy;
              const esHoy = fechaStr === hoy;
              const fecha = new Date(s.fecha);
              const diaSemana = fecha.toLocaleDateString('es-CO', { weekday: 'short' });
              const diaNum = fecha.getDate();

              return (
                <div key={s.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${esHoy ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-200'}`}>
                  {/* Fecha */}
                  <div className="text-center w-14 flex-shrink-0">
                    <p className="text-xs text-slate-400 uppercase">{diaSemana}</p>
                    <p className="text-xl font-bold text-slate-700">{diaNum}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${tipoColor[s.tipo]}`}>
                        {tipoLabel[s.tipo]}
                      </span>
                      <span className="text-xs text-slate-400">#{s.numero_sesion}</span>
                      {esHoy && <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-xs font-medium">Hoy</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {s.hora_inicio?.substring(0, 5)} – {s.hora_fin?.substring(0, 5)}
                    </p>
                    {s.notas_entrenador && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{s.notas_entrenador}</p>
                    )}
                  </div>

                  {/* Estado asistencia */}
                  <div className="flex-shrink-0">
                    {asis ? (
                      asis.asistio ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">Asistió</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <XCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Falta</span>
                        </div>
                      )
                    ) : esPasada ? (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs">Sin registro</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-5 h-5" />
                        <span className="text-xs">Próxima</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {sesiones.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">Las sesiones aún no han sido generadas para esta cohorte.</p>
        </div>
      )}
    </div>
  );
}
