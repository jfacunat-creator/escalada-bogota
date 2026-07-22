import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Calendar, Clock, MapPin, User,
  ChevronRight, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import {
  IconoPresa, IconoRoca, IconoCohorte, IconoCronometro, IconoMuro
} from '../components/Icons';

function StatCard({ icon: Icon, label, value, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    slate: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CohorteCard({ cohorte }) {
  if (!cohorte) return null;

  const horarioMap = {
    'lun_mie_18_20': 'Lun y Mié · 18:00 – 20:00',
    'lun_mie_20_22': 'Lun y Mié · 20:00 – 22:00',
    'mar_jue_18_20': 'Mar y Jue · 18:00 – 20:00',
    'mar_jue_20_22': 'Mar y Jue · 20:00 – 22:00',
    'sab_dom_7_9': 'Sáb y Dom · 7:00 – 9:00',
    'sab_dom_9_11': 'Sáb y Dom · 9:00 – 11:00',
    'sab_dom_11_13': 'Sáb y Dom · 11:00 – 13:00',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-teal-700 px-5 py-3">
        <h3 className="text-white font-semibold">{cohorte.programa?.nombre || 'Mi Cohorte'}</h3>
        <p className="text-teal-200 text-sm">{cohorte.ciclo?.codigo || ''} · {cohorte.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}</p>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{horarioMap[cohorte.horario] || cohorte.horario}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{cohorte.muro?.nombre || 'Por definir'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">Entrenador: {cohorte.entrenador?.nombre || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <IconoCohorte className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{cohorte.inscritos_actual || '?'}/{cohorte.cupo_maximo || 8} cupos</span>
        </div>
      </div>
    </div>
  );
}



export default function EscaladorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);

  const esc = user?.escalador;

  useEffect(() => {
    Promise.all([
      api.getMe().then(setProfile).catch(() => {}),
      api.getProgramas().then(setProgramas).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const estadoBadge = {
    activo: { label: 'Activo', class: 'bg-green-100 text-green-700' },
    inactivo: { label: 'Inactivo', class: 'bg-slate-100 text-slate-600' },
    congelado: { label: 'Congelado', class: 'bg-amber-100 text-amber-700' },
  };

  const estado = estadoBadge[esc?.estado] || estadoBadge.activo;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          ¡Hola, {esc?.nombre || 'Escalador'}! 🧗
        </h1>
        <p className="text-slate-500 mt-1">Bienvenido a tu plataforma de entrenamiento</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={IconoPresa} label="Estado" value={estado.label} color={esc?.estado === 'activo' ? 'green' : 'amber'} />
        <StatCard icon={IconoRoca} label="Nivel" value={esc?.rangoEtario === 'adulto' ? 'Adulto' : esc?.rangoEtario?.replace('menor_', 'Menor ')} />
        <StatCard icon={IconoCohorte} label="Cohorte activa" value={profile?.escalador?.inscripciones?.length > 0 ? 'Sí' : 'No inscrito'} color={profile?.escalador?.inscripciones?.length > 0 ? 'teal' : 'slate'} />
        <StatCard icon={IconoCronometro} label="Ciclo" value="2026-T4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cohorte activa o invitación a inscribirse */}
        <div className="lg:col-span-2">
          {profile?.escalador?.inscripciones?.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Mi Cohorte Activa</h2>
              {profile.escalador.inscripciones.map(insc => (
                <CohorteCard key={insc.cohorte?.id || insc.id} cohorte={insc.cohorte} />
              ))}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <IconoMuro className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No estás inscrito en ninguna cohorte</h3>
              <p className="text-slate-500 text-sm mb-4">
                Contacta al equipo para inscribirte en el próximo ciclo.
                Las cohortes abren cada trimestre.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-teal-700 font-medium">
                <AlertCircle className="w-4 h-4" />
                Próximo empalme: Diciembre 2026
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Perfil rápido */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Mi Perfil</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nombre</span>
                <span className="text-slate-800 font-medium">{esc?.nombre} {esc?.apellido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.class}`}>
                  {estado.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono</span>
                <span className="text-slate-800">{profile?.escalador?.telefono || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emergencia</span>
                <span className="text-slate-800 text-right text-xs">{profile?.escalador?.contactoEmergencia || '—'}</span>
              </div>
            </div>
          </div>

          {/* Programas disponibles */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Programas Disponibles</h3>
            <div className="space-y-2">
              {programas.filter(p => p.poblacion === 'adulto').map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700">{p.nombre}</span>
                  <span className="text-xs text-slate-400">{p.duracion_semanas || 13} sem</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
