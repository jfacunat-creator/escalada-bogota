/**
 * ContabilidadPage.jsx — Módulo P&G
 * Si las tablas pyg_* no existen, muestra instrucciones de migración.
 * Si existen, muestra el estado de resultados con CRUD de entradas.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { IconoPresa, IconoRoca, IconoCronometro } from '../components/Icons';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C', text3: '#666' };
function fmt(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ContabilidadPage() {
  const [estado, setEstado] = useState(null);
  const [datos, setDatos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoriaId: '', concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'egreso' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEstado(); }, []);
  useEffect(() => { if (estado?.schema_ready) loadDatos(); }, [anio, estado?.schema_ready]);

  const loadEstado = async () => {
    try {
      const e = await api.request('/contabilidad/estado');
      setEstado(e);
      if (e.schema_ready) {
        const c = await api.request('/contabilidad/categorias');
        setCategorias(c);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadDatos = async () => {
    try {
      const d = await api.request(`/contabilidad/entradas?anio=${anio}`);
      setDatos(d);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!form.categoriaId || !form.concepto || !form.monto) return;
    setSaving(true);
    try {
      const fecha = new Date(form.fecha);
      await api.request('/contabilidad/entradas', {
        method: 'POST',
        body: JSON.stringify({
          categoriaId: form.categoriaId,
          concepto: form.concepto,
          monto: parseFloat(form.monto),
          fecha: form.fecha,
          periodoMes: fecha.getMonth() + 1,
          periodoAnio: fecha.getFullYear(),
          tipo: form.tipo,
        }),
      });
      setShowForm(false);
      setForm({ categoriaId: '', concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], tipo: 'egreso' });
      loadDatos();
    } catch (err) { alert(err.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: C.accent }} /></div>;

  // No migrado: mostrar instrucciones
  if (!estado?.schema_ready) {
    return (
      <div>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text, marginBottom: '24px' }}>Contabilidad · P&G</h1>
        <div style={{ background: '#1a1200', border: '1px solid #D4AF3730', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <AlertCircle size={20} style={{ color: C.accent }} />
            <span style={{ fontFamily: 'Poppins', fontSize: '0.95rem', color: C.accent, fontWeight: 600 }}>Módulo pendiente de activación</span>
          </div>
          <p style={{ fontFamily: 'Poppins', fontSize: '0.88rem', color: C.text2, lineHeight: 1.8, marginBottom: '16px' }}>
            Las tablas <code style={{ background: '#0c1a12', color: '#86efac', padding: '1px 6px', borderRadius: '3px' }}>pyg_categoria</code> y <code style={{ background: '#0c1a12', color: '#86efac', padding: '1px 6px', borderRadius: '3px' }}>pyg_entrada</code> no existen en la base de datos. Para activar el módulo de contabilidad, ejecuta la siguiente migración SQL:
          </p>
          <pre style={{ background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', fontSize: '0.78rem', color: '#86efac', fontFamily: 'monospace', lineHeight: 1.8, overflow: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap' }}>
            {estado?.migracion_sql}
          </pre>
          <p style={{ fontFamily: 'Poppins', fontSize: '0.78rem', color: C.text3, marginTop: '12px' }}>
            Una vez ejecutada la migración, recarga esta página. El módulo se activa automáticamente.
          </p>
        </div>
      </div>
    );
  }

  const resumen = datos?.resumen;
  const entradas = datos?.entradas || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Contabilidad · P&G</h1>
          <p style={{ color: C.text2, fontSize: '0.9rem', fontFamily: 'Poppins' }}>Estado de resultados · Año {anio}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input-dark" style={{ width: 'auto' }}>
            {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.accent, color: '#121212', border: 'none', padding: '8px 16px', borderRadius: '8px', fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            <Plus size={16} /> Registrar
          </button>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: '#22c55e' }}>{fmt(resumen.total_ingresos)}</div>
            <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>Ingresos {anio}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: '#ef4444' }}>{fmt(resumen.total_egresos)}</div>
            <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>Egresos {anio}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Antonio', fontSize: '1.5rem', color: resumen.utilidad >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(resumen.utilidad)}</div>
            <div style={{ fontSize: '0.78rem', color: C.text2, fontFamily: 'Poppins' }}>Utilidad {anio}</div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.accent}40`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: C.accent, fontWeight: 600, fontFamily: 'Poppins', marginBottom: '14px' }}>Nueva entrada P&G</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, categoriaId: '' }))} className="input-dark">
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
            <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className="input-dark">
              <option value="">Seleccionar categoría</option>
              {categorias.filter(c => c.tipo === form.tipo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Concepto" className="input-dark" />
            <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="Monto COP" className="input-dark" />
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="input-dark" />
            <button onClick={handleSubmit} disabled={saving || !form.categoriaId || !form.concepto || !form.monto}
              style={{ padding: '10px', borderRadius: '8px', background: C.accent, color: '#121212', border: 'none', fontWeight: 700, fontFamily: 'Poppins', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de entradas */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Poppins', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#242424', borderBottom: `1px solid ${C.border}` }}>
              {['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: C.text2 }}>Sin registros para {anio}. Usa el botón "Registrar" para añadir entradas.</td></tr>
            ) : entradas.map(e => (
              <tr key={e.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                <td style={{ padding: '10px 14px', color: C.text2 }}>{new Date(e.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
                <td style={{ padding: '10px 14px', color: C.text, fontWeight: 500 }}>{e.concepto}</td>
                <td style={{ padding: '10px 14px', color: C.text2 }}>{e.categoria_nombre}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, background: e.tipo === 'ingreso' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: e.tipo === 'ingreso' ? '#22c55e' : '#ef4444' }}>
                    {e.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'Antonio', fontSize: '1rem', color: e.tipo === 'ingreso' ? '#22c55e' : '#ef4444' }}>{fmt(e.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
