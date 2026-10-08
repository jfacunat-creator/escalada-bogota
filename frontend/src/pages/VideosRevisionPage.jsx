// Videos para revisión (entrenador: los de sus escaladores · admin: todos) con observaciones.
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import { C, Aviso } from '../components/ui';
import { VideoCard } from '../components/VideosRevision';

export default function VideosRevisionPage() {
  const [videos, setVideos] = useState(null);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setVideos(null); setError(null);
    api.getVideos(soloPendientes ? { pendientes: '1' } : undefined)
      .then(d => setVideos(d.videos))
      .catch(e => { setError(e?.error || 'No se pudieron cargar los videos'); setVideos([]); });
  }, [soloPendientes]);

  const q = buscar.trim().toLowerCase();
  const filtrados = (videos || []).filter(v => !q || `${v.nombre} ${v.apellido}`.toLowerCase().includes(q));
  const actualizar = v => setVideos(list => list.map(x => (x.id === v.id ? v : x)));

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Videos para revisión</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Cada video corresponde a una sesión puntual del plan del escalador. Deja tus observaciones.</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[[true, 'Sin revisar'], [false, 'Todos']].map(([v, l]) => (
          <button key={l} onClick={() => setSoloPendientes(v)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Poppins',
            border: `1px solid ${soloPendientes === v ? C.accent + '60' : C.border}`,
            background: soloPendientes === v ? C.accent + '15' : C.surface, color: soloPendientes === v ? C.accent : C.text2,
          }}>{l}</button>
        ))}
        <input className="input-dark" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar escalador…" style={{ maxWidth: '240px' }} />
      </div>
      <Aviso>{error}</Aviso>
      {videos === null ? (
        <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />
      ) : filtrados.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.88rem' }}>
          {soloPendientes ? 'No hay videos pendientes de revisión.' : 'Aún no hay videos.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: '14px' }}>
          {filtrados.map(v => <VideoCard key={v.id} video={v} mostrarEscalador puedeObservar onActualizado={actualizar} />)}
        </div>
      )}
    </div>
  );
}
