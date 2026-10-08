// Videos para revisión: el escalador comparte el enlace (YouTube o Google Drive) de una sesión puntual
// de su plan y el entrenador o el admin le dejan observaciones. Los videos se ven siempre.
// Backend: routes/videos.js
import { useState, useEffect } from 'react';
import { ExternalLink, Loader2, MessageSquare, Send } from 'lucide-react';
import api from '../services/api';
import { C, Aviso, Badge, Btn } from './ui';
import { IconoVideo } from './Icons';

const PLATAFORMA = { youtube: 'YouTube', drive: 'Google Drive' };
const fmtFechaHora = d => new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const sesionLabel = v => `${v.trimestre} · ${v.semana}·${v.sesion_num}${v.sesion_nombre ? ` — ${v.sesion_nombre}` : ''}`;

export function VideoCard({ video, mostrarEscalador, puedeObservar, onActualizado }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const obs = video.observaciones || [];

  const observar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true); setError(null);
    try { onActualizado(await api.observarVideo(video.id, texto)); setTexto(''); }
    catch (err) { setError(err?.error || 'No se pudo guardar la observación'); }
    finally { setEnviando(false); }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ padding: '9px', borderRadius: '10px', background: '#818cf815', color: '#818cf8', flexShrink: 0 }}>
          <IconoVideo style={{ width: '20px', height: '20px' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {mostrarEscalador && <div style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.accent, fontWeight: 600 }}>{video.nombre} {video.apellido}</div>}
          <div style={{ fontFamily: 'Poppins', fontWeight: 600, color: C.text, fontSize: '0.9rem', lineHeight: 1.3 }}>{sesionLabel(video)}</div>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.74rem', color: C.text3, marginTop: '2px' }}>
            {PLATAFORMA[video.plataforma] || video.plataforma} · {fmtFechaHora(video.created_at)}
          </div>
          {video.descripcion && <div style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: C.text2, marginTop: '6px', whiteSpace: 'pre-wrap' }}>{video.descripcion}</div>}
        </div>
        {obs.length ? <Badge color={C.ok}>{obs.length} observación{obs.length !== 1 ? 'es' : ''}</Badge> : <Badge color={C.warn}>Sin revisar</Badge>}
      </div>

      <div style={{ borderTop: '1px solid #242424', background: '#181818', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <a href={video.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: C.accent, fontWeight: 500, textDecoration: 'none', fontFamily: 'Poppins', width: 'fit-content' }}>
          <ExternalLink size={14} /> Ver video
        </a>
        {obs.map(o => (
          <div key={o.id} style={{ background: C.surface2, borderRadius: '8px', padding: '8px 10px' }}>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text3, marginBottom: '2px' }}>
              <MessageSquare size={11} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '4px' }} />
              {o.autorRol === 'admin' ? 'Administrador' : `Entrenador ${o.autor}`} · {fmtFechaHora(o.createdAt)}
            </div>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.84rem', color: C.text, whiteSpace: 'pre-wrap' }}>{o.texto}</div>
          </div>
        ))}
        {puedeObservar && (
          <form onSubmit={observar} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} maxLength={2000}
              className="input-dark" placeholder="Escribe una observación para el escalador…" style={{ flex: 1, resize: 'vertical' }} />
            <Btn type="submit" small disabled={enviando || !texto.trim()}><Send size={13} /> {enviando ? 'Enviando…' : 'Enviar'}</Btn>
          </form>
        )}
        <Aviso onClose={error ? () => setError(null) : null}>{error}</Aviso>
      </div>
    </div>
  );
}

// Opciones de sesión desde el plan del escalador (semanas que puede ver); null si no hay plan.
function opcionesDelPlan(plan) {
  if (!plan?.semanas?.length) return null;
  return plan.semanas.flatMap(w => (w.sesiones || []).map(s => ({
    value: `${w.id}_${s.num}`, semana: w.id, num: s.num, nombre: s.name || null,
    label: `${w.id} · Sesión ${s.num}${s.name ? ` — ${s.name}` : ''}`,
  })));
}

const SEMANAS = Array.from({ length: 13 }, (_, i) => `S${i}`);

