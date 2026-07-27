import { C, T, Section, SectionLabel, Divider, PageHeader, BtnPrimary, CheckItem } from './shared';

const niveles = [
  {
    nivel: 'Iniciación', rango: '0–6 meses', color: '#22c55e',
    dolor: '"No sé por dónde empezar y me da miedo lesionarme."',
    pitch: 'El 80% del plan es escalar mejor, no sufrir en una tabla. Cero trabajo de dedos el primer año. En 12 semanas caes sin miedo y lees tus propias vías.',
    incluye: ['Técnica de caída y lectura de vías', 'Repertorio motor básico', 'Juego de cierre en cada sesión', 'Cero campus ni lastre'],
  },
  {
    nivel: 'Intermedio', rango: 'Estancado V2–V4', color: '#D4AF37',
    dolor: '"Llevo meses sin subir de grado. Entreno fuerte pero no avanzo."',
    pitch: 'Tu problema no es fuerza, es estructura. Test de entrada gratuito: te mostramos con datos qué te frena. Progresión por tamaño de presa, sin hipotecar los dedos.',
    incluye: ['Test Hörst + circuito estándar de entrada', 'Progresión por tamaño de presa', 'Liga interna de puntos por grupo', 'Check-Point Fest al cierre'],
  },
  {
    nivel: 'Avanzado', rango: 'V5+ / Competidor', color: '#ef4444',
    dolor: '"Llegué a un techo de rendimiento. No sé cómo periodizar mis picos."',
    pitch: 'Doble pico anual planificado con efectos retardados. Fisio mensual y nutrición por fase incluidas. Tests Lehner–Heyters para discriminar el alto nivel.',
    incluye: ['Doble pico anual periodizado', 'Fisioterapeuta mensual incluido', 'Nutricionista por fases', 'Batería Lehner–Heyters'],
  },
];

const planes = [
  {
    nombre: 'Plan Autónomo', precio: '$120.000 – $180.000', periodo: 'mes · solo con suscripción activa',
    desc: 'Para el escalador disciplinado que prefiere entrenar en sus horarios. Acceso completo al plan digital del ciclo vigente, videoteca técnica y tests presenciales en cada empalme.',
    incluye: ['Plan digital del ciclo vigente', 'Videoteca técnica completa', 'Revisión asincrónica de 2 videos/mes', 'Tests presenciales en cada empalme', 'Acceso activo mientras dure la suscripción'],
    color: '#9E721D', destacado: false,
  },
  {
    nombre: 'Plan Acompañado', precio: '$350.000 – $600.000', periodo: 'mes · ciclos de 13 semanas',
    desc: '2 a 3 sesiones presenciales por semana en muro aliado, con entrenador asignado, evaluación trimestral, Liga interna, Check-Point Fest y salidas a roca.',
    incluye: ['2–3 sesiones presenciales/semana', 'Plan periodizado con entrenador asignado', 'Evaluación trimestral con informe', 'Tarifas preferenciales con fisio y nutrición', 'Liga interna, Fest y salida trimestral a Suesca'],
    color: '#D4AF37', destacado: true,
  },
];

