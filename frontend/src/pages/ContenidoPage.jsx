import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  IconoPlanEntreno, IconoVideo, IconoCuerda, IconoMagnesia,
  IconoCandado, IconoCheck, IconoPresa, IconoRoca
} from '../components/Icons';
import { Loader2, ExternalLink } from 'lucide-react';

const tipoConfig = {
  plan_entrenamiento: { label: 'Plan de Entreno', Icon: IconoPlanEntreno, color: 'teal' },
  video_tecnica: { label: 'Video Técnica', Icon: IconoVideo, color: 'indigo' },
  video_sesion: { label: 'Video Sesión', Icon: IconoVideo, color: 'purple' },
  documento_apoyo: { label: 'Documento', Icon: IconoRoca, color: 'amber' },
  nutricion: { label: 'Nutrición', Icon: IconoMagnesia, color: 'green' },
  fisioterapia: { label: 'Fisioterapia', Icon: IconoCuerda, color: 'rose' },
};

const colorClasses = {
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   ring: 'ring-teal-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'ring-indigo-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', ring: 'ring-purple-100' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  ring: 'ring-amber-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  ring: 'ring-green-100' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   ring: 'ring-rose-100' },
};

function ProgressRing({ pct, size = 36, stroke = 3 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 90 ? '#16a34a' : pct > 0 ? '#0d9488' : '#e2e8f0';

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      {pct >= 90 && (
        <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fontSize="11" fontWeight="600" fill="#16a34a">✓</text>
      )}
      {pct > 0 && pct < 90 && (
        <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fontSize="9" fontWeight="600" fill="#0d9488">{pct}%</text>
      )}
    </svg>
  );
}

function ContentCard({ item, onMarkViewed }) {
  const config = tipoConfig[item.tipo] || tipoConfig.documento_apoyo;
  const colors = colorClasses[config.color];
  const pct = item.progreso_pct || 0;
  const isVideo = item.tipo.includes('video');

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  };

  const formatDuration = (seg) => {
    if (!seg) return '';
    const min = Math.floor(seg / 60);
    const sec = seg % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition group`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Ícono con color */}
          <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text} flex-shrink-0`}>
            <config.Icon className="w-5 h-5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                {config.label}
              </span>
              {item.programa_nombre && (
                <span className="text-xs text-slate-400">{item.programa_nombre}</span>
              )}
            </div>
            <h3 className="font-medium text-slate-800 text-sm leading-snug mb-1">{item.titulo}</h3>
            {item.descripcion && (
              <p className="text-xs text-slate-400 line-clamp-2">{item.descripcion}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              {item.duracion_seg && <span>{formatDuration(item.duracion_seg)}</span>}
              {item.tamano_bytes && <span>{formatSize(item.tamano_bytes)}</span>}
              {item.mime_type && <span>{item.mime_type.split('/')[1]?.toUpperCase()}</span>}
            </div>
          </div>

          {/* Progreso + Acción */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <ProgressRing pct={pct} />
            {pct < 90 && (
              <button
                onClick={() => onMarkViewed(item.id)}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
              >
                Marcar visto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra inferior con link */}
      <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between bg-slate-50/50">
        <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 transition">
          {isVideo ? (
            <><IconoVideo className="w-3.5 h-3.5" /> Ver video</>
          ) : (
            <><ExternalLink className="w-3.5 h-3.5" /> Abrir documento</>
          )}
        </a>
        {item.visto && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <IconoCheck className="w-3.5 h-3.5" /> Completado
          </span>
        )}
      </div>
    </div>
  );
}

export default function ContenidoPage() {
  const { user } = useAuth();
  const [contenido, setContenido] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    loadContenido();
  }, []);

  const loadContenido = async () => {
    try {
      const data = await api.getContenido();
      setContenido(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkViewed = async (contenidoId) => {
    try {
      await api.updateProgreso(contenidoId, 100);
      setContenido(prev => prev.map(c =>
        c.id === contenidoId ? { ...c, progreso_pct: 100, visto: true } : c
      ));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  }

  const tipos = ['todos', ...new Set(contenido.map(c => c.tipo))];
  const filtered = filtro === 'todos' ? contenido : contenido.filter(c => c.tipo === filtro);
  const totalVisto = contenido.filter(c => c.visto || c.progreso_pct >= 90).length;
  const pctTotal = contenido.length > 0 ? Math.round((totalVisto / contenido.length) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Contenido del Ciclo</h1>
        <p className="text-slate-500 mt-1">Material de entrenamiento · Acceso con suscripción activa</p>
      </div>

      {contenido.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <IconoCandado className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin contenido disponible</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {user?.rol === 'escalador'
              ? 'El contenido se habilita cuando tienes una inscripción activa en un ciclo. Contacta al equipo para más información.'
              : 'Aún no se ha subido contenido para este ciclo. Usa el botón de crear para agregar material.'}
          </p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{contenido.length}</p>
              <p className="text-xs text-slate-500">Materiales</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalVisto}</p>
              <p className="text-xs text-slate-500">Completados</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-teal-700">{contenido.length - totalVisto}</p>
              <p className="text-xs text-slate-500">Pendientes</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className={`text-2xl font-bold ${pctTotal >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{pctTotal}%</p>
              <p className="text-xs text-slate-500">Progreso</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tipos.map(t => {
              const config = t === 'todos' ? null : tipoConfig[t];
              const colors = config ? colorClasses[config.color] : null;
              const isActive = filtro === t;

              return (
                <button key={t} onClick={() => setFiltro(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? colors ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}` : 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {t === 'todos' ? 'Todos' : config?.label || t}
                  <span className="ml-1.5 text-xs opacity-60">
                    {t === 'todos' ? contenido.length : contenido.filter(c => c.tipo === t).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista de contenido */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(item => (
              <ContentCard key={item.id} item={item} onMarkViewed={handleMarkViewed} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
