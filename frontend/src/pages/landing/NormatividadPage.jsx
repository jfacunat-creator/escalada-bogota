import { C, F, Section, PageHeader } from './shared';
import { S } from '../../contenido';

export default function NormatividadPage() {
  const { encabezado: h, normas } = S.legal;
  return (
    <>
      <PageHeader label={h.etiqueta} title={h.titulo} subtitle={h.subtitulo} />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }} className="norm-grid">
          <style>{`@media(max-width:640px){.norm-grid{grid-template-columns:1fr!important}}`}</style>
          {normas.map(item => (
            <div key={item.titulo} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '22px' }}>
              <div style={{ fontFamily: F.texto, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: item.color, marginBottom: '4px' }}>{item.ley}</div>
              <h4 style={{ fontFamily: F.titulos, fontSize: '1.1rem', color: C.text, marginBottom: '10px' }}>{item.titulo}</h4>
              <p style={{ fontFamily: F.texto, fontSize: '0.83rem', color: C.text2, lineHeight: 1.7 }}>{item.descripcion}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
