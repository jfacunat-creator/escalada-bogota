import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Search, Filter } from 'lucide-react';
import { IconoEscalador, IconoSemaforo } from '../components/Icons';

const estadoColor = { activo: 'badge-green', inactivo: 'badge-slate', congelado: 'badge-amber' };

export default function EscaladoresAdminPage() {
  const [escaladores, setEscaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => { load(); }, [buscar, estado]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (estado) params.estado = estado;
      const data = await api.getEscaladores(params);
      setEscaladores(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>Escaladores</h1>
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{escaladores.length} registros</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#A09A8C' }} />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre..."
            className="input-dark" style={{ paddingLeft: '38px' }} />
        </div>
        <select value={estado} onChange={e => setEstado(e.target.value)} className="input-dark" style={{ width: 'auto', minWidth: '160px' }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="congelado">Congelado</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: '#D4AF37' }} /></div>
      ) : (
        <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2e2e2e', background: '#242424' }}>
                {['Escalador', 'Email', 'Nivel', 'Grupos activos', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', color: '#A09A8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escaladores.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#A09A8C' }}>Sin resultados</td></tr>
              ) : escaladores.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #2e2e2e' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#242424'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#F0EDE8', fontSize: '0.9rem' }}>{e.nombre} {e.apellido}</div>
                    <div style={{ fontSize: '0.78rem', color: '#A09A8C' }}>{e.telefono || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#A09A8C' }}>{e.email}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#D4AF37', background: '#3a2e0a', padding: '3px 10px', borderRadius: '20px', fontWeight: 500 }}>
                      {e.rango_etario === 'adulto' ? 'Adulto' : e.rango_etario?.replace('menor_', 'Menor ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: parseInt(e.grupos_activos) > 0 ? '#D4AF37' : '#A09A8C' }}>{e.grupos_activos || 0}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge-${e.estado === 'activo' ? 'green' : e.estado === 'congelado' ? 'amber' : 'slate'}`}
                      style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 500 }}>
                      {e.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
