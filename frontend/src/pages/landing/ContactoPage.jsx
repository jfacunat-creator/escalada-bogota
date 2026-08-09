import { MessageCircle, Mail } from 'lucide-react';
import { C, T, Section, SectionLabel, Divider, PageHeader, BtnPrimary } from './shared';

const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const contactos = [
  { Icon: MessageCircle, label: 'WhatsApp', value: '+57 300 212 3034', href: 'https://wa.me/573002123034', color: '#22c55e' },
  { Icon: Mail, label: 'Email', value: 'hola@escaladabogota.com', href: 'mailto:hola@escaladabogota.com', color: '#D4AF37' },
  { Icon: InstagramIcon, label: 'Instagram', value: '@escaladabogota', href: 'https://instagram.com/escaladabogota', color: '#c084fc' },

];

export default function ContactoPage() {
  return (
    <>
      <PageHeader label="Contacto" title="Hablemos" subtitle="¿Listo para entrenar con estructura y datos? Contáctanos por los canales disponibles o inscríbete directamente." />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'start' }} className="ct-grid">
          <style>{`@media(max-width:768px){.ct-grid{grid-template-columns:1fr!important}}`}</style>
          <div>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}>¿Listo para<br /><span style={{ color: C.accent }}>empezar?</span></h2>
            <Divider />
            <p style={T.body}>Contáctanos por WhatsApp o inscríbete directamente en la plataforma. Te asignamos grupo según tu nivel y disponibilidad.</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '28px' }}>Cada ciclo abre y cierra con test de evaluación — la curva de progreso es parte del servicio.</p>
            <BtnPrimary to="/registro">
              Inscribirme
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
