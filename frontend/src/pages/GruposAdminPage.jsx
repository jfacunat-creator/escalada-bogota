/**
 * GruposAdminPage.jsx
 * Gestión de cohortes: listar, filtrar, crear, cambiar estado, navegar al detalle.
 * Consume:
 *   GET    /api/cohortes
 *   POST   /api/cohortes
 *   PATCH  /api/cohortes/:id/estado
 *   GET    /api/catalogos/programas
 *   GET    /api/catalogos/ciclos
 *   GET    /api/catalogos/muros
 *   GET    /api/entrenadores
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, ChevronRight, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { IconoCohorte, IconoCronometro, IconoMuro, IconoEscalador, IconoCuerda } from '../components/Icons';

const C = { bg: '#121212', surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', accent2: '#9E721D', sidebar: '#4A2F0F', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };

const ESTADO_COLOR = {
  abierta:    { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', label: 'Abierta' },
  cerrada:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Cerrada' },
  en_curso:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'En curso' },
  finalizada: { bg: 'rgba(100,100,100,0.1)', color: '#666',    label: 'Finalizada' },
};

const HORARIOS = [
  { value: 'lun_mie_18_20', label: 'Lun y Mié · 18:00–20:00' },
  { value: 'lun_mie_20_22', label: 'Lun y Mié · 20:00–22:00' },
  { value: 'mar_jue_18_20', label: 'Mar y Jue · 18:00–20:00' },
  { value: 'mar_jue_20_22', label: 'Mar y Jue · 20:00–22:00' },
  { value: 'sab_dom_7_9',   label: 'Sáb y Dom · 7:00–9:00' },
  { value: 'sab_dom_9_11',  label: 'Sáb y Dom · 9:00–11:00' },
  { value: 'sab_dom_11_13', label: 'Sáb y Dom · 11:00–13:00' },
];

const horarioLabel = Object.fromEntries(HORARIOS.map(h => [h.value, h.label]));

function formatFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function Badge({ label, bg, color }) {
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
      background: bg, color, fontFamily: 'Poppins', textTransform: 'capitalize',
    }}>
      {label}
    </span>
  );
}

function SelectField({ label, value, onChange, children, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <select value={value} onChange={onChange} className="input-dark" style={{ width: '100%' }}>
        {children}
      </select>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, required, placeholder, min, max }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
        className="input-dark" style={{ width: '100%' }} />
    </div>
  );
}

// ─── Tarjeta de cohorte ───────────────────────────────────────────────────────

function CohorteRow({ cohorte, onEstado, onDetalle }) {
  const est = ESTADO_COLOR[cohorte.estado] || ESTADO_COLOR.abierta;
  const [menuOpen, setMenuOpen] = useState(false);

  const estados = ['abierta', 'cerrada', 'en_curso', 'finalizada'].filter(e => e !== cohorte.estado);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: C.text, marginBottom: '4px' }}>
            {cohorte.programa_nombre}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Badge label={est.label} bg={est.bg} color={est.color} />
            <Badge label={cohorte.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'} bg="rgba(212,175,55,0.1)" color={C.accent} />
            <Badge label={cohorte.nivel} bg="rgba(158,114,29,0.1)" color={C.accent2} />
          </div>
        </div>
        <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: C.accent }}>
          {cohorte.inscritos_actual}/{cohorte.cupo_maximo}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: C.text2, fontFamily: 'Poppins' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoCronometro style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          {horarioLabel[cohorte.horario] || cohorte.horario}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoMuro style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          {cohorte.muro_nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconoCuerda style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          {cohorte.entrenador_nombre}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onDetalle(cohorte.id)} style={{
          flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${C.border}`,
          background: 'transparent', color: C.text2, cursor: 'pointer', fontFamily: 'Poppins',
          fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        }}>
          Ver detalle <ChevronRight size={14} />
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: C.sidebar, color: C.accent, fontFamily: 'Poppins', fontSize: '0.82rem', fontWeight: 600,
          }}>
            Estado ▾
          </button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{
                position: 'absolute', right: 0, top: '110%', background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '140px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                {estados.map(e => {
                  const ec = ESTADO_COLOR[e];
                  return (
                    <button key={e} onClick={() => { onEstado(cohorte.id, e); setMenuOpen(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        color: ec.color, fontFamily: 'Poppins', fontSize: '0.82rem', fontWeight: 500,
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.background = ec.bg}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      → {ec.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal crear cohorte ──────────────────────────────────────────────────────

function ModalCrearCohorte({ open, onClose, onCreada, programas, ciclos, entrenadores, muros }) {
  const [form, setForm] = useState({
    programaId: '', cicloId: '', entrenadorId: '', muroId: '',
    modalidad: 'acompanado', horario: '', cupoMaximo: 8,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.programaId || !form.cicloId || !form.entrenadorId || !form.muroId || !form.horario) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.crearCohorte(form);
      onCreada();
      onClose();
      setForm({ programaId: '', cicloId: '', entrenadorId: '', muroId: '', modalidad: 'acompanado', horario: '', cupoMaximo: 8 });
    } catch (err) {
      setError(err?.error || err?.errors?.[0]?.msg || 'Error al crear la cohorte.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Filtrar programas adultos (los de menores se gestionarán en fase 2)
  const progsAdulto = programas.filter(p => p.poblacion === 'adulto');
  const progSeleccionado = programas.find(p => p.id === form.programaId);
  const esMenu = progSeleccionado?.poblacion === 'menor';

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px',
        padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: C.text }}>Crear nueva cohorte</div>
            <div style={{ fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins' }}>Asigna programa, ciclo, entrenador y horario</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SelectField label="Programa" value={form.programaId} onChange={e => set('programaId', e.target.value)} required>
            <option value="">Seleccionar programa...</option>
            {progsAdulto.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.nivel}</option>)}
          </SelectField>

          <SelectField label="Ciclo" value={form.cicloId} onChange={e => set('cicloId', e.target.value)} required>
            <option value="">Seleccionar ciclo...</option>
            {ciclos.map(c => <option key={c.id} value={c.id}>{c.codigo} · {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)}</option>)}
          </SelectField>

          <SelectField label="Entrenador" value={form.entrenadorId} onChange={e => set('entrenadorId', e.target.value)} required>
            <option value="">Seleccionar entrenador...</option>
            {entrenadores.map(e => <option key={e.id} value={e.id}>{e.nombre} · Lic. {e.licencia_ley181 || '—'}</option>)}
          </SelectField>

          <SelectField label="Muro aliado" value={form.muroId} onChange={e => set('muroId', e.target.value)} required>
            <option value="">Seleccionar muro...</option>
            {muros.map(m => <option key={m.id} value={m.id}>{m.nombre} · {m.zonas_disponibles} zonas</option>)}
          </SelectField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SelectField label="Modalidad" value={form.modalidad} onChange={e => set('modalidad', e.target.value)} required>
              <option value="acompanado">Acompañado</option>
              <option value="autonomo">Autónomo</option>
            </SelectField>

            <InputField label="Cupo máximo" type="number" value={form.cupoMaximo}
              onChange={e => set('cupoMaximo', parseInt(e.target.value) || 4)}
              min={4} max={esMenu ? 6 : 12} required />
          </div>

          <SelectField label="Horario" value={form.horario} onChange={e => set('horario', e.target.value)} required>
            <option value="">Seleccionar horario...</option>
            {HORARIOS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </SelectField>
        </div>

        {error && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '16px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
            padding: '10px 12px', fontSize: '0.82rem', color: '#fca5a5', fontFamily: 'Poppins',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: '11px', borderRadius: '8px', background: 'transparent',
            color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.85rem',
          }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 2, padding: '11px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#3a3a2a' : C.accent, color: '#121212', fontFamily: 'Poppins',
            fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : 'Crear cohorte'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────

export default function GruposAdminPage() {
  const navigate = useNavigate();
  const [cohortes, setCohortes] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [entrenadores, setEntrenadores] = useState([]);
  const [muros, setMuros] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [showCrear, setShowCrear] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [coh, progs, cics, ents, murs] = await Promise.all([
        api.getCohortes({ estado: filtroEstado || undefined, cicloId: filtroCiclo || undefined }),
        api.getProgramas(),
        api.getCiclos(),
        api.getEntrenadores(),
        api.getMuros(),
      ]);
      setCohortes(coh);
      setProgramas(progs);
      setCiclos(cics);
      setEntrenadores(ents);
      setMuros(murs);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [filtroEstado, filtroCiclo]);

  const handleEstado = async (id, estado) => {
    try {
      await api.cambiarEstadoCohorte(id, estado);
      await cargarDatos();
    } catch (err) {
      alert(err?.error || 'Error al cambiar estado');
    }
  };

  // Stats
  const totalInscritos = cohortes.reduce((s, c) => s + (c.inscritos_actual || 0), 0);
  const abiertas = cohortes.filter(c => c.estado === 'abierta').length;
  const enCurso = cohortes.filter(c => c.estado === 'en_curso').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text, marginBottom: '4px' }}>Gestión de Grupos</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
            {cohortes.length} cohortes · {totalInscritos} inscritos · {abiertas} abiertas · {enCurso} en curso
          </p>
        </div>
        <button onClick={() => setShowCrear(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
          borderRadius: '8px', border: 'none', background: C.accent, color: '#121212',
          fontFamily: 'Antonio, sans-serif', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={18} /> Nueva cohorte
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="input-dark" style={{ width: 'auto', minWidth: '160px' }}>
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="cerrada">Cerrada</option>
          <option value="en_curso">En curso</option>
          <option value="finalizada">Finalizada</option>
        </select>

        <select value={filtroCiclo} onChange={e => setFiltroCiclo(e.target.value)}
          className="input-dark" style={{ width: 'auto', minWidth: '160px' }}>
          <option value="">Todos los ciclos</option>
          {ciclos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />
        </div>
      ) : cohortes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <IconoCohorte style={{ width: '48px', height: '48px', color: '#2e2e2e', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: C.text2, marginBottom: '8px' }}>
            Sin cohortes{filtroEstado || filtroCiclo ? ' con esos filtros' : ''}
          </div>
          <p style={{ color: C.text3, fontSize: '0.85rem', fontFamily: 'Poppins', marginBottom: '16px' }}>
            Crea la primera cohorte para iniciar el ciclo.
          </p>
          <button onClick={() => setShowCrear(true)} style={{
            padding: '10px 20px', borderRadius: '8px', background: C.accent, color: '#121212',
            border: 'none', fontFamily: 'Antonio, sans-serif', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Crear cohorte
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '14px',
        }}>
          {cohortes.map(c => (
            <CohorteRow
              key={c.id}
              cohorte={c}
              onEstado={handleEstado}
              onDetalle={(id) => navigate(`/app/grupos/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal crear */}
      <ModalCrearCohorte
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onCreada={cargarDatos}
        programas={programas}
        ciclos={ciclos}
        entrenadores={entrenadores}
        muros={muros}
      />
    </div>
  );
}