function NivelesSection() {
  return (
    <Section>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <SectionLabel>Adultos</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '12px' }}>¿En qué nivel estás?</h2>
        <p style={{ ...T.body, maxWidth: '520px', margin: '0 auto' }}>El discurso cambia porque el dolor del escalador cambia por nivel. Todos los grupos tienen test de entrada y test de cierre — la curva de progreso es el producto.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }} className="niv-grid">
        <style>{`@media(max-width:900px){.niv-grid{grid-template-columns:1fr!important}}`}</style>
        {niveles.map(n => (
          <div key={n.nivel} style={{ background: '#1c1c1c', border: `1px solid #2e2e2e`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '22px', background: `${n.color}10`, borderBottom: `1px solid ${n.color}20` }}>
              <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: n.color, marginBottom: '6px' }}>{n.rango}</div>
              <h3 style={{ fontFamily: 'Antonio', fontSize: '1.4rem', color: n.color, marginBottom: '10px' }}>{n.nivel}</h3>
              <p style={{ ...T.body, fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>{n.dolor}</p>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ ...T.body, fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.7, fontStyle: 'italic', color: '#A09A8C' }}>"{n.pitch}"</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {n.incluye.map(i => <CheckItem key={i} color={n.color}>{i}</CheckItem>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Menores */}
      <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c084fc', marginBottom: '6px' }}>Programa Menores</div>
            <h3 style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: '#F0EDE8', marginBottom: '10px' }}>Para niños y jóvenes</h3>
            <p style={{ ...T.body, fontSize: '0.85rem' }}>Ratios 1:6 y 1:8 según edad. Protocolo de protección (Ley 1098/2006). Cero campus ni lastre antes de los 16. Fases sensibles del desarrollo motor respetadas por rango.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[['6–9 años', '2 niveles'], ['10–12 años', '2 niveles'], ['13–15 años', '2 niveles']].map(([r, n]) => (
              <div key={r} style={{ padding: '14px 18px', background: '#242424', borderRadius: '10px', border: '1px solid #2e2e2e', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Antonio', fontSize: '1rem', color: '#c084fc' }}>{r}</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function PlanesSection() {
  return (
    <div style={{ background: '#1c1c1c', borderTop: '1px solid #2e2e2e', borderBottom: '1px solid #2e2e2e' }}>
      <Section>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionLabel>Modalidades</SectionLabel>
          <h2 style={{ ...T.h2, marginBottom: '12px' }}>Elige cómo entrenar</h2>
          <p style={{ ...T.body, maxWidth: '500px', margin: '0 auto' }}>Comprás ciclos de 13 semanas, no meses. La renovación ocurre en la semana de empalme, junto con tu informe de resultados.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '820px', margin: '0 auto' }} className="planes-grid">
          <style>{`@media(max-width:640px){.planes-grid{grid-template-columns:1fr!important}}`}</style>
          {planes.map(p => (
            <div key={p.nombre} style={{
              background: p.destacado ? '#4A2F0F' : '#242424',
              border: `1px solid ${p.destacado ? `${p.color}40` : '#2e2e2e'}`,
              borderRadius: '16px', padding: '28px', position: 'relative',
              boxShadow: p.destacado ? `0 0 40px ${p.color}12` : 'none',
            }}>
              {p.destacado && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#121212', padding: '4px 16px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>Más popular</div>}
              <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.color, marginBottom: '6px' }}>
                {p.destacado ? 'Presencial · Recomendado' : 'Digital'}
              </div>
              <h3 style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: '#F0EDE8', marginBottom: '6px' }}>{p.nombre}</h3>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontFamily: 'Antonio', fontSize: '1.7rem', color: p.color }}>{p.precio}</span>
                <div style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>{p.periodo}</div>
              </div>
              <p style={{ ...T.body, fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.7 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {p.incluye.map(i => <CheckItem key={i} color={p.color}>{i}</CheckItem>)}
              </div>
              <BtnPrimary to="/registro" style={{ width: '100%', justifyContent: 'center', background: p.destacado ? p.color : 'transparent', color: p.destacado ? '#121212' : '#F0EDE8', border: p.destacado ? 'none' : '1px solid #2e2e2e' }}>
                Inscribirme en este plan
              </BtnPrimary>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: 'Poppins', fontSize: '0.85rem', color: '#666' }}>
          ¿Dudas? Agenda tu <a href="https://wa.me/573004567890" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 600 }}>test de entrada gratuito</a> — te mostramos con datos qué te frena.
        </p>
      </Section>
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <>
      <PageHeader label="Servicios" title="Programas y planes" subtitle="Primero entiende qué nivel eres. Luego elige cómo quieres entrenar." />
      <NivelesSection />
      <PlanesSection />
    </>
  );
}
