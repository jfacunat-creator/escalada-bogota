import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconoMuro, IconoPresa, IconoEscalador, IconoCohorte, IconoPlanEntreno, IconoCronometro, IconoCuerda, IconoRoca } from '../components/Icons';
import { LogOut, Menu, X } from 'lucide-react';

const nav = {
  escalador: [
    { to: '/app', icon: IconoPresa, label: 'Mi Panel' },
    { to: '/app/mis-sesiones', icon: IconoCronometro, label: 'Mis Sesiones' },
    { to: '/app/contenido', icon: IconoPlanEntreno, label: 'Contenido' },
    { to: '/app/mi-progreso', icon: IconoRoca, label: 'Mi Progreso' },
  ],
  entrenador: [
    { to: '/app', icon: IconoPresa, label: 'Panel' },
    { to: '/app/mis-grupos', icon: IconoCohorte, label: 'Mis Grupos' },
    { to: '/app/asistencia', icon: IconoCronometro, label: 'Asistencia' },
    { to: '/app/mis-escaladores', icon: IconoEscalador, label: 'Escaladores' },
  ],
  admin: [
    { to: '/app', icon: IconoPresa, label: 'Panel' },
    { to: '/app/grupos', icon: IconoCohorte, label: 'Grupos' },
    { to: '/app/escaladores', icon: IconoEscalador, label: 'Escaladores' },
    { to: '/app/entrenadores', icon: IconoCuerda, label: 'Entrenadores' },
    { to: '/app/programas', icon: IconoPlanEntreno, label: 'Programas' },
    { to: '/app/pagos', icon: IconoRoca, label: 'Pagos' },
  ],
};

const rolLabel = { escalador: 'Escalador', entrenador: 'Entrenador', admin: 'Administrador' };

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = nav[user?.rol] || [];
  const userName = user?.escalador?.nombre || user?.entrenador?.nombre || user?.email?.split('@')[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#121212' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', background: '#4A2F0F', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s',
      }} className="sidebar-aside">
        <style>{`@media(min-width:1024px){.sidebar-aside{transform:translateX(0)!important;position:relative;flex-shrink:0}}`}</style>

        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconoMuro style={{ width: '28px', height: '28px', color: '#D4AF37', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '0.95rem', color: '#F0EDE8', letterSpacing: '0.05em', lineHeight: 1.2 }}>ESCALADA</div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '0.95rem', color: '#D4AF37', letterSpacing: '0.05em', lineHeight: 1.2 }}>BOGOTÁ</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#A09A8C', cursor: 'pointer', display: 'none' }} className="close-btn">
            <X size={20} />
          </button>
          <style>{`@media(max-width:1023px){.close-btn{display:block!important}}`}</style>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'} onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                transition: 'background 0.15s',
                background: isActive ? '#3a2409' : 'transparent',
                color: isActive ? '#D4AF37' : 'rgba(240,237,232,0.7)',
              })}>
              <item.icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
            <div style={{ fontSize: '0.72rem', color: '#D4AF37' }}>{rolLabel[user?.rol]}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,237,232,0.5)', padding: '6px', borderRadius: '6px', transition: 'color 0.15s' }}
            title="Cerrar sesión"
            onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,232,0.5)'}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }} className="overlay-mobile" />}
      <style>{`@media(min-width:1024px){.overlay-mobile{display:none!important}}`}</style>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        {/* Topbar mobile */}
        <header style={{ background: '#1c1c1c', borderBottom: '1px solid #2e2e2e', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }} className="topbar-mobile">
          <style>{`@media(min-width:1024px){.topbar-mobile{display:none!important}}`}</style>
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A09A8C' }}>
            <Menu size={22} />
          </button>
          <IconoMuro style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
          <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1rem', color: '#F0EDE8', letterSpacing: '0.05em' }}>ESCALADA BOGOTÁ</span>
        </header>

        <main style={{ flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