function FormVideo({ onCreado, disponible }) {
  const [plan, setPlan] = useState(undefined); // undefined = cargando · null = sin plan
  const [form, setForm] = useState({ sesion: '', trimestre: 'T1', semana: 'S1', num: '1', url: '', descripcion: '' });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => { api.getMyPlan().then(setPlan).catch(() => setPlan(null)); }, []);
  const opciones = opcionesDelPlan(plan);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    let sesion;
    if (opciones) {
      const o = opciones.find(x => x.value === form.sesion);
      if (!o) return setError('Elige la sesión que muestra el video');
      sesion = { trimestre: plan.trimestre, semana: o.semana, sesionNum: o.num, sesionNombre: o.nombre };
    } else {
      sesion = { trimestre: form.trimestre, semana: form.semana, sesionNum: Number(form.num) };
    }
    setEnviando(true);
    try {
      onCreado(await api.crearVideo({ ...sesion, url: form.url, descripcion: form.descripcion }));
      setForm(f => ({ ...f, sesion: '', url: '', descripcion: '' }));
    } catch (err) { setError(err?.error || 'No se pudo compartir el video'); }
    finally { setEnviando(false); }
  };

  if (plan === undefined) return <Loader2 className="animate-spin" style={{ width: '20px', height: '20px', color: C.accent }} />;

  return (
    <form onSubmit={enviar} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {opciones ? (
        <div>
          <label className="lbl-video">Sesión que muestra el video</label>
          <select className="input-dark" value={form.sesion} onChange={set('sesion')} required>
            <option value="">Elige la sesión…</option>
            {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div><label className="lbl-video">Trimestre</label>
            <select className="input-dark" value={form.trimestre} onChange={set('trimestre')}>{['T1', 'T2', 'T3', 'T4'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className="lbl-video">Semana</label>
            <select className="input-dark" value={form.semana} onChange={set('semana')}>{SEMANAS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className="lbl-video">Sesión</label>
            <select className="input-dark" value={form.num} onChange={set('num')}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></div>
        </div>
      )}
      <div>
        <label className="lbl-video">Enlace del video (YouTube o Google Drive)</label>
        <input className="input-dark" type="url" value={form.url} onChange={set('url')} required placeholder="https://youtu.be/… o https://drive.google.com/…" />
        <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text3, marginTop: '4px', lineHeight: 1.5 }}>
          Formato MP4 o MOV, máximo 50 MB. En YouTube súbelo como «No listado»; en Drive comparte «Cualquier persona con el enlace».
        </div>
      </div>
      <div>
        <label className="lbl-video">¿Qué quieres que revise tu entrenador? (opcional)</label>
        <textarea className="input-dark" rows={2} value={form.descripcion} onChange={set('descripcion')} maxLength={1000} style={{ resize: 'vertical' }} />
      </div>
      <Aviso>{error}</Aviso>
      <Btn type="submit" disabled={enviando || !disponible} style={{ alignSelf: 'flex-start' }}>
        {enviando ? 'Enviando…' : disponible ? 'Compartir video' : 'Límite del mes alcanzado'}
      </Btn>
    </form>
  );
}

// Sección del escalador en Contenido: formulario + sus videos con observaciones.
export function MisVideos() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const cargar = () => api.getVideos().then(setData).catch(e => setError(e?.error || 'No se pudieron cargar tus videos'));
  useEffect(() => { cargar(); }, []);

  const disponible = data ? data.usadosMes < data.limite : false;
  return (
    <section style={{ marginBottom: '32px' }}>
      <style>{`.lbl-video{display:block;font-size:0.72rem;color:${C.text2};margin-bottom:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;font-family:Poppins}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.4rem', color: C.text }}>Mis videos para revisión</h2>
          <p style={{ color: C.text2, fontSize: '0.85rem', fontFamily: 'Poppins' }}>Comparte una sesión de tu plan y tu entrenador te deja observaciones.</p>
        </div>
        {data && <Badge color={disponible ? C.accent : C.warn}>{data.usadosMes}/{data.limite} este mes</Badge>}
      </div>
      <Aviso>{error}</Aviso>
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormVideo disponible={disponible}
            onCreado={v => setData(d => ({ ...d, videos: [v, ...d.videos], usadosMes: d.usadosMes + 1 }))} />
          {data.videos.map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </section>
  );
}
