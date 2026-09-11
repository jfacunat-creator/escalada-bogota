/**
 * AdminDashboard.jsx v3
 * Filtros: ciclo, nivel, modalidad, entrenador, rango etario
 * Secciones: Financiero (flujo de caja) · Operación (dinámico) · Alertas
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { IconoPlanEntreno, IconoCronometro, IconoMuro, IconoRoca, IconoEscalador, IconoCuerda, IconoPresa } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', accent2: '#9E721D', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const NIVEL_LABEL = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado' };
const NIVEL_COLOR = { iniciacion: '#22c55e', intermedio: C.accent, avanzado: '#ef4444' };

function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

function StatCard({ icon: Icon, label, value, sub, color = C.accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color + '60')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ padding: '10px', borderRadius: '10px', background: color + '18', color, flexShrink: 0 }}><Icon style={{ width: '20px', height: '20px' }} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: C.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: C.text2, marginTop: '2px', fontFamily: 'Poppins' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: C.text3, fontFamily: 'Poppins', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children, color = C.accent }) {
  return <div style={{ fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', marginTop: '28px', fontFamily: 'Poppins' }}>{children}</div>;
}

function BarChart({ data, valueKey = 'total', labelKey = 'periodo', color = C.accent }) {
  if (!data?.length) return <div style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', padding: '20px', textAlign: 'center' }}>Sin datos</div>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((d, i) => {
        const val = parseFloat(d[valueKey]) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        const p = d[labelKey];
        const label = p?.includes('-') ? MESES[parseInt(p.split('-')[1]) - 1] + ' ' + p.split('-')[0].slice(2) : p;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins', textAlign: 'right', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: '24px', background: '#252525', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.5s', minWidth: pct > 0 ? '2px' : 0 }} />
              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{fmt(val)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({ pct, label, color, size = 90 }) {
  const stroke = 6, radius = (size - stroke) / 2, circ = 2 * Math.PI * radius, offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#252525" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" style={{ fontFamily: 'Antonio', fontSize: '1.3rem', fill: color }}>{pct}%</text>
      </svg>
      <div style={{ fontSize: '0.72rem', color: C.text2, marginTop: '6px', fontFamily: 'Poppins' }}>{label}</div>
    </div>
  );
}

function NivelRow({ nivel, modalidad, inscripciones, recaudado }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NIVEL_COLOR[nivel] || C.accent, flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', color: C.text, fontWeight: 600, fontFamily: 'Poppins' }}>{NIVEL_LABEL[nivel] || nivel}</span>
        {modalidad && <span style={{ fontSize: '0.7rem', color: C.text3, fontFamily: 'Poppins', textTransform: 'capitalize' }}>({modalidad === 'acompanado' ? 'Acomp.' : 'Autón.'})</span>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.85rem', color: C.accent, fontWeight: 700, fontFamily: 'Antonio' }}>{fmt(recaudado)}</div>
        <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>{inscripciones} inscrito{inscripciones != 1 ? 's' : ''}</div>
      </div>
    </div>
  );
}

function FilterBar({ filtro, setFiltro, ciclos, entrenadores }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Ciclo */}
      <select value={filtro.cicloId} onChange={e => setFiltro(f => ({ ...f, cicloId: e.target.value }))}
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer' }}>
        <option value="">Todos los ciclos</option>
        {ciclos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
      </select>
      {/* Nivel */}
      <select value={filtro.nivel || ''} onChange={e => setFiltro(f => ({ ...f, nivel: e.target.value }))}
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer' }}>
        <option value="">Todos los niveles</option>
        <option value="iniciacion">Iniciación</option>
        <option value="intermedio">Intermedio</option>
        <option value="avanzado">Avanzado</option>
      </select>
      {/* Modalidad */}
      <select value={filtro.modalidad || ''} onChange={e => setFiltro(f => ({ ...f, modalidad: e.target.value }))}
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer' }}>
        <option value="">Ambas modalidades</option>
        <option value="autonomo">Autónomo</option>
        <option value="acompanado">Acompañado</option>
      </select>
      {/* Entrenador */}
      <select value={filtro.entrenadorId || ''} onChange={e => setFiltro(f => ({ ...f, entrenadorId: e.target.value }))}
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer' }}>
        <option value="">Todos los entrenadores</option>
        {entrenadores.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
      {/* Rango etario */}
      <select value={filtro.rangoEtario || ''} onChange={e => setFiltro(f => ({ ...f, rangoEtario: e.target.value }))}
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer' }}>
        <option value="">Todos los rangos</option>
        <option value="adulto">Adultos</option>
        <option value="menor_6_9">Menores 6–9</option>
        <option value="menor_10_12">Menores 10–12</option>
        <option value="menor_13_15">Menores 13–15</option>
      </select>
      {/* Limpiar */}
      {Object.values(filtro).some(v => v) && (
        <button onClick={() => setFiltro({ cicloId: '', nivel: '', modalidad: '', entrenadorId: '', rangoEtario: '' })}
          style={{ background: 'none', border: `1px solid ${C.border}`, color: '#ef4444', padding: '7px 10px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.78rem', cursor: 'pointer' }}>
          ✕ Limpiar
        </button>
      )}
    </div>
  );
}

