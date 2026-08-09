import { C, T, Section, SectionLabel, Divider, PageHeader } from './shared';

const items = [
  {
    titulo: 'Tratamiento de Datos Personales',
    ley: 'Ley 1581/2012 · Decreto 1377/2013',
    desc: 'Tus datos se recopilan con consentimiento expreso, se almacenan de forma segura y no se comparten con terceros sin autorización. Tienes derecho a conocer, actualizar, rectificar y suprimir tu información en cualquier momento.',
    color: '#38bdf8',
  },
  {
    titulo: 'Habilitación de Entrenadores',
    ley: 'Ley 181/1995 · Art. 35',
    desc: 'Todos nuestros entrenadores están habilitados según la Ley del Deporte colombiana. Contamos con licencia para prestar servicios de entrenamiento deportivo de escalada a nivel amateur y competidor.',
    color: '#22c55e',
  },
  {
    titulo: 'Protección al Consumidor',
    ley: 'Ley 1480/2011 (Estatuto del Consumidor)',
    desc: 'Tienes derecho a recibir el servicio en las condiciones ofrecidas, a información clara sobre precios y condiciones, y a radicar reclamaciones. Toda la información de planes y precios es pública y verificable.',
    color: '#D4AF37',
  },
  {
    titulo: 'Protocolo de Menores',
    ley: 'Ley 1098/2006 (Código de Infancia)',
    desc: 'Para escaladores menores de edad se requiere consentimiento informado firmado por el representante legal, y se aplica un protocolo estricto de protección. Ratios diferenciados y supervisión reforzada.',
    color: '#c084fc',
  },
];

export default function NormatividadPage() {
  return (
    <>
      <PageHeader label="Marco Legal" title="Tus derechos, nuestras obligaciones" subtitle="Operamos bajo la normatividad colombiana vigente. La transparencia es parte del producto." />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }} className="norm-grid">
          <style>{`@media(max-width:640px){.norm-grid{grid-template-columns:1fr!important}}`}</style>
          {items.map(item => (
            <div key={item.titulo} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '22px' }}>
              <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color, marginBottom: '4px' }}>{item.ley}</div>
              <h4 style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: '#F0EDE8', marginBottom: '10px' }}>{item.titulo}</h4>
              <p style={{ fontFamily: 'Poppins', fontSize: '0.83rem', color: '#A09A8C', lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
