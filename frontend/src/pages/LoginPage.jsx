import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { IconoMuro } from '../components/Icons';

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
      setError(err.error || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const demos = [
    { rol: 'Admin', email: 'admin@escaladabogota.com', pwd: 'admin2026' },
    { rol: 'JFA', email: 'jfa@escaladabogota.com', pwd: 'jfa2025' },
    { rol: 'JDG', email: 'jdg@escaladabogota.com', pwd: 'jdg2025' },
    { rol: 'Escalador', email: 'sofia.torres@gmail.com', pwd: 'escalador2026' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#121212' }}>
      {/* Lado izquierdo: imagen + branding */}
      <div style={{ display: 'none', position: 'relative', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', overflow: 'hidden', flex: 1 }} className="lg-flex-col">
        <style>{`@media(min-width:1024px){.lg-flex-col{display:flex!important}}`}</style>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/climbing-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(18,18,18,0.88) 0%, rgba(74,47,15,0.65) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconoMuro style={{ width: '36px', height: '36px', color: '#D4AF37' }} />
          <div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: '#F0EDE8', letterSpacing: '0.06em' }}>ESCALADA BOGOTÁ</div>
            <div style={{ fontSize: '0.65rem', color: '#D4AF37', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Entrenamiento por Ciclos</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '3.2rem', color: '#F0EDE8', lineHeight: 1.05, marginBottom: '16px' }}>
            Cada sesión<br /><span style={{ color: '#D4AF37' }}>te lleva más alto.</span>
          </h2>
          <p style={{ color: '#A09A8C', fontSize: '1rem', maxWidth: '380px', lineHeight: 1.7 }}>
            Entrenamiento periodizado por niveles, tests objetivos y comunidad que te impulsa a crecer.
          </p>
          <div style={{ display: 'flex', gap: '32px', marginTop: '36px' }}>
            {[['4', 'Ciclos al año'], ['13', 'Semanas por ciclo'], ['9', 'Programas']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#D4AF37', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: '0.72rem', color: '#A09A8C', marginTop: '4px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado derecho: formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <IconoMuro style={{ width: '28px', height: '28px', color: '#D4AF37' }} />
            <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: '#F0EDE8', letterSpacing: '0.06em' }}>ESCALADA BOGOTÁ</span>
          </div>

          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>Bienvenido</h2>
          <p style={{ color: '#A09A8C', fontSize: '0.875rem', marginBottom: '28px' }}>Accede a tu plan de entrenamiento</p>

          {error && (
            <div style={{ background: '#2e0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#A09A8C', marginBottom: '6px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-dark" placeholder="tu@email.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#A09A8C', marginBottom: '6px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="input-dark" placeholder="••••••••" style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A09A8C', display: 'flex', alignItems: 'center' }}>
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ marginTop: '4px', width: '100%', fontSize: '0.95rem', letterSpacing: '0.05em', fontFamily: 'Poppins, sans-serif' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#A09A8C' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" style={{ color: '#D4AF37', fontWeight: 600 }}>Regístrate</Link>
          </p>

          <div style={{ marginTop: '28px', padding: '14px', background: '#1c1c1c', borderRadius: '10px', border: '1px solid #2e2e2e' }}>
            <p style={{ fontSize: '0.7rem', color: '#A09A8C', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Accesos de prueba</p>
            {demos.map(d => (
              <button key={d.rol} type="button" onClick={() => { setEmail(d.email); setPassword(d.pwd); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#A09A8C', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#242424'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: '#D4AF37', fontWeight: 600, marginRight: '8px', fontFamily: 'Antonio, sans-serif', fontSize: '0.85rem' }}>{d.rol}</span>{d.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
