/**
 * AdminDashboard.jsx
 * Dashboard financiero y operativo consolidado.
 * Consume GET /api/dashboard (KPIs) + GET /api/catalogos/* (catálogos)
 */

import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { IconoPlanEntreno, IconoCronometro, IconoMuro, IconoRoca, IconoCohorte, IconoEscalador, IconoCuerda, IconoPresa } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', accent2: '#9E721D', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatCOP(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

// ─── Componentes ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = C.accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ padding: '10px', borderRadius: '10px', background: color + '18', color, flexShrink: 0 }}>
        <Icon style={{ width: '20px', height: '20px' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: C.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: C.text2, marginTop: '2px', fontFamily: 'Poppins' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: C.text3, fontFamily: 'Poppins', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children, color = C.accent }) {
  return (
    <div style={{ fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', marginTop: '28px', fontFamily: 'Poppins' }}>
      {children}
    </div>
  );
}

function BarChart({ data, label, valueKey = 'total', labelKey = 'periodo', color = C.accent }) {
  if (!data || data.length === 0) return <div style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', padding: '20px', textAlign: 'center' }}>Sin datos suficientes</div>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((d, i) => {
        const val = parseFloat(d[valueKey]) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        const periodo = d[labelKey];
        const mesLabel = periodo?.includes('-') ? MESES[parseInt(periodo.split('-')[1]) - 1] + ' ' + periodo.split('-')[0].slice(2) : periodo;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins', textAlign: 'right', flexShrink: 0 }}>{mesLabel}</div>
            <div style={{ flex: 1, height: '24px', background: '#252525', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.5s ease', minWidth: pct > 0 ? '2px' : 0 }} />
              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>
                {formatCOP(val)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NivelRow({ nivel, inscripciones, recaudado }) {
  const nivelLabel = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  const nivelColor = { iniciacion: '#22c55e', intermedio: C.accent, avanzado: '#ef4444' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: nivelColor[nivel] || C.accent, flexShrink: 0 }} />
        <span style={{ fontSize: '0.88rem', color: C.text, fontWeight: 600, fontFamily: 'Poppins' }}>{nivelLabel[nivel] || nivel}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.88rem', color: C.accent, fontWeight: 700, fontFamily: 'Antonio, sans-serif' }}>{formatCOP(recaudado)}</div>
        <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins' }}>{inscripciones} inscrito{inscripciones !== 1 ? 's' : ''}</div>
      </div>
    </div>
  );
}

function ProgressRing({ pct, label, color, size = 90 }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#252525" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', fill: color }}>{pct}%</text>
      </svg>
      <div style={{ fontSize: '0.72rem', color: C.text2, marginTop: '6px', fontFamily: 'Poppins' }}>{label}</div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.request('/dashboard')
      .then(setData)
      .catch(err => {
        console.error(err);
        setError('No se pudo cargar el dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} /></div>;

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p style={{ color: C.text2, fontFamily: 'Poppins' }}>{error || 'Error cargando datos.'}</p>
      </div>
    );
  }

  const margenPositivo = data.margen_mensual >= 0;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Panel de Administración</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Vista financiera y operativa del negocio</p>
      </div>

      {/* ── FINANCIERO ──────────────────────────────────────── */}
      <SectionTitle>Financiero</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '4px' }}>
        <StatCard icon={IconoRoca} label="Ingresos recibidos" value={formatCOP(data.ingresos_recibidos)} color="#22c55e" />
        <StatCard icon={IconoPresa} label="Ingresos esperados" value={formatCOP(data.ingresos_esperados)} color={C.accent} />
        <StatCard icon={IconoCronometro} label="Pendiente de cobro" value={formatCOP(data.monto_pendiente)} sub={`${data.pagos_pendientes} pago(s)`} color="#f59e0b" />
        <StatCard icon={IconoCuerda} label="Costo RRHH mensual" value={formatCOP(data.costo_rrhh_mensual)} sub={`${data.contratos_activos} contrato(s) × 1.54`} color="#9E721D" />
        <StatCard
          icon={margenPositivo ? TrendingUp : TrendingDown}
          label="Margen estimado"
          value={formatCOP(data.margen_mensual)}
          sub="Ingresos recibidos − costo RRHH"
          color={margenPositivo ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* ── INDICADORES CIRCULARES ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px', marginBottom: '4px' }}>
        {/* Recaudo + Ocupación */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <ProgressRing pct={data.tasa_recaudo} label="Tasa de recaudo" color={data.tasa_recaudo >= 70 ? '#22c55e' : '#f59e0b'} />
          <ProgressRing pct={data.ocupacion_pct} label="Ocupación grupos" color={data.ocupacion_pct >= 80 ? '#22c55e' : data.ocupacion_pct >= 50 ? C.accent : '#ef4444'} />
        </div>

        {/* Ingresos por nivel */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'Poppins' }}>
            Ingresos por nivel
          </div>
          {data.ingresos_por_nivel?.length > 0
            ? data.ingresos_por_nivel.map(n => <NivelRow key={n.nivel} {...n} />)
            : <div style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins' }}>Sin datos</div>}
        </div>
      </div>

      {/* ── INGRESOS POR MES ────────────────────────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', fontFamily: 'Poppins' }}>
          Ingresos últimos 6 meses
        </div>
        <BarChart data={data.ingresos_por_mes} color="#22c55e" />
      </div>

      {/* ── OPERACIÓN ───────────────────────────────────────── */}
      <SectionTitle color={C.accent2}>Operación</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard icon={IconoEscalador} label="Escaladores activos" value={data.escaladores_activos} sub={`${data.escaladores_total} registrados`} color="#22c55e" />
        <StatCard icon={IconoCohorte} label="Inscripciones activas" value={data.inscripciones_activas} color={C.accent} />
        <StatCard icon={IconoMuro} label="Cohortes abiertas" value={data.cohortes_abiertas} sub={`${data.cohortes_en_curso} en curso`} color="#60a5fa" />
        <StatCard icon={IconoPlanEntreno} label="Capacidad" value={`${data.total_inscritos}/${data.capacidad_total}`} sub={`${data.ocupacion_pct}% ocupación`} color={data.ocupacion_pct >= 70 ? '#22c55e' : '#f59e0b'} />
        <StatCard icon={IconoCronometro} label="Renovación" value={data.escaladores_renovados} sub="escaladores con 2+ ciclos" color="#a78bfa" />
      </div>

      {/* ── ALERTAS ─────────────────────────────────────────── */}
      {(data.pagos_vencidos > 0 || data.parafiscales_pendientes > 0) && (
        <>
          <SectionTitle color="#ef4444">Alertas</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.pagos_vencidos > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text }}>
                  <strong style={{ color: '#ef4444' }}>{data.pagos_vencidos}</strong> pago(s) vencido(s) por {formatCOP(data.monto_vencido)}
                </div>
              </div>
            )}
            {data.parafiscales_pendientes > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text }}>
                  Parafiscales pendientes por {formatCOP(data.parafiscales_pendientes)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
