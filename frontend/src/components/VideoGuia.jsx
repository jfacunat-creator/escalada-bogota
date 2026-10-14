// Reproductor de los videos guía de ejercicios (ver backend/src/utils/ejercicios.js).
// YouTube «No listado» (recomendado) se reproduce con youtube-nocookie (sin cookies de seguimiento y sin
// recomendaciones de otros canales al final). También admite Vimeo, Google Drive y archivos MP4/WebM.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PlayCircle } from 'lucide-react';

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
        <video src={video.videoId} controls autoPlay playsInline preload="metadata" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }
  const src = urlEmbed(video);
  if (!src) return null;
  return (
    <div style={marco}>
      <iframe src={src} title={titulo || 'Video guía'} loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
    </div>
  );
}

export function ModalVideo({ video, titulo, onClose }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Video guía: ${titulo}`}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '880px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <PlayCircle size={18} color="#D4AF37" />
          <span style={{ flex: 1, fontFamily: 'Poppins', fontSize: '0.95rem', fontWeight: 600, color: '#F0EDE8' }}>{titulo}</span>
          <button onClick={onClose} aria-label="Cerrar video" style={{ background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', color: '#F0EDE8', cursor: 'pointer', display: 'flex', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>
        <ReproductorVideo video={video} titulo={titulo} />
      </div>
    </div>,
    document.body
  );
}

// Botón compacto "▶ Video guía" (no propaga el clic: va dentro de cabeceras que abren/cierran).
export function BotonVideoGuia({ onClick, compacto }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} title="Ver video guía"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, cursor: 'pointer',
        background: '#D4AF3718', border: '1px solid #D4AF3755', borderRadius: '6px', color: '#D4AF37',
        padding: compacto ? '2px 7px' : '4px 10px', fontFamily: 'Poppins', fontSize: compacto ? '10px' : '11px', fontWeight: 700 }}>
      <PlayCircle size={compacto ? 12 : 14} /> {compacto ? 'Video' : 'Video guía'}
    </button>
  );
}
