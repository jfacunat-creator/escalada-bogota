import { C, T, Section, SectionLabel, Divider, PageHeader } from './shared';

const equipo = [
  { nombre: 'Juan Francisco Acuña', rol: 'Co-fundador · Entrenador Principal', icon: 'JFA', bio: 'Escalador con más de 10 años de experiencia en escalada deportiva y boulder en Bogotá. Especialista en periodización y entrenamiento funcional. Habilitado bajo Ley 181/1995. Ha formado más de 80 escaladores en programas estructurados.', areas: ['Iniciación Adulto', 'Intermedio Adulto', 'Menores 10–15'] },
  { nombre: 'Juan Diego García', rol: 'Co-fundador · Entrenador Avanzado', icon: 'JDG', bio: 'Escalador de alto rendimiento con experiencia en competencia nacional y metodología periodizada. Especialista en nivel Avanzado y desarrollo de talento joven. Habilitado bajo Ley 181/1995 con formación en fisiología del esfuerzo.', areas: ['Avanzado', 'Intermedio Adulto', 'Competencia'] },
];

export default function EquipoPage() {
  return (
    <>
      <PageHeader label="Quiénes somos" title="El entrenador es el producto" subtitle="Dos escaladores bogotanos que fundaron Escalada Bogotá en 2025 para que nadie más se estanque ni se lastime entrenando sin estructura." />
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', marginBottom: '64px' }} className="eq-main">
          <style>{`@media(max-width:768px){.eq-main{grid-template-columns:1fr!important}}`}</style>
          <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3' }}>
            <img src="/foto-equipo.png" alt="Equipo Escala Bogotá" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div>
            <SectionLabel>Nuestra historia</SectionLabel>
            <h2 style={{ ...T.h2, marginBottom: '12px' }}>Escaladores que<br /><span style={{ color: C.accent }}>entrenan escaladores</span></h2>
            <Divider />
            <p style={T.body}>Después de años viendo a amigos lesionarse imitando métodos de escaladores de alto nivel, entendimos que el problema no es la falta de esfuerzo — es la falta de estructura.</p>
            <p style={{ ...T.body, marginTop: '12px' }}>Escala Bogotá nació para ofrecer lo que ningún muro tenía: periodización real, evaluación objetiva y una comunidad que escala junta, mejora junta y se divierte junta.</p>
          </div>
        </div>

        <h2 style={{ ...T.h2, marginBottom: '32px', textAlign: 'center' }}>Nuestros entrenadores</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="eq-cards">
          <style>{`@media(max-width:640px){.eq-cards{grid-template-columns:1fr!important}}`}</style>
          {equipo.map(e => (
            <div key={e.nombre} style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '24px', background: '#4A2F0F', borderBottom: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Antonio', fontSize: '1rem', color: C.accent, flexShrink: 0 }}>{e.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: '#F0EDE8' }}>{e.nombre}</div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.accent, marginTop: '2px' }}>{e.rol}</div>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ ...T.body, fontSize: '0.85rem', lineHeight: 1.8, marginBottom: '16px' }}>{e.bio}</p>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>Grupos que dirige</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {e.areas.map(a => <span key={a} style={{ padding: '3px 10px', background: 'rgba(212,175,55,0.1)', color: C.accent, borderRadius: '20px', fontSize: '0.78rem', fontFamily: 'Poppins' }}>{a}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
