import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconoMuro } from '../components/Icons';
import { CheckCircle, Phone, Mail, Clock, ArrowRight } from 'lucide-react';

// ── Constantes de contacto — ajustar cuando el equipo las defina ─────────────
const WHATSAPP   = '573001234567';          // número sin +
const WHATSAPP_MSG = 'Hola, acabo de registrarme en la plataforma de Escalada Bogotá y quiero conocer los próximos pasos.';
const EMAIL      = 'info@escaladabogota.com';
// ─────────────────────────────────────────────────────────────────────────────

const Step = ({ num, title, desc, active }) => (
  <div style={{
    display: 'flex', gap: '14px', alignItems: 'flex-start',
    opacity: active ? 1 : 0.45,
  }}>
    <div style={{
      flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
      background: active ? '#D4AF37' : '#2e2e2e',
      color: active ? '#121212' : '#666',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Antonio, sans-serif', fontSize: '1rem', fontWeight: 700,
    }}>
      {num}
    </div>
    <div style={{ paddingTop: '4px' }}>
      <div style={{ fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 600, color: active ? '#F0EDE8' : '#666', marginBottom: '2px' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: '#A09A8C', lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  </div>
);

export default function BienvenidaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.escalador?.nombre || 'escalador';

  const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

  return (
    <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior mínima */}
      <div style={{
        padding: '16px clamp(20px, 5vw, 60px)',
        borderBottom: '1px solid #2e2e2e', background: '#1c1c1c',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <IconoMuro style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
        <span style={{ fontFamily: 'Antonio', fontSize: '0.9rem', color: '#F0EDE8', letterSpacing: '0.06em' }}>
          ESCALADA BOGOTÁ
        </span>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>

          {/* ── Confirmación ── */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#052e0a', border: '2px solid #22c55e',
              marginBottom: '16px',
            }}>
              <CheckCircle size={30} color="#22c55e" />
            </div>
            <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '6px' }}>
              ¡Bienvenido, {nombre}!
            </h1>
            <p style={{ fontFamily: 'Poppins', fontSize: '0.92rem', color: '#A09A8C' }}>
              Tu cuenta fue creada exitosamente.
            </p>
          </div>

          {/* ── Card de próximos pasos ── */}
          <div style={{
            background: '#1c1c1c', border: '1px solid #2e2e2e',
            borderRadius: '16px', padding: '28px', marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.72rem', color: '#A09A8C', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'Poppins', marginBottom: '20px',
            }}>
              ¿Qué sigue ahora?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Step
                num={1} active={true}
                title="Registro completado ✓"
                desc="Tu perfil ya está en nuestra plataforma y tu cuenta está activa."
              />
              <Step
                num={2} active={true}
                title="Un entrenador se pondrá en contacto contigo"
                desc="En los próximos días hábiles, uno de nuestros entrenadores coordinará contigo una sesión de evaluación inicial para conocer tu nivel y experiencia previa."
              />
              <Step
                num={3} active={false}
                title="Asignación a tu programa y grupo"
                desc="Con base en tu evaluación, te asignaremos al programa, nivel y horario que mejor se adapten a ti."
              />
              <Step
                num={4} active={false}
                title="¡A escalar!"
                desc="Podrás ver tu grupo, sesiones, progreso y contenido desde tu dashboard."
              />
            </div>
          </div>

          {/* ── ¿Quieres contactarnos ya? ── */}
          <div style={{
            background: '#141000', border: '1px solid #D4AF3740',
            borderRadius: '12px', padding: '20px', marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'Poppins', fontSize: '0.85rem', color: '#D4AF37',
              fontWeight: 600, marginBottom: '14px',
            }}>
              <Clock size={14} />
              ¿Quieres agilizar el proceso?
            </div>
            <p style={{ fontFamily: 'Poppins', fontSize: '0.82rem', color: '#A09A8C', marginBottom: '14px' }}>
              Contáctanos directamente y te respondemos a la mayor brevedad:
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '8px',
                  background: '#25D366', color: '#fff',
                  fontFamily: 'Poppins', fontSize: '0.85rem', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Phone size={14} /> WhatsApp
              </a>
              <a
                href={`mailto:${EMAIL}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '8px',
                  background: '#1c1c1c', border: '1px solid #3a3a3a',
                  color: '#A09A8C',
                  fontFamily: 'Poppins', fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <Mail size={14} /> {EMAIL}
              </a>
            </div>
          </div>

          {/* ── CTA ir al dashboard ── */}
          <button
            onClick={() => navigate('/app')}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              background: '#D4AF37', color: '#121212',
              border: 'none', cursor: 'pointer',
              fontFamily: 'Antonio, sans-serif', fontSize: '1.05rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            Ir a mi dashboard <ArrowRight size={16} />
          </button>

          <p style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: '#666', textAlign: 'center', marginTop: '14px' }}>
            También puedes acceder a tu dashboard en cualquier momento desde el menú.
          </p>
        </div>
      </div>
    </div>
  );
}
