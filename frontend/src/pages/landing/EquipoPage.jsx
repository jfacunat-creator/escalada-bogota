import { C, F, T, Section, SectionLabel, Divider, PageHeader, TituloDoble } from './shared';
import { S } from '../../contenido';

const etiquetaPequena = (color) => ({ fontFamily: F.texto, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color });

export default function EquipoPage() {
  const { encabezado: h, historia, entrenadores } = S.equipo;
  return (
    <>
      <PageHeader label={h.etiqueta} title={h.titulo} subtitle={h.subtitulo} />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', marginBottom: '64px' }} className="eq-main">
          <style>{`@media(max-width:768px){.eq-main{grid-template-columns:1fr!important}}`}</style>
          <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3' }}>
            <img src={historia.imagen} alt={`Equipo ${S.marca.nombre}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div>
            <SectionLabel>{historia.etiqueta}</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}><TituloDoble titulo={historia.titulo} destacado={historia.tituloDestacado} /></h2>
            <Divider />
            <p style={T.body}>{historia.parrafo1}</p>
            <p style={{ ...T.body, marginTop: '12px' }}>{historia.parrafo2}</p>
          </div>
        </div>

        <h2 style={{ ...T.h2, marginBottom: '32px', textAlign: 'center' }}>{entrenadores.titulo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="eq-cards">
          <style>{`@media(max-width:640px){.eq-cards{grid-template-columns:1fr!important}}`}</style>
          {entrenadores.lista.map(e => (
            <div key={e.nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '24px', background: C.sidebar, borderBottom: `1px solid ${C.accent}33`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `${C.accent}26`, border: `2px solid ${C.accent}4D`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.titulos, fontSize: '1rem', color: C.accent, flexShrink: 0 }}>{e.iniciales}</div>
                <div>
                  <div style={{ fontFamily: F.titulos, fontSize: '1.1rem', color: C.text }}>{e.nombre}</div>
                  <div style={{ ...etiquetaPequena(C.accent), marginTop: '2px' }}>{e.rol}</div>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ ...T.body, fontSize: '0.85rem', lineHeight: 1.8, marginBottom: '16px' }}>{e.bio}</p>
                <div style={{ ...etiquetaPequena(C.text3), marginBottom: '8px' }}>{entrenadores.etiquetaGrupos}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {e.grupos.map(a => <span key={a} style={{ padding: '3px 10px', background: `${C.accent}1A`, color: C.accent, borderRadius: '20px', fontSize: '0.78rem', fontFamily: F.texto }}>{a}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
