/**
 * EntrenadoresAdminPage.jsx — Dashboard completo de entrenadores.
 * Muestra grupos activos, escaladores asignados y métricas por entrenador.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Search, Plus, Trash2, Pencil, X } from 'lucide-react';
import { IconoEscalador, IconoMuro, IconoCronometro, IconoPresa } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }

export default function EntrenadoresAdminPage() {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const FORM_VACIO = { nombre: '', apellido: '', email: '', password: '', especialidad: '', maxGrupos: 4 };
  const [form, setForm] = useState(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => {
    setLoading(true);
    api.getEntrenadores()
      .then(setEntrenadores)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCrear = async () => {
    setSaving(true); setFormError(null);
    try {
      await api.crearEntrenador(form);
      setShowCrear(false);
      setForm(FORM_VACIO);
      load();
    } catch (err) {
      setFormError(err?.error || err?.errors?.[0]?.msg || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async () => {
    setSaving(true); setFormError(null);
    try {
      await api.updateEntrenador(editando.id, {
        nombre: form.nombre,
        apellido: form.apellido,
        especialidad: form.especialidad,
        maxGrupos: form.maxGrupos,
      });
      setEditando(null);
      setForm(FORM_VACIO);
      load();
    } catch (err) {
      setFormError(err?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteEntrenador(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert(err?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const filtrados = entrenadores.filter(e =>
    !buscar || `${e.nombre} ${e.email}`.toLowerCase().includes(buscar.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} />
    </div>
  );

  const totalGrupos = entrenadores.reduce((s, e) => s + parseInt(e.grupos_activos || 0), 0);
  const totalEscaladores = entrenadores.reduce((s, e) => s + parseInt(e.total_escaladores || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Entrenadores</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
            {entrenadores.length} entrenador{entrenadores.length !== 1 ? 'es' : ''} registrado{entrenadores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setForm(FORM_VACIO); setFormError(null); setShowCrear(true); }} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
          borderRadius: '8px', border: 'none', background: C.accent, color: '#121212',
          fontFamily: 'Antonio, sans-serif', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={17} /> Nuevo entrenador
        </button>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          [entrenadores.length, 'Entrenadores', C.accent, IconoEscalador],
          [totalGrupos, 'Grupos activos', '#22c55e', IconoMuro],
          [totalEscaladores, 'Escaladores asignados', '#60a5fa', IconoPresa],
        ].map(([v, l, color, Icon]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: color + '18', color, flexShrink: 0 }}>
              <Icon style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: C.text, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px' }}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', color: C.text2 }} />
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar entrenador..."
          className="input-dark" style={{ paddingLeft: '36px', width: '100%' }} />
      </div>

      {/* Cards de entrenadores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtrados.map(ent => {
          const grupos = ent.grupos || [];
          const isOpen = expanded === ent.id;
          const pct = ent.max_grupos > 0 ? Math.round((parseInt(ent.grupos_activos) / ent.max_grupos) * 100) : 0;

          return (
            <div key={ent.id} style={{ background: C.surface, border: `1px solid ${isOpen ? C.accent + '50' : C.border}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Fila principal */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : ent.id)}>
                {/* Avatar */}
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#3a2e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Antonio', fontSize: '1.1rem', color: C.accent, flexShrink: 0 }}>
                  {ent.nombre?.charAt(0)}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: '0.95rem', fontFamily: 'Poppins' }}>{ent.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>{ent.email} · {ent.licencia_ley181 || 'Sin licencia'}</div>
                </div>
                {/* Stats inline */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: parseInt(ent.grupos_activos) > 0 ? C.accent : C.text2 }}>
                      {ent.grupos_activos || 0}/{ent.max_grupos || '?'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>grupos</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Antonio', fontSize: '1.3rem', color: parseInt(ent.total_escaladores) > 0 ? '#22c55e' : C.text2 }}>
                      {ent.total_escaladores || 0}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>escaladores</div>
                  </div>
                  {/* Barra de carga */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ fontSize: '0.72rem', color: pct >= 80 ? '#f59e0b' : '#22c55e', fontFamily: 'Poppins', fontWeight: 600 }}>{pct}%</div>
                    <div style={{ width: '60px', height: '5px', background: '#252525', borderRadius: '3px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#f59e0b' : '#22c55e', borderRadius: '3px', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: C.text3, fontFamily: 'Poppins' }}>carga</div>
                  </div>
                  <div style={{ color: C.text3, fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</div>
                  <button onClick={ev => { ev.stopPropagation(); setEditando(ent); setForm({ nombre: ent.nombre || '', apellido: ent.apellido || '', email: ent.email || '', password: '', especialidad: ent.especialidad || '', maxGrupos: ent.max_grupos || 4 }); setFormError(null); }} title="Editar" style={{
                    background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', borderRadius: '6px', padding: '5px 7px', flexShrink: 0,
                  }}><Pencil size={13} /></button>
                  <button onClick={ev => { ev.stopPropagation(); setConfirmDelete(ent); }} title="Eliminar" style={{
                    background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', padding: '5px 7px', flexShrink: 0,
                  }}><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Detalle expandible: grupos */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px', fontFamily: 'Poppins' }}>
                    Grupos activos
                  </div>
                  {grupos.length === 0 ? (
                    <p style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem' }}>Sin grupos activos en este ciclo.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {grupos.map(g => (
                        <div key={g.id} style={{ background: '#242424', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{g.programa_nombre}</div>
                            <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins', marginTop: '2px' }}>
                              {g.ciclo_codigo} · {g.horario} · {g.muro_nombre}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.accent }}>{g.inscritos || 0}/{g.cupo_maximo}</div>
                              <div style={{ fontSize: '0.68rem', color: C.text2, fontFamily: 'Poppins' }}>inscritos</div>
                            </div>
                            <span style={{
                              padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins',
                              background: g.estado === 'en_curso' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                              color: g.estado === 'en_curso' ? '#f59e0b' : '#22c55e',
                            }}>{g.estado === 'en_curso' ? 'En curso' : 'Abierto'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: '#0a0a0a', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>
                    Fecha de ingreso: {ent.fecha_ingreso ? new Date(ent.fecha_ingreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtrados.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '48px', textAlign: 'center', color: C.text2, fontFamily: 'Poppins' }}>
            Sin resultados para "{buscar}"
          </div>
        )}
      </div>

      {/* Modal crear/editar entrenador */}
      {(showCrear || editando) && (() => {
        const isEditing = !!editando;
        return (
          <div onClick={() => { setShowCrear(false); setEditando(null); }} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px',
              padding: '28px', maxWidth: '460px', width: '100%',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: C.text }}>
                  {isEditing ? `Editar · ${editando.nombre}` : 'Nuevo entrenador'}
                </div>
                <button onClick={() => { setShowCrear(false); setEditando(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2 }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[['nombre', 'Nombre'], ['apellido', 'Apellido']].map(([k, label]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>{label} *</label>
                      <input value={form[k]} onChange={e => setF(k, e.target.value)} className="input-dark" style={{ width: '100%' }} />
                    </div>
                  ))}
                </div>
                {!isEditing && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>Email *</label>
                      <input value={form.email} onChange={e => setF('email', e.target.value)} type="email" className="input-dark" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>Contraseña *</label>
                      <input value={form.password} onChange={e => setF('password', e.target.value)} type="password" placeholder="mín. 6 caracteres" className="input-dark" style={{ width: '100%' }} />
                    </div>
                  </>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>Especialidad</label>
                  <input value={form.especialidad} onChange={e => setF('especialidad', e.target.value)} placeholder="Ej: Búlder, Deportiva..." className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' }}>Máximo de grupos</label>
                  <input value={form.maxGrupos} onChange={e => setF('maxGrupos', parseInt(e.target.value) || 1)} type="number" min={1} max={10} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              {formError && (
                <div style={{ marginTop: '12px', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'Poppins' }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => { setShowCrear(false); setEditando(null); }} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent',
                  color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Poppins',
                }}>Cancelar</button>
                <button onClick={isEditing ? handleEditar : handleCrear} disabled={saving} style={{
                  flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                  background: C.accent, color: '#121212', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700,
                }}>
                  {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear entrenador'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm delete entrenador */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.surface, border: '1px solid #ef444440', borderRadius: '14px',
            padding: '28px', maxWidth: '400px', width: '100%',
          }}>
            <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: '#ef4444', marginBottom: '8px' }}>Eliminar entrenador</div>
            <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.85rem', marginBottom: '16px' }}>
              Se eliminará a <strong style={{ color: C.text }}>{confirmDelete.nombre}</strong> junto con todos sus grupos, sesiones, inscripciones y pagos.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent',
                color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Poppins',
              }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700,
              }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