// ─── Modal asignar nivel ──────────────────────────────────────────────────────
const NIVELES = [
  { value: 'iniciacion', label: 'Iniciación', desc: 'Sin experiencia previa en escalada', color: '#22c55e' },
  { value: 'intermedio', label: 'Intermedio', desc: 'Con experiencia básica, listo para progresar', color: C.accent },
  { value: 'avanzado',   label: 'Avanzado',   desc: 'Escalador con técnica y condición establecida', color: '#ef4444' },
];

function ModalAsignarNivel({ escalador, onCerrar, onAsignado }) {
  const [nivel, setNivel] = useState('iniciacion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const confirmar = async () => {
    setLoading(true); setError(null);
    try {
      await api.asignarNivel(escalador.id, nivel);
      onAsignado(escalador.id);
    } catch (e) {
      setError(e?.error || 'Error al asignar nivel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px', padding: '28px', maxWidth: '460px', width: '100%' }}>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: C.text, marginBottom: '4px' }}>Asignar nivel</div>
        <div style={{ fontSize: '0.82rem', color: C.text2, marginBottom: '20px' }}>
          {escalador.nombre} {escalador.apellido} · {escalador.email}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#252525', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.82rem' }}>
          {[['Teléfono', escalador.telefono || '—'], ['Emergencia', escalador.contacto_emergencia || '—'], ['Rango', escalador.rango_etario === 'adulto' ? 'Adulto' : (escalador.rango_etario || '—').replace('menor_', 'Menor ')], ['Registro', new Date(escalador.created_at).toLocaleDateString('es-CO')]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0', borderBottom: '1px solid #2e2e2e' }}>
              <span style={{ color: C.text2 }}>{k}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: C.text2, marginBottom: '8px', fontFamily: 'Poppins' }}>
            Nivel del escalador
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {NIVELES.map(n => (
              <label key={n.value} onClick={() => setNivel(n.value)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: nivel === n.value ? n.color + '15' : '#252525', border: `1px solid ${nivel === n.value ? n.color + '60' : '#3e3e3e'}`, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${nivel === n.value ? n.color : '#555'}`, background: nivel === n.value ? n.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {nivel === n.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#121212' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: nivel === n.value ? n.color : C.text, fontFamily: 'Poppins' }}>{n.label}</div>
                  <div style={{ fontSize: '0.75rem', color: C.text3 }}>{n.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: C.text3, background: '#252525', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', lineHeight: 1.6 }}>
          Al asignar el nivel, el escalador podrá ver los grupos disponibles y elegir uno para inscribirse.
          Su cuenta se activará cuando el equipo registre el primer pago.
        </div>

        {error && <div style={{ background: '#ef444415', border: '1px solid #ef444433', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '0.82rem', color: '#fca5a5' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCerrar} disabled={loading}
            style={{ flex: 1, padding: '11px', borderRadius: '8px', background: 'transparent', color: C.text2, border: '1px solid #2e2e2e', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Poppins' }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={loading}
            style={{ flex: 2, padding: '11px', borderRadius: '8px', background: loading ? '#3a3a2a' : C.accent, color: '#121212', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Asignar nivel →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState({ cicloId: '', nivel: '', modalidad: '', entrenadorId: '', rangoEtario: '' });
  const [escaladorActivar, setEscaladorActivar] = useState(null);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtro.cicloId) params.set('cicloId', filtro.cicloId);
    if (filtro.nivel) params.set('nivel', filtro.nivel);
    if (filtro.modalidad) params.set('modalidad', filtro.modalidad);
    if (filtro.entrenadorId) params.set('entrenadorId', filtro.entrenadorId);
    if (filtro.rangoEtario) params.set('rangoEtario', filtro.rangoEtario);
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.request(`/dashboard${qs}`)
      .then(d => { setData(d); setError(null); })
      .catch(err => { console.error(err); setError('No se pudo cargar el dashboard.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filtro.cicloId, filtro.nivel, filtro.modalidad, filtro.entrenadorId, filtro.rangoEtario]);

  if (loading && !data) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} /></div>;
  if (error && !data) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
      <p style={{ color: C.text2, fontFamily: 'Poppins' }}>{error}</p>
    </div>
  );
  if (!data) return null;

  const ciclos = data._ciclos || [];
  const entrenadores = data._entrenadores || [];
  const [pendientes, setPendientes] = useState(data.pendientes || []);

  useEffect(() => { setPendientes(data?.pendientes || []); }, [data]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Panel de Administración</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Vista financiera y operativa</p>
        </div>
        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.surface, border: `1px solid ${C.border}`, color: C.accent, padding: '8px 14px', borderRadius: '8px', fontFamily: 'Poppins', fontSize: '0.82rem', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ opacity: loading ? 1 : 0.5 }} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: '20px' }}>
        <FilterBar filtro={filtro} setFiltro={setFiltro} ciclos={ciclos} entrenadores={entrenadores} />
      </div>

      {/* ── FINANCIERO ────────────────────── */}
      <SectionTitle>Flujo de Caja</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '4px' }}>
        <StatCard icon={IconoRoca} label="Ingresos recibidos" value={fmt(data.ingresos_recibidos)} color="#22c55e" />
        <StatCard icon={IconoCuerda} label="Gastos estimados" value={fmt(data.gastos_entrenadores_estimado)} sub={`${data.n_entrenadores} entrenador(es)`} color="#9E721D" />
        <StatCard icon={data.margen_estimado >= 0 ? TrendingUp : TrendingDown} label="Margen estimado" value={fmt(data.margen_estimado)} sub="Ingresos − gastos" color={data.margen_estimado >= 0 ? '#22c55e' : '#ef4444'} />
        <StatCard icon={IconoCronometro} label="Pagos pendientes" value={data.pagos_pendientes} sub={fmt(data.ingresos_vencidos) + " vencido"} color="#f59e0b" />
      </div>

      {/* Distribución + gráfico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {/* Ingresos por nivel */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'Poppins' }}>Ingresos por nivel</div>
          {data.ingresos_por_nivel?.length > 0
            ? data.ingresos_por_nivel.map((n, i) => <NivelRow key={i} {...n} />)
            : <div style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins' }}>Sin datos</div>}
        </div>
        {/* Ingresos por entrenador */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'Poppins' }}>Por entrenador</div>
          {data.ingresos_por_entrenador?.length > 0
            ? data.ingresos_por_entrenador.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '0.85rem', color: C.text, fontFamily: 'Poppins' }}>{e.entrenador}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.82rem', color: '#22c55e', fontFamily: 'Antonio' }}>{fmt(e.recaudado)}</div>
                  <div style={{ fontSize: '0.68rem', color: C.text3, fontFamily: 'Poppins' }}>{e.inscripciones} insc.</div>
                </div>
              </div>
            )) : <div style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins' }}>Sin datos</div>}
        </div>
      </div>

      {/* Ingresos por mes */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', fontFamily: 'Poppins' }}>Ingresos últimos 6 meses</div>
        <BarChart data={data.ingresos_por_mes} color="#22c55e" />
      </div>

      {/* ── OPERACIÓN ────────────────────── */}
      <SectionTitle color={C.accent2}>Operación</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard icon={IconoEscalador} label="Escaladores activos" value={data.escaladores_activos} sub={`${data.escaladores_total} registrados · ${data.adultos} adultos · ${data.menores} menores`} color="#22c55e" onClick={() => navigate('/app/escaladores')} />
        <StatCard icon={IconoPresa} label="Inscripciones activas" value={data.inscripciones_activas} sub={`${data.inscripciones_total} total`} color={C.accent} />
        <StatCard icon={IconoMuro} label="Grupos abiertos" value={data.grupos_abiertos} sub={`${data.grupos_en_curso} en curso`} color="#60a5fa" onClick={() => navigate('/app/grupos')} />
        <StatCard icon={IconoPlanEntreno} label="Capacidad" value={`${data.total_inscritos}/${data.capacidad_total}`} sub={`${data.ocupacion_pct}% ocupación`} color={data.ocupacion_pct >= 70 ? '#22c55e' : '#f59e0b'} />
        <StatCard icon={IconoCronometro} label="Renovación" value={data.escaladores_renovados} sub="2+ ciclos" color="#a78bfa" />
      </div>

      {/* Distribución */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <ProgressRing pct={data.ocupacion_pct} label="Ocupación" color={data.ocupacion_pct >= 80 ? '#22c55e' : data.ocupacion_pct >= 50 ? C.accent : '#ef4444'} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.8rem', color: C.accent }}>{data.total_inscritos}</div>
            <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins' }}>inscritos</div>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text3, marginTop: '8px' }}>{data.capacidad_total}</div>
            <div style={{ fontSize: '0.72rem', color: C.text3, fontFamily: 'Poppins' }}>cupos</div>
          </div>
        </div>
        {/* Distribución por rango etario */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'Poppins' }}>Distribución demográfica</div>
          {data.distribucion_etario?.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: '0.85rem', fontFamily: 'Poppins' }}>
              <span style={{ color: C.text, textTransform: 'capitalize' }}>{d.rango_etario?.replace('menor_', 'Menor ').replace('_', '–') || 'Adulto'}</span>
              <span style={{ color: C.accent, fontFamily: 'Antonio', fontSize: '1rem' }}>{d.n}</span>
            </div>
          ))}
        </div>
        {/* Carga por entrenador */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'Poppins' }}>Carga por entrenador</div>
          {data.distribucion_entrenador?.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: '0.85rem', fontFamily: 'Poppins' }}>
              <span style={{ color: C.text }}>{d.nombre}</span>
              <span style={{ color: C.text2 }}>{d.grupos} grupo{d.grupos != 1 ? 's' : ''} · {d.escaladores} esc.</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ALERTAS ────────────────────── */}
      {/* ── Pendientes: sin nivel asignado ── */}
      {pendientes.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <SectionTitle color="#f59e0b">
            Nuevos registros · sin nivel asignado · {pendientes.length}
          </SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendientes.map(e => (
              <div key={e.id} style={{ background: C.surface, border: '1px solid #f59e0b40', borderLeft: '3px solid #f59e0b', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: C.text, fontWeight: 600 }}>
                    {e.nombre} {e.apellido}
                    <span style={{ marginLeft: '8px', fontSize: '0.72rem', fontWeight: 400, color: C.text3 }}>
                      {e.rango_etario === 'adulto' ? 'Adulto' : e.rango_etario?.replace('menor_', 'Menor ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: C.text2, marginTop: '2px' }}>{e.email}</div>
                </div>
                <div style={{ fontSize: '0.78rem', color: C.text2, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {e.telefono && <span>📱 {e.telefono}</span>}
                  {e.contacto_emergencia && <span>🆘 {e.contacto_emergencia}</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: C.text3 }}>
                  Registro: {new Date(e.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <button
                  onClick={() => setEscaladorActivar(e)}
                  style={{ padding: '6px 14px', borderRadius: '8px', background: '#f59e0b20', border: '1px solid #f59e0b60', color: '#f59e0b', fontFamily: 'Poppins', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Asignar nivel →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.alertas?.pagos_vencidos > 0 || data.alertas?.grupos_casi_llenos > 0) && (
        <>
          <SectionTitle color="#ef4444">Alertas</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.alertas?.pagos_vencidos > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text }}>
                  <strong style={{ color: '#ef4444' }}>{data.alertas.pagos_vencidos}</strong> pago(s) vencido(s) por {fmt(data.alertas.monto_vencido)}
                </div>
              </div>
            )}
            {data.alertas?.grupos_casi_llenos > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text }}>
                  <strong style={{ color: '#f59e0b' }}>{data.alertas.grupos_casi_llenos}</strong> grupo(s) al 85%+ de capacidad
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {escaladorActivar && (
        <ModalAsignarNivel
          escalador={escaladorActivar}
          onCerrar={() => setEscaladorActivar(null)}
          onAsignado={id => {
            setPendientes(prev => prev.filter(e => e.id !== id));
            setEscaladorActivar(null);
          }}
        />
      )}
    </div>
  );
}
