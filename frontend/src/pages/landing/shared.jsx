// ── Paleta, tipografía y componentes compartidos de landing ──
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export const C = {
  bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e',
  accent: '#D4AF37', accent2: '#9E721D', sidebar: '#4A2F0F',
  text: '#F0EDE8', text2: '#A09A8C', text3: '#666',
};

export const T = {
  hero:  { fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 700, lineHeight: 1.05, color: C.text },
  h1:    { fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.1, color: C.text },
  h2:    { fontFamily: 'Antonio, sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: C.text },
  h3:    { fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: C.text },
  h4:    { fontFamily: 'Antonio, sans-serif', fontSize: '1.05rem', fontWeight: 600, color: C.text },
  body:  { fontFamily: 'Poppins, sans-serif', fontSize: '0.95rem', color: C.text2, lineHeight: 1.8 },
  small: { fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem', color: C.text3 },
  label: { fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent },
};

export const Section = ({ id, children, style = {} }) => (
  <section id={id} style={{ padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)', maxWidth: '1200px', margin: '0 auto', ...style }}>
    {children}
  </section>
);

export const SectionLabel = ({ children, color }) => (
  <div style={{ ...T.label, color: color || C.accent, marginBottom: '12px' }}>{children}</div>
);

export const Divider = ({ color }) => (
  <div style={{ width: '48px', height: '3px', background: color || C.accent, borderRadius: '2px', margin: '16px 0 24px' }} />
);

export const PageHeader = ({ label, title, subtitle, dark = false }) => (
  <div style={{ background: dark ? '#0a0a0a' : C.surface, borderBottom: `1px solid ${C.border}`, padding: 'clamp(80px, 10vw, 120px) clamp(20px, 5vw, 60px) clamp(48px, 6vw, 72px)' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <SectionLabel>{label}</SectionLabel>
      <h1 style={{ ...T.h1, marginBottom: subtitle ? '16px' : 0 }}>{title}</h1>
      {subtitle && <p style={{ ...T.body, maxWidth: '560px', marginTop: '12px', fontSize: '1.05rem' }}>{subtitle}</p>}
    </div>
  </div>
);

export const BtnPrimary = ({ children, to, href, onClick, style = {} }) => {
  const s = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '13px 28px', borderRadius: '8px',
    background: C.accent, color: '#121212',
    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '0.9rem',
    textDecoration: 'none', border: 'none', cursor: 'pointer',
    transition: 'background 0.15s', ...style
  };
  const hover = e => e.currentTarget.style.background = '#E5C108';
  const leave = e => e.currentTarget.style.background = C.accent;
  if (to) return <Link to={to} style={s} onMouseEnter={hover} onMouseLeave={leave}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={s} onMouseEnter={hover} onMouseLeave={leave}>{children}</a>;
  return <button onClick={onClick} style={s} onMouseEnter={hover} onMouseLeave={leave}>{children}</button>;
};

export const BtnOutline = ({ children, to, href, style = {} }) => {
  const s = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '12px 28px', borderRadius: '8px',
    background: 'transparent', color: C.text,
    fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.9rem',
    textDecoration: 'none', border: `1px solid ${C.border}`,
    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s', ...style
  };
  const hover = e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; };
  const leave = e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; };
  if (to) return <Link to={to} style={s} onMouseEnter={hover} onMouseLeave={leave}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" style={s} onMouseEnter={hover} onMouseLeave={leave}>{children}</a>;
};

export const CheckItem = ({ children, color }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
    <Check size={14} style={{ color: color || C.accent, flexShrink: 0, marginTop: '4px' }} />
    <span style={{ ...T.body, fontSize: '0.85rem' }}>{children}</span>
  </div>
);
