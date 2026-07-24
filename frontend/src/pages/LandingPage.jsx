import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconoMuro, IconoPresa, IconoRoca, IconoCuerda, IconoEscalador, IconoCronometro, IconoMagnesia, IconoPlanEntreno } from '../components/Icons';
import { Menu, X, ChevronDown, MessageCircle, Mail, MapPin, Check } from 'lucide-react';

// Icono Instagram SVG
const InstagramIcon = ({ size = 18, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

// ── PALETA ────────────────────────────────────────────────
const C = {
  bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e',
  accent: '#D4AF37', accent2: '#9E721D', sidebar: '#4A2F0F',
  text: '#F0EDE8', text2: '#A09A8C', text3: '#666',
};

// ── TIPOGRAFÍA ────────────────────────────────────────────
const T = {
  hero:    { fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 700, lineHeight: 1.05, color: C.text },
  h2:      { fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: C.text },
  h3:      { fontFamily: 'Antonio, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: C.text },
  h4:      { fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: C.text },
  body:    { fontFamily: 'Poppins, sans-serif', fontSize: '0.95rem', color: C.text2, lineHeight: 1.8 },
  small:   { fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem', color: C.text3 },
  label:   { fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent },
};

// ── COMPONENTES BASE ──────────────────────────────────────
const Section = ({ id, children, style = {} }) => (
  <section id={id} style={{ padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)', maxWidth: '1200px', margin: '0 auto', ...style }}>
    {children}
  </section>
);

const SectionLabel = ({ children }) => (
  <div style={{ ...T.label, marginBottom: '12px' }}>{children}</div>
);

const Divider = () => <div style={{ width: '48px', height: '3px', background: C.accent, borderRadius: '2px', margin: '16px 0 24px' }} />;

const BtnPrimary = ({ children, to, href, onClick, style = {} }) => {
  const s = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '13px 28px', borderRadius: '8px',
    background: C.accent, color: '#121212',
    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '0.9rem',
    textDecoration: 'none', border: 'none', cursor: 'pointer',
    transition: 'background 0.15s, transform 0.1s',
    ...style
  };
  if (to) return <Link to={to} style={s} onMouseEnter={e => e.currentTarget.style.background = '#E5C108'} onMouseLeave={e => e.currentTarget.style.background = C.accent}>{children}</Link>;
  if (href) return <a href={href} style={s} onMouseEnter={e => e.currentTarget.style.background = '#E5C108'} onMouseLeave={e => e.currentTarget.style.background = C.accent}>{children}</a>;
  return <button onClick={onClick} style={s} onMouseEnter={e => e.currentTarget.style.background = '#E5C108'} onMouseLeave={e => e.currentTarget.style.background = C.accent}>{children}</button>;
};

const BtnOutline = ({ children, to, href, style = {} }) => {
  const s = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '12px 28px', borderRadius: '8px',
    background: 'transparent', color: C.text,
    fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.9rem',
    textDecoration: 'none', border: `1px solid ${C.border}`,
    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
    ...style
  };
  if (to) return <Link to={to} style={s} onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>{children}</Link>;
  return <a href={href} style={s} onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>{children}</a>;
};

// ── NAVBAR ────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    ['#inicio', 'Inicio'], ['#servicios', 'Servicios'], ['#programas', 'Programas'],
    ['#equipo', 'Equipo'], ['#alianzas', 'Alianzas'], ['#contacto', 'Contacto'],
  ];

  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(18,18,18,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
      transition: 'all 0.3s',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(20px, 5vw, 60px)', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <button onClick={() => scrollTo('#inicio')} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <IconoMuro style={{ width: '26px', height: '26px', color: C.accent }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '0.95rem', color: C.text, letterSpacing: '0.07em', lineHeight: 1.1 }}>ESCALADA</div>
            <div style={{ fontFamily: 'Antonio', fontSize: '0.95rem', color: C.accent, letterSpacing: '0.07em', lineHeight: 1.1 }}>BOGOTÁ</div>
          </div>
        </button>

        {/* Links desktop */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} className="nav-links">
          <style>{`@media(max-width:768px){.nav-links{display:none!important}}`}</style>
          {links.map(([href, label]) => (
            <button key={href} onClick={() => scrollTo(href)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', color: C.text2, fontSize: '0.85rem', fontFamily: 'Poppins', fontWeight: 500, transition: 'color 0.15s', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.text2}>
              {label}
            </button>
          ))}
          <Link to="/login" style={{ marginLeft: '12px', padding: '8px 20px', background: C.accent, color: '#121212', borderRadius: '7px', textDecoration: 'none', fontSize: '0.85rem', fontFamily: 'Poppins', fontWeight: 700, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#E5C108'}
            onMouseLeave={e => e.currentTarget.style.background = C.accent}>
            Ingresar
          </Link>
        </div>

        {/* Burger mobile */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'none', padding: '4px' }} className="nav-burger">
          <style>{`@media(max-width:768px){.nav-burger{display:flex!important}}`}</style>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div style={{ background: 'rgba(18,18,18,0.98)', padding: '16px 24px 24px', borderBottom: `1px solid ${C.border}` }}>
          {links.map(([href, label]) => (
            <button key={href} onClick={() => scrollTo(href)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', color: C.text2, fontSize: '1rem', fontFamily: 'Poppins', borderBottom: `1px solid ${C.border}` }}>{label}</button>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: '16px', padding: '12px', background: C.accent, color: '#121212', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', fontFamily: 'Poppins', fontWeight: 700 }}>Ingresar a la plataforma</Link>
        </div>
      )}
    </nav>
  );
}

// ── HERO ──────────────────────────────────────────────────
function Hero() {
  return (
    <section id="inicio" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/climbing-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(18,18,18,0.95) 0%, rgba(18,18,18,0.7) 60%, rgba(18,18,18,0.3) 100%)' }} />

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', padding: '100px clamp(20px, 5vw, 60px) 80px', width: '100%' }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ ...T.label, marginBottom: '16px' }}>Bogotá · Entrenamiento de Escalada</div>
          <h1 style={{ ...T.hero, marginBottom: '20px' }}>
            Cada sesión<br />
            <span style={{ color: C.accent }}>te lleva más alto.</span>
          </h1>
          <p style={{ ...T.body, fontSize: '1.05rem', maxWidth: '480px', marginBottom: '36px' }}>
            No vendemos acceso al muro. Vendemos el proceso: entrenamiento periodizado por niveles, con tests objetivos y respaldo interdisciplinario. El dato es el producto.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <BtnPrimary to="/registro">Comenzar ahora</BtnPrimary>
            <BtnOutline href="#servicios">Ver planes</BtnOutline>
          </div>

          {/* Stats */}
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

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
        <div style={{ fontSize: '0.72rem', fontFamily: 'Poppins', color: C.text2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Descubrir</div>
        <ChevronDown size={18} color={C.text2} />
      </div>
    </section>
  );
}

// ── PROBLEMA / SOLUCIÓN ───────────────────────────────────
function Problema() {
  const pilares = [
    { Icon: IconoPresa, title: 'Grupos por nivel', text: '4 ciclos al año de 13 semanas. Nadie entra a mitad de ciclo. La personalización vive en la carga individual: edad, peso, condición y dosis.' },
    { Icon: IconoCronometro, title: 'El dato es el producto', text: 'Todo ciclo abre y cierra con test: batería Hörst, tests físicos y rendimiento en muro. Ves tu curva de progreso trimestre a trimestre.' },
    { Icon: IconoPlanEntreno, title: 'Metodología documentada', text: '3 planes anuales y 12 microciclos trimestrales sesión a sesión. 16 documentos técnicos con sustento bibliográfico internacional.' },
    { Icon: IconoCuerda, title: 'Red aliada', text: 'Muros como canal, no como competencia. Fisioterapeuta y nutricionista integrados con hitos fijos en el calendario.' },
  ];

  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <Section id="problema">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="prob-grid">
          <style>{`@media(max-width:768px){.prob-grid{grid-template-columns:1fr!important}}`}</style>

          {/* Foto entrenamiento */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
            <img src="/foto-entrenamiento.png" alt="Entrenamiento Escala Bogotá"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(18,18,18,0.85)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '8px', border: `1px solid ${C.accent}30` }}>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.accent }}>El proceso, no el resultado</div>
              <div style={{ ...T.small, marginTop: '2px' }}>Metodología Escala Bogotá</div>
            </div>
          </div>

          <div>
            <SectionLabel>El problema</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '16px' }}>El muro vende acceso.<br /><span style={{ color: C.accent }}>Nosotros vendemos proceso.</span></h2>
            <Divider />
            <p style={T.body}>El escalador aficionado en Bogotá entrena sin estructura: repite lo que ve, se estanca entre V2 y V4, se lesiona los dedos por imitar métodos de avanzados y no tiene forma de medir si mejora.</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '24px' }}>Ningún actor local ofrece periodización real con evaluación objetiva y respaldo interdisciplinario. Hasta ahora.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {pilares.map(p => (
                <div key={p.title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
                  <div style={{ padding: '6px', background: `${C.accent}15`, borderRadius: '6px', width: 'fit-content', marginBottom: '8px' }}>
                    <p.Icon style={{ width: '16px', height: '16px', color: C.accent }} />
                  </div>
                  <h4 style={{ ...T.h4, fontSize: '0.85rem', marginBottom: '4px' }}>{p.title}</h4>
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

// ── SERVICIOS ─────────────────────────────────────────────
function Servicios() {
  const planes = [
    {
      nombre: 'Plan Autónomo',
      precio: '$120.000 – $180.000',
      periodo: 'mes · solo con suscripción activa',
      desc: 'Para el escalador disciplinado que prefiere entrenar en sus horarios. Acceso completo al plan digital del ciclo vigente, videoteca técnica y evaluaciones presenciales en cada empalme.',
      incluye: [
        'Plan digital del ciclo vigente',
        'Videoteca técnica completa',
        'Revisión asincrónica de 2 videos/mes',
        'Tests presenciales en cada empalme',
        'Acceso a la plataforma mientras esté activo',
      ],
      tag: 'Digital',
      color: C.accent2,
    },
    {
      nombre: 'Plan Acompañado',
      precio: '$350.000 – $600.000',
      periodo: 'mes · ciclos de 13 semanas',
      desc: 'El plan completo para quien quiere resultados. 2 a 3 sesiones presenciales por semana en muro aliado, con entrenador asignado, evaluación trimestral y acceso a la red de aliados.',
      incluye: [
        '2–3 sesiones presenciales/semana',
        'Plan periodizado en muro aliado',
        'Evaluación trimestral con informe',
        'Tarifas preferenciales con fisio y nutrición',
        'Liga interna, Check-Point Fest y salidas a roca',
      ],
      tag: 'Presencial · Recomendado',
      color: C.accent,
      destacado: true,
    },
  ];

  return (
    <Section id="servicios">
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <SectionLabel>Nuestros Planes</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '12px' }}>Elige tu camino</h2>
        <p style={{ ...T.body, maxWidth: '520px', margin: '0 auto' }}>Comprás ciclos, no meses. La renovación ocurre en la semana de empalme, junto con la entrega de resultados — el momento de mayor percepción de valor.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '800px', margin: '0 auto' }} className="planes-grid">
        <style>{`@media(max-width:640px){.planes-grid{grid-template-columns:1fr!important}}`}</style>
        {planes.map(p => (
          <div key={p.nombre} style={{
            background: p.destacado ? C.sidebar : C.surface,
            border: `1px solid ${p.destacado ? `${C.accent}40` : C.border}`,
            borderRadius: '16px', padding: '28px',
            position: 'relative',
            boxShadow: p.destacado ? `0 0 40px ${C.accent}15` : 'none',
          }}>
            {p.destacado && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: C.accent, color: '#121212', padding: '4px 16px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>Más popular</div>}
            <div style={{ ...T.label, color: p.color, marginBottom: '8px' }}>{p.tag}</div>
            <h3 style={{ ...T.h3, marginBottom: '6px' }}>{p.nombre}</h3>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontFamily: 'Antonio', fontSize: '1.8rem', color: p.color }}>{p.precio}</span>
              <div style={{ ...T.small, marginTop: '2px' }}>{p.periodo}</div>
            </div>
            <p style={{ ...T.body, fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.7 }}>{p.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {p.incluye.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Check size={15} style={{ color: p.color, flexShrink: 0, marginTop: '3px' }} />
                  <span style={{ ...T.body, fontSize: '0.83rem' }}>{item}</span>
                </div>
              ))}
            </div>
            <BtnPrimary to="/registro" style={{ width: '100%', justifyContent: 'center', background: p.destacado ? C.accent : 'transparent', color: p.destacado ? '#121212' : C.text, border: p.destacado ? 'none' : `1px solid ${C.border}` }}>
              Inscribirme
            </BtnPrimary>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '24px', ...T.small }}>
        ¿Dudas? Agenda tu test de entrada gratuito — te mostramos con datos qué te frena.{' '}
        <a href="https://wa.me/573004567890" style={{ color: C.accent, fontWeight: 600 }}>Escribenos por WhatsApp</a>
      </div>
    </Section>
  );
}

