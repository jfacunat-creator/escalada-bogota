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
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  switch (user?.rol) {
    case 'escalador': return <EscaladorDashboard />;
    case 'entrenador': return <EntrenadorDashboard />;
    case 'admin': return <AdminDashboard />;
    default: return <Navigate to="/login" replace />;
  }
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-slate-400">
          <path d="M3 20L8 4l5 8 5-6 3 14H3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-500">Próximamente.</p>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>;
  if (user) return <Navigate to="/app" replace />;
  return children;
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
            <Route path="mis-cohortes" element={<ComingSoon title="Detalle de Cohortes" />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="escaladores" element={<PagosPage />} />
            <Route path="entrenadores" element={<ComingSoon title="Gestión de Entrenadores" />} />
            <Route path="cohortes" element={<PagosPage />} />
            <Route path="programas" element={<ComingSoon title="Programas" />} />
          </Route>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
