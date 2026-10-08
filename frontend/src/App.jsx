import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingLayout from './layouts/LandingLayout';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/landing/HomePage';
import ServiciosPage from './pages/landing/ServiciosPage';
import EquipoPage from './pages/landing/EquipoPage';
import AlianzasPage from './pages/landing/AlianzasPage';
import ContactoPage from './pages/landing/ContactoPage';
import NormatividadPage from './pages/landing/NormatividadPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BienvenidaPage from './pages/BienvenidaPage';
import EscaladorDashboard from './pages/EscaladorDashboard';
import EntrenadorDashboard from './pages/EntrenadorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MiGrupoPage from './pages/MiGrupoPage';
import ContenidoPage from './pages/ContenidoPage';
import MiProgresoPage from './pages/MiProgresoPage';
import MisGruposPage from './pages/MisGruposPage';
import GrupoDetallePage from './pages/GrupoDetallePage';
import EscaladoresAdminPage from './pages/EscaladoresAdminPage';
import EntrenadoresAdminPage from './pages/EntrenadoresAdminPage';
import ProgramasAdminPage from './pages/ProgramasAdminPage';
import PagosPage from './pages/PagosPage';
import InscripcionPage from './pages/InscripcionPage';
import GruposAdminPage from './pages/GruposAdminPage';
import MisPagosPage from './pages/MisPagosPage';
import RRHHPage from './pages/RRHHPage';
import PlanTrackerPage from './pages/PlanTrackerPage';
import AjustesAIPage from './pages/AjustesAIPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import { Loader2 } from 'lucide-react';

const Spinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212' }}>
    <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

// Cada sección solo para los roles que la usan (el backend igual valida permisos).
function Solo({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.rol) ? children : <Navigate to="/app" replace />;
}
const ESC = ['escalador'], ENT = ['entrenador'], ADM = ['admin'];

function DashboardRouter() {
  const { user } = useAuth();
  switch (user?.rol) {
    case 'escalador':  return <EscaladorDashboard />;
    case 'entrenador': return <EntrenadorDashboard />;
    case 'admin':      return <AdminDashboard />;
    default:           return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* LANDING (público) */}
          <Route element={<LandingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/equipo" element={<EquipoPage />} />
            <Route path="/alianzas" element={<AlianzasPage />} />
            <Route path="/normatividad" element={<NormatividadPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
          </Route>

          {/* AUTH */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/registro" element={<RegisterPage />} />

          {/* Post-registro: protegida pero fuera del AppLayout (pantalla limpia) */}
          <Route path="/bienvenida" element={<ProtectedRoute><BienvenidaPage /></ProtectedRoute>} />

          {/* APP (protegido) */}
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            <Route path="inscribirme"     element={<Solo roles={ESC}><InscripcionPage /></Solo>} />
            <Route path="mi-grupo"        element={<Solo roles={ESC}><MiGrupoPage /></Solo>} />
            <Route path="contenido"       element={<Solo roles={ESC}><ContenidoPage /></Solo>} />
            <Route path="mi-progreso"     element={<Solo roles={ESC}><MiProgresoPage /></Solo>} />
            <Route path="mis-pagos"       element={<Solo roles={ESC}><MisPagosPage /></Solo>} />
            <Route path="mi-plan"         element={<Solo roles={ESC}><PlanTrackerPage /></Solo>} />
            <Route path="mis-grupos"      element={<Solo roles={ENT}><MisGruposPage /></Solo>} />
            <Route path="mis-grupos/:id"  element={<Solo roles={ENT}><GrupoDetallePage /></Solo>} />
            <Route path="mis-escaladores" element={<Solo roles={ENT}><EscaladoresAdminPage /></Solo>} />
            <Route path="grupos"          element={<Solo roles={ADM}><GruposAdminPage /></Solo>} />
            <Route path="grupos/:id"      element={<Solo roles={ADM}><GrupoDetallePage /></Solo>} />
            <Route path="escaladores"     element={<Solo roles={ADM}><EscaladoresAdminPage /></Solo>} />
            <Route path="entrenadores"    element={<Solo roles={ADM}><EntrenadoresAdminPage /></Solo>} />
            <Route path="programas"       element={<Solo roles={ADM}><ProgramasAdminPage /></Solo>} />
            <Route path="pagos"           element={<Solo roles={ADM}><PagosPage /></Solo>} />
            <Route path="rrhh"            element={<Solo roles={ADM}><RRHHPage /></Solo>} />
            <Route path="configuracion"   element={<Solo roles={ADM}><ConfiguracionPage /></Solo>} />
            <Route path="ajustes-ai"      element={<Solo roles={[...ADM, ...ENT]}><AjustesAIPage /></Solo>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
