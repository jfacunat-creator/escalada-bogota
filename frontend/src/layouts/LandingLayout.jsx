import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { IconoMuro } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/equipo', label: 'Equipo' },
  { to: '/alianzas', label: 'Alianzas' },
  { to: '/contacto', label: 'Contacto' },
];

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
      background: transparent ? 'transparent' : 'rgba(18,18,18,0.97)',
      backdropFilter: transparent ? 'none' : 'blur(12px)',
      borderBottom: transparent ? 'none' : `1px solid ${C.border}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(20px, 5vw, 60px)', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <IconoMuro style={{ width: '24px', height: '24px', color: C.accent }} />
          <div>
            <div style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: C.text, letterSpacing: '0.07em', lineHeight: 1.1 }}>ESCALADA</div>
            <div style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: C.accent, letterSpacing: '0.07em', lineHeight: 1.1 }}>BOGOTÁ</div>
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
                fontSize: '0.85rem', fontFamily: 'Poppins', fontWeight: active ? 600 : 400,
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
            marginLeft: '16px', padding: '9px 22px', background: C.accent, color: '#121212',
            borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontFamily: 'Poppins',
            fontWeight: 700, transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#E5C108'}
            onMouseLeave={e => e.currentTarget.style.background = C.accent}>
            Ingresar
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
        <div style={{ background: 'rgba(18,18,18,0.98)', padding: '16px 24px 24px', borderBottom: `1px solid ${C.border}` }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{ display: 'block', padding: '12px 0', color: location.pathname === to ? C.accent : C.text2, fontSize: '1rem', fontFamily: 'Poppins', textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}>
              {label}
            </Link>
          ))}
          <Link to="/login" style={{ display: 'block', marginTop: '16px', padding: '12px', background: C.accent, color: '#121212', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', fontFamily: 'Poppins', fontWeight: 700 }}>
            Ingresar a la plataforma
          </Link>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background: '#0a0a0a', borderTop: `1px solid ${C.border}`, padding: '24px clamp(20px, 5vw, 60px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoMuro style={{ width: '18px', height: '18px', color: C.accent }} />
          <span style={{ fontFamily: 'Antonio', fontSize: '0.85rem', color: C.text2, letterSpacing: '0.06em' }}>ESCALADA BOGOTÁ</span>
        </div>
        <p style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text3, textAlign: 'center' }}>
          © 2025 Escalada Bogotá · PI registrada (DNDA) · Habilitación Ley 181/1995
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[['Términos', '#'], ['Privacidad', '#']].map(([l]) => (
            <span key={l} style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text3, cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function LandingLayout() {
  return (
    <div style={{ background: '#121212', minHeight: '100vh' }}>
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
