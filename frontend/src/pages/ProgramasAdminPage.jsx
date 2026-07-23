import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoPlanEntreno, IconoMagnesia, IconoCuerda } from '../components/Icons';

export default function ProgramasAdminPage() {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getProgramas().then(setProgramas).catch(console.error).finally(() => setLoading(false)); }, []);

  const adultos = programas.filter(p => p.poblacion === 'adulto');
  const menores = programas.filter(p => p.poblacion === 'menor');

  const ProgramaCard = ({ p }) => (
    <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem' }}>{p.nombre}</div>
        <span style={{ fontSize: '0.72rem', color: '#D4AF37', background: '#3a2e0a', padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' }}>{p.nivel}</span>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#A09A8C', lineHeight: 1.6, marginBottom: '10px' }}>{p.descripcion}</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: '#A09A8C', background: '#242424', padding: '2px 8px', borderRadius: '20px' }}>{p.duracion_semanas} semanas</span>
        {p.incluye_fisio && <span style={{ fontSize: '0.72rem', color: '#60a5fa', background: '#0a1a2e', padding: '2px 8px', borderRadius: '20px' }}>Fisio</span>}
        {p.incluye_nutricion && <span style={{ fontSize: '0.72rem', color: '#4ade80', background: '#0a1e0a', padding: '2px 8px', borderRadius: '20px' }}>Nutrición</span>}
        {p.rango_etario_menor && <span style={{ fontSize: '0.72rem', color: '#c084fc', background: '#1a0a2e', padding: '2px 8px', borderRadius: '20px' }}>{p.rango_etario_menor.replace('menor_','')}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>Programas</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{programas.length} programas configurados</p>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: '#D4AF37' }} /></div> : (
        <>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#D4AF37', marginBottom: '12px' }}>Adultos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {adultos.map(p => <ProgramaCard key={p.id} p={p} />)}
          </div>
          <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#9E721D', marginBottom: '12px' }}>Menores</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {menores.map(p => <ProgramaCard key={p.id} p={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
