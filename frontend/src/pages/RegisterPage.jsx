import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconoMuro } from '../components/Icons';
import { ArrowLeft } from 'lucide-react';

// FIX 3: Field definido FUERA del componente padre.
// Si se define adentro, cada render (cada tecleo) crea una nueva
// referencia de función → React desmonta/remonta el input → pierde el foco.
const Field = ({ label, children }) => (
  <div>
    <label style={{
      display: 'block', fontSize: '0.72rem', color: '#A09A8C',
      marginBottom: '6px', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', fontFamily: 'Poppins'
    }}>
      {label}
    </label>
    {children}
  </div>
);

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    telefono: '',
    // FIX 2: contacto de emergencia en dos campos separados
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
  });

  // FIX 3 (complemento): usar actualización funcional para evitar
  // closures obsoletos cuando varios campos cambian rápidamente.
  const set = f => e => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [f]: value }));
  };

  // FIX 1: calcular fecha máxima = hoy, y mínima = 1940
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden');
    if (form.password.length < 8) return setError('Mínimo 8 caracteres');
    setLoading(true);
    try {
      // FIX 2: combinar los dos campos antes de enviar al backend
      const { confirmPassword, contactoEmergenciaNombre, contactoEmergenciaTelefono, ...rest } = form;
      const data = {
        ...rest,
        contactoEmergencia: `${contactoEmergenciaNombre} - ${contactoEmergenciaTelefono}`,
      };
      await register(data);
      navigate('/app');
    } catch (err) {
      setError(err.error || err.errors?.[0]?.msg || 'Error en registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior */}
      <div style={{ padding: '16px clamp(20px, 5vw, 60px)', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #2e2e2e', background: '#1c1c1c' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#A09A8C', fontFamily: 'Poppins', fontSize: '0.85rem', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'} onMouseLeave={e => e.currentTarget.style.color = '#A09A8C'}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoMuro style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
          <span style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: '#F0EDE8', letterSpacing: '0.06em' }}>ESCALADA BOGOTÁ</span>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '460px', background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '16px', padding: '32px' }}>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.6rem', color: '#F0EDE8', marginBottom: '4px' }}>Crear cuenta</h1>
          <p style={{ fontFamily: 'Poppins', fontSize: '0.85rem', color: '#A09A8C', marginBottom: '24px' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#D4AF37', fontWeight: 600 }}>Inicia sesión</Link>
          </p>

          {error && (
            <div style={{ background: '#2e0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#f87171', fontSize: '0.85rem', fontFamily: 'Poppins' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Nombre">
                <input type="text" value={form.nombre} onChange={set('nombre')} required className="input-dark" />
              </Field>
              <Field label="Apellido">
                <input type="text" value={form.apellido} onChange={set('apellido')} required className="input-dark" />
              </Field>
            </div>

            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} required className="input-dark" />
            </Field>

            {/* FIX 1: rango de años con min/max */}
            <Field label="Fecha de nacimiento">
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={set('fechaNacimiento')}
                required
                min="1940-01-01"
                max={today}
                className="input-dark"
              />
            </Field>

            <Field label="Teléfono">
              <input type="tel" value={form.telefono} onChange={set('telefono')} className="input-dark" placeholder="300 123 4567" />
            </Field>

            {/* FIX 2: contacto de emergencia en dos campos separados */}
            <div>
              <p style={{ fontSize: '0.72rem', color: '#A09A8C', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Poppins' }}>
                Contacto de emergencia
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Nombre">
                  <input
                    type="text"
                    value={form.contactoEmergenciaNombre}
                    onChange={set('contactoEmergenciaNombre')}
                    required
                    className="input-dark"
                    placeholder="Juan Pérez"
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={form.contactoEmergenciaTelefono}
                    onChange={set('contactoEmergenciaTelefono')}
                    required
                    className="input-dark"
                    placeholder="310 000 0000"
                  />
                </Field>
              </div>
              <p style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: '#666', marginTop: '4px' }}>
                Obligatorio para protocolos de seguridad en muro
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Contraseña">
                <input type="password" value={form.password} onChange={set('password')} required minLength={8} className="input-dark" />
              </Field>
              <Field label="Confirmar">
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required className="input-dark" />
              </Field>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: '4px', fontSize: '0.95rem', fontFamily: 'Poppins' }}
            >
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
