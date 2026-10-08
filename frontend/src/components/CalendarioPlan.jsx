import { useNavigate, Link } from 'react-router-dom';
import { fmtRango, fmtHora } from './ui';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#555' };
const TIPO_COLOR = { baja: '#00D9B5', media: '#D4AF37', alta: '#EF4444' };
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Días sugeridos dentro de la semana del plan (0 = primer día de la semana Sn) según cuántas
// sesiones tenga: se reparten dejando descanso entre sesiones siempre que se pueda.
const PATRON = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

// Fechas "AAAA-MM-DD" en UTC para no desfasar días
const sumarDias = (f, n) => { const d = new Date(f + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaSemana = f => (new Date(f + 'T00:00:00Z').getUTCDay() + 6) % 7; // 0 = lunes

// Asigna a cada sesión del mes una fecha sugerida. La semana Sn empieza el día 7·n del ciclo
// (S0 = inicio del ciclo). Si el grupo tiene sesiones programadas con entrenador esa semana,
// esos días van primero; el resto se completa con el patrón de descanso.
export function sugerirFechas({ semanas, inicioCiclo, mes, sesionesGrupo = [] }) {
  const porFecha = {};
  const fechasGrupo = new Set(sesionesGrupo.map(s => s.fecha?.slice(0, 10)));
  for (const w of semanas) {
    const n = Number(String(w.id).slice(1));
    const ini = sumarDias(inicioCiclo, 7 * n);
    const dias = [0, 1, 2, 3, 4, 5, 6].map(o => sumarDias(ini, o))
      .filter(f => f >= mes.fechaInicio && f <= mes.fechaFin);
    const k = w.sesiones.length;
    const elegidas = dias.filter(f => fechasGrupo.has(f)).slice(0, k);
    const preferidos = [...(PATRON[k] || [0, 1, 2, 3, 4, 5, 6]), 0, 1, 2, 3, 4, 5, 6]
      .map(o => sumarDias(ini, o)).filter(f => dias.includes(f));
    for (const f of preferidos) {
      if (elegidas.length >= k) break;
      if (!elegidas.includes(f)) elegidas.push(f);
    }
    elegidas.sort();
    [...w.sesiones].sort((a, b) => a.num - b.num).forEach((s, i) => {
      const f = elegidas[i];
      if (f) (porFecha[f] ||= []).push({ semana: w.id, num: s.num, name: s.name, type: s.type });
    });
  }
  return porFecha;
}

export default function CalendarioPlan({ plan, sesionesGrupo, asistMap }) {
  const navigate = useNavigate();
  const mes = plan?.meses?.find(m => m.mes === plan.mesVigente);
  const inicioCiclo = plan?.meses?.find(m => m.mes === 1)?.fechaInicio;

  const titulo = (
    <div style={{ fontFamily: 'Poppins', fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>
      Calendario sugerido del mes{mes ? ` ${mes.mes} · ${fmtRango(mes.fechaInicio, mes.fechaFin)}` : ''}
    </div>
  );
  const aviso = (contenido) => (
    <div style={{ marginBottom: '24px' }}>
      {titulo}
      <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '22px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem' }}>
        {contenido}
      </div>
    </div>
  );

  if (!plan) return null;
  if (plan.acceso === 'ciclo_terminado') return aviso(`Tu ciclo ${plan.cicloCodigo} terminó. Inscríbete al siguiente ciclo para ver un nuevo calendario.`);
  if (plan.acceso !== 'completo' || !mes || !inicioCiclo) {
    return aviso(<>🔒 El calendario con las sesiones sugeridas aparece cuando la mensualidad del mes {plan.mesVigente} esté pagada. <Link to="/app/mis-pagos" style={{ color: C.accent }}>Ver mis pagos</Link></>);
  }

  const semanas = plan.semanas.filter(w => !w.historica);
  const porFecha = sugerirFechas({ semanas, inicioCiclo, mes, sesionesGrupo });
  const grupoPorFecha = Object.fromEntries(sesionesGrupo.map(s => [s.fecha?.slice(0, 10), s]));
  const hoy = new Date().toISOString().slice(0, 10);

  // Cuadrícula de lunes a domingo que cubre todo el mes del ciclo
  const desde = sumarDias(mes.fechaInicio, -diaSemana(mes.fechaInicio));
  const hasta = sumarDias(mes.fechaFin, 6 - diaSemana(mes.fechaFin));
  const celdas = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) celdas.push(f);
  const totalSesiones = Object.values(porFecha).reduce((n, l) => n + l.length, 0);

  return (
    <div style={{ marginBottom: '24px' }}>
      {titulo}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px' }}>
        <p style={{ fontFamily: 'Poppins', fontSize: '0.76rem', color: C.text2, margin: '0 0 10px' }}>
          Sugerencia para repartir las {totalSesiones} sesiones de tu plan este mes, con días de descanso entre ellas
          {sesionesGrupo.length > 0 && ' y priorizando los días de entrenamiento con tu grupo'}. Puedes moverlas según tu agenda:
          lo importante es hacerlas en orden. Toca una sesión para abrirla en Mi Plan.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
          {DIAS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontFamily: 'Poppins', fontSize: '0.66rem', color: C.text3, fontWeight: 600, paddingBottom: '2px' }}>{d}</div>
          ))}
          {celdas.map(f => {
            const fuera = f < mes.fechaInicio || f > mes.fechaFin;
            const sesiones = porFecha[f] || [];
            const g = grupoPorFecha[f];
            const a = asistMap?.[f];
            const esHoy = f === hoy;
            const dia = Number(f.slice(8));
            return (
              <div key={f} style={{
                minHeight: '64px', borderRadius: '8px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '3px',
                background: fuera ? 'transparent' : esHoy ? '#1a1400' : '#232323',
                border: `1px solid ${esHoy ? C.accent + '80' : fuera ? 'transparent' : C.border}`,
                opacity: fuera ? 0.3 : f < hoy ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontFamily: 'Antonio', fontSize: '0.85rem', color: esHoy ? C.accent : C.text }}>
                    {dia === 1 ? `${dia} ${new Date(f + 'T12:00:00Z').toLocaleDateString('es-CO', { timeZone: 'UTC', month: 'short' }).replace('.', '')}` : dia}
                  </span>
                  {g && !fuera && (
                    <span title={`Sesión con grupo ${fmtHora(g.hora_inicio)}–${fmtHora(g.hora_fin)}${a ? (a.asistio ? ' · asististe' : ' · falta') : ''}`}
                      style={{ fontSize: '0.6rem', color: a ? (a.asistio ? '#22c55e' : '#ef4444') : '#818cf8' }}>
                      {a ? (a.asistio ? '✓' : '✗') : '👥'}
                    </span>
                  )}
                </div>
                {!fuera && sesiones.map(s => {
                  const col = TIPO_COLOR[s.type?.toLowerCase()] || C.accent;
                  return (
                    <button key={`${s.semana}_${s.num}`} title={`${s.semana} · Sesión ${s.num}${s.name ? ` — ${s.name}` : ''}`}
                      onClick={() => navigate(`/app/mi-plan?semana=${s.semana}&sesion=${s.num}`)}
                      style={{ width: '100%', padding: '3px 2px', borderRadius: '5px', cursor: 'pointer', border: `1px solid ${col}66`, background: col + '1f', color: col, fontFamily: 'Poppins', fontSize: '0.64rem', fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.semana}·{s.num}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px', fontFamily: 'Poppins', fontSize: '0.68rem', color: C.text2 }}>
          {Object.entries(TIPO_COLOR).map(([t, col]) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: col }} /> Intensidad {t}
            </span>
          ))}
          {sesionesGrupo.length > 0 && <span>👥 sesión con grupo · ✓ asististe · ✗ falta</span>}
          <span>S3·2 = semana 3, sesión 2</span>
        </div>
      </div>
    </div>
  );
}
