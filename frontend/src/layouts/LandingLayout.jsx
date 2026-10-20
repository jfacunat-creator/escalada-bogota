import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { IconoMuro } from '../components/Icons';
import { C, F } from '../pages/landing/shared';
import { S } from '../contenido';

const M = S.menu;
const navLinks = [
  { to: '/', label: M.inicio },
  { to: '/servicios', label: M.servicios },
  { to: '/equipo', label: M.equipo },
  { to: '/alianzas', label: M.alianzas },
  { to: '/normatividad', label: M.legal },
  { to: '/contacto', label: M.contacto },
];

// Logo: la imagen de marca si el contenido trae una; si no, el ícono del muro.
const Logo = ({ size }) => S.marca.logoImagen
  ? <img src={S.marca.logoImagen} alt={S.marca.nombre} style={{ height: `${size}px`, width: 'auto', display: 'block' }} />
  : <IconoMuro style={{ width: `${size}px`, height: `${size}px`, color: C.accent }} />;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const transparent = isHome && !scrolled;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: transparent ? 'transparent' : `${C.bg}F7`,
      backdropFilter: transparent ? 'none' : 'blur(12px)',
      borderBottom: transparent ? 'none' : `1px solid ${C.border}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(20px, 5vw, 60px)', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <Logo size={24} />
          <div>
            <div style={{ fontFamily: F.titulos, fontSize: '0.9rem', color: C.text, letterSpacing: '0.07em', lineHeight: 1.1 }}>{S.marca.logoLinea1}</div>
            <div style={{ fontFamily: F.titulos, fontSize: '0.9rem', color: C.accent, letterSpacing: '0.07em', lineHeight: 1.1 }}>{S.marca.logoLinea2}</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }} className="nav-desk">
          <style>{`@media(max-width:768px){.nav-desk{display:none!important}}`}</style>
          {navLinks.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} style={{
                padding: '8px 14px', color: active ? C.accent : C.text2,
                fontSize: '0.85rem', fontFamily: F.texto, fontWeight: active ? 600 : 400,
                textDecoration: 'none', borderRadius: '6px', transition: 'color 0.15s',
                borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.text2; }}>
                {label}
              </Link>
            );
          })}
          <Link to="/login" style={{
            marginLeft: '16px', padding: '9px 22px', background: C.accent, color: C.onAccent,
            borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontFamily: F.texto,
            fontWeight: 700, transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
            onMouseLeave={e => e.currentTarget.style.background = C.accent}>
            {M.ingresar}
          </Link>
        </div>

        {/* Burger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'none', padding: '4px' }} className="nav-burger">
          <style>{`@media(max-width:768px){.nav-burger{display:flex!important}}`}</style>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: `${C.bg}FA`, padding: '16px 24px 24px', borderBottom: `1px solid ${C.border}` }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{ display: 'block', padding: '12px 0', color: location.pathname === to ? C.accent : C.text2, fontSize: '1rem', fontFamily: F.texto, textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}>
              {label}
            </Link>
          ))}
          <Link to="/login" style={{ display: 'block', marginTop: '16px', padding: '12px', background: C.accent, color: C.onAccent, borderRadius: '8px', textAlign: 'center', textDecoration: 'none', fontFamily: F.texto, fontWeight: 700 }}>
            {M.ingresarMovil}
          </Link>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background: C.bgDeep, borderTop: `1px solid ${C.border}`, padding: '24px clamp(20px, 5vw, 60px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={18} />
          <span style={{ fontFamily: F.titulos, fontSize: '0.85rem', color: C.text2, letterSpacing: '0.06em' }}>{S.pie.nombre}</span>
        </div>
        <p style={{ fontFamily: F.texto, fontSize: '0.78rem', color: C.text3, textAlign: 'center' }}>
          {S.pie.copyright}
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[S.pie.terminos, S.pie.privacidad].map(l => (
            <span key={l} style={{ fontFamily: F.texto, fontSize: '0.78rem', color: C.text3, cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function LandingLayout() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
