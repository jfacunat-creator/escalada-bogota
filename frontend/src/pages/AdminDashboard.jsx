import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, Mountain, MapPin, BookOpen, Loader2,
  Calendar, TrendingUp
} from 'lucide-react';

export default function AdminDashboard() {
  const [programas, setProgramas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [muros, setMuros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProgramas().then(setProgramas).catch(() => {}),
      api.getCiclos().then(setCiclos).catch(() => {}),
      api.getMuros().then(setMuros).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const programasAdulto = programas.filter(p => p.poblacion === 'adulto');
  const programasMenor = programas.filter(p => p.poblacion === 'menor');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
        <p className="text-slate-500 mt-1">Vista general del negocio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-lg"><BookOpen className="w-5 h-5 text-teal-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{programas.length}</p>
              <p className="text-sm text-slate-500">Programas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg"><Calendar className="w-5 h-5 text-amber-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{ciclos.length}</p>
              <p className="text-sm text-slate-500">Ciclos registrados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg"><MapPin className="w-5 h-5 text-green-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{muros.length}</p>
              <p className="text-sm text-slate-500">Muros aliados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-700" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">T4</p>
              <p className="text-sm text-slate-500">Ciclo activo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Programas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Programas Adultos</h2>
          <div className="space-y-3">
            {programasAdulto.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-700">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.descripcion?.substring(0, 60)}...</p>
                </div>
                <div className="flex gap-1.5">
                  {p.incluye_fisio && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Fisio</span>}
                  {p.incluye_nutricion && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">Nutri</span>}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mt-6 mb-4">Programas Menores</h2>
          <div className="space-y-3">
            {programasMenor.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-700">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.descripcion}</p>
                </div>
                <span className="text-xs text-slate-400">{p.rango_etario_menor?.replace('menor_', '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Muros y Ciclos */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Muros Aliados</h2>
            {muros.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg"><Mountain className="w-4 h-4 text-teal-700" /></div>
                  <div>
                    <p className="font-medium text-slate-700">{m.nombre}</p>
                    <p className="text-xs text-slate-400">{m.direccion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">{m.zonas_disponibles} zonas</p>
                  <span className={`text-xs ${m.convenio_activo ? 'text-green-600' : 'text-red-500'}`}>
                    {m.convenio_activo ? 'Convenio activo' : 'Sin convenio'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Ciclos</h2>
            {ciclos.map(c => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-semibold text-slate-700">{c.codigo}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(c.fecha_inicio).toLocaleDateString('es-CO')} → {new Date(c.fecha_fin).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <span className="text-xs text-slate-400">Empalme: {new Date(c.semana_empalme).toLocaleDateString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