// ── BREAK VISUAL ─────────────────────────────────────────
function BreakVisual() {
  return (
    <div style={{ position: 'relative', height: 'clamp(180px, 25vw, 300px)', overflow: 'hidden' }}>
      <img src="/foto-marca-gold.png" alt="Escala Bogotá"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,18,18,0.55)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontFamily: 'Antonio', fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', color: C.text, letterSpacing: '0.08em', textAlign: 'center' }}>
          ENTRENAMIENTO DE <span style={{ color: C.accent }}>ESCALADA</span>
        </div>
        <div style={{ ...T.label, opacity: 0.7 }}>Bogotá · Ciclos trimestrales · Todos los niveles</div>
      </div>
    </div>
  );
}

// ── PROGRAMAS ─────────────────────────────────────────────
function Programas() {
  const niveles = [
    {
      nivel: 'Iniciación',
      rango: '0–6 meses',
      color: '#22c55e',
      dolor: 'Miedo, no saber por dónde empezar, riesgo de lesión',
      pitch: 'El 80% del plan es escalar mejor, no sufrir en una tabla. Cero trabajo de dedos el primer año: así se construye una carrera sin lesiones. En 12 semanas caes sin miedo y lees tus propias vías.',
      incluye: ['Técnica de caída y lectura de vías', 'Repertorio motor básico', 'Juego de cierre en cada sesión', 'Cero campus ni lastre'],
    },
    {
      nivel: 'Intermedio',
      rango: 'Estancado V2–V4',
      color: C.accent,
      dolor: 'Meses sin subir de grado; entrena fuerte pero sin método',
      pitch: 'Tu problema no es fuerza, es estructura. Test de entrada gratuito: te mostramos con datos qué te frena. Progresión por tamaño de presa, sin lastre: subís de grado sin hipotecar los dedos.',
      incluye: ['Test Hörst + circuito estándar de entrada', 'Progresión por tamaño de presa', 'Liga interna de puntos por grupo', 'Check-Point Fest al cierre'],
    },
    {
      nivel: 'Avanzado',
      rango: 'V5+ / Competidor',
      color: '#ef4444',
      dolor: 'Techo de rendimiento; no sabe periodizar picos',
      pitch: 'Doble pico anual planificado con efectos retardados. Fisio mensual y nutrición por fase incluidas en el diseño. Entrenás con los mismos tests que discriminan el alto nivel (Lehner–Heyters).',
      incluye: ['Doble pico anual periodizado', 'Fisioterapeuta mensual incluido', 'Nutricionista por fases', 'Batería Lehner–Heyters'],
    },
  ];

  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      {/* Imagen de programas - full width */}
      <div style={{ width: '100%', height: 'clamp(200px, 30vw, 360px)', overflow: 'hidden', position: 'relative' }}>
        <img src="/foto-programas.png" alt="Programas Escala Bogotá"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(28,28,28,0.95) 100%)' }} />
      </div>

      <Section id="programas">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionLabel>Tipos de Entrenamiento</SectionLabel>
          <h2 style={{ ...T.h2, marginBottom: '12px' }}>Un programa para cada nivel</h2>
          <p style={{ ...T.body, maxWidth: '540px', margin: '0 auto' }}>9 programas: adultos en 3 niveles, menores en 3 rangos etarios × 2 niveles. El discurso cambia porque el dolor del escalador cambia por nivel.</p>
        </div>

        {/* Adultos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }} className="niv-grid">
          <style>{`@media(max-width:900px){.niv-grid{grid-template-columns:1fr!important}}`}</style>
          {niveles.map(n => (
            <div key={n.nivel} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '20px', background: `${n.color}10`, borderBottom: `1px solid ${n.color}20` }}>
                <div style={{ ...T.label, color: n.color, marginBottom: '6px' }}>{n.rango}</div>
                <h3 style={{ ...T.h3, color: n.color }}>{n.nivel}</h3>
                <p style={{ ...T.body, fontSize: '0.82rem', marginTop: '8px', color: C.text3, lineHeight: 1.6 }}>"{n.dolor}"</p>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ ...T.body, fontSize: '0.83rem', marginBottom: '16px', lineHeight: 1.7, fontStyle: 'italic', color: C.text2 }}>"{n.pitch}"</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {n.incluye.map(i => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <Check size={13} style={{ color: n.color, flexShrink: 0, marginTop: '3px' }} />
                      <span style={{ ...T.small, color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>{i}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Menores */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ ...T.label, color: '#c084fc', marginBottom: '6px' }}>Programa Menores</div>
              <h3 style={{ ...T.h3, marginBottom: '10px' }}>Para niños y jóvenes</h3>
              <p style={{ ...T.body, fontSize: '0.85rem' }}>Ratios 1:6 y 1:8 según grupo de edad. Protocolo de protección (Ley 1098/2006). Cero campus ni lastre antes de los 16. Fases sensibles del desarrollo motor respetadas por rango de edad.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[['6–9 años', '2 niveles'], ['10–12 años', '2 niveles'], ['13–15 años', '2 niveles']].map(([r, n]) => (
                <div key={r} style={{ padding: '14px 18px', background: C.surface, borderRadius: '10px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: '#c084fc' }}>{r}</div>
                  <div style={{ ...T.small, marginTop: '4px' }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── EXPERIENCIA ───────────────────────────────────────────
function Experiencia() {
  const items = [
    { Icon: IconoPresa, title: 'Liga interna de puntos', text: 'Puntos por asistencia, retos y juegos — no solo grado. Tabla pública por grupo. El principiante compite en igualdad con el avanzado.' },
    { Icon: IconoRoca, title: 'Check-Point Fest', text: 'El test trimestral se vive como festival: mini-competencia por equipos mixtos, música, premiación y comida. El dato recolectado, la experiencia celebrada.' },
    { Icon: IconoMuro, title: 'Salida trimestral a Suesca', text: 'Roca real, 1.5 h de Bogotá. El "para qué" del entrenamiento. El gancho social más fuerte del mercado local. Iniciación en top-rope opcional.' },
    { Icon: IconoEscalador, title: 'Sistema de parejas', text: 'Compañero de cordada rotativo dentro del grupo. Conocer gente como objetivo de diseño, no accidente.' },
    { Icon: IconoCronometro, title: 'Juego de cierre', text: 'Toda sesión de Iniciación e Intermedio termina en 15 minutos de juego: relevos, twister vertical, escalada a ciegas. Entrenamiento con motor técnico invisible.' },
    { Icon: IconoCuerda, title: 'Viernes social mensual', text: 'Escalada libre abierta con invitados externos y juegos. El viernes queda libre de grupos. Captación y referidos orgánicos.' },
  ];

  return (
    <Section id="experiencia">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', marginBottom: '48px' }} className="exp-intro-grid">
        <style>{`@media(max-width:768px){.exp-intro-grid{grid-template-columns:1fr!important}}`}</style>
        <div>
          <SectionLabel>La Experiencia</SectionLabel>
          <h2 style={{ ...T.h2, marginBottom: '12px' }}>El mercado no compra periodización.<br /><span style={{ color: C.accent }}>Compra divertirse y crecer.</span></h2>
          <Divider />
          <p style={T.body}>La rigurosidad técnica es el motor invisible. La experiencia visible es social, lúdica y memorable. Nuestros grupos son comunidad, no solo clases.</p>
        </div>
        {/* Foto comunidad - con overlay para tapar el logo con typo */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '16/10' }}>
          <img src="/foto-comunidad.png" alt="Comunidad Escala Bogotá"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
          {/* Overlay en esquina inferior derecha para cubrir logo con typo */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '180px', height: '60px', background: 'linear-gradient(to top-left, rgba(18,18,18,0.95) 0%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontFamily: 'Antonio', fontSize: '0.8rem', color: C.accent, letterSpacing: '0.06em' }}>ESCALA BOGOTÁ</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="exp-grid">
        <style>{`@media(max-width:900px){.exp-grid{grid-template-columns:1fr 1fr!important}}@media(max-width:600px){.exp-grid{grid-template-columns:1fr!important}}`}</style>
        {items.map(item => (
          <div key={item.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '22px' }}>
            <div style={{ padding: '9px', background: `${C.accent}12`, borderRadius: '8px', width: 'fit-content', marginBottom: '14px' }}>
              <item.Icon style={{ width: '20px', height: '20px', color: C.accent }} />
            </div>
            <h4 style={{ ...T.h4, marginBottom: '8px', fontSize: '0.95rem' }}>{item.title}</h4>
            <p style={{ ...T.body, fontSize: '0.83rem', lineHeight: 1.7 }}>{item.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── EQUIPO ────────────────────────────────────────────────
function Equipo() {
  const miembros = [
    {
      nombre: 'Juan Francisco Acuña',
      rol: 'Co-fundador · Entrenador Principal',
      bio: 'Escalador con más de 10 años de experiencia en escalada deportiva y boulder en Bogotá. Especialista en periodización y entrenamiento funcional para escaladores aficionados y competidores. Habilitado bajo Ley 181/1995. Ha formado más de 80 escaladores en programas estructurados.',
    },
    {
      nombre: 'Juan Diego García',
      rol: 'Co-fundador · Entrenador Avanzado',
      bio: 'Escalador de alto rendimiento con experiencia en competencia nacional y metodología de entrenamiento periodizado. Especialista en nivel Avanzado y desarrollo de talento joven. Entrenador habilitado bajo Ley 181/1995 con formación en fisiología del esfuerzo aplicada a la escalada.',
    },
  ];

  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <Section id="equipo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }} className="team-main-grid">
          <style>{`@media(max-width:768px){.team-main-grid{grid-template-columns:1fr!important}}`}</style>

          {/* Foto del equipo */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
            <img src="/foto-equipo.png" alt="Equipo Escala Bogotá"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', background: 'linear-gradient(to top, rgba(18,18,18,0.9) 0%, transparent 100%)' }}>
              <div style={{ ...T.label, marginBottom: '4px' }}>Nuestro equipo</div>
              <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.text }}>Entrenadores certificados · Ley 181/1995</div>
            </div>
          </div>

          {/* Textos */}
          <div>
            <SectionLabel>Quiénes somos</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}>El entrenador<br /><span style={{ color: C.accent }}>es el producto</span></h2>
            <Divider />
            <p style={{ ...T.body, marginBottom: '28px' }}>Dos escaladores bogotanos que se cansaron de ver a sus amigos lesionarse entrenando sin estructura. Fundamos Escalada Bogotá en 2025 para cambiar eso.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {miembros.map(m => (
                <div key={m.nombre} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.text, marginBottom: '2px' }}>{m.nombre}</div>
                  <div style={{ ...T.label, color: C.accent2, fontSize: '0.68rem', marginBottom: '8px' }}>{m.rol}</div>
                  <p style={{ ...T.body, fontSize: '0.82rem', lineHeight: 1.7 }}>{m.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── ALIANZAS ──────────────────────────────────────────────
function Alianzas() {
  const aliados = [
    { nombre: 'BetaClimb', tipo: 'Muro Aliado', desc: 'Muro de boulder e indoor en Bogotá. Zona exclusiva para grupos de Escalada Bogotá en horarios pico. 2 zonas disponibles para sesiones paralelas.', icon: IconoMuro, color: '#60a5fa' },
    { nombre: 'Weya Centro de Escalada', tipo: 'Muro Aliado', desc: 'Centro de escalada completo en Bogotá. Pared de dificultad y boulder. Convenio activo para grupos de Iniciación e Intermedio fines de semana.', icon: IconoMuro, color: '#60a5fa' },
    { nombre: 'Liyeri Fisioterapia', tipo: 'Aliado de Salud · Fisioterapia', desc: 'Fisioterapeuta especializada en lesiones deportivas y escalada. Integrada con hitos fijos en el calendario Avanzado. Remisión preferencial para todos los niveles.', icon: IconoCuerda, color: '#f43f5e' },
    { nombre: 'Daniela Forero', tipo: 'Aliado de Salud · Nutrición Deportiva', desc: 'Nutricionista deportiva con experiencia en deportes de fuerza y resistencia. Nutrición por fases incluida en el plan Avanzado. Valoración preferencial para demás niveles.', icon: IconoMagnesia, color: '#22c55e' },
  ];

  return (
    <Section id="alianzas">
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <SectionLabel>Alianzas</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '12px' }}>Una red que trabaja junta</h2>
        <p style={{ ...T.body, maxWidth: '480px', margin: '0 auto' }}>El muro recibe tráfico y retención. El fisio y el nutricionista reciben remisiones calificadas. Todos ganan — sobre todo el escalador.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }} className="ali-grid">
        <style>{`@media(max-width:640px){.ali-grid{grid-template-columns:1fr!important}}`}</style>
        {aliados.map(a => (
          <div key={a.nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '22px', display: 'flex', gap: '16px' }}>
            <div style={{ padding: '10px', background: `${a.color}12`, borderRadius: '10px', width: 'fit-content', height: 'fit-content', flexShrink: 0 }}>
              <a.icon style={{ width: '22px', height: '22px', color: a.color }} />
            </div>
            <div>
              <div style={{ ...T.label, color: a.color, marginBottom: '4px' }}>{a.tipo}</div>
              <h4 style={{ ...T.h4, marginBottom: '8px' }}>{a.nombre}</h4>
              <p style={{ ...T.body, fontSize: '0.83rem', lineHeight: 1.7 }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── CONTACTO ──────────────────────────────────────────────
function Contacto() {
  return (
    <div style={{ background: C.sidebar, borderTop: `1px solid ${C.accent}20` }}>
      <Section id="contacto">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }} className="contact-grid">
          <style>{`@media(max-width:768px){.contact-grid{grid-template-columns:1fr!important}}`}</style>
          <div>
            <SectionLabel>Contacto</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}>¿Listo para escalar<br /><span style={{ color: C.accent }}>con estructura?</span></h2>
            <Divider />
            <p style={{ ...T.body, marginBottom: '28px' }}>Agenda tu test de entrada gratuito. Te mostramos con datos (batería Hörst + circuito estándar) qué te frena y cuánto podés mejorar en 2 ciclos.</p>
            <BtnPrimary to="/registro">Comenzar ahora</BtnPrimary>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { Icon: MessageCircle, label: 'WhatsApp', value: '+57 300 456 7890', href: 'https://wa.me/573004567890', color: '#22c55e' },
              { Icon: Mail, label: 'Email', value: 'hola@escaladabogota.com', href: 'mailto:hola@escaladabogota.com', color: C.accent },
              { Icon: InstagramIcon, label: 'Instagram', value: '@escaladabogota', href: 'https://instagram.com/escaladabogota', color: '#c084fc' },
              { Icon: MapPin, label: 'Bogotá', value: 'BetaClimb · Weya Centro de Escalada', href: null, color: '#60a5fa' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'rgba(18,18,18,0.3)', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.07)` }}>
                <div style={{ padding: '8px', background: `${c.color}15`, borderRadius: '8px' }}><c.Icon size={18} style={{ color: c.color }} /></div>
                <div>
                  <div style={{ ...T.small, color: C.text3, marginBottom: '2px' }}>{c.label}</div>
                  {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: C.text, fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = c.color}
                    onMouseLeave={e => e.currentTarget.style.color = C.text}>{c.value}</a>
                    : <div style={{ color: C.text, fontFamily: 'Poppins', fontSize: '0.9rem' }}>{c.value}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#0a0a0a', borderTop: `1px solid ${C.border}`, padding: '24px clamp(20px, 5vw, 60px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoMuro style={{ width: '18px', height: '18px', color: C.accent }} />
          <span style={{ fontFamily: 'Antonio', fontSize: '0.85rem', color: C.text2, letterSpacing: '0.06em' }}>ESCALADA BOGOTÁ</span>
        </div>
        <div style={{ ...T.small, textAlign: 'center' }}>
          © 2025 Escalada Bogotá · PI registrada (DNDA) · Habilitación Ley 181/1995
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[['Términos', '#'], ['Privacidad', '#']].map(([l, h]) => (
            <a key={l} href={h} style={{ ...T.small, color: C.text3, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.text3}>{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <Problema />
      <Servicios />
      <BreakVisual />
      <Programas />
      <Experiencia />
      <Equipo />
      <Alianzas />
      <Contacto />
      <Footer />
    </div>
  );
}
