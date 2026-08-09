/**
 * RRHHPage.jsx — Vista RRHH basada en entrenadores activos.
 * Las tablas contrato_entrenador y parafiscal no existen en el schema Prisma,
 * así que esta vista se basa en la tabla entrenador y muestra un simulador de costos.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { IconoEscalador, IconoMuro, IconoCronometro, IconoPresa } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

// Tasas parafiscales colombianas (empleador)
const TASAS = { salud: 0.085, pension: 0.12, arl: 0.0696, caja: 0.04 };
const PRESTACIONES = { prima: 1/12, cesantias: 1/12, int_cesantias: 0.12/12, vacaciones: 1/24 };

function simularCosto(salarioBase) {
  const base = parseFloat(salarioBase) || 0;
  const parafiscales = {
    salud: Math.round(base * TASAS.salud),
    pension: Math.round(base * TASAS.pension),
    arl: Math.round(base * TASAS.arl),
    caja: Math.round(base * TASAS.caja),
  };
  parafiscales.total = parafiscales.salud + parafiscales.pension + parafiscales.arl + parafiscales.caja;
  const prest = {
    prima: Math.round(base * PRESTACIONES.prima),
    cesantias: Math.round(base * PRESTACIONES.cesantias),
    int_cesantias: Math.round(base * PRESTACIONES.int_cesantias),
    vacaciones: Math.round(base * PRESTACIONES.vacaciones),
  };
  prest.total = prest.prima + prest.cesantias + prest.int_cesantias + prest.vacaciones;
  return { salarioBase: base, parafiscales, prestaciones: prest, costoTotal: base + parafiscales.total + prest.total, factor: ((base + parafiscales.total + prest.total) / base).toFixed(2) };
}

export default function RRHHPage() {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salarioSim, setSalarioSim] = useState(1200000);

  useEffect(() => {
    api.getEntrenadores()
      .then(setEntrenadores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} /></div>;

  const sim = simularCosto(salarioSim);
  const costoTotalEquipo = entrenadores.length * sim.costoTotal;
  const totalGrupos = entrenadores.reduce((s, e) => s + parseInt(e.grupos_activos || 0), 0);
  const totalEscaladores = entrenadores.reduce((s, e) => s + parseInt(e.total_escaladores || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Recursos Humanos</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Equipo de entrenadores · Normativa laboral colombiana</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          [entrenadores.length, 'Entrenadores', C.accent, IconoEscalador],
          [totalGrupos, 'Grupos activos', '#22c55e', IconoMuro],
          [totalEscaladores, 'Escaladores', '#60a5fa', IconoPresa],
          [fmt(costoTotalEquipo), 'Costo total est./mes', '#ef4444', IconoCronometro],
        ].map(([v, l, color, Icon]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: color + '18', color, flexShrink: 0 }}><Icon style={{ width: '18px', height: '18px' }} /></div>
            <div>
              <div style={{ fontFamily: 'Antonio', fontSize: typeof v === 'string' && v.includes('$') ? '1.1rem' : '1.5rem', color: C.text, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px' }}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="rrhh-grid">
        <style>{`@media(max-width:800px){.rrhh-grid{grid-template-columns:1fr!important}}`}</style>

        {/* Tabla de entrenadores */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins' }}>Equipo activo</div>
          {entrenadores.map(ent => (
            <div key={ent.id} style={{ padding: '12px 18px', borderBottom: `1px solid #1a1a1a`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{ent.nombre}</div>
                <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>{ent.licencia_ley181 || 'Sin licencia'} · Ingreso: {ent.fecha_ingreso ? new Date(ent.fecha_ingreso).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }) : '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.accent }}>{ent.grupos_activos || 0}/{ent.max_grupos}</div>
                <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>grupos</div>
              </div>
            </div>
          ))}
        </div>

        {/* Simulador de costos */}
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', fontFamily: 'Poppins' }}>
              Simulador de costo laboral
            </div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins', marginBottom: '6px' }}>Salario base mensual</label>
            <input type="number" value={salarioSim} onChange={e => setSalarioSim(parseInt(e.target.value) || 0)}
              className="input-dark" style={{ width: '100%', marginBottom: '16px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                ['Salario base', fmt(sim.salarioBase), C.text],
                ['Salud (8.5%)', fmt(sim.parafiscales.salud), C.text2],
                ['Pensión (12%)', fmt(sim.parafiscales.pension), C.text2],
                ['ARL clase V (6.96%)', fmt(sim.parafiscales.arl), C.text2],
                ['Caja (4%)', fmt(sim.parafiscales.caja), C.text2],
                ['Total parafiscales', fmt(sim.parafiscales.total), '#f59e0b'],
                ['Prima (1/12)', fmt(sim.prestaciones.prima), C.text2],
                ['Cesantías (1/12)', fmt(sim.prestaciones.cesantias), C.text2],
                ['Int. cesantías', fmt(sim.prestaciones.int_cesantias), C.text2],
                ['Vacaciones (1/24)', fmt(sim.prestaciones.vacaciones), C.text2],
                ['Total prestaciones', fmt(sim.prestaciones.total), '#f59e0b'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: l.startsWith('Total') ? `1px solid ${C.border}` : 'none', fontSize: '0.82rem', fontFamily: 'Poppins' }}>
                  <span style={{ color: l.startsWith('Total') ? c : C.text2 }}>{l}</span>
                  <span style={{ color: c, fontWeight: l.startsWith('Total') ? 700 : 400 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: '6px', fontSize: '1rem', fontFamily: 'Poppins' }}>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>COSTO TOTAL</span>
                <span style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: '#ef4444' }}>{fmt(sim.costoTotal)}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: C.text3, fontFamily: 'Poppins' }}>Factor: ×{sim.factor}</div>
            </div>
          </div>

          {/* Marco legal */}
          <div style={{ background: '#0a0a0a', border: `1px solid #1e293b`, borderRadius: '10px', padding: '14px 16px', fontSize: '0.75rem', color: '#475569', fontFamily: 'Poppins', lineHeight: 1.8 }}>
            <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Normatividad aplicada</div>
            Ley 100/1993 · Art. 204 — Salud empleador<br />
            Ley 797/2003 · Art. 20 — Pensión empleador<br />
            Decreto 1607/2002 — ARL clase V (deporte)<br />
            Ley 21/1982 · Art. 7 — Caja compensación<br />
            <span style={{ color: '#334155' }}>Las tablas de contratos y parafiscales requieren migración de BD para activarse.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
