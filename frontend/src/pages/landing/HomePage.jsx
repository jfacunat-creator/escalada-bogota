import { ChevronDown } from 'lucide-react';
import { C, T, Section, SectionLabel, Divider, BtnPrimary, BtnOutline, CheckItem } from './shared';
import { IconoPresa, IconoCronometro, IconoPlanEntreno, IconoCuerda } from '../../components/Icons';

function Hero() {
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/climbing-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(18,18,18,0.95) 0%, rgba(18,18,18,0.7) 60%, rgba(18,18,18,0.2) 100%)' }} />
      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', padding: '100px clamp(20px, 5vw, 60px) 80px', width: '100%' }}>
        <div style={{ maxWidth: '620px' }}>
          <div style={{ ...T.label, marginBottom: '16px' }}>Bogotá · Entrenamiento de Escalada</div>
          <h1 style={{ ...T.hero, marginBottom: '20px' }}>
            Cada sesión<br />
            <span style={{ color: C.accent }}>te lleva más alto.</span>
          </h1>
          <p style={{ ...T.body, fontSize: '1.05rem', maxWidth: '480px', marginBottom: '36px' }}>
            No vendemos acceso al muro. Vendemos el proceso: entrenamiento periodizado por niveles, con tests objetivos y respaldo interdisciplinario.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <BtnPrimary to="/servicios">Ver programas y planes</BtnPrimary>
            <BtnOutline to="/contacto">Agenda tu test gratuito</BtnOutline>
          </div>
          <div style={{ display: 'flex', gap: '32px', marginTop: '56px', flexWrap: 'wrap' }}>
            {[['4', 'Ciclos al año'], ['13', 'Semanas por ciclo'], ['9', 'Programas'], ['2', 'Muros aliados']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Antonio', fontSize: '2.2rem', color: C.accent, lineHeight: 1 }}>{n}</div>
                <div style={{ ...T.small, marginTop: '4px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
        <div style={{ fontSize: '0.72rem', fontFamily: 'Poppins', color: C.text2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Descubrir</div>
        <ChevronDown size={18} color={C.text2} />
      </div>
    </section>
  );
}

function ElProblema() {
  const pilares = [
    { Icon: IconoPresa, title: 'Grupos por nivel', text: '4 ciclos al año de 13 semanas. Nadie entra a mitad de ciclo. La personalización vive en la carga individual.' },
    { Icon: IconoCronometro, title: 'El dato es el producto', text: 'Todo ciclo abre y cierra con test. Ves tu curva de progreso trimestre a trimestre.' },
    { Icon: IconoPlanEntreno, title: 'Metodología documentada', text: '16 documentos técnicos con sustento bibliográfico internacional (FEDME, Hörst, Cometti, Watts).' },
    { Icon: IconoCuerda, title: 'Red aliada', text: 'Fisioterapeuta y nutricionista integrados con hitos fijos en el calendario.' },
  ];
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="prob-grid">
          <style>{`@media(max-width:768px){.prob-grid{grid-template-columns:1fr!important}}`}</style>
          <div style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
            <img src="/foto-entrenamiento.png" alt="Entrenamiento estructurado" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(18,18,18,0.85)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '8px', border: `1px solid ${C.accent}30` }}>
              <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.accent }}>Proceso periodizado</div>
              <div style={{ ...T.small, marginTop: '2px' }}>No improvisación — metodología</div>
            </div>
          </div>
          <div>
            <SectionLabel>El problema</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '16px' }}>El muro vende acceso.<br /><span style={{ color: C.accent }}>Nosotros vendemos proceso.</span></h2>
            <Divider />
            <p style={T.body}>El escalador en Bogotá entrena sin estructura: se estanca entre V2 y V4, se lesiona los dedos imitando métodos de avanzados y no tiene cómo medir si mejora.</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '28px' }}>Ningún actor local ofrece periodización real con evaluación objetiva y respaldo interdisciplinario. Hasta ahora.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {pilares.map(p => (
                <div key={p.title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
                  <div style={{ padding: '6px', background: `${C.accent}15`, borderRadius: '6px', width: 'fit-content', marginBottom: '8px' }}>
                    <p.Icon style={{ width: '16px', height: '16px', color: C.accent }} />
                  </div>
                  <div style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: C.text, marginBottom: '4px' }}>{p.title}</div>
                  <p style={{ ...T.body, fontSize: '0.78rem', lineHeight: 1.6 }}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function CTASection() {
  return (
    <div style={{ background: C.sidebar, borderTop: `1px solid ${C.accent}20`, borderBottom: `1px solid ${C.accent}20` }}>
      <Section style={{ textAlign: 'center', padding: 'clamp(48px, 6vw, 80px) clamp(20px, 5vw, 60px)' }}>
        <SectionLabel>¿Listo para empezar?</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '16px' }}>Conoce nuestros programas y planes</h2>
        <p style={{ ...T.body, maxWidth: '480px', margin: '0 auto 32px' }}>
          Iniciación, Intermedio, Avanzado y programas para menores. Plan Autónomo o Plan Acompañado. Encuentra el que es para ti.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <BtnPrimary to="/servicios">Ver programas y planes</BtnPrimary>
          <BtnOutline to="/contacto" style={{ borderColor: 'rgba(255,255,255,0.2)', color: C.text }}>Hablar con el equipo</BtnOutline>
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
