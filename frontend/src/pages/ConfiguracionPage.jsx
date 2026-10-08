/**
 * ConfiguracionPage.jsx — Datos maestros del admin: tarifas mensuales, ciclos, sedes y aliados de salud.
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import { C, fmtCOP, fmtFecha, Btn, Modal, Field, Input, Select, Aviso, Badge, Confirmar } from '../components/ui';

function Seccion({ titulo, descripcion, accion, children }) {
  return (
    <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '18px' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'Antonio', fontSize: '1.2rem', color: C.text }}>{titulo}</h2>
          {descripcion && <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>{descripcion}</div>}
        </div>
        {accion}
      </div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </section>
  );
}

const Fila = ({ children, apagada }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid #242424', opacity: apagada ? 0.55 : 1, flexWrap: 'wrap' }}>{children}</div>
);

// ── Tarifas ───────────────────────────────────────────────
function Tarifas() {
  const [tarifas, setTarifas] = useState(null);
  const [valores, setValores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.getTarifas().then(t => { setTarifas(t); setValores(t); }).catch(e => setError(e.error)); }, []);

  const guardar = async (modalidad) => {
    setError(null); setAviso(null);
    try {
      const r = await api.updateTarifa(modalidad, parseFloat(valores[modalidad]));
      setTarifas(r.tarifas); setValores(r.tarifas);
      setAviso(`Tarifa actualizada.${r.mensualidadesActualizadas ? ` ${r.mensualidadesActualizadas} mensualidad(es) sin pagar de este mes en adelante quedaron con el nuevo valor.` : ''}`);
    } catch (e) { setError(e.error); }
  };

  return (
    <Seccion titulo="Tarifas mensuales" descripcion="Un único valor por mes según la modalidad, para cualquier nivel. Las mensualidades ya pagadas no cambian.">
      <Aviso tipo="ok" onClose={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso onClose={() => setError(null)}>{error}</Aviso>
      {!tarifas ? <Loader2 className="animate-spin" style={{ color: C.accent }} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {[['autonomo', 'Autónomo'], ['acompanado', 'Acompañado']].map(([k, l]) => (
            <div key={k} style={{ background: C.surface2, borderRadius: '10px', padding: '14px' }}>
              <Field label={`${l} · por mes`}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input type="number" min="1" step="1000" value={valores[k] ?? ''} onChange={e => setValores(v => ({ ...v, [k]: e.target.value }))} />
                  <Btn onClick={() => guardar(k)} disabled={!(parseFloat(valores[k]) > 0) || parseFloat(valores[k]) === tarifas[k]}>Guardar</Btn>
                </div>
              </Field>
              <div style={{ fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins', marginTop: '6px' }}>Vigente: {fmtCOP(tarifas[k])}</div>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );
}

// ── Ciclos ────────────────────────────────────────────────
function Ciclos() {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [error, setError] = useState(null);
  const [avisos, setAvisos] = useState([]);

  const cargar = useCallback(() => { api.getCiclos().then(setCiclos).catch(e => setError(e.error)).finally(() => setLoading(false)); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const nuevo = () => {
    // Propone el ciclo siguiente al último: empieza el lunes después de su fin y dura 13 semanas.
    const ult = ciclos[0];
    let anio = new Date().getFullYear(), trimestre = 1, inicio = new Date().toISOString().slice(0, 10);
    if (ult) {
      trimestre = ult.trimestre === 4 ? 1 : ult.trimestre + 1;
      anio = ult.trimestre === 4 ? ult.anio + 1 : ult.anio;
      const d = new Date(ult.fecha_fin); d.setUTCDate(d.getUTCDate() + 1);
      while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
      inicio = d.toISOString().slice(0, 10);
    }
    const fin = new Date(inicio); fin.setUTCDate(fin.getUTCDate() + 13 * 7 - 1);
    setForm({ anio, trimestre, fechaInicio: inicio, fechaFin: fin.toISOString().slice(0, 10), semanaEmpalme: '' });
  };

  const guardar = async () => {
    setError(null); setAvisos([]);
    try {
      const r = form.id ? await api.updateCiclo(form.id, form) : await api.crearCiclo(form);
      setAvisos(r.avisos || []); setForm(null); cargar();
    } catch (e) { setError(e.error); }
  };

  return (
    <Seccion titulo="Ciclos" descripcion="Trimestres de 13 semanas. Los grupos se crean dentro de un ciclo; su número (T1–T4) define el mesociclo del plan."
      accion={<Btn small variant="dark" onClick={nuevo}><Plus size={13} /> Nuevo ciclo</Btn>}>
      <Aviso tipo="ok" onClose={() => setAvisos([])}>{avisos}</Aviso>
      {!form && <Aviso onClose={() => setError(null)}>{error}</Aviso>}
      {loading ? <Loader2 className="animate-spin" style={{ color: C.accent }} />
        : ciclos.length === 0 ? <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem' }}>No hay ciclos.</div>
        : ciclos.map(c => {
          const hoy = new Date().toISOString().slice(0, 10);
          const vigente = c.fecha_inicio.slice(0, 10) <= hoy && hoy <= c.fecha_fin.slice(0, 10);
          return (
            <Fila key={c.id}>
              <span style={{ fontFamily: 'Antonio', fontSize: '1.05rem', color: C.accent, width: '80px' }}>{c.codigo}</span>
              <span style={{ flex: 1, fontFamily: 'Poppins', fontSize: '0.84rem', color: C.text2 }}>
                {fmtFecha(c.fecha_inicio)} → {fmtFecha(c.fecha_fin)} · empalme {fmtFecha(c.semana_empalme)} · {c.grupos} grupo(s)
              </span>
              {vigente && <Badge color={C.ok}>Vigente</Badge>}
              <Btn small variant="secondary" onClick={() => setForm({ id: c.id, anio: c.anio, trimestre: c.trimestre, fechaInicio: c.fecha_inicio.slice(0, 10), fechaFin: c.fecha_fin.slice(0, 10), semanaEmpalme: c.semana_empalme?.slice(0, 10) || '' })}><Pencil size={13} /></Btn>
              {Number(c.grupos) === 0 && <Btn small variant="danger" onClick={() => setBorrar(c)}><Trash2 size={13} /></Btn>}
            </Fila>
          );
        })}
      {form && (
        <Modal title={form.id ? 'Editar ciclo' : 'Nuevo ciclo'} onClose={() => { setForm(null); setError(null); }} footer={<>
          <Btn variant="secondary" onClick={() => { setForm(null); setError(null); }}>Cancelar</Btn>
          <Btn onClick={guardar}>Guardar</Btn>
        </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Año" required><Input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))} /></Field>
              <Field label="Trimestre" required>
                <Select value={form.trimestre} onChange={e => setForm(f => ({ ...f, trimestre: Number(e.target.value) }))}>
                  {[1, 2, 3, 4].map(t => <option key={t} value={t}>T{t}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Inicio" required><Input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} /></Field>
              <Field label="Fin" required><Input type="date" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))} /></Field>
            </div>
            <Field label="Semana de empalme" hint="Vacío = última semana del ciclo"><Input type="date" value={form.semanaEmpalme} onChange={e => setForm(f => ({ ...f, semanaEmpalme: e.target.value }))} /></Field>
            {form.id && <div style={{ fontSize: '0.75rem', color: C.text3, fontFamily: 'Poppins' }}>Cambiar las fechas regenera las sesiones de los grupos del ciclo que aún no tienen asistencia.</div>}
          </div>
          <Aviso>{error}</Aviso>
        </Modal>
      )}
      {borrar && (
        <Confirmar peligro titulo="Eliminar ciclo" textoBoton="Eliminar" onClose={() => setBorrar(null)}
          mensaje={<>Se eliminará el ciclo {borrar.codigo}.</>}
          onConfirm={async () => { await api.deleteCiclo(borrar.id); cargar(); }} />
      )}
    </Seccion>
  );
}

// ── Sedes y aliados de salud (mismo patrón: lista + modal + activar/desactivar) ──
function Catalogo({ titulo, descripcion, cargarFn, crearFn, actualizarFn, campos, vacio, resumen, activoKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => { cargarFn().then(setItems).catch(e => setError(e.error)).finally(() => setLoading(false)); }, [cargarFn]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setError(null);
    try {
      const { id, ...datos } = form;
      if (id) await actualizarFn(id, datos); else await crearFn(datos);
      setForm(null); cargar();
    } catch (e) { setError(e.error); }
  };
  const toggle = async (it) => {
    setError(null);
    try { await actualizarFn(it.id, { [activoKey.campo]: !it[activoKey.col] }); cargar(); } catch (e) { setError(e.error); }
  };

  return (
    <Seccion titulo={titulo} descripcion={descripcion} accion={<Btn small variant="dark" onClick={() => setForm({ ...vacio })}><Plus size={13} /> Agregar</Btn>}>
      {!form && <Aviso onClose={() => setError(null)}>{error}</Aviso>}
      {loading ? <Loader2 className="animate-spin" style={{ color: C.accent }} />
        : items.length === 0 ? <div style={{ color: C.text3, fontFamily: 'Poppins', fontSize: '0.85rem' }}>Sin registros.</div>
        : items.map(it => (
          <Fila key={it.id} apagada={!it[activoKey.col]}>
            <span style={{ flex: 1, minWidth: '200px', fontFamily: 'Poppins', fontSize: '0.85rem', color: C.text }}>
              <strong>{it.nombre}</strong>
              <span style={{ display: 'block', fontSize: '0.74rem', color: C.text3 }}>{resumen(it)}</span>
            </span>
            {!it[activoKey.col] && <Badge color={C.text3}>Inactivo</Badge>}
            <Btn small variant="secondary" onClick={() => toggle(it)}>{it[activoKey.col] ? 'Desactivar' : 'Activar'}</Btn>
            <Btn small variant="secondary" onClick={() => setForm(campos.reduce((f, c) => ({ ...f, [c.k]: it[c.col] ?? '' }), { id: it.id }))}><Pencil size={13} /></Btn>
          </Fila>
        ))}
      {form && (
        <Modal title={form.id ? `Editar · ${form.nombre}` : `Agregar · ${titulo}`} onClose={() => { setForm(null); setError(null); }} footer={<>
          <Btn variant="secondary" onClick={() => { setForm(null); setError(null); }}>Cancelar</Btn>
          <Btn onClick={guardar}>Guardar</Btn>
        </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {campos.map(c => (
              <Field key={c.k} label={c.label} required={c.required}>
                {c.opciones
                  ? <Select value={form[c.k]} onChange={e => setForm(f => ({ ...f, [c.k]: e.target.value }))}>{c.opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                  : <Input type={c.type || 'text'} value={form[c.k]} onChange={e => setForm(f => ({ ...f, [c.k]: e.target.value }))} />}
              </Field>
            ))}
          </div>
          <Aviso>{error}</Aviso>
        </Modal>
      )}
    </Seccion>
  );
}

const cargarMuros = () => api.getMuros(true);
const cargarAliados = () => api.getAliadosSalud(true);

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Configuración</h1>
        <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Tarifas, ciclos, sedes y aliados de salud</p>
      </div>
      <Tarifas />
      <Ciclos />
      <Catalogo titulo="Sedes (muros aliados)" descripcion="Los grupos acompañados se dictan en una sede."
        cargarFn={cargarMuros} crearFn={d => api.crearMuro(d)} actualizarFn={(id, d) => api.updateMuro(id, d)}
        activoKey={{ campo: 'convenioActivo', col: 'convenio_activo' }}
        vacio={{ nombre: '', direccion: '', contacto: '', zonasDisponibles: 1 }}
        campos={[
          { k: 'nombre', col: 'nombre', label: 'Nombre', required: true },
          { k: 'direccion', col: 'direccion', label: 'Dirección', required: true },
          { k: 'contacto', col: 'contacto', label: 'Contacto' },
          { k: 'zonasDisponibles', col: 'zonas_disponibles', label: 'Zonas disponibles', type: 'number' },
        ]}
        resumen={m => `${m.direccion}${m.contacto ? ` · ${m.contacto}` : ''} · ${m.zonas_disponibles} zona(s) · ${m.grupos_activos} grupo(s) activo(s)`} />
      <Catalogo titulo="Aliados de salud" descripcion="Fisioterapia y nutrición: los entrenadores remiten escaladores a estos aliados."
        cargarFn={cargarAliados} crearFn={d => api.crearAliadoSalud(d)} actualizarFn={(id, d) => api.updateAliadoSalud(id, d)}
        activoKey={{ campo: 'activo', col: 'activo' }}
        vacio={{ nombre: '', tipo: 'fisioterapia', direccion: '', contacto: '' }}
        campos={[
          { k: 'nombre', col: 'nombre', label: 'Nombre', required: true },
          { k: 'tipo', col: 'tipo', label: 'Tipo', required: true, opciones: [['fisioterapia', 'Fisioterapia'], ['nutricion', 'Nutrición']] },
          { k: 'direccion', col: 'direccion', label: 'Dirección' },
          { k: 'contacto', col: 'contacto', label: 'Contacto' },
        ]}
        resumen={a => `${a.tipo === 'fisioterapia' ? 'Fisioterapia' : 'Nutrición'}${a.contacto ? ` · ${a.contacto}` : ''}${a.direccion ? ` · ${a.direccion}` : ''}`} />
    </div>
  );
}
