import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconoMuro, IconoPresa, IconoEscalador, IconoCohorte, IconoPlanEntreno, IconoCronometro, IconoCuerda, IconoRoca } from '../components/Icons';
import { LogOut, Menu, X } from 'lucide-react';

const nav = {
  escalador: [
    { to: '/app', icon: IconoPresa, label: 'Inicio' },
    { to: '/app/mi-grupo', icon: IconoCohorte, label: 'Mi Grupo' },
    { to: '/app/contenido', icon: IconoPlanEntreno, label: 'Contenido' },
    { to: '/app/mi-progreso', icon: IconoRoca, label: 'Mi Progreso' },
  ],
  entrenador: [
    { to: '/app', icon: IconoPresa, label: 'Inicio' },
    { to: '/app/mis-grupos', icon: IconoCohorte, label: 'Mis Grupos' },
    { to: '/app/mis-escaladores', icon: IconoEscalador, label: 'Escaladores' },
  ],
  admin: [
    { to: '/app', icon: IconoPresa, label: 'Resumen' },
    { to: '/app/grupos', icon: IconoCohorte, label: 'Grupos' },
    { to: '/app/escaladores', icon: IconoEscalador, label: 'Escaladores' },
    { to: '/app/entrenadores', icon: IconoCuerda, label: 'Entrenadores' },
    { to: '/app/programas', icon: IconoPlanEntreno, label: 'Programas' },
    { to: '/app/pagos', icon: IconoRoca, label: 'Pagos' },
  ],
};

const rolLabel = { escalador: 'Escalador', entrenador: 'Entrenador', admin: 'Administrador' };
const SB_W = 220;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = nav[user?.rol] || [];
  const userName = user?.escalador?.nombre || user?.entrenador?.nombre || user?.email?.split('@')[0];

  const SidebarContent = () => (
    <>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconoMuro style={{ width: '26px', height: '26px', color: '#D4AF37', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '0.9rem', color: '#F0EDE8', letterSpacing: '0.06em', lineHeight: 1.2 }}>ESCALADA</div>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '0.9rem', color: '#D4AF37', letterSpacing: '0.06em', lineHeight: 1.2 }}>BOGOTÁ</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#A09A8C', cursor: 'pointer', padding: '4px', display: 'flex' }} className="sb-close">
          <X size={18} />
        </button>
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {items.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/app'} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Poppins, sans-serif',
              transition: 'background 0.15s',
              background: isActive ? 'rgba(18,18,18,0.5)' : 'transparent',
              color: isActive ? '#D4AF37' : 'rgba(240,237,232,0.75)',
            })}>
            <item.icon style={{ width: '17px', height: '17px', flexShrink: 0 }} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Poppins' }}>{userName}</div>
          <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '1px', fontFamily: 'Poppins' }}>{rolLabel[user?.rol]}</div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,237,232,0.4)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,232,0.4)'}>
          <LogOut size={17} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .sb-close { display: none !important; }
        @media (max-width: 1023px) { .sb-close { display: flex !important; } .sb-desktop { display: none !important; } .topbar { display: flex !important; } }
        @media (min-width: 1024px) { .topbar { display: none !important; } .sb-mobile { display: none !important; } }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', background: '#121212' }}>
        <aside className="sb-desktop" style={{ width: `${SB_W}px`, flexShrink: 0, background: '#4A2F0F', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh' }}>
          <SidebarContent />
        </aside>
        <>
          {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />}
          <aside className="sb-mobile" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: `${SB_W}px`, background: '#4A2F0F', display: 'flex', flexDirection: 'column', zIndex: 50, transform: open ? 'translateX(0)' : `translateX(-${SB_W}px)`, transition: 'transform 0.22s ease' }}>
            <SidebarContent />
          </aside>
        </>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
          <header className="topbar" style={{ display: 'none', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#1c1c1c', borderBottom: '1px solid #2e2e2e', position: 'sticky', top: 0, zIndex: 30 }}>
            <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A09A8C', display: 'flex', padding: '4px' }}><Menu size={22} /></button>
            <IconoMuro style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
            <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1rem', color: '#F0EDE8', letterSpacing: '0.05em' }}>ESCALADA BOGOTÁ</span>
          </header>
          <main style={{ flex: 1, padding: '28px 24px', maxWidth: '1180px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
