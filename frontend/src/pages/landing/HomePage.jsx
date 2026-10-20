import { ChevronDown } from 'lucide-react';
import { C, F, T, Section, SectionLabel, Divider, BtnPrimary, BtnOutline, TituloDoble } from './shared';
import { IconoPresa, IconoCronometro, IconoPlanEntreno, IconoCuerda } from '../../components/Icons';
import { S } from '../../contenido';

function Hero() {
  const t = S.inicio.portada;
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${t.imagen}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.bg}F2 0%, ${C.bg}B3 60%, ${C.bg}33 100%)` }} />
      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', padding: '100px clamp(20px, 5vw, 60px) 80px', width: '100%' }}>
        <div style={{ maxWidth: '620px' }}>
          <div style={{ ...T.label, marginBottom: '16px' }}>{t.etiqueta}</div>
          <h1 style={{ ...T.hero, marginBottom: '20px' }}>
            <TituloDoble titulo={t.titulo} destacado={t.tituloDestacado} />
          </h1>
          <p style={{ ...T.body, fontSize: '1.05rem', maxWidth: '480px', marginBottom: '36px' }}>{t.parrafo}</p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <BtnPrimary to="/registro">{t.boton}</BtnPrimary>
          </div>
          <div style={{ display: 'flex', gap: '32px', marginTop: '56px', flexWrap: 'wrap' }}>
            {t.cifras.map(({ numero, texto }) => (
              <div key={texto}>
                <div style={{ fontFamily: F.titulos, fontSize: '2.2rem', color: C.accent, lineHeight: 1 }}>{numero}</div>
                <div style={{ ...T.small, marginTop: '4px' }}>{texto}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
        <div style={{ fontSize: '0.72rem', fontFamily: F.texto, color: C.text2, letterSpacing: '0.1em' }}>{t.descubrir}</div>
        <ChevronDown size={18} color={C.text2} />
      </div>
    </section>
  );
}

// Íconos de los pilares, en el mismo orden que S.inicio.problema.pilares
const ICONOS_PILARES = [IconoPresa, IconoCronometro, IconoPlanEntreno, IconoCuerda];

function ElProblema() {
  const t = S.inicio.problema;
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="prob-grid">
          <style>{`@media(max-width:768px){.prob-grid{grid-template-columns:1fr!important}}`}</style>
          <div style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
            <img src={t.imagen} alt={t.imagenTitulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: `${C.bg}D9`, backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '8px', border: `1px solid ${C.accent}30` }}>
              <div style={{ fontFamily: F.titulos, fontSize: '1rem', color: C.accent }}>{t.imagenTitulo}</div>
              <div style={{ ...T.small, marginTop: '2px' }}>{t.imagenSubtitulo}</div>
            </div>
          </div>
          <div>
            <SectionLabel>{t.etiqueta}</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '16px' }}><TituloDoble titulo={t.titulo} destacado={t.tituloDestacado} /></h2>
            <Divider />
            <p style={T.body}>{t.parrafo1}</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '28px' }}>{t.parrafo2}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {t.pilares.map((p, i) => {
                const Icon = ICONOS_PILARES[i % ICONOS_PILARES.length];
                return (
                  <div key={p.titulo} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
                    <div style={{ padding: '6px', background: `${C.accent}15`, borderRadius: '6px', width: 'fit-content', marginBottom: '8px' }}>
                      <Icon style={{ width: '16px', height: '16px', color: C.accent }} />
                    </div>
                    <div style={{ fontFamily: F.titulos, fontSize: '0.9rem', color: C.text, marginBottom: '4px' }}>{p.titulo}</div>
                    <p style={{ ...T.body, fontSize: '0.78rem', lineHeight: 1.6 }}>{p.texto}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function CTASection() {
  const t = S.inicio.llamado;
  return (
    <div style={{ background: C.sidebar, borderTop: `1px solid ${C.accent}20`, borderBottom: `1px solid ${C.accent}20` }}>
      <Section style={{ textAlign: 'center', padding: 'clamp(48px, 6vw, 80px) clamp(20px, 5vw, 60px)' }}>
        <SectionLabel>{t.etiqueta}</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '16px' }}>{t.titulo}</h2>
        <p style={{ ...T.body, maxWidth: '480px', margin: '0 auto 32px' }}>{t.parrafo}</p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <BtnPrimary to="/registro">{t.boton}</BtnPrimary>
          <BtnOutline to="/contacto" style={{ borderColor: 'rgba(255,255,255,0.2)', color: C.text }}>{t.botonSecundario}</BtnOutline>
        </div>
      </Section>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <ElProblema />
      <CTASection />
    </>
  );
}
