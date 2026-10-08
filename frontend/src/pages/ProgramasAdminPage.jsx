/**
 * ProgramasAdminPage.jsx — Programas: plan anual real (4 mesociclos T1–T4 de plan_contenido),
 * grupos del programa y contenido (videos / documentos) que ven los escaladores.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronDown, ChevronRight, Pencil, Plus, Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { C, NIVEL, MODALIDAD, fmtFecha, Btn, Modal, Field, Input, Select, Aviso, Badge, Confirmar } from '../components/ui';

const NIVEL_COLOR = { iniciacion: '#22c55e', intermedio: '#D4AF37', avanzado: '#ef4444' };
const ESTADO_GRUPO = { abierta: ['Abierta', C.ok], en_curso: ['En curso', C.warn], cerrada: ['Cerrada', C.danger], finalizada: ['Finalizada', C.text3] };
const TIPO_CONTENIDO = {
  plan_entrenamiento: 'Plan de entrenamiento', video_tecnica: 'Video técnica', video_sesion: 'Video sesión',
  documento_apoyo: 'Documento de apoyo', nutricion: 'Nutrición', fisioterapia: 'Fisioterapia',
};
const TRIMESTRES = ['T1', 'T2', 'T3', 'T4'];

function Tarjeta({ titulo, color = C.accent, accion, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Poppins' }}>{titulo}</span>
        {accion}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

// ── Plan anual: 4 mesociclos de 13 semanas ────────────────
function PlanAnual({ nivel }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [tri, setTri] = useState('T1');
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    setPlan(null); setError(null); setAbierta(null); setTri('T1');
    api.getPlanContenido(nivel).then(setPlan).catch(e => setError(e.error));
  }, [nivel]);

  if (error) return <Aviso>{error}</Aviso>;
  if (!plan) return <div style={{ padding: '20px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: C.accent, margin: '0 auto' }} /></div>;

  const disponibles = plan.trimestres.map(t => t.trimestre);
  const semanas = plan.trimestres.find(t => t.trimestre === tri)?.semanas || [];
  const totalSesiones = semanas.reduce((n, w) => n + (w.sesiones?.length || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {TRIMESTRES.map(t => (
          <button key={t} disabled={!disponibles.includes(t)} onClick={() => { setTri(t); setAbierta(null); }} style={{
            padding: '6px 16px', borderRadius: '20px', border: '1px solid', cursor: disponibles.includes(t) ? 'pointer' : 'not-allowed',
            fontFamily: 'Antonio', fontSize: '0.95rem', letterSpacing: '0.04em',
            background: tri === t ? C.accent : 'transparent', color: tri === t ? '#121212' : (disponibles.includes(t) ? C.text2 : C.text3),
            borderColor: tri === t ? C.accent : C.border,
          }}>Mesociclo {t}</button>
        ))}
        <span style={{ fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins', marginLeft: 'auto' }}>
          {semanas.length} semanas · {totalSesiones} sesiones
        </span>
      </div>

      {semanas.map((w, i) => {
        const open = abierta === i;
        return (
          <div key={w.id || i} style={{ borderTop: i ? '1px solid #242424' : 'none' }}>
            <button onClick={() => setAbierta(open ? null : i)} style={{ width: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 4px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontFamily: 'Antonio', fontSize: '1rem', color: C.accent, width: '34px', flexShrink: 0 }}>{w.id}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'Poppins', fontSize: '0.84rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {w.n ? <strong>{w.n} · </strong> : null}{(w.sesiones || []).map(s => s.name).join(' · ')}
              </span>
              {w.pse && <span style={{ fontSize: '0.7rem', color: C.text2, fontFamily: 'Poppins', flexShrink: 0 }}>PSE {w.pse}</span>}
              <span style={{ fontSize: '0.7rem', color: C.info, fontFamily: 'Poppins', flexShrink: 0 }}>{w.sesiones?.length || 0} ses.</span>
              {open ? <ChevronDown size={15} color={C.text3} /> : <ChevronRight size={15} color={C.text3} />}
            </button>
            {open && (
              <div style={{ padding: '4px 4px 14px 46px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {w.note && <div style={{ fontSize: '0.78rem', color: C.text2, fontStyle: 'italic', fontFamily: 'Poppins' }}>{w.note}</div>}
                {(w.sesiones || []).map(s => (
                  <div key={s.num} style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: '10px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>
                      Sesión {s.num} · {s.name}
                      <span style={{ fontWeight: 400, fontSize: '0.72rem', color: C.text3, marginLeft: '8px' }}>
                        {s.type}{s.pse ? ` · PSE ${s.pse}` : ''}{s.cal ? ` · ${s.cal}′ calentamiento` : ''}
                      </span>
                    </div>
                    {s.warn && <div style={{ fontSize: '0.75rem', color: C.warn, fontFamily: 'Poppins' }}>{s.warn}</div>}
                    {(s.blocks || []).map((b, bi) => (
                      <div key={bi} style={{ marginTop: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600, fontFamily: 'Poppins' }}>{b.n}</div>
                        {(b.params || []).map(([k, v], pi) => (
                          <div key={pi} style={{ fontSize: '0.76rem', color: C.text2, fontFamily: 'Poppins', paddingLeft: '8px', lineHeight: 1.55 }}>
                            {k ? <span style={{ color: C.text }}>{k}: </span> : null}{v}
                          </div>
                        ))}
                      </div>
                    ))}
                    {s.note && <div style={{ fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins', marginTop: '4px' }}>{s.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Contenido del programa (lo que ve el escalador en "Contenido") ──
function ContenidoPrograma({ programa, ciclos }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getContenido({ programaId: programa.id, incluirOcultos: '1' }).then(setItems).catch(e => setError(e.error)).finally(() => setLoading(false));
  }, [programa.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setError(null);
    try {
      await api.crearContenido({ ...nuevo, programaId: programa.id });
      setNuevo(null); cargar();
    } catch (e) { setError(e.error); }
  };
  const toggle = async (c) => {
    setError(null);
    try { await api.setContenidoVisible(c.id, !c.visible); cargar(); } catch (e) { setError(e.error); }
  };

  return (
    <Tarjeta titulo="Contenido para los escaladores" color={C.info}
      accion={<Btn small variant="dark" onClick={() => setNuevo({ cicloId: ciclos[0]?.id || '', mes: '', tipo: 'video_tecnica', titulo: '', archivoUrl: '', descripcion: '' })}><Plus size={13} /> Agregar</Btn>}>
      <Aviso onClose={() => setError(null)}>{error}</Aviso>
      {loading ? <Loader2 className="animate-spin" style={{ color: C.accent }} />
        : items.length === 0 ? <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.84rem' }}>Sin contenido. Lo que agregues aquí aparece en “Contenido” para los escaladores inscritos en este programa que tengan pagado el mes en curso del ciclo elegido.</div>
        : items.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #242424', opacity: c.visible ? 1 : 0.5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', color: C.text, fontFamily: 'Poppins', fontWeight: 600 }}>{c.titulo}</div>
              <div style={{ fontSize: '0.72rem', color: C.text3, fontFamily: 'Poppins' }}>{TIPO_CONTENIDO[c.tipo]} · {c.ciclo_codigo} · {c.mes ? `solo mes ${c.mes}` : 'todo el ciclo'}{c.visible ? '' : ' · oculto'}</div>
            </div>
            <a href={c.archivo_url} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ color: C.text2, display: 'flex' }}><ExternalLink size={15} /></a>
            <Btn small variant="secondary" title={c.visible ? 'Ocultar a los escaladores' : 'Mostrar'} onClick={() => toggle(c)}>{c.visible ? <EyeOff size={13} /> : <Eye size={13} />}</Btn>
            <Btn small variant="danger" title="Eliminar" onClick={() => setBorrar(c)}><Trash2 size={13} /></Btn>
          </div>
        ))}
      {nuevo && (
        <Modal title="Agregar contenido" onClose={() => setNuevo(null)} footer={<>
          <Btn variant="secondary" onClick={() => setNuevo(null)}>Cancelar</Btn>
          <Btn onClick={guardar} disabled={!nuevo.cicloId || !nuevo.titulo.trim() || !nuevo.archivoUrl.trim()}>Guardar</Btn>
        </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Ciclo" required>
              <Select value={nuevo.cicloId} onChange={e => setNuevo(n => ({ ...n, cicloId: e.target.value }))}>
                {ciclos.length === 0 && <option value="">No hay ciclos: créalos en Configuración</option>}
                {ciclos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
              </Select>
            </Field>
            <Field label="Visible en" hint="El escalador solo ve el material del mes en curso, y solo si lo tiene pagado. Para planes y documentos de un mes, elige ese mes.">
              <Select value={nuevo.mes} onChange={e => setNuevo(n => ({ ...n, mes: e.target.value }))}>
                <option value="">Todo el ciclo (mientras tenga el mes en curso pagado)</option>
                {[1, 2, 3].map(m => <option key={m} value={m}>Solo el mes {m} ({['S0–S4', 'S5–S8', 'S9–S12'][m - 1]})</option>)}
              </Select>
            </Field>
            <Field label="Tipo" required>
              <Select value={nuevo.tipo} onChange={e => setNuevo(n => ({ ...n, tipo: e.target.value }))}>
                {Object.entries(TIPO_CONTENIDO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Título" required><Input value={nuevo.titulo} onChange={e => setNuevo(n => ({ ...n, titulo: e.target.value }))} /></Field>
            <Field label="Enlace (URL)" required hint="YouTube, Google Drive, PDF público…"><Input type="url" placeholder="https://…" value={nuevo.archivoUrl} onChange={e => setNuevo(n => ({ ...n, archivoUrl: e.target.value }))} /></Field>
            <Field label="Descripción"><Input value={nuevo.descripcion} onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))} /></Field>
          </div>
          <Aviso>{error}</Aviso>
        </Modal>
      )}
      {borrar && (
        <Confirmar peligro titulo="Eliminar contenido" textoBoton="Eliminar" onClose={() => setBorrar(null)}
          mensaje={<>Se eliminará “{borrar.titulo}” y el progreso de los escaladores sobre él. Si solo quieres quitarlo de la vista, usa ocultar.</>}
          onConfirm={async () => { await api.deleteContenido(borrar.id); cargar(); }} />
      )}
    </Tarjeta>
  );
}

function ModalEditarPrograma({ programa, onClose, onGuardado }) {
  const [form, setForm] = useState({ nombre: programa.nombre, descripcion: programa.descripcion || '', incluyeFisio: programa.incluye_fisio, incluyeNutricion: programa.incluye_nutricion });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardar = async () => {
    setGuardando(true); setError(null);
    try { onGuardado(await api.updatePrograma(programa.id, form)); onClose(); }
    catch (e) { setError(e.error); } finally { setGuardando(false); }
  };
  return (
    <Modal title={`Editar · ${programa.nombre}`} onClose={onClose} footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Btn>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Field label="Nombre" required><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
        <Field label="Descripción">
          <textarea className="input-dark" rows={4} style={{ width: '100%', resize: 'vertical' }} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
        </Field>
        {[['incluyeFisio', 'Incluye fisioterapia'], ['incluyeNutricion', 'Incluye nutrición']].map(([k, l]) => (
          <label key={k} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'Poppins', fontSize: '0.85rem', color: C.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} /> {l}
          </label>
        ))}
      </div>
      <Aviso>{error}</Aviso>
    </Modal>
  );
}

export default function ProgramasAdminPage() {
  const navigate = useNavigate();
  const [programas, setProgramas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getProgramas(), api.getGrupos(), api.getCiclos()])
      .then(([p, g, c]) => { setProgramas(p); setGrupos(g); setCiclos(c); setSelected(s => s || p[0]?.id || null); })
      .catch(e => setError(e.error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} /></div>;

  const lista = programas.filter(p => !filtro || p.nivel === filtro);
  const prog = programas.find(p => p.id === selected);
  const gruposProg = grupos.filter(g => g.programa_id === selected);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Programas</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Plan anual de 4 mesociclos (T1–T4) por nivel, grupos y contenido</p>
      </div>
      <Aviso>{error}</Aviso>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }} className="prog-layout">
        <style>{`@media(max-width:900px){.prog-layout{grid-template-columns:1fr!important}}`}</style>

        <div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['iniciacion', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontFamily: 'Poppins', fontSize: '0.78rem', background: filtro === v ? C.accent : 'transparent', color: filtro === v ? '#121212' : C.text2, borderColor: filtro === v ? C.accent : C.border }}>{l}</button>
            ))}
          </div>
          {lista.map(p => {
            const n = grupos.filter(g => g.programa_id === p.id && ['abierta', 'en_curso'].includes(g.estado)).length;
            return (
              <button key={p.id} onClick={() => setSelected(p.id)} style={{ width: '100%', textAlign: 'left', background: selected === p.id ? '#3a2e0a' : C.surface, border: `1px solid ${selected === p.id ? C.accent + '60' : C.border}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NIVEL_COLOR[p.nivel], flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: C.text, fontFamily: 'Poppins' }}>{p.nombre}</span>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: C.text2, fontFamily: 'Poppins' }}>{NIVEL[p.nivel]} · {p.poblacion === 'adulto' ? 'Adultos' : 'Menores'}</span>
                </span>
                {n > 0 && <Badge color={C.ok}>{n} activo{n !== 1 ? 's' : ''}</Badge>}
              </button>
            );
          })}
        </div>

        {prog && (
          <div style={{ minWidth: 0 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: NIVEL_COLOR[prog.nivel], fontWeight: 700, fontFamily: 'Poppins', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{NIVEL[prog.nivel]} · {prog.poblacion === 'adulto' ? 'Adultos' : 'Menores'}</div>
                  <h2 style={{ fontFamily: 'Antonio', fontSize: '1.6rem', color: C.text }}>{prog.nombre}</h2>
                </div>
                <Btn small variant="secondary" onClick={() => setEditando(true)}><Pencil size={13} /> Editar</Btn>
              </div>
              <p style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.86rem', lineHeight: 1.7, margin: '8px 0 10px' }}>{prog.descripcion || 'Sin descripción.'}</p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', fontFamily: 'Poppins', color: C.text2 }}>
                <span>4 mesociclos × {prog.duracion_semanas || 13} semanas</span>
                {prog.incluye_fisio && <span style={{ color: C.ok }}>✓ Fisio incluida</span>}
                {prog.incluye_nutricion && <span style={{ color: C.ok }}>✓ Nutrición incluida</span>}
              </div>
            </div>

            <Tarjeta titulo={`Grupos (${gruposProg.length})`} color={C.info}>
              {gruposProg.length === 0
                ? <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.84rem' }}>Este programa no tiene grupos. Créalos en Grupos.</div>
                : gruposProg.map(g => {
                  const [label, color] = ESTADO_GRUPO[g.estado] || [g.estado, C.text2];
                  return (
                    <button key={g.id} onClick={() => navigate(`/app/grupos/${g.id}`)} style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 0', background: 'transparent', border: 'none', borderBottom: '1px solid #242424', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ flex: 1, fontFamily: 'Poppins', fontSize: '0.85rem', color: C.text }}>
                        {g.ciclo_codigo} · {MODALIDAD[g.modalidad]} · {g.entrenador_nombre}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: C.text3 }}>{fmtFecha(g.fecha_inicio)} → {fmtFecha(g.fecha_fin)}{g.muro_nombre ? ` · ${g.muro_nombre}` : ''}</span>
                      </span>
                      <span style={{ fontFamily: 'Antonio', color: C.accent }}>{g.inscritos_actual}/{g.cupo_maximo}</span>
                      <Badge color={color}>{label}</Badge>
                      <ChevronRight size={14} color={C.text3} />
                    </button>
                  );
                })}
            </Tarjeta>

            <Tarjeta titulo="Plan anual · 4 mesociclos">
              <PlanAnual nivel={prog.nivel} />
            </Tarjeta>

            <ContenidoPrograma key={prog.id} programa={prog} ciclos={ciclos} />
          </div>
        )}
      </div>

      {editando && prog && (
        <ModalEditarPrograma programa={prog} onClose={() => setEditando(false)}
          onGuardado={(p) => setProgramas(ps => ps.map(x => (x.id === p.id ? p : x)))} />
      )}
    </div>
  );
}
