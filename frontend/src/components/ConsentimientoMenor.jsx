// Formato de consentimiento informado para escaladores menores de edad (Ley 1098/2006).
// Lo diligencia el representante legal al registrarse (RegisterPage) o antes de inscribirse
// (InscripcionPage). El backend valida lo mismo en utils/consentimiento.js.

export const MAYORIA_EDAD = 18;

export const CONSENTIMIENTO_VACIO = {
  representanteNombre: '', tipoDocumento: 'CC', documento: '', parentesco: '',
  telefono: '', email: '', aceptaProtocolo: false, firma: '',
};

export function edadDe(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(`${String(fechaNacimiento).slice(0, 10)}T12:00:00`);
  const hoy = new Date();
  return hoy.getFullYear() - nac.getFullYear() -
    (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate()) ? 1 : 0);
}

export const PUNTOS_PROTOCOLO = [
  'Autorizo la participación del menor en el entrenamiento de escalada deportiva y conozco sus riesgos (caídas, lesiones musculares y articulares).',
  'Grupos con ratios diferenciados y supervisión reforzada de un entrenador durante toda la sesión.',
  'Sin campus board ni entrenamiento con lastre antes de los 16 años; carga de dedos ajustada a la edad.',
  'Toda comunicación sobre el menor se hace también con el representante legal.',
  'Los datos del menor se tratan según la Ley 1581/2012 y no se publican imágenes sin autorización escrita.',
];

const lbl = { display: 'block', fontSize: '0.72rem', color: '#A09A8C', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Poppins' };

const Campo = ({ label, children }) => (
  <div><label style={lbl}>{label}</label>{children}</div>
);

export default function ConsentimientoMenor({ value, onChange, nombreMenor }) {
  const set = k => e => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(prev => ({ ...prev, [k]: v }));
  };
  return (
    <div style={{ border: '1px solid #c084fc40', background: '#c084fc0d', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontFamily: 'Poppins', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c084fc' }}>Ley 1098/2006 · Código de Infancia</div>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.15rem', color: '#F0EDE8', marginTop: '4px' }}>Consentimiento del representante legal</div>
        <p style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: '#A09A8C', marginTop: '4px', lineHeight: 1.5 }}>
          {nombreMenor ? `${nombreMenor} es menor de edad` : 'El escalador es menor de edad'}: su madre, padre o tutor legal debe diligenciar y firmar este formato.
        </p>
      </div>

      <Campo label="Nombre completo del representante">
        <input className="input-dark" value={value.representanteNombre} onChange={set('representanteNombre')} required placeholder="Nombre y apellidos" />
      </Campo>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
        <Campo label="Tipo doc.">
          <select className="input-dark" value={value.tipoDocumento} onChange={set('tipoDocumento')}>
            <option value="CC">CC</option>
            <option value="CE">CE</option>
            <option value="PA">Pasaporte</option>
          </select>
        </Campo>
        <Campo label="Número de documento">
          <input className="input-dark" value={value.documento} onChange={set('documento')} required inputMode="numeric" />
        </Campo>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Campo label="Parentesco">
          <select className="input-dark" value={value.parentesco} onChange={set('parentesco')} required>
            <option value="">Elige…</option>
            {['Madre', 'Padre', 'Tutor legal', 'Otro'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
        <Campo label="Teléfono">
          <input className="input-dark" type="tel" value={value.telefono} onChange={set('telefono')} required placeholder="300 123 4567" />
        </Campo>
      </div>
      <Campo label="Email del representante (opcional)">
        <input className="input-dark" type="email" value={value.email} onChange={set('email')} />
      </Campo>

      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {PUNTOS_PROTOCOLO.map(p => <li key={p} style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: '#A09A8C', lineHeight: 1.5 }}>{p}</li>)}
      </ul>

      <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={value.aceptaProtocolo} onChange={set('aceptaProtocolo')} required style={{ marginTop: '3px', accentColor: '#c084fc' }} />
        <span style={{ fontFamily: 'Poppins', fontSize: '0.8rem', color: '#F0EDE8', lineHeight: 1.5 }}>
          Declaro que soy el representante legal del menor, que la información es verdadera y que acepto el consentimiento informado y el protocolo de protección de menores.
        </span>
      </label>

      <Campo label="Firma: escribe de nuevo el nombre completo del representante">
        <input className="input-dark" value={value.firma} onChange={set('firma')} required style={{ fontStyle: 'italic' }} />
      </Campo>
    </div>
  );
}
