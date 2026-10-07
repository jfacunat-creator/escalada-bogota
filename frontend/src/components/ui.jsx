// Piezas de interfaz compartidas por las páginas de administración (tema oscuro de la app).
import { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const C = {
  bg: '#121212', surface: '#1c1c1c', surface2: '#242424', border: '#2e2e2e',
  accent: '#D4AF37', sidebar: '#4A2F0F', text: '#F0EDE8', text2: '#A09A8C', text3: '#666',
  ok: '#22c55e', warn: '#f59e0b', danger: '#ef4444', info: '#60a5fa',
};

export const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);
export const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// "2026-10" → "octubre 2026"
export const fmtMes = (p) => { if (!p) return '—'; const [a, m] = String(p).split('-'); return `${MESES[+m - 1]} ${a}`; };
// Columnas TIME llegan como "1970-01-01T18:00:00.000Z" (o "18:00:00"): devuelve "18:00".
export const fmtHora = (t) => (t ? (String(t).match(/\d{2}:\d{2}/) || [''])[0] : '');
export const mesActual = () => new Date().toISOString().slice(0, 7);
export const sumarMeses = (p, n) => { const [a, m] = p.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
export const MODALIDAD = { autonomo: 'Autónomo', acompanado: 'Acompañado' };
export const HORARIOS = [
  { value: 'lun_mie_18_20', label: 'Lun y Mié · 18:00–20:00' },
  { value: 'lun_mie_20_22', label: 'Lun y Mié · 20:00–22:00' },
  { value: 'mar_jue_18_20', label: 'Mar y Jue · 18:00–20:00' },
  { value: 'mar_jue_20_22', label: 'Mar y Jue · 20:00–22:00' },
  { value: 'sab_dom_7_9',   label: 'Sáb y Dom · 7:00–9:00' },
  { value: 'sab_dom_9_11',  label: 'Sáb y Dom · 9:00–11:00' },
  { value: 'sab_dom_11_13', label: 'Sáb y Dom · 11:00–13:00' },
];
export const HORARIO_LABEL = Object.fromEntries(HORARIOS.map(h => [h.value, h.label]));
export const NIVEL = { iniciacion: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

const labelStyle = { display: 'block', fontSize: '0.72rem', color: C.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'Poppins' };

export function Field({ label, required, children, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {children}
      {hint && <div style={{ fontSize: '0.72rem', color: C.text3, marginTop: '4px', fontFamily: 'Poppins' }}>{hint}</div>}
    </div>
  );
}

export function Input(props) {
  return <input className="input-dark" style={{ width: '100%' }} {...props} />;
}

export function Select({ children, ...props }) {
  return <select className="input-dark" style={{ width: '100%' }} {...props}>{children}</select>;
}

export function Btn({ variant = 'primary', small, style, children, ...props }) {
  const v = {
    primary: { background: C.accent, color: '#121212', border: 'none', fontWeight: 700 },
    secondary: { background: 'transparent', color: C.text2, border: `1px solid ${C.border}`, fontWeight: 500 },
    danger: { background: 'rgba(239,68,68,0.12)', color: C.danger, border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 },
    ok: { background: 'rgba(34,197,94,0.12)', color: C.ok, border: '1px solid rgba(34,197,94,0.3)', fontWeight: 600 },
    dark: { background: C.sidebar, color: C.accent, border: 'none', fontWeight: 600 },
  }[variant];
  return (
    <button {...props} style={{
      ...v, padding: small ? '5px 10px' : '9px 16px', borderRadius: '7px', cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.55 : 1, fontFamily: 'Poppins', fontSize: small ? '0.76rem' : '0.85rem',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', ...style,
    }}>{children}</button>
  );
}

export function Modal({ title, onClose, children, footer, width = 460 }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px',
    }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', maxWidth: `${width}px`, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.25rem', color: C.text }}>{title}</div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>
  );
}

// Aviso de error / éxito. `avisos` (array) muestra los efectos que el backend aplicó en datos relacionados.
export function Aviso({ tipo = 'error', children, onClose }) {
  if (!children || (Array.isArray(children) && !children.length)) return null;
  const color = tipo === 'error' ? C.danger : tipo === 'ok' ? C.ok : C.warn;
  const Icon = tipo === 'ok' ? CheckCircle2 : AlertCircle;
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: color + '14', border: `1px solid ${color}40`, borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: tipo === 'error' ? '#fca5a5' : color, fontFamily: 'Poppins', margin: '10px 0' }}>
      <Icon size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>{Array.isArray(children) ? children.map((c, i) => <div key={i}>{c}</div>) : children}</div>
      {onClose && <button onClick={onClose} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>}
    </div>
  );
}

export function Badge({ color = C.accent, children }) {
  return <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 9px', borderRadius: '20px', background: color + '1c', color, fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>{children}</span>;
}

export const ESTADO_PAGO = {
  pagado: { label: 'Pagado', color: C.ok },
  pendiente: { label: 'Pendiente', color: C.warn },
  vencido: { label: 'Vencido', color: C.danger },
};
export const ESTADO_INSC = {
  activa: { label: 'Activa', color: C.ok },
  reservada: { label: 'Cupo reservado', color: C.accent },
  congelada: { label: 'Congelada', color: C.warn },
  cancelada: { label: 'Cancelada', color: C.danger },
  completada: { label: 'Completada', color: C.info },
};

export function Confirmar({ titulo, mensaje, textoBoton = 'Confirmar', peligro, onConfirm, onClose }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ok = async () => {
    setEnviando(true); setError(null);
    try { await onConfirm(); onClose(); } catch (e) { setError(e?.error || 'No se pudo completar la acción'); } finally { setEnviando(false); }
  };
  return (
    <Modal title={titulo} onClose={onClose} width={420} footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn variant={peligro ? 'danger' : 'primary'} onClick={ok} disabled={enviando}>{enviando ? 'Procesando…' : textoBoton}</Btn>
    </>}>
      <div style={{ color: C.text2, fontFamily: 'Poppins', fontSize: '0.88rem', lineHeight: 1.6 }}>{mensaje}</div>
      <Aviso>{error}</Aviso>
    </Modal>
  );
}
