// Admin → Ejercicios: video guía de cada ejercicio del catálogo (backend/src/utils/ejercicios.js).
// El escalador ve el botón "▶ Video guía" en cada bloque de Mi Plan que corresponde al ejercicio.
import { useState, useEffect } from 'react';
import { Loader2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { C, Aviso, Badge, Btn } from '../components/ui';
import { BotonVideoGuia, ModalVideo } from '../components/VideoGuia';

function FilaEjercicio({ e, onCambio }) {
  const [url, setUrl] = useState(e.video?.url || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ver, setVer] = useState(false);
  const cambiado = url.trim() !== (e.video?.url || '');

  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      const r = url.trim() ? await api.guardarVideoEjercicio(e.clave, url.trim()) : (await api.quitarVideoEjercicio(e.clave), { video: null });
      onCambio(e.clave, r.video);
    } catch (err) { setError(err?.error || 'No se pudo guardar'); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ padding: '12px 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>{e.nombre}</span>
        <code style={{ fontSize: '0.7rem', color: C.text3 }}>{e.clave}</code>
        {e.usos != null && <span style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2 }} title={e.bloques.join('\n')}>en {e.usos} bloque{e.usos !== 1 ? 's' : ''} del plan</span>}
        <span style={{ marginLeft: 'auto' }}>{e.video ? <Badge color={C.ok}>Con video</Badge> : <Badge color={C.text3}>Sin video</Badge>}</span>
        {e.video && <BotonVideoGuia onClick={() => setVer(true)} />}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input className="input-dark" value={url} onChange={ev => setUrl(ev.target.value)} placeholder="https://youtu.be/…  (YouTube no listado recomendado)" style={{ flex: 1 }} />
        <Btn small onClick={guardar} disabled={guardando || !cambiado}>{guardando ? 'Guardando…' : url.trim() || !e.video ? 'Guardar' : 'Quitar'}</Btn>
      </div>
      <Aviso onClose={error ? () => setError(null) : null}>{error}</Aviso>
      {ver && <ModalVideo video={e.video} titulo={e.nombre} onClose={() => setVer(false)} />}
    </div>
  );
}

export default function EjerciciosAdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [verSin, setVerSin] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => { api.getEjercicios().then(setData).catch(e => setError(e?.error || 'No se pudo cargar el catálogo')); }, []);

  if (error) return <Aviso>{error}</Aviso>;
  if (!data) return <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />;

  const onCambio = (clave, video) => setData(d => ({ ...d, ejercicios: d.ejercicios.map(x => (x.clave === clave ? { ...x, video } : x)) }));
  const conVideo = data.ejercicios.filter(e => e.video).length;
  const lista = data.ejercicios.filter(e => filtro === 'todos' || (filtro === 'sin' ? !e.video : !!e.video));
  const categorias = [...new Set(lista.map(e => e.categoria))];

  const plantilla = () => {
    const csv = ['clave,url,nombre (referencia; se ignora)', ...data.ejercicios.map(e => `${e.clave},${e.video?.url || ''},"${e.categoria} · ${e.nombre}"`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'videos-ejercicios.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Videos guía de ejercicios</h1>
      <p style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text2, lineHeight: 1.6, margin: '4px 0 16px' }}>
        Pega el enlace del video de cada ejercicio. El escalador lo ve con el botón «▶ Video guía» en cada bloque de Mi Plan que lo usa.
        Recomendado: súbelos a YouTube como <strong style={{ color: C.text }}>No listado</strong>; también sirven Vimeo, Google Drive o un .mp4.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        {[['todos', 'Todos'], ['sin', 'Sin video'], ['con', 'Con video']].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Poppins',
            border: `1px solid ${filtro === k ? C.accent + '60' : C.border}`, background: filtro === k ? C.accent + '15' : C.surface, color: filtro === k ? C.accent : C.text2,
          }}>{l}</button>
        ))}
        <span style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: C.text2 }}>{conVideo}/{data.ejercicios.length} con video</span>
        <Btn small variant="secondary" onClick={plantilla} style={{ marginLeft: 'auto' }}><Download size={13} /> Plantilla CSV</Btn>
      </div>

      {categorias.map(cat => (
        <div key={cat} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '6px 16px 4px', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', color: C.accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 0' }}>{cat}</div>
          {lista.filter(e => e.categoria === cat).map(e => <FilaEjercicio key={e.clave} e={e} onCambio={onCambio} />)}
        </div>
      ))}

      <button onClick={() => setVerSin(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: C.text2, cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.82rem', padding: '8px 0' }}>
        {verSin ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Bloques del plan sin ejercicio asociado ({data.sinEjercicio.length})
      </button>
      {verSin && (
        <div style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text3, lineHeight: 1.7, columns: '2 260px' }}>
          {data.sinEjercicio.map(b => <div key={b.nombre}>{b.veces > 1 ? `${b.veces}× ` : ''}{b.nombre}</div>)}
        </div>
      )}
    </div>
  );
}
