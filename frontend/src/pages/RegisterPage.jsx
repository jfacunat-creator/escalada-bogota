import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mountain, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    nombre: '', apellido: '', fechaNacimiento: '',
    telefono: '', contactoEmergencia: '',
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres');
    }

    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      navigate('/app');
    } catch (err) {
      setError(err.error || err.errors?.[0]?.msg || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Mountain className="w-7 h-7 text-teal-700" />
          <h1 className="text-xl font-bold text-slate-800">Registro de Escalador</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input type="text" value={form.nombre} onChange={set('nombre')} required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input type="text" value={form.apellido} onChange={set('apellido')} required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
            <input type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input type="tel" value={form.telefono} onChange={set('telefono')} placeholder="300 123 4567"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contacto de emergencia</label>
            <input type="text" value={form.contactoEmergencia} onChange={set('contactoEmergencia')} required
              placeholder="Nombre - Teléfono"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
            <p className="text-xs text-slate-400 mt-1">Obligatorio para protocolos de seguridad en muro</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="password" value={form.password} onChange={set('password')} required minLength={8}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar</label>
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition disabled:opacity-60 mt-2">
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
