import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { IconoPlanEntreno, IconoVideo, IconoCuerda, IconoMagnesia, IconoCandado, IconoCheck, IconoRoca } from '../components/Icons';
import { Loader2, ExternalLink } from 'lucide-react';

const tipoConfig = {
  plan_entrenamiento: { label: 'Plan de Entreno', Icon: IconoPlanEntreno, color: '#D4AF37' },
  video_tecnica: { label: 'Video Técnica', Icon: IconoVideo, color: '#818cf8' },
  video_sesion: { label: 'Video Sesión', Icon: IconoVideo, color: '#c084fc' },
  documento_apoyo: { label: 'Documento', Icon: IconoRoca, color: '#f59e0b' },
  nutricion: { label: 'Nutrición', Icon: IconoMagnesia, color: '#22c55e' },
  fisioterapia: { label: 'Fisioterapia', Icon: IconoCuerda, color: '#f43f5e' },
};

export default function ContenidoPage() {
  const { user } = useAuth();
  const [contenido, setContenido] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => { api.getContenido().then(setContenido).catch(console.error).finally(() => setLoading(false)); }, []);

  const handleMark = async (id) => {
    try { await api.updateProgreso(id, 100); setContenido(p => p.map(c => c.id === id ? { ...c, progreso_pct: 100, visto: true } : c)); } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>;

  const tipos = ['todos', ...new Set(contenido.map(c => c.tipo))];
  const filtered = filtro === 'todos' ? contenido : contenido.filter(c => c.tipo === filtro);
  const totalVisto = contenido.filter(c => c.visto || c.progreso_pct >= 90).length;
  const pct = contenido.length > 0 ? Math.round((totalVisto / contenido.length) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8' }}>Contenido del Ciclo</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Material de entrenamiento · Acceso con suscripción activa</p>
      </div>

      {contenido.length === 0 ? (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoCandado style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#A09A8C', marginBottom: '8px' }}>Sin contenido disponible</h3>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>El contenido se habilita con una inscripción activa.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }} className="cont-stats">
            <style>{`@media(max-width:600px){.cont-stats{grid-template-columns:repeat(2,1fr)!important}}`}</style>
            {[[contenido.length, 'Materiales', '#A09A8C'], [totalVisto, 'Completados', '#22c55e'], [contenido.length - totalVisto, 'Pendientes', '#D4AF37'], [pct + '%', 'Progreso', pct >= 80 ? '#22c55e' : '#f59e0b']].map(([v, l, c]) => (
              <div key={l} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: c }}>{v}</div>
                <div style={{ fontSize: '0.75rem', color: '#A09A8C', marginTop: '2px' }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {tipos.map(t => {
              const cfg = t === 'todos' ? null : tipoConfig[t];
              return (
                <button key={t} onClick={() => setFiltro(t)} style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
                  border: filtro === t ? `1px solid ${cfg?.color || '#D4AF37'}40` : '1px solid #2e2e2e',
                  background: filtro === t ? (cfg?.color || '#D4AF37') + '15' : '#1c1c1c',
                  color: filtro === t ? (cfg?.color || '#D4AF37') : '#A09A8C',
                  transition: 'all 0.15s',
                }}>{t === 'todos' ? 'Todos' : cfg?.label || t} <span style={{ opacity: 0.6, marginLeft: '4px' }}>{t === 'todos' ? contenido.length : contenido.filter(c => c.tipo === t).length}</span></button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {filtered.map(item => {
              const cfg = tipoConfig[item.tipo] || tipoConfig.documento_apoyo;
              const p = item.progreso_pct || 0;
              return (
                <div key={item.id} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '10px', background: cfg.color + '15', color: cfg.color, flexShrink: 0 }}>
                        <cfg.Icon style={{ width: '20px', height: '20px' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: cfg.color, padding: '1px 6px', borderRadius: '4px', background: cfg.color + '15' }}>{cfg.label}</span>
                        <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem', marginTop: '6px', lineHeight: 1.3 }}>{item.titulo}</div>
                        {item.descripcion && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{item.descripcion}</div>}
                      </div>
                      {p >= 90 ? <IconoCheck style={{ width: '22px', height: '22px', color: '#22c55e', flexShrink: 0 }} />
                        : p > 0 ? <span style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: '#D4AF37' }}>{p}%</span>
                        : null}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #242424', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#181818' }}>
                    <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#D4AF37', fontWeight: 500, textDecoration: 'none' }}>
                      <ExternalLink size={14} /> Abrir
                    </a>
                    {p < 90 && <button onClick={() => handleMark(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#A09A8C', fontWeight: 500 }}>Marcar visto</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
