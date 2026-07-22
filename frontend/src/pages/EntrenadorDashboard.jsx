import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Users, Calendar, Mountain, MapPin, Loader2,
  ChevronDown, ChevronUp, Clock, AlertTriangle
} from 'lucide-react';

export default function EntrenadorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCohorte, setExpandedCohorte] = useState(null);

  const ent = user?.entrenador;

  useEffect(() => {
    if (ent?.id) {
      api.getEntrenador(ent.id).then(setProfile).catch(console.error).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [ent?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const cohortes = profile?.cohortes || [];
  const totalEscaladores = cohortes.reduce((sum, c) => sum + (c.inscripciones?.length || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Entrenador</h1>
        <p className="text-slate-500 mt-1">Hola, {ent?.nombre || 'Entrenador'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-lg"><Users className="w-5 h-5 text-teal-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{cohortes.length}</p>
              <p className="text-sm text-slate-500">Cohortes activas</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">Máximo: {profile?.maxGrupos || 6}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg"><Mountain className="w-5 h-5 text-amber-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalEscaladores}</p>
              <p className="text-sm text-slate-500">Escaladores</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg"><Calendar className="w-5 h-5 text-green-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{profile?.licenciaLey181 || '—'}</p>
              <p className="text-sm text-slate-500">Licencia Ley 181</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cohortes */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Mis Cohortes</h2>

      {cohortes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No tienes cohortes asignadas en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cohortes.map(c => {
            const isOpen = expandedCohorte === c.id;
            const escaladores = c.inscripciones || [];

            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedCohorte(isOpen ? null : c.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Mountain className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-800">{c.programa?.nombre}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.horario}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.muro?.nombre}</span>
                        <span>{c.ciclo?.codigo}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">{escaladores.length}/{c.cupoMaximo || 8}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    {escaladores.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">Sin escaladores inscritos aún.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                            <th className="pb-2 font-medium">Nombre</th>
                            <th className="pb-2 font-medium">Estado</th>
                            <th className="pb-2 font-medium">Pago</th>
                          </tr>
                        </thead>
                        <tbody>
                          {escaladores.map(insc => {
                            const e = insc.escalador;
                            const pagoStatus = insc.pagos?.[0]?.estado || 'pendiente';
                            const pagoColor = pagoStatus === 'pagado' ? 'text-green-600' : 'text-amber-600';
                            return (
                              <tr key={e?.id || insc.id} className="border-b border-slate-50 last:border-0">
                                <td className="py-2.5 font-medium text-slate-700">{e?.nombre} {e?.apellido}</td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    e?.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {e?.estado}
                                  </span>
                                </td>
                                <td className={`py-2.5 font-medium ${pagoColor}`}>{pagoStatus}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
