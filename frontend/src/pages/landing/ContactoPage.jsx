import { MessageCircle, Mail } from 'lucide-react';
import { C, F, T, Section, Divider, PageHeader, BtnPrimary, TituloDoble } from './shared';
import { S, whatsappLink } from '../../contenido';

const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const { contacto: dato } = S;
const { canales } = S.contactoPagina;
const contactos = [
  { Icon: MessageCircle, label: canales.whatsapp, value: dato.whatsappVisible, href: whatsappLink, color: canales.colorWhatsapp },
  { Icon: Mail, label: canales.email, value: dato.email, href: `mailto:${dato.email}`, color: canales.colorEmail },
  { Icon: InstagramIcon, label: canales.instagram, value: `@${dato.instagram}`, href: `https://instagram.com/${dato.instagram}`, color: canales.colorInstagram },
];

export default function ContactoPage() {
  const { encabezado: h, cuerpo } = S.contactoPagina;
  return (
    <>
      <PageHeader label={h.etiqueta} title={h.titulo} subtitle={h.subtitulo} />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'start' }} className="ct-grid">
          <style>{`@media(max-width:768px){.ct-grid{grid-template-columns:1fr!important}}`}</style>
          <div>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}><TituloDoble titulo={cuerpo.titulo} destacado={cuerpo.tituloDestacado} /></h2>
            <Divider />
            <p style={T.body}>{cuerpo.parrafo1}</p>
            <p style={{ ...T.body, marginTop: '12px', marginBottom: '28px' }}>{cuerpo.parrafo2}</p>
            <BtnPrimary to="/registro">
              {cuerpo.boton}
            </BtnPrimary>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {contactos.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: C.surface, borderRadius: '12px', border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px', background: `${c.color}12`, borderRadius: '10px', flexShrink: 0 }}>
                  <c.Icon size={18} style={{ color: c.color }} />
                </div>
                <div>
                  <div style={{ fontFamily: F.texto, fontSize: '0.72rem', color: C.text3, marginBottom: '2px' }}>{c.label}</div>
                  {c.href
                    ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: C.text, fontFamily: F.texto, fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = c.color} onMouseLeave={e => e.currentTarget.style.color = C.text}>{c.value}</a>
                    : <div style={{ color: C.text, fontFamily: F.texto, fontSize: '0.9rem' }}>{c.value}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
