import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconoPresa, IconoMuro, IconoEscalador, IconoCohorte,
  IconoPlanEntreno, IconoCronometro, IconoRoca, IconoCuerda,
  IconoMagnesia, IconoVideo, IconoCheck
} from '../components/Icons';
import { LogOut, Menu } from 'lucide-react';

const navItems = {
  escalador: [
    { to: '/app', icon: IconoPresa, label: 'Mi Panel' },
    { to: '/app/mis-sesiones', icon: IconoCronometro, label: 'Mis Sesiones' },
    { to: '/app/contenido', icon: IconoPlanEntreno, label: 'Contenido' },
    { to: '/app/mi-progreso', icon: IconoRoca, label: 'Mi Progreso' },
  ],
  entrenador: [
    { to: '/app', icon: IconoPresa, label: 'Panel' },
    { to: '/app/mis-cohortes', icon: IconoCohorte, label: 'Mis Cohortes' },
    { to: '/app/asistencia', icon: IconoCronometro, label: 'Asistencia' },
    { to: '/app/escaladores', icon: IconoEscalador, label: 'Escaladores' },
  ],
  admin: [
    { to: '/app', icon: IconoPresa, label: 'Panel' },
    { to: '/app/cohortes', icon: IconoCohorte, label: 'Cohortes' },
    { to: '/app/escaladores', icon: IconoEscalador, label: 'Escaladores' },
    { to: '/app/entrenadores', icon: IconoCuerda, label: 'Entrenadores' },
    { to: '/app/programas', icon: IconoPlanEntreno, label: 'Programas' },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = navItems[user?.rol] || [];
  const handleLogout = () => { logout(); navigate('/login'); };
  const rolLabel = { escalador: 'Escalador', entrenador: 'Entrenador', admin: 'Administrador' };
  const userName = user?.escalador?.nombre || user?.entrenador?.nombre || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-teal-800 text-white transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b border-teal-700">
          <div className="flex items-center gap-2.5">
            <IconoMuro className="w-7 h-7 text-teal-300" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Escalada Bogotá</h1>
              <p className="text-xs text-teal-300">Entrenamiento por Cohortes</p>
            </div>
          </div>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-700 text-white' : 'text-teal-200 hover:bg-teal-700/50 hover:text-white'
                }`
              }>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-teal-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-teal-300">{rolLabel[user?.rol]}</p>
            </div>
            <button onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-teal-700 text-teal-300 hover:text-white transition" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <IconoMuro className="w-5 h-5 text-teal-700" />
          <span className="font-semibold text-slate-800">Escalada Bogotá</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
