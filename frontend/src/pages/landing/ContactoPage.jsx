import { MessageCircle, Mail, MapPin } from 'lucide-react';
import { C, T, Section, SectionLabel, Divider, PageHeader, BtnPrimary } from './shared';

const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const contactos = [
  { Icon: MessageCircle, label: 'WhatsApp', value: '+57 300 456 7890', href: 'https://wa.me/573004567890', color: '#22c55e' },
  { Icon: Mail, label: 'Email', value: 'hola@escaladabogota.com', href: 'mailto:hola@escaladabogota.com', color: '#D4AF37' },
  { Icon: InstagramIcon, label: 'Instagram', value: '@escaladabogota', href: 'https://instagram.com/escaladabogota', color: '#c084fc' },
  { Icon: MapPin, label: 'Muros', value: 'BetaClimb · Weya Centro de Escalada', href: null, color: '#60a5fa' },
];

export default function ContactoPage() {
  return (
    <>
      <PageHeader label="Contacto" title="Hablemos" subtitle="Agenda tu test de entrada gratuito. Te mostramos con datos qué te frena y cuánto podés mejorar en 2 ciclos." />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'start' }} className="ct-grid">
          <style>{`@media(max-width:768px){.ct-grid{grid-template-columns:1fr!important}}`}</style>
          <div>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}>Test de entrada<br /><span style={{ color: C.accent }}>gratuito</span></h2>
            <Divider />
            <p style={T.body}>El test incluye la batería Hörst + circuito estándar. Al finalizar te entregamos un informe de una página con semáforo por áreas y el grado estimado que podés alcanzar en 2 ciclos.</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '28px' }}>Sin compromiso. Sin pago previo. Solo datos objetivos sobre tu escalada.</p>
            <BtnPrimary href="https://wa.me/573004567890?text=Hola,%20quiero%20agendar%20mi%20test%20de%20entrada%20gratuito">
              Agendar por WhatsApp
            </BtnPrimary>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {contactos.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: '#1c1c1c', borderRadius: '12px', border: '1px solid #2e2e2e' }}>
                <div style={{ padding: '10px', background: `${c.color}12`, borderRadius: '10px', flexShrink: 0 }}>
                  <c.Icon size={18} style={{ color: c.color }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: '#666', marginBottom: '2px' }}>{c.label}</div>
                  {c.href
                    ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: '#F0EDE8', fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = c.color} onMouseLeave={e => e.currentTarget.style.color = '#F0EDE8'}>{c.value}</a>
                    : <div style={{ color: '#F0EDE8', fontFamily: 'Poppins', fontSize: '0.9rem' }}>{c.value}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
