/**
 * AjustesAIPage.jsx — Revisión de los ajustes que la AI propone sobre el plan base.
 * Entrenador: sus escaladores. Admin: todos, más la vista previa de la actualización semanal.
 * Nada llega al escalador sin aprobación.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, Check, X, BookOpen, RefreshCw } from 'lucide-react';

const C = {
  surface: '#1c1c1c', card: '#232323', border: '#2e2e2e', accent: '#D4AF37',
  text: '#F0EDE8', text2: '#A09A8C', text3: '#666', green: '#22c55e', red: '#ef4444', teal: '#2dd4bf',
};

const ESTADOS = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'aprobado', label: 'Aprobados' },
  { key: 'rechazado', label: 'Rechazados' },
];

const ORIGEN = { test_entrada: 'Test S0', semanal: 'Semana registrada', reporte: 'Reporte' };

function agrupar(ajustes) {
  const porEscalador = new Map();
  for (const a of ajustes) {
    if (!porEscalador.has(a.escalador_id)) porEscalador.set(a.escalador_id, { nombre: a.escalador, sesiones: new Map() });
    const sesiones = porEscalador.get(a.escalador_id).sesiones;
    const k = `${a.trimestre} · ${a.semana}·S${a.sesion_num}`;
    if (!sesiones.has(k)) sesiones.set(k, []);
    sesiones.get(k).push(a);
  }
  return [...porEscalador.values()];
}

const boton = (color, lleno) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
  fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins', border: `1px solid ${color}`,
  background: lleno ? color : 'transparent', color: lleno ? '#121212' : color,
});

function Ajuste({ a, pendiente, onRevisar, ocupado }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ color: C.text, fontSize: '0.85rem', fontWeight: 600 }}>{a.bloque} · {a.etiqueta}</div>
        <span style={{ color: C.text3, fontSize: '0.7rem' }}>{ORIGEN[a.origen] || a.origen}</span>
      </div>
      <div style={{ margin: '6px 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
        <span style={{ color: C.text2, textDecoration: 'line-through' }}>{a.valor_base}</span>
        <span style={{ color: C.text3 }}> → </span>
        <span style={{ color: C.accent, fontWeight: 600 }}>{a.valor_propuesto}</span>
      </div>
      <div style={{ color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>{a.motivo}</div>
      <blockquote style={{ margin: '8px 0 0', padding: '6px 10px', borderLeft: `3px solid ${C.teal}`,
        color: C.text2, fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.5, background: '#1a1a1a' }}>
        “{a.cita}”
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontStyle: 'normal', color: C.teal, fontSize: '0.72rem' }}>
          <BookOpen size={12} /> {a.fuente_etiqueta}{a.fuente_seccion ? ` · ${a.fuente_seccion}` : ''}
        </div>
      </blockquote>
      {a.nota_revisor && <div style={{ color: C.text3, fontSize: '0.75rem', marginTop: 6 }}>Nota: {a.nota_revisor}</div>}
      {pendiente && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button disabled={ocupado} style={boton(C.green, true)} onClick={() => onRevisar(a.id, 'aprobar')}>
            <Check size={14} /> Aprobar
          </button>
          <button disabled={ocupado} style={boton(C.red, false)} onClick={() => onRevisar(a.id, 'rechazar')}>
            <X size={14} /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}

const fecha = f => new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function ActualizacionSemanal() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.getActualizacionSemanal()
      .then(setDatos)
      .catch(e => setError(e?.error || 'No se pudo armar la vista previa'))
      .finally(() => setCargando(false));
  }, []);
  useEffect(cargar, [cargar]);

  return (
    <section style={{ background: C.surface, border: `1px solid ${C.accent}55`, borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.text, fontSize: '1.05rem', margin: 0 }}>Actualización semanal</h2>
        <button style={boton(C.accent, false)} onClick={cargar} disabled={cargando}><RefreshCw size={14} /> Revisar de nuevo</button>
      </div>
      <p style={{ color: C.text2, fontSize: '0.8rem', lineHeight: 1.5, margin: '6px 0 10px' }}>
        Esto es lo que procesará la próxima corrida. Para ejecutarla, abre en n8n el flujo
        <b> Actualización semanal de planes</b> y dale <b>Execute workflow</b>. Las propuestas aparecerán abajo como pendientes.
      </p>
      {cargando ? <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: C.accent }} />
        : error ? <div style={{ color: C.red, fontSize: '0.85rem' }}>{error}</div>
        : (
          <>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
              <div><div style={{ color: C.text3, fontSize: '0.7rem' }}>Consultas a la AI</div><div style={{ color: C.text, fontSize: '1.3rem', fontWeight: 700 }}>{datos.consultas}</div></div>
              <div><div style={{ color: C.text3, fontSize: '0.7rem' }}>Costo estimado</div><div style={{ color: C.accent, fontSize: '1.3rem', fontWeight: 700 }}>US$ {datos.costoEstimado.toFixed(2)}</div></div>
            </div>
            {datos.items.length ? datos.items.map((i, k) => (
              <div key={k} style={{ color: C.text, fontSize: '0.82rem', padding: '4px 0' }}>
                • <b>{i.escalador}</b> <span style={{ color: C.text3 }}>({ORIGEN[i.origen] || i.origen}, {i.consultas} consulta{i.consultas === 1 ? '' : 's'})</span>
                <span style={{ color: C.text2 }}> — {i.motivo}</span>
              </div>
            )) : <div style={{ color: C.text3, fontSize: '0.82rem' }}>No hay nada que procesar: la corrida no gastaría créditos.</div>}
            {datos.omitidos.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ color: C.text3, fontSize: '0.75rem', cursor: 'pointer' }}>Sin consulta esta semana ({datos.omitidos.length})</summary>
                {datos.omitidos.map((o, k) => <div key={k} style={{ color: C.text3, fontSize: '0.75rem', padding: '2px 0' }}>· {o.escalador}: {o.motivo}</div>)}
              </details>
            )}
            {datos.corridas.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ color: C.text3, fontSize: '0.75rem', cursor: 'pointer' }}>Corridas anteriores</summary>
                {datos.corridas.map((c, k) => (
                  <div key={k} style={{ color: C.text3, fontSize: '0.75rem', padding: '2px 0' }}>
                    · {fecha(c.fecha)}: {c.devueltas}/{c.consultas} consultas devueltas{c.errores ? `, ${c.errores} con error` : ''} · {c.propuestas} propuestas
                    {c.costoEstimado != null ? ` · ≈ US$ ${c.costoEstimado.toFixed(2)}` : ''}
                  </div>
                ))}
              </details>
            )}
          </>
        )}
    </section>
  );
}

export default function AjustesAIPage() {
  const { user } = useAuth();
  const [estado, setEstado] = useState('pendiente');
  const [ajustes, setAjustes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getAjustesAI(estado)
      .then(setAjustes)
      .catch(e => setError(e?.error || 'No se pudieron cargar los ajustes'))
      .finally(() => setLoading(false));
  }, [estado]);

  useEffect(cargar, [cargar]);

  async function revisar(id, accion) {
    let nota;
    if (accion === 'rechazar') {
      nota = window.prompt('¿Por qué lo rechazas? (opcional, queda registrado)');
      if (nota === null) return;
    }
    setOcupado(true);
    try {
      await (accion === 'aprobar' ? api.aprobarAjusteAI(id) : api.rechazarAjusteAI(id, nota));
      setAjustes(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      setError(e?.error || 'No se pudo guardar la revisión');
    } finally {
      setOcupado(false);
    }
  }

  async function aprobarSesion(lista) {
    setOcupado(true);
    try {
      await api.aprobarAjustesAI(lista.map(a => a.id));
      const ids = new Set(lista.map(a => a.id));
      setAjustes(prev => prev.filter(a => !ids.has(a.id)));
    } catch (e) {
      setError(e?.error || 'No se pudieron aprobar');
    } finally {
      setOcupado(false);
    }
  }

  const grupos = agrupar(ajustes);
  const pendiente = estado === 'pendiente';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: 'Poppins' }}>
      <h1 style={{ color: C.text, fontFamily: 'Antonio', fontSize: '1.8rem', margin: '0 0 4px' }}>Ajustes del plan</h1>
      <p style={{ color: C.text2, fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.5 }}>
        Propuestas de la AI a partir del test S0 y de lo que cada escalador registró en la semana. Cada una cita su fuente
        (guía del programa, Hörst u Obradó) y llega al escalador solo cuando la apruebas.
      </p>

      {user?.rol === 'admin' && <ActualizacionSemanal />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {ESTADOS.map(e => (
          <button key={e.key} onClick={() => setEstado(e.key)}
            style={{ ...boton(C.accent, estado === e.key), padding: '6px 14px' }}>{e.label}</button>
        ))}
      </div>

      {error && <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: C.accent }} />
        </div>
      ) : !grupos.length ? (
        <div style={{ color: C.text3, textAlign: 'center', padding: 48, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          {pendiente ? 'No hay ajustes pendientes de revisión.' : 'Sin ajustes en este estado.'}
        </div>
      ) : grupos.map(g => (
        <section key={g.nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: '14px 16px', marginBottom: 14 }}>
          <h2 style={{ color: C.text, fontSize: '1.05rem', margin: 0 }}>{g.nombre}</h2>
          {[...g.sesiones.entries()].map(([sesion, lista]) => (
            <div key={sesion} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.accent, fontSize: '0.8rem', fontWeight: 700 }}>{sesion}</span>
                {pendiente && lista.length > 1 && (
                  <button disabled={ocupado} style={boton(C.green, false)} onClick={() => aprobarSesion(lista)}>
                    <Check size={14} /> Aprobar los {lista.length}
                  </button>
                )}
              </div>
              {lista.map(a => <Ajuste key={a.id} a={a} pendiente={pendiente} onRevisar={revisar} ocupado={ocupado} />)}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
