/**
 * MisGruposPage.jsx — Vista del entrenador: dashboard de sus grupos activos.
 * Muestra inscritos, asistencia, fechas y permite acceder al detalle.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { IconoEscalador, IconoMuro, IconoCronometro, IconoPresa } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

const NIVEL_COLOR = { iniciacion: '#22c55e', intermedio: '#D4AF37', avanzado: '#ef4444' };

export default function MisGruposPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entData, setEntData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrenador?.id) {
      api.getEntrenador(user.entrenador.id)
        .then(setEntData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.entrenador?.id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />
    </div>
  );

  const grupos = entData?.grupos || [];
  const stats = entData?.stats || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mis Grupos</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} activo{grupos.length !== 1 ? 's' : ''} · {stats.escaladores_activos || 0} escaladores en total
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          [grupos.length, 'Grupos activos', C.accent, IconoMuro],
          [stats.escaladores_activos || 0, 'Escaladores', '#22c55e', IconoEscalador],
          [stats.total_grupos_historico || 0, 'Histórico total', C.text2, IconoCronometro],
        ].map(([v, l, color, Icon]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: color + '18', color, flexShrink: 0 }}>
              <Icon style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: C.text, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px' }}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <IconoMuro style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 16px' }} />
          <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>Sin grupos asignados en este ciclo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {grupos.map(g => {
            const pct = g.cupo_maximo > 0 ? Math.round((parseInt(g.inscritos) / g.cupo_maximo) * 100) : 0;
            const nivelColor = NIVEL_COLOR[g.nivel] || C.accent;

            return (
              <div key={g.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header de grupo */}
                <div style={{ background: '#1a1a1a', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: nivelColor, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Antonio', fontSize: '1.1rem', color: C.text }}>{g.programa_nombre}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>
                      {g.ciclo_codigo} · {g.horario} · {g.muro_nombre}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins',
                      background: g.estado === 'en_curso' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      color: g.estado === 'en_curso' ? '#f59e0b' : '#22c55e',
                    }}>{g.estado === 'en_curso' ? 'En curso' : 'Abierto'}</span>
                    <button onClick={() => navigate(`/app/grupos/${g.id}`)}
                      style={{ padding: '6px 14px', borderRadius: '6px', background: '#4A2F0F', border: 'none', color: C.accent, fontFamily: 'Poppins', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                      Gestionar →
                    </button>
                  </div>
                </div>

                {/* Stats del grupo */}
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '14px' }}>
                  {/* Ocupación */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Antonio', fontSize: '1.4rem', color: C.accent }}>{g.inscritos}/{g.cupo_maximo}</div>
                    <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins', marginBottom: '4px' }}>Inscritos</div>
                    <div style={{ height: '4px', background: '#252525', borderRadius: '2px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#f59e0b' : '#22c55e', borderRadius: '2px' }} />
                    </div>
                  </div>

                  {/* Fechas */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: C.text, fontFamily: 'Poppins', fontWeight: 500 }}>
                      {g.fecha_inicio ? new Date(g.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>Inicio</div>
                    <div style={{ fontSize: '0.8rem', color: C.text, fontFamily: 'Poppins', fontWeight: 500, marginTop: '4px' }}>
                      {g.fecha_fin ? new Date(g.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>Fin</div>
                  </div>

                  {/* Modalidad */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: C.text, fontFamily: 'Poppins', fontWeight: 500, textTransform: 'capitalize' }}>
                      {g.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.text2, fontFamily: 'Poppins' }}>Modalidad</div>
                  </div>

                  {/* Accesos rápidos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => navigate(`/app/asistencia/${g.id}`)}
                      style={{ padding: '4px 10px', borderRadius: '5px', background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, fontFamily: 'Poppins', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                      📋 Pasar lista
                    </button>
                    <button onClick={() => navigate(`/app/evaluaciones?grupo=${g.id}`)}
                      style={{ padding: '4px 10px', borderRadius: '5px', background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, fontFamily: 'Poppins', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                      📊 Evaluaciones
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
