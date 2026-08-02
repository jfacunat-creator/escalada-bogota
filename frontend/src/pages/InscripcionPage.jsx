/**
 * InscripcionPage.jsx
 * Catálogo de cohortes disponibles y auto-inscripción del escalador.
 * Consume:
 *   GET  /api/cohortes/disponibles   → catálogo con precio_mensual calculado en backend
 *   GET  /api/inscripciones?estado=activa
 *   POST /api/inscripciones/autoservicio
 */

import { useState, useEffect } from 'react';
import { Loader2, MapPin, Clock, Calendar, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const NIVEL_LABEL = {
  iniciacion: 'Iniciación',
  intermedio: 'Intermedio',
  avanzado:   'Avanzado',
};

const NIVEL_COLOR = {
  iniciacion: '#22c55e',
  intermedio: '#D4AF37',
  avanzado:   '#ef4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCOP(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);
}

function formatFecha(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px',
      background: bg || color + '20', color,
    }}>
      {label}
    </span>
  );
}

function InfoRow({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#A09A8C' }}>
      <Icon size={13} style={{ marginTop: '2px', flexShrink: 0, color: '#6b7280' }} />
      <span>{children}</span>
    </div>
  );
}

function CapacidadBar({ actual, max }) {
  const pct = Math.min((actual / max) * 100, 100);
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px' }}>
        <span style={{ color, fontWeight: 600 }}>{actual} / {max} inscritos</span>
        <span style={{ color: '#6b7280' }}>
          {max - actual > 0 ? `${max - actual} cupos libres` : 'Sin cupos'}
        </span>
      </div>
      <div style={{ height: '5px', background: '#2e2e2e', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ─── Tarjeta de cohorte ───────────────────────────────────────────────────────
function CohorteCard({ cohorte, onInscribirse, tieneInscripcionActiva }) {
  const {
    modalidad, horario, cupo_maximo, inscritos_actual, estado,
    programa_nombre, nivel, programa_descripcion, incluye_fisio, incluye_nutricion,
    ciclo_codigo, fecha_inicio, fecha_fin,
    muro_nombre, muro_direccion,
    entrenador_nombre, licencia_ley181,
    ya_inscrito, precio_mensual,
  } = cohorte;

  const lleno = estado !== 'abierta' || inscritos_actual >= cupo_maximo;
  const nivelColor = NIVEL_COLOR[nivel] || '#D4AF37';
  const modalidadLabel = modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo';
  const modalidadColor = modalidad === 'acompanado' ? '#D4AF37' : '#60a5fa';

  const cardBg      = ya_inscrito ? '#0f1f10' : '#1c1c1c';
  const cardBorder  = ya_inscrito ? '1px solid #22c55e55' : '1px solid #2e2e2e';

  return (
    <div style={{
      background: cardBg, border: cardBorder, borderRadius: '12px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Encabezado */}
      <div style={{
        background: '#252525', borderBottom: '1px solid #2e2e2e',
        padding: '14px 18px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Badge label={NIVEL_LABEL[nivel] || nivel} color={nivelColor} />
        <Badge label={modalidadLabel} color={modalidadColor} />
        {ya_inscrito && <Badge label="✓ Inscrito" color="#22c55e" />}
        {lleno && !ya_inscrito && <Badge label="Sin cupos" color="#ef4444" />}
        <span style={{ marginLeft: 'auto', fontFamily: 'Antonio, sans-serif', fontSize: '0.8rem', color: '#6b7280' }}>
          {ciclo_codigo}
        </span>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.25rem', color: '#F0EDE8', marginBottom: '4px' }}>
            {programa_nombre}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#A09A8C', lineHeight: 1.6 }}>
            {programa_descripcion}
          </div>
          {(incluye_fisio || incluye_nutricion) && (
            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {incluye_fisio     && <Badge label="Fisio incluida"     color="#a78bfa" />}
              {incluye_nutricion && <Badge label="Nutrición incluida" color="#34d399" />}
            </div>
          )}
        </div>

        {/* Entrenador */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#252525', borderRadius: '8px', padding: '10px 12px',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: '#4A2F0F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: '#D4AF37', flexShrink: 0,
          }}>
            {entrenador_nombre?.split(' ').map(w => w[0]).slice(0,2).join('')}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8' }}>{entrenador_nombre}</div>
            {licencia_ley181 && (
              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Lic. Ley 181 · {licencia_ley181}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <InfoRow icon={Clock}>{horario}</InfoRow>
          <InfoRow icon={MapPin}>{muro_nombre}{muro_direccion ? ` · ${muro_direccion}` : ''}</InfoRow>
          <InfoRow icon={Calendar}>{formatFecha(fecha_inicio)} → {formatFecha(fecha_fin)}</InfoRow>
        </div>

        <CapacidadBar actual={inscritos_actual} max={cupo_maximo} />

        {/* Precio — viene del backend, no de un mapa local */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Precio mensual</span>
          <span style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.4rem', color: '#D4AF37' }}>
            {formatCOP(precio_mensual)}
          </span>
        </div>

        {/* CTA */}
        {ya_inscrito ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '8px', background: '#22c55e15',
            border: '1px solid #22c55e33', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600,
          }}>
            <CheckCircle2 size={15} /> Ya estás inscrito en este grupo
          </div>
        ) : lleno ? (
          <button disabled style={{
            padding: '11px', borderRadius: '8px', background: '#1a1a1a',
            color: '#4b5563', border: '1px solid #2e2e2e',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'not-allowed', width: '100%',
          }}>
            Grupo completo
          </button>
        ) : tieneInscripcionActiva ? (
          <div style={{
            padding: '10px', borderRadius: '8px', background: '#2e2e2e',
            color: '#A09A8C', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.5,
          }}>
            Cancela o completa tu ciclo actual para inscribirte aquí
          </div>
        ) : (
          <button
            onClick={() => onInscribirse(cohorte)}
            style={{
              padding: '12px', borderRadius: '8px', background: '#D4AF37',
              color: '#121212', border: 'none', fontSize: '0.9rem', fontWeight: 700,
              cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Inscribirme <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal de confirmación ────────────────────────────────────────────────────
function ModalConfirmacion({ cohorte, onConfirmar, onCerrar, loading, error, confirmado }) {
  if (!cohorte) return null;

  const filas = [
    ['Programa',    cohorte.programa_nombre],
    ['Nivel',       NIVEL_LABEL[cohorte.nivel] || cohorte.nivel],
    ['Ciclo',       cohorte.ciclo_codigo],
    ['Entrenador',  cohorte.entrenador_nombre],
    ['Muro',        cohorte.muro_nombre],
    ['Horario',     cohorte.horario],
    ['Inicio',      formatFecha(cohorte.fecha_inicio)],
    ['Fin',         formatFecha(cohorte.fecha_fin)],
    ['Mensualidad', formatCOP(cohorte.precio_mensual)],
    ['Ciclo completo (3 meses)', formatCOP(cohorte.precio_ciclo)],
  ];

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px',
      }}
    >
      <div style={{
        background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: '14px',
        padding: '28px', maxWidth: '460px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {confirmado ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={52} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: '#F0EDE8', marginBottom: '8px' }}>
              ¡Inscripción confirmada!
            </div>
            <div style={{ fontSize: '0.85rem', color: '#A09A8C', lineHeight: 1.7, marginBottom: '24px' }}>
              Tu primer pago está pendiente. Recibirás comunicación del equipo
              con las instrucciones del ciclo.
              <br /><br />
              El ciclo inicia el <strong style={{ color: '#D4AF37' }}>{formatFecha(cohorte.fecha_inicio)}</strong>.
            </div>
            <button
              onClick={onCerrar}
              style={{
                padding: '11px 28px', borderRadius: '8px', background: '#D4AF37',
                color: '#121212', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Ver mi inscripción
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#F0EDE8', marginBottom: '4px' }}>
              Confirmar inscripción
            </div>
            <div style={{ fontSize: '0.8rem', color: '#A09A8C', marginBottom: '20px' }}>
              Revisa los detalles antes de confirmar
            </div>

            <div style={{ background: '#252525', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
              {filas.map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px',
                  fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid #2e2e2e',
                }}>
                  <span style={{ color: '#A09A8C', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: '#F0EDE8', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{
              fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.7,
              background: '#252525', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px',
            }}>
              Al confirmar acepto el <span style={{ color: '#D4AF37' }}>consentimiento informado</span>,
              la <span style={{ color: '#D4AF37' }}>política de tratamiento de datos personales</span> (Ley 1581/2012)
              y las condiciones del ciclo trimestral. La renovación se ofrece en semana de empalme (S12).
            </div>

            {error && (
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                background: '#ef444415', border: '1px solid #ef444433', borderRadius: '8px',
                padding: '10px 12px', marginBottom: '16px', fontSize: '0.82rem', color: '#fca5a5',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onCerrar}
                disabled={loading}
                style={{
                  flex: 1, padding: '11px', borderRadius: '8px',
                  background: 'transparent', color: '#A09A8C',
                  border: '1px solid #2e2e2e', fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmar}
                disabled={loading}
                style={{
                  flex: 2, padding: '11px', borderRadius: '8px',
                  background: loading ? '#3a3a2a' : '#D4AF37',
                  color: '#121212', border: 'none', fontSize: '0.9rem',
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Procesando...</> : 'Confirmar inscripción →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta de inscripción activa ───────────────────────────────────────────
function InscripcionActivaCard({ inscripcion }) {
  return (
    <div style={{
      background: '#0f1f10', border: '1px solid #22c55e44',
      borderRadius: '12px', overflow: 'hidden', marginBottom: '32px',
    }}>
      <div style={{ background: '#1a3a1a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
        <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Mi inscripción activa
        </span>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#F0EDE8', marginBottom: '4px' }}>
            {inscripcion.programa || 'Mi grupo'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#A09A8C', marginBottom: '12px' }}>
            {inscripcion.ciclo || ''} ·{' '}
            {inscripcion.modalidad === 'acompanado' ? 'Plan Acompañado' : 'Plan Autónomo'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {inscripcion.muro && <InfoRow icon={MapPin}>{inscripcion.muro}</InfoRow>}
            {inscripcion.horario && <InfoRow icon={Clock}>{inscripcion.horario}</InfoRow>}
            {inscripcion.entrenador_nombre && <InfoRow icon={Clock}>Entrenador: {inscripcion.entrenador_nombre}</InfoRow>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Estado del pago
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: parseInt(inscripcion.pagos_pendientes) > 0 ? '#f59e0b' : '#22c55e' }}>
            {parseInt(inscripcion.pagos_pendientes) > 0 ? 'Pago pendiente' : 'Al día'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function InscripcionPage() {
  const [cohortes, setCohortes]           = useState([]);
  const [inscActiva, setInscActiva]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const [filtroModalidad, setFiltroModalidad] = useState('todos');
  const [filtroNivel, setFiltroNivel]         = useState('todos');

  const [cohorteSeleccionada, setCohorteSeleccionada] = useState(null);
  const [modalLoading, setModalLoading]               = useState(false);
  const [modalError, setModalError]                   = useState(null);
  const [confirmado, setConfirmado]                   = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cohortesData, inscData] = await Promise.all([
        api.getCohortesDisponibles(),
        api.getInscripciones({ estado: 'activa' }),
      ]);
      setCohortes(cohortesData);
      setInscActiva(inscData?.[0] || null);
    } catch {
      setError('No se pudieron cargar las cohortes disponibles. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const cohortesFiltradas = cohortes.filter(c => {
    if (filtroModalidad !== 'todos' && c.modalidad !== filtroModalidad) return false;
    if (filtroNivel !== 'todos' && c.nivel !== filtroNivel) return false;
    return true;
  });

  const handleInscribirse = (cohorte) => {
    setCohorteSeleccionada(cohorte);
    setModalError(null);
    setConfirmado(false);
  };

  const handleConfirmar = async () => {
    if (!cohorteSeleccionada) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.autoInscribirse(cohorteSeleccionada.id);
      setConfirmado(true);
      // Recargar para reflejar cambios
      const [cohortesData, inscData] = await Promise.all([
        api.getCohortesDisponibles(),
        api.getInscripciones({ estado: 'activa' }),
      ]);
      setCohortes(cohortesData);
      setInscActiva(inscData?.[0] || null);
    } catch (err) {
      setModalError(err?.error || 'Ocurrió un error al procesar la inscripción.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCerrarModal = () => {
    setCohorteSeleccionada(null);
    setModalError(null);
    if (confirmado) setConfirmado(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
        <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#D4AF37' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '16px' }}>
        <AlertCircle size={40} style={{ color: '#ef4444' }} />
        <p style={{ color: '#A09A8C', fontSize: '0.9rem' }}>{error}</p>
        <button
          onClick={cargarDatos}
          style={{
            padding: '9px 20px', borderRadius: '8px', background: '#D4AF37',
            color: '#121212', border: 'none', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {inscActiva && <InscripcionActivaCard inscripcion={inscActiva} />}

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.7rem', color: '#A09A8C', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>
          Grupos disponibles
        </div>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: '#F0EDE8', marginBottom: '4px' }}>
          Inscríbete en el próximo ciclo
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#A09A8C' }}>
          {cohortes.filter(c => c.cupos_disponibles > 0).length} cohortes con cupos disponibles
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#1c1c1c', borderRadius: '8px', padding: '3px', border: '1px solid #2e2e2e' }}>
          {[['todos', 'Todos los niveles'], ['iniciacion', 'Iniciación'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFiltroNivel(val)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                background: filtroNivel === val ? '#D4AF37' : 'transparent',
                color: filtroNivel === val ? '#121212' : '#A09A8C',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#1c1c1c', borderRadius: '8px', padding: '3px', border: '1px solid #2e2e2e' }}>
          {[['todos', 'Todos'], ['acompanado', 'Acompañado'], ['autonomo', 'Autónomo']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFiltroModalidad(val)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                background: filtroModalidad === val ? '#4A2F0F' : 'transparent',
                color: filtroModalidad === val ? '#D4AF37' : '#A09A8C',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {cohortesFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '0.9rem' }}>
          No hay cohortes disponibles con ese filtro.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {cohortesFiltradas.map(c => (
            <CohorteCard
              key={c.id}
              cohorte={c}
              onInscribirse={handleInscribirse}
              tieneInscripcionActiva={!!inscActiva && !c.ya_inscrito}
            />
          ))}
        </div>
      )}

      <ModalConfirmacion
        cohorte={cohorteSeleccionada}
        onConfirmar={handleConfirmar}
        onCerrar={handleCerrarModal}
        loading={modalLoading}
        error={modalError}
        confirmado={confirmado}
      />
    </div>
  );
}
