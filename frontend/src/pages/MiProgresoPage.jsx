import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Loader2 } from 'lucide-react';
import { IconoRoca, IconoPresa, IconoSemaforo, IconoCronometro, IconoEscalador, IconoCuerda } from '../components/Icons';

const metricaConfig = {
  fuerza_dedos_kg:    { label: 'Fuerza de dedos',   Icon: IconoPresa,   color: '#0d9488', desc: 'Dinamometría (kg)' },
  grado_max_boulder:  { label: 'Grado máximo',      Icon: IconoRoca,    color: '#7c3aed', desc: 'Boulder más alto enviado' },
  resistencia_seg:    { label: 'Resistencia',        Icon: IconoCronometro, color: '#2563eb', desc: 'Tiempo en pared (seg)' },
  flexibilidad_cm:    { label: 'Flexibilidad',       Icon: IconoCuerda,  color: '#059669', desc: 'Sit and reach (cm)' },
  tecnica_caida:      { label: 'Técnica de caída',   Icon: IconoEscalador, color: '#d97706', desc: 'Evaluación 1-5' },
  lectura_vias:       { label: 'Lectura de vías',    Icon: IconoRoca,    color: '#dc2626', desc: 'Evaluación 1-5' },
};

const semaforoColor = { verde: '#16a34a', amarillo: '#f59e0b', rojo: '#dc2626' };

function MetricaCard({ metrica, data }) {
  const config = metricaConfig[metrica] || { label: metrica, Icon: IconoPresa, color: '#64748b', desc: '' };
  const { puntos, tendencia, unidad } = data;
  const ultimo = puntos[puntos.length - 1];
  const chartData = puntos.map(p => ({
    name: `${p.ciclo} ${p.tipo === 'entrada' ? 'E' : 'S'}`,
    valor: p.valor,
    semaforo: p.semaforo,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: config.color + '15', color: config.color }}>
              <config.Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{config.label}</h3>
              <p className="text-xs text-slate-400">{config.desc}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: config.color }}>{ultimo.valor}</span>
              <span className="text-xs text-slate-400">{unidad}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <IconoSemaforo color={ultimo.semaforo} className="w-4 h-4" />
              {tendencia && (
                <span className={`text-xs font-medium ${tendencia.mejoro ? 'text-green-600' : 'text-red-500'}`}>
                  {tendencia.mejoro ? '↑' : '↓'} {Math.abs(tendencia.cambioPct)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {puntos.length >= 2 && (
        <div className="px-3 py-3">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${metrica}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(val, name) => [`${val} ${unidad}`, config.label]}
                labelStyle={{ fontWeight: 600, color: '#334155' }}
              />
              <Area type="monotone" dataKey="valor" stroke={config.color} strokeWidth={2.5}
                fill={`url(#grad-${metrica})`} dot={{ r: 4, fill: config.color, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Puntos de datos */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex gap-3 overflow-x-auto">
          {puntos.map((p, i) => (
            <div key={i} className="flex-shrink-0 text-center min-w-[60px]">
              <p className="text-xs text-slate-400">{p.ciclo}</p>
              <p className="text-xs text-slate-400">{p.tipo === 'entrada' ? 'Entrada' : 'Salida'}</p>
              <p className="text-sm font-semibold" style={{ color: semaforoColor[p.semaforo] }}>{p.valor}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <IconoRoca className="w-14 h-14 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Aún no tienes evaluaciones</h3>
      <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
        Las evaluaciones se realizan al inicio y final de cada ciclo (13 semanas).
        Tu entrenador registrará los resultados de la batería Hörst, tests físicos
        y rendimiento en muro.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {Object.entries(metricaConfig).slice(0, 4).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <cfg.Icon className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvaluacionTimeline({ evaluaciones }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Historial de Evaluaciones</h3>
      <div className="space-y-3">
        {evaluaciones.map((ev, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              ev.tipo === 'entrada' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
            }`}>
              <span className="text-xs font-bold">{ev.tipo === 'entrada' ? 'E' : 'S'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                Test de {ev.tipo} · {ev.ciclo}
              </p>
              <p className="text-xs text-slate-400">
                {ev.programa} · {new Date(ev.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MiProgresoPage() {
  const { user } = useAuth();
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.escalador?.id) {
      api.getProgreso(user.escalador.id)
        .then(setProgreso)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.escalador?.id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  }

  const hayDatos = progreso?.hayDatos;
  const metricas = progreso?.metricas || {};
  const evaluaciones = progreso?.evaluaciones || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mi Progreso</h1>
        <p className="text-slate-500 mt-1">Curvas de progreso trimestre a trimestre</p>
      </div>

      {!hayDatos ? (
        <EmptyState />
      ) : (
        <>
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{evaluaciones.length}</p>
              <p className="text-xs text-slate-500">Evaluaciones</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-teal-700">{Object.keys(metricas).length}</p>
              <p className="text-xs text-slate-500">Métricas</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {Object.values(metricas).filter(m => m.tendencia?.mejoro).length}
              </p>
              <p className="text-xs text-slate-500">Mejorando</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{progreso.totalPuntos}</p>
              <p className="text-xs text-slate-500">Datos totales</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Curvas de métricas */}
            <div className="lg:col-span-2 space-y-4">
              {Object.entries(metricas).map(([key, data]) => (
                <MetricaCard key={key} metrica={key} data={data} />
              ))}
            </div>

            {/* Timeline lateral */}
            <div>
              <EvaluacionTimeline evaluaciones={evaluaciones} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
