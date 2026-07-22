import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mountain, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-teal-800 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <Mountain className="w-10 h-10 text-teal-300" />
            <h1 className="text-2xl font-bold">Escalada Bogotá</h1>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Vendemos el proceso,<br />no el muro.
          </h2>
          <p className="text-teal-200 text-lg max-w-md">
            Entrenamiento periodizado por niveles, con tests objetivos
            y soporte interdisciplinario.
          </p>
        </div>
        <div className="space-y-3 text-sm text-teal-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            9 programas · 4 ciclos al año · 13 semanas por cohorte
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            BetaClimb · Weya Centro de Escalada
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Mountain className="w-8 h-8 text-teal-700" />
            <span className="text-xl font-bold text-slate-800">Escalada Bogotá</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Inicia sesión</h2>
          <p className="text-slate-500 mb-6">Accede a tu plan de entrenamiento</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-teal-700 font-medium hover:underline">
              Regístrate
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-3 bg-slate-100 rounded-lg">
            <p className="text-xs font-medium text-slate-500 mb-2">Cuentas de prueba:</p>
            <div className="space-y-1 text-xs text-slate-600">
              {[
                { role: 'Escalador', email: 'escalador@escaladabogota.com', pwd: 'escalador2026' },
                { role: 'Entrenador', email: 'entrenador@escaladabogota.com', pwd: 'entrenador2026' },
                { role: 'Admin', email: 'admin@escaladabogota.com', pwd: 'admin2026' },
              ].map(d => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pwd); }}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-slate-200 transition"
                >
                  <span className="font-medium">{d.role}:</span> {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
