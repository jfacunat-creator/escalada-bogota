import { C, T, Section, SectionLabel, Divider, PageHeader } from './shared';
import { IconoMuro, IconoCuerda, IconoMagnesia } from '../../components/Icons';

const aliados = [
  { nombre: 'BetaClimb', tipo: 'Muro Aliado', Icon: IconoMuro, color: '#60a5fa', desc: 'Muro de boulder e indoor en Bogotá. Zona exclusiva para grupos de Escala Bogotá en horarios pico. 2 zonas disponibles para sesiones paralelas. Convenio activo.' },
  { nombre: 'Weya Centro de Escalada', tipo: 'Muro Aliado', Icon: IconoMuro, color: '#60a5fa', desc: 'Centro de escalada completo en Bogotá. Pared de dificultad y boulder. Convenio activo para grupos de Iniciación e Intermedio los fines de semana.' },
  { nombre: 'Liyeri Fisioterapia', tipo: 'Fisioterapia Deportiva', Icon: IconoCuerda, color: '#f43f5e', desc: 'Fisioterapeuta especializada en lesiones deportivas y escalada. Integrada con hitos fijos en el calendario Avanzado. Remisión preferencial para todos los niveles desde nuestra plataforma.' },
  { nombre: 'Daniela Forero', tipo: 'Nutrición Deportiva', Icon: IconoMagnesia, color: '#22c55e', desc: 'Nutricionista deportiva con experiencia en deportes de fuerza y resistencia. Nutrición por fases incluida en el plan Avanzado. Valoración con tarifa preferencial para todos los escaladores.' },
];

export default function AlianzasPage() {
  return (
    <>
      <PageHeader label="Red aliada" title="Una red que trabaja junta" subtitle="El muro recibe tráfico y retención. El fisio y nutricionista reciben remisiones calificadas. El escalador recibe un servicio integrado. Todos ganan." />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ali-grid">
          <style>{`@media(max-width:640px){.ali-grid{grid-template-columns:1fr!important}}`}</style>
          {aliados.map(a => (
            <div key={a.nombre} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '24px', display: 'flex', gap: '18px' }}>
              <div style={{ padding: '12px', background: `${a.color}12`, borderRadius: '12px', width: 'fit-content', height: 'fit-content', flexShrink: 0 }}>
                <a.Icon style={{ width: '24px', height: '24px', color: a.color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: a.color, marginBottom: '4px' }}>{a.tipo}</div>
                <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: '#F0EDE8', marginBottom: '10px' }}>{a.nombre}</div>
                <p style={{ ...T.body, fontSize: '0.85rem', lineHeight: 1.75 }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '48px', background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
          <SectionLabel>¿Eres un aliado potencial?</SectionLabel>
          <h3 style={{ ...T.h2, marginBottom: '12px', fontSize: '1.6rem' }}>Construyamos algo juntos</h3>
          <p style={{ ...T.body, maxWidth: '480px', margin: '0 auto 24px' }}>Si eres un muro, especialista en salud o servicio complementario para escaladores en Bogotá, conversemos.</p>
          <a href="https://wa.me/573004567890" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: C.accent, color: '#121212', borderRadius: '8px', textDecoration: 'none', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.9rem' }}>Escribenos por WhatsApp</a>
        </div>
      </Section>
    </>
  );
}
