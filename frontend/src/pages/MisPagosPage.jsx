/**
 * MisPagosPage.jsx
 * Vista de pagos del escalador: pendientes, historial, botón de pago Wompi.
 * Consume:
 *   GET  /api/pagos
 *   POST /api/pagos/:id/link-pago
 */

import { useState, useEffect } from 'react';
import { Loader2, CreditCard, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import api from '../services/api';

const C = { surface: '#1c1c1c', border: '#2e2e2e', accent: '#D4AF37', text: '#F0EDE8', text2: '#A09A8C' };

function formatCOP(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}

function formatFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ESTADO_PAGO = {
  pendiente: { icon: Clock,         color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pendiente' },
  pagado:    { icon: CheckCircle2,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'Pagado' },
  vencido:   { icon: AlertCircle,    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Vencido' },
};

function PagoCard({ pago, onPagar, pagando }) {
  const est = ESTADO_PAGO[pago.estado] || ESTADO_PAGO.pendiente;
  const Icon = est.icon;
  const vencido = pago.fecha_vencimiento && new Date(pago.fecha_vencimiento) < new Date() && pago.estado === 'pendiente';

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px',
      padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.1rem', color: C.text }}>
            {pago.programa}
          </div>
          <div style={{ fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins' }}>
            {pago.ciclo} · {pago.modalidad === 'acompanado' ? 'Acompañado' : 'Autónomo'}
          </div>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
          borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins',
          background: vencido ? 'rgba(239,68,68,0.1)' : est.bg,
          color: vencido ? '#ef4444' : est.color,
        }}>
          <Icon size={12} /> {vencido ? 'Vencido' : est.label}
        </span>
      </div>

      {/* Detalles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ background: '#252525', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.68rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px', fontFamily: 'Poppins' }}>
            Monto
          </div>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.3rem', color: C.accent }}>
            {formatCOP(pago.monto)}
          </div>
        </div>
        <div style={{ background: '#252525', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.68rem', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px', fontFamily: 'Poppins' }}>
            {pago.estado === 'pagado' ? 'Fecha de pago' : 'Vence'}
          </div>
          <div style={{ fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 600, color: vencido ? '#ef4444' : C.text }}>
            {formatFecha(pago.estado === 'pagado' ? pago.fecha_pago : pago.fecha_vencimiento)}
          </div>
        </div>
      </div>

      {/* Método y referencia si ya pagó */}
      {pago.estado === 'pagado' && (
        <div style={{ fontSize: '0.8rem', color: C.text2, fontFamily: 'Poppins', display: 'flex', gap: '16px' }}>
          {pago.metodo && <span>Método: <span style={{ color: C.text, textTransform: 'capitalize' }}>{pago.metodo}</span></span>}
          {pago.referencia && <span>Ref: <span style={{ color: C.text }}>{pago.referencia.substring(0, 20)}</span></span>}
        </div>
      )}

      {/* Botón de pago */}
      {pago.estado !== 'pagado' && (
        <button
          onClick={() => onPagar(pago.id)}
          disabled={pagando === pago.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px', borderRadius: '8px', border: 'none', cursor: pagando === pago.id ? 'not-allowed' : 'pointer',
            background: pagando === pago.id ? '#3a3a2a' : C.accent,
            color: '#121212', fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 700,
            width: '100%', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (pagando !== pago.id) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {pagando === pago.id ? (
            <><Loader2 size={16} className="animate-spin" /> Generando link...</>
          ) : (
            <><CreditCard size={16} /> Pagar con Wompi</>
          )}
        </button>
      )}
    </div>
  );
}

export default function MisPagosPage() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPagos()
      .then(setPagos)
      .catch(() => setError('No se pudieron cargar tus pagos.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePagar = async (pagoId) => {
    setPagando(pagoId);
    try {
      const result = await api.generarLinkPago(pagoId);
      // Abrir checkout de Wompi en nueva pestaña
      window.open(result.payment_url, '_blank');
    } catch (err) {
      alert(err?.error || 'No se pudo generar el link de pago. Intenta de nuevo.');
    } finally {
      setPagando(null);
    }
  };

  const pendientes = pagos.filter(p => p.estado !== 'pagado');
  const pagados = pagos.filter(p => p.estado === 'pagado');
  const totalPendiente = pendientes.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const totalPagado = pagados.reduce((s, p) => s + parseFloat(p.monto || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: C.accent }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '2rem', color: C.text }}>Mis Pagos</h1>
        <p style={{ fontSize: '0.9rem', color: C.text2, fontFamily: 'Poppins' }}>Estado de tus mensualidades</p>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: pendientes.length > 0 ? '#f59e0b' : '#22c55e' }}>
            {pendientes.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>Pendientes</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: '#f59e0b' }}>
            {formatCOP(totalPendiente)}
          </div>
          <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>Por pagar</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.5rem', color: '#22c55e' }}>
            {formatCOP(totalPagado)}
          </div>
          <div style={{ fontSize: '0.75rem', color: C.text2, fontFamily: 'Poppins' }}>Pagado total</div>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px',
          marginBottom: '20px', fontSize: '0.85rem', color: '#fca5a5', fontFamily: 'Poppins',
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'Poppins' }}>
            Pagos pendientes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '32px' }}>
            {pendientes.map(p => (
              <PagoCard key={p.id} pago={p} onPagar={handlePagar} pagando={pagando} />
            ))}
          </div>
        </>
      )}

      {/* Historial */}
      {pagados.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'Poppins' }}>
            Pagos realizados
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {pagados.map(p => (
              <PagoCard key={p.id} pago={p} onPagar={handlePagar} pagando={pagando} />
            ))}
          </div>
        </>
      )}

      {pagos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <CreditCard size={48} style={{ color: '#2e2e2e', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.2rem', color: C.text2, marginBottom: '8px' }}>
            Sin pagos registrados
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: 'Poppins' }}>
            Tus pagos aparecerán aquí una vez te inscribas en una cohorte.
          </p>
        </div>
      )}
    </div>
  );
}
