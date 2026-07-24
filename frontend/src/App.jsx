import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EscaladorDashboard from './pages/EscaladorDashboard';
import EntrenadorDashboard from './pages/EntrenadorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MisSesionesPage from './pages/MisSesionesPage';
import AsistenciaPage from './pages/AsistenciaPage';
import ContenidoPage from './pages/ContenidoPage';
import MiProgresoPage from './pages/MiProgresoPage';
import PagosPage from './pages/PagosPage';
import EscaladoresAdminPage from './pages/EscaladoresAdminPage';
import EntrenadoresAdminPage from './pages/EntrenadoresAdminPage';
import ProgramasAdminPage from './pages/ProgramasAdminPage';
import MisGruposPage from './pages/MisGruposPage';
import { Loader2 } from 'lucide-react';

const Spinner = () => (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} /></div>);

function ProtectedRoute({ children }) { const { user, loading } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; return children; }
function PublicRoute({ children }) { const { user, loading } = useAuth(); if (loading) return <Spinner />; if (user) return <Navigate to="/app" replace />; return children; }

function DashboardRouter() {
  const { user } = useAuth();
  switch (user?.rol) {
    case 'escalador': return <EscaladorDashboard />;
    case 'entrenador': return <EntrenadorDashboard />;
    case 'admin': return <AdminDashboard />;
    default: return <Navigate to="/login" replace />;
  }
}

function Proximamente({ title }) {
  return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', textAlign: 'center' }}>
    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#1c1c1c', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#4A2F0F" strokeWidth="2" style={{ width: '28px', height: '28px' }}><path d="M3 20L8 4l5 8 5-6 3 14H3z" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    <h2 style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: '#F0EDE8', marginBottom: '8px' }}>{title}</h2>
    <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>Próximamente disponible.</p>
  </div>);
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            <Route path="mis-sesiones" element={<MisSesionesPage />} />
            <Route path="contenido" element={<ContenidoPage />} />
            <Route path="mi-progreso" element={<MiProgresoPage />} />
            <Route path="mis-grupos" element={<MisGruposPage />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="mis-escaladores" element={<EscaladoresAdminPage />} />
            <Route path="grupos" element={<Proximamente title="Gestión de Grupos" />} />
            <Route path="escaladores" element={<EscaladoresAdminPage />} />
            <Route path="entrenadores" element={<EntrenadoresAdminPage />} />
            <Route path="programas" element={<ProgramasAdminPage />} />
            <Route path="pagos" element={<PagosPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
