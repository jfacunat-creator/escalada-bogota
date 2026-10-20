import { C, F, T, Section, SectionLabel, PageHeader } from './shared';
import { IconoMuro, IconoCuerda, IconoMagnesia } from '../../components/Icons';
import { S, whatsappLink } from '../../contenido';

// Ícono por tipo de aliado; si el tipo cambia de nombre se usa el del muro.
const iconoAliado = (tipo) => /fisio/i.test(tipo) ? IconoCuerda : /nutri/i.test(tipo) ? IconoMagnesia : IconoMuro;

export default function AlianzasPage() {
  const { encabezado: h, aliados, invitacion } = S.alianzas;
  return (
    <>
      <PageHeader label={h.etiqueta} title={h.titulo} subtitle={h.subtitulo} />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ali-grid">
          <style>{`@media(max-width:640px){.ali-grid{grid-template-columns:1fr!important}}`}</style>
          {aliados.map(a => {
            const Icon = iconoAliado(a.tipo);
            return (
              <div key={a.nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', display: 'flex', gap: '18px' }}>
                <div style={{ padding: '12px', background: `${a.color}12`, borderRadius: '12px', width: 'fit-content', height: 'fit-content', flexShrink: 0 }}>
                  <Icon style={{ width: '24px', height: '24px', color: a.color }} />
                </div>
                <div>
                  <div style={{ fontFamily: F.texto, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: a.color, marginBottom: '4px' }}>{a.tipo}</div>
                  <div style={{ fontFamily: F.titulos, fontSize: '1.1rem', color: C.text, marginBottom: '10px' }}>{a.nombre}</div>
                  <p style={{ ...T.body, fontSize: '0.85rem', lineHeight: 1.75 }}>{a.descripcion}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '48px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
          <SectionLabel>{invitacion.etiqueta}</SectionLabel>
          <h3 style={{ ...T.h2, marginBottom: '12px', fontSize: '1.6rem' }}>{invitacion.titulo}</h3>
          <p style={{ ...T.body, maxWidth: '480px', margin: '0 auto 24px' }}>{invitacion.parrafo}</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: C.accent, color: C.onAccent, borderRadius: '8px', textDecoration: 'none', fontFamily: F.texto, fontWeight: 700, fontSize: '0.9rem' }}>{invitacion.boton}</a>
        </div>
      </Section>
    </>
  );
}
