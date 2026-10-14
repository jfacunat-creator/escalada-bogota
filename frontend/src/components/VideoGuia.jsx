// Reproductor de los videos guía de ejercicios (ver backend/src/utils/ejercicios.js).
// YouTube «No listado» (recomendado) se reproduce con youtube-nocookie (sin cookies de seguimiento y sin
// recomendaciones de otros canales al final). También admite Vimeo, Google Drive y archivos MP4/WebM.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PlayCircle, Clock } from 'lucide-react';

function urlEmbed({ plataforma, videoId }) {
  if (plataforma === 'youtube') return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;
  if (plataforma === 'vimeo') {
    const [id, h] = String(videoId).split(':');
    return `https://player.vimeo.com/video/${id}?${h ? `h=${h}&` : ''}dnt=1&title=0&byline=0&portrait=0&autoplay=1`;
  }
  if (plataforma === 'drive') return `https://drive.google.com/file/d/${videoId}/preview`;
  return null;
}

export function ReproductorVideo({ video, titulo }) {
  const marco = { position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: '10px', overflow: 'hidden' };
  if (video.plataforma === 'archivo') {
    return (
      <div style={marco}>
        <video key={video.videoId} src={video.videoId} controls autoPlay playsInline preload="metadata" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }
  const src = urlEmbed(video);
  if (!src) return null;
  return (
    <div style={marco}>
      <iframe key={src} src={src} title={titulo || 'Video guía'} loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
    </div>
  );
}

const FASE = { 1: 'Fase 1 · Activación general', 2: 'Fase 2 · Activación específica', 3: 'Fase 3 · Preparación mental' };

// Ventana con uno o varios ejercicios: reproduce el elegido y lista el resto con su dosis.
// items: [{ clave, nombre, dosis?, fase?, video? }]. Los que no tienen video se listan como "Video pendiente".
export function ModalVideos({ titulo, subtitulo, items, onClose }) {
  const conVideo = items.filter(i => i.video);
  const [actual, setActual] = useState(conVideo[0]?.clave || null);
  const sel = items.find(i => i.clave === actual);
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const lista = items.length > 1 || !sel;
  let faseAnt = null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '880px', maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <PlayCircle size={18} color="#D4AF37" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.95rem', fontWeight: 600, color: '#F0EDE8' }}>{sel && items.length === 1 ? sel.nombre : titulo}</div>
            {subtitulo && <div style={{ fontFamily: 'Poppins', fontSize: '0.74rem', color: '#A09A8C' }}>{subtitulo}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', color: '#F0EDE8', cursor: 'pointer', display: 'flex', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {sel?.video && <ReproductorVideo video={sel.video} titulo={sel.nombre} />}

        {lista && (
          <div style={{ overflowY: 'auto', marginTop: sel?.video ? '10px' : 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {items.map((it, i) => {
              const cabecera = it.fase && it.fase !== faseAnt ? FASE[it.fase] : null;
              faseAnt = it.fase || faseAnt;
              const activo = it.clave === actual;
              return (
                <div key={it.clave}>
                  {cabecera && <div style={{ fontFamily: 'Poppins', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', margin: `${i ? 8 : 0}px 0 4px` }}>{cabecera}</div>}
                  <button onClick={() => it.video && setActual(it.clave)} disabled={!it.video}
                    style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'flex-start', textAlign: 'left', padding: '9px 10px', borderRadius: '9px',
                      cursor: it.video ? 'pointer' : 'default', border: `1px solid ${activo ? '#D4AF3770' : '#2e2e2e'}`, background: activo ? '#D4AF3714' : '#232323' }}>
                    {it.video ? <PlayCircle size={16} color={activo ? '#D4AF37' : '#A09A8C'} style={{ flexShrink: 0, marginTop: 2 }} /> : <Clock size={16} color="#555" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'Poppins', fontSize: '0.84rem', fontWeight: 600, color: it.video ? '#F0EDE8' : '#A09A8C' }}>
                        {it.nombre}{!it.video && <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#666' }}> · video pendiente</span>}
                      </span>
                      {it.dosis && <span style={{ display: 'block', fontFamily: 'Poppins', fontSize: '0.74rem', color: '#A09A8C', lineHeight: 1.45, marginTop: 2 }}>{it.dosis}</span>}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Botón compacto "▶ Video guía" (no propaga el clic: va dentro de cabeceras que abren/cierran).
export function BotonVideoGuia({ onClick, compacto, n = 1 }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} title="Ver video guía"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, cursor: 'pointer',
        background: '#D4AF3718', border: '1px solid #D4AF3755', borderRadius: '6px', color: '#D4AF37',
        padding: compacto ? '2px 7px' : '4px 10px', fontFamily: 'Poppins', fontSize: compacto ? '10px' : '11px', fontWeight: 700 }}>
      <PlayCircle size={compacto ? 12 : 14} /> {compacto ? 'Video' : n > 1 ? `${n} videos` : 'Video guía'}
    </button>
  );
}
