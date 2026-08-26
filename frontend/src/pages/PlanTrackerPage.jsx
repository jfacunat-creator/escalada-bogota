/**
 * frontend/src/pages/PlanTrackerPage.jsx
 *
 * Tracker universal — funciona para los 12 planes (T1-T4 × Iniciación/Intermedio/Avanzado).
 * El plan se determina automáticamente desde la inscripción activa del escalador.
 *
 * INTEGRACIÓN:
 *   App.jsx      → <Route path="mi-plan" element={<PlanTrackerPage />} />
 *   AppLayout    → { to: '/app/mi-plan', label: 'Mi Plan' } en nav escalador
 *   api.js       → agregar: getMyPlan: () => request('/plan/my')
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  card:    "#1c1c1c",
  cardAlt: "#232323",
  border:  "#2e2e2e",
  accent:  "#D4AF37",
  accentA: "rgba(212,175,55,0.15)",
  teal:    "#00D9B5",
  tealA:   "rgba(0,217,181,0.12)",
  purple:  "#A78BFA",
  purpleA: "rgba(167,139,250,0.12)",
  orange:  "#FF5C35",
  orangeA: "rgba(255,92,53,0.14)",
  gold:    "#D4AF37",
  goldA:   "rgba(212,175,55,0.14)",
  red:     "#EF4444",
  redA:    "rgba(239,68,68,0.12)",
  green:   "#22C55E",
  greenA:  "rgba(34,197,94,0.12)",
  text:    "#F0EDE8",
  sub:     "#A09A8C",
  muted:   "#555",
};

// Color por nivel
const NIVEL_COLOR = {
  iniciacion: C.teal,
  intermedio: C.accent,
  avanzado:   C.orange,
};

// Iconos semáforo de sesión
const TIPO_COLOR = {
  baja:  C.teal,
  media: C.gold,
  alta:  C.red,
};

// ─── SUB-COMPONENTES ─────────────────────────────────────────────────────────
function PseBar({ target }) {
  const max = String(target).includes("–")
    ? parseFloat(String(target).split("–")[1])
    : parseFloat(target) || 5;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{ width: 15, height: 6, borderRadius: 3,
          background: i < max ? C.accent : C.border }} />
      ))}
      <span style={{ color: C.sub, fontSize: 11, marginLeft: 4, fontFamily: "Poppins" }}>
        PSE {target}
      </span>
    </div>
  );
}

function Block({ b }) {
  const [open, setOpen] = useState(false);
  const hasParams = b.params && b.params.length > 0;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`,
      borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={() => hasParams && setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "10px 13px", cursor: hasParams ? "pointer" : "default" }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text,
          lineHeight: 1.3, fontFamily: "Poppins" }}>{b.n}</span>
        {hasParams && (
          <span style={{ color: C.muted, fontSize: 13, display: "inline-block",
            transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        )}
      </div>
      {open && hasParams && (
        <div style={{ padding: "0 13px 13px" }}>
          {b.params.map(([k, v], i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0",
              borderTop: `1px solid ${C.border}` }}>
              {k && (
                <span style={{ color: C.sub, fontSize: 10, fontWeight: 700,
                  minWidth: 100, textTransform: "uppercase", letterSpacing: 0.4,
                  paddingTop: 2, flexShrink: 0, fontFamily: "Poppins" }}>{k}</span>
              )}
              <span style={{ color: C.text, fontSize: 12, flex: 1,
                lineHeight: 1.5, fontFamily: "Poppins" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PLAN TAB ─────────────────────────────────────────────────────────────────
function PlanTab({ semanas, logs, onSelect, curWeek }) {
  return (
    <div>
      <p style={{ color: C.sub, fontSize: 12, marginBottom: 14, fontFamily: "Poppins" }}>
        {semanas.length} semanas · Toca una sesión para ir directamente a ella
      </p>
      {semanas.map(w => {
        const done = w.sesiones.filter(s => logs[`${w.id}_${s.num}`]?.pse).length;
        const isCur = w.id === curWeek;
        return (
          <div key={w.id} style={{ background: isCur ? C.accentA : C.card,
            border: `1px solid ${isCur ? C.accent : C.border}`, borderRadius: 12,
            padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ background: C.accentA, border: `1px solid ${C.accent}44`,
                borderRadius: 8, padding: "4px 8px", textAlign: "center", minWidth: 42 }}>
                <div style={{ color: C.accent, fontSize: 12, fontWeight: 800, fontFamily: "Antonio" }}>
                  {w.id}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  {done > 0 && (
                    <span style={{ background: C.greenA, color: C.green, fontSize: 9,
                      fontWeight: 700, padding: "1px 6px", borderRadius: 999, fontFamily: "Poppins" }}>
                      {done}/{w.sesiones.length} ✓
                    </span>
                  )}
                </div>
                <PseBar target={w.pse} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {w.sesiones.map(s => {
                const lg = logs[`${w.id}_${s.num}`];
                const tc = TIPO_COLOR[s.type?.toLowerCase()] || C.sub;
                return (
                  <button key={s.num} onClick={() => onSelect(w.id, s.num)}
                    style={{ flex: 1, minWidth: 60, background: lg?.completed ? C.greenA : lg?.pse ? C.accentA : C.cardAlt,
                      border: `1px solid ${lg?.completed ? C.green : lg?.pse ? C.accent : C.border}`,
                      borderRadius: 8, padding: "6px 4px", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ color: lg?.completed ? C.green : lg?.pse ? C.accent : C.sub,
                      fontSize: 11, fontWeight: 700, fontFamily: "Poppins" }}>S{s.num}</div>
                    <div style={{ fontSize: 8, color: tc, marginTop: 2, fontWeight: 600, fontFamily: "Poppins" }}>
                      {s.type?.toUpperCase()}
                    </div>
                    {lg?.pse && <div style={{ color: C.accent, fontSize: 9, marginTop: 1 }}>PSE {lg.pse}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SESIÓN TAB ───────────────────────────────────────────────────────────────
function SesionTab({ semanas, week, session, logs, onWeekChange, onSessionChange, onLog }) {
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);
  const lg = logs[`${week}_${session}`];
  const tc = TIPO_COLOR[sd?.type?.toLowerCase()] || C.accent;

  if (!sd) return (
    <div style={{ padding: 20, color: C.sub, textAlign: "center", fontFamily: "Poppins" }}>
      Sin sesión {session} para {week}
    </div>
  );

  return (
    <div>
      {/* Semana selector */}
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 8,
        marginBottom: 10, scrollbarWidth: "none" }}>
        {semanas.map(w => (
          <button key={w.id} onClick={() => { onWeekChange(w.id); onSessionChange(1); }}
            style={{ background: w.id === week ? C.accentA : C.cardAlt,
              border: `1px solid ${w.id === week ? C.accent : C.border}`,
              borderRadius: 7, padding: "4px 9px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            <span style={{ color: w.id === week ? C.accent : C.sub,
              fontSize: 11, fontWeight: 700, fontFamily: "Poppins" }}>{w.id}</span>
          </button>
        ))}
      </div>

      {/* Sesión selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {wd?.sesiones.map(s => {
          const sl = logs[`${week}_${s.num}`];
          return (
            <button key={s.num} onClick={() => onSessionChange(s.num)}
              style={{ flex: 1, background: s.num === session ? C.accentA : C.cardAlt,
                border: `1px solid ${s.num === session ? C.accent : C.border}`,
                borderRadius: 8, padding: "7px 4px", cursor: "pointer" }}>
              <div style={{ color: s.num === session ? C.accent : C.sub,
                fontSize: 12, fontWeight: 700, fontFamily: "Poppins" }}>S{s.num}</div>
              {sl?.pse && <div style={{ color: C.green, fontSize: 9, marginTop: 1 }}>✓</div>}
            </button>
          );
        })}
      </div>

      {/* Header sesión */}
      <div style={{ background: `${tc}14`, border: `1px solid ${tc}44`,
        borderRadius: 12, padding: "13px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ background: tc, color: "#121212", fontSize: 9, fontWeight: 900,
            padding: "2px 7px", borderRadius: 999, letterSpacing: 0.5, fontFamily: "Poppins" }}>
            {week}·S{session}
          </span>
          <span style={{ color: C.sub, fontSize: 11, fontFamily: "Poppins" }}>
            {sd.type?.charAt(0).toUpperCase() + sd.type?.slice(1).toLowerCase()}
          </span>
          {lg?.completed && (
            <span style={{ background: C.greenA, color: C.green, fontSize: 9,
              fontWeight: 700, padding: "2px 7px", borderRadius: 999, fontFamily: "Poppins" }}>
              ✓ Completada
            </span>
          )}
        </div>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 8,
          lineHeight: 1.3, fontFamily: "Antonio" }}>
          {sd.name}
        </div>
        <PseBar target={sd.pse} />
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {sd.cal > 0 && <span style={{ background: C.card, borderRadius: 7, padding: "3px 9px",
            color: C.sub, fontSize: 11, fontFamily: "Poppins" }}>🔥 Cal. {sd.cal} min</span>}
          {sd.vac > 0 && <span style={{ background: C.card, borderRadius: 7, padding: "3px 9px",
            color: C.sub, fontSize: 11, fontFamily: "Poppins" }}>🧊 VaC {sd.vac} min</span>}
          {lg?.pse && <span style={{ background: C.accentA, borderRadius: 7, padding: "3px 9px",
            color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: "Poppins" }}>PSE real: {lg.pse}</span>}
        </div>
      </div>

      {/* Advertencia */}
      {sd.warn && (
        <div style={{ background: C.redA, border: `1px solid ${C.red}33`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 10, color: C.red, fontSize: 12,
          lineHeight: 1.5, fontFamily: "Poppins" }}>{sd.warn}</div>
      )}
      {sd.note && (
        <div style={{ background: C.goldA, border: `1px solid ${C.gold}33`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 10, color: C.gold, fontSize: 12,
          lineHeight: 1.5, fontFamily: "Poppins" }}>{sd.note}</div>
      )}

      {/* Bloques */}
      {sd.blocks?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
            textTransform: "uppercase", marginBottom: 8, fontFamily: "Poppins" }}>
            Bloques de la sesión
          </div>
          {sd.blocks.map((b, i) => <Block key={i} b={b} />)}
        </div>
      )}

      <button onClick={onLog}
        style={{ width: "100%", background: lg?.pse ? C.greenA : C.accentA,
          border: `1px solid ${lg?.pse ? C.green : C.accent}`,
          borderRadius: 10, padding: "12px", cursor: "pointer",
          color: lg?.pse ? C.green : C.accent, fontSize: 13, fontWeight: 700, fontFamily: "Poppins" }}>
        {lg?.pse ? `✓ Ver registro (PSE real: ${lg.pse})` : "📝 Registrar esta sesión"}
      </button>
    </div>
  );
}

// ─── REGISTRO TAB ─────────────────────────────────────────────────────────────
function RegistroTab({ week, session, semanas, logs, setLogs, storageKey }) {
  const ZONES = ["Dedos D", "Dedos I", "Codo D", "Codo I", "Hombro D", "Hombro I", "Espalda"];
  const logKey = `${week}_${session}`;
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);
  const initDraft = {
    pse: "", notas: "", regleta: "", tiempo: "", completed: false,
    ...ZONES.reduce((a, z) => ({ ...a, [`p_${z}`]: "0" }), {})
  };
  const [draft, setDraft] = useState(initDraft);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const stored = logs[logKey];
    setDraft(stored ? { ...initDraft, ...stored } : initDraft);
  }, [logKey]);

  const save = () => {
    const entry = { ...draft, date: new Date().toLocaleDateString("es-CO"), week, session };
    const all = { ...logs, [logKey]: entry };
    setLogs(all);
    try {
      localStorage.setItem(storageKey, JSON.stringify(all));
      setSaved("✓ Guardado");
    } catch {
      setSaved("Error al guardar");
    }
    setTimeout(() => setSaved(""), 2500);
  };

  const history = Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div style={{ background: C.accentA, border: `1px solid ${C.accent}44`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1,
          marginBottom: 3, fontFamily: "Poppins" }}>REGISTRO ACTUAL</div>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: "Antonio" }}>
          {week} · S{session}
        </div>
        <div style={{ color: C.sub, fontSize: 11, marginTop: 2, fontFamily: "Poppins" }}>
          {sd?.name || "—"}
        </div>
      </div>

      {/* PSE */}
      <div style={{ background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" }}>PSE real (0–10)</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[...Array(11)].map((_, i) => (
            <button key={i} onClick={() => setDraft(d => ({ ...d, pse: String(i) }))}
              style={{ width: 36, height: 36, borderRadius: 7, cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: "Poppins",
                background: draft.pse === String(i) ? (i <= 4 ? C.greenA : i <= 7 ? C.accentA : C.redA) : C.cardAlt,
                border: `2px solid ${draft.pse === String(i) ? (i <= 4 ? C.green : i <= 7 ? C.accent : C.red) : C.border}`,
                color: draft.pse === String(i) ? (i <= 4 ? C.green : i <= 7 ? C.accent : C.red) : C.sub }}>
              {i}
            </button>
          ))}
        </div>
        {sd?.pse && (
          <div style={{ color: C.muted, fontSize: 10, marginTop: 6, fontFamily: "Poppins" }}>
            Objetivo: PSE {sd.pse}
          </div>
        )}
      </div>

      {/* Semáforo de dolor */}
      <div style={{ background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" }}>
          🚦 Semáforo de dolor (0–4)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {ZONES.map(z => (
            <div key={z} style={{ background: C.cardAlt, borderRadius: 8, padding: "7px 9px" }}>
              <div style={{ color: C.sub, fontSize: 10, marginBottom: 5, fontFamily: "Poppins" }}>{z}</div>
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2, 3, 4].map(v => {
                  const cur = parseInt(draft[`p_${z}`] || 0);
                  return (
                    <button key={v} onClick={() => setDraft(d => ({ ...d, [`p_${z}`]: String(v) }))}
                      style={{ width: 22, height: 22, borderRadius: 5, cursor: "pointer",
                        fontWeight: 700, fontSize: 10, fontFamily: "Poppins",
                        background: cur === v ? (v === 0 ? C.greenA : v <= 2 ? C.accentA : C.redA) : C.border,
                        border: `1px solid ${cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : "transparent"}`,
                        color: cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : C.sub }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 10, fontFamily: "Poppins" }}>
          <span style={{ color: C.green }}>🟢 0–2 continúa</span>
          <span style={{ color: C.accent }}>🟡 3 reduce</span>
          <span style={{ color: C.red }}>🔴 4+ para+fisio</span>
        </div>
      </div>

      {/* Regleta + tiempo */}
      <div style={{ background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" }}>Hangboard (si aplica)</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["regleta", "Regleta usada", "ej: 18 mm"], ["tiempo", "Tiempo aguantado", "ej: 7 seg"]].map(([key, label, ph]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: "Poppins" }}>{label}</div>
              <input value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                placeholder={ph}
                style={{ width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`,
                  borderRadius: 7, padding: "7px 9px", color: C.text, fontSize: 12, outline: "none",
                  boxSizing: "border-box", fontFamily: "Poppins" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div style={{ background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" }}>Nota libre</div>
        <textarea value={draft.notas} onChange={e => setDraft(d => ({ ...d, notas: e.target.value }))}
          placeholder="Resultados · sensaciones · qué ajustar..."
          style={{ width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`,
            borderRadius: 7, padding: "9px", color: C.text, fontSize: 12, outline: "none",
            resize: "vertical", minHeight: 70, boxSizing: "border-box",
            fontFamily: "Poppins", lineHeight: 1.5 }} />
      </div>

      {/* Completada */}
      <div onClick={() => setDraft(d => ({ ...d, completed: !d.completed }))}
        style={{ background: draft.completed ? C.greenA : C.card,
          border: `1px solid ${draft.completed ? C.green : C.border}`,
          borderRadius: 11, padding: "12px 14px", marginBottom: 12,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5,
          background: draft.completed ? C.green : C.border,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {draft.completed && <span style={{ color: "#121212", fontSize: 12, fontWeight: 900 }}>✓</span>}
        </div>
        <span style={{ color: draft.completed ? C.green : C.sub,
          fontSize: 13, fontWeight: 600, fontFamily: "Poppins" }}>Sesión completada</span>
      </div>

      <button onClick={save}
        style={{ width: "100%", background: C.accent, border: "none", borderRadius: 10,
          padding: "12px", cursor: "pointer", color: "#121212", fontSize: 14,
          fontWeight: 700, marginBottom: 20, fontFamily: "Poppins" }}>
        {saved || "Guardar registro"}
      </button>

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            textTransform: "uppercase", marginBottom: 8, fontFamily: "Poppins" }}>Historial</div>
          {history.map(([k, v]) => {
            const ws = k.split("_");
            const wid = ws[0]; const snum = ws[1];
            const wsem = semanas.find(w => w.id === wid);
            const sse = wsem?.sesiones.find(s => s.num === parseInt(snum));
            return (
              <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 9, padding: "9px 12px", marginBottom: 5,
                display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ background: v.completed ? C.greenA : C.accentA,
                  borderRadius: 5, padding: "3px 8px", minWidth: 52, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ color: v.completed ? C.green : C.accent,
                    fontSize: 10, fontWeight: 800, fontFamily: "Poppins" }}>{k}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "Poppins",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sse?.name || "—"}
                  </div>
                  <div style={{ color: C.sub, fontSize: 10, fontFamily: "Poppins" }}>
                    {v.date}{v.pse ? ` · PSE ${v.pse}` : ""}
                  </div>
                </div>
                {v.completed && <span style={{ color: C.green, fontSize: 12, flexShrink: 0 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PANTALLAS ESPECIALES ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 0", textAlign: "center" }}>
      <div style={{ color: C.sub, fontFamily: "Poppins", fontSize: 14 }}>
        Cargando tu plan...
      </div>
    </div>
  );
}

function Bloqueado({ estado, nombre }) {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.card,
        border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>🔒</div>
      <h2 style={{ fontFamily: "Antonio, sans-serif", fontSize: "1.6rem", color: C.text, marginBottom: 8 }}>
        Plan de entrenamiento
      </h2>
      {nombre && (
        <p style={{ color: C.sub, fontSize: "0.85rem", marginBottom: 6, fontFamily: "Poppins" }}>
          Hola, {nombre}
        </p>
      )}
      <p style={{ color: C.sub, fontSize: "0.85rem", marginBottom: 6, fontFamily: "Poppins" }}>
        Tu perfil está <strong style={{ color: "#f59e0b" }}>{estado || "inactivo"}</strong>.
      </p>
      <p style={{ color: C.sub, fontSize: "0.8rem", marginBottom: 28, lineHeight: 1.6, fontFamily: "Poppins" }}>
        Para acceder al plan de entrenamiento debes tener tu ciclo al día.
        Revisa el estado de tus pagos o contacta a tu entrenador.
      </p>
      <button onClick={() => navigate("/app/mis-pagos")}
        style={{ background: C.accent, border: "none", borderRadius: 8, padding: "12px 28px",
          cursor: "pointer", color: "#121212", fontSize: "0.9rem", fontWeight: 700,
          fontFamily: "Poppins", marginRight: 12 }}>
        Ver mis pagos
      </button>
      <button onClick={() => navigate("/app")}
        style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "12px 28px", cursor: "pointer", color: C.sub,
          fontSize: "0.9rem", fontFamily: "Poppins" }}>
        Volver al inicio
      </button>
    </div>
  );
}

function SinInscripcion({ nombre }) {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontFamily: "Antonio, sans-serif", fontSize: "1.4rem", color: C.text, marginBottom: 8 }}>
        Sin inscripción activa
      </h2>
      {nombre && (
        <p style={{ color: C.sub, fontSize: "0.85rem", marginBottom: 6, fontFamily: "Poppins" }}>
          Hola, {nombre}
        </p>
      )}
      <p style={{ color: C.sub, fontSize: "0.85rem", marginBottom: 28, lineHeight: 1.6, fontFamily: "Poppins" }}>
        Aún no tienes un grupo activo asignado. Habla con tu entrenador para que te inscriba en un cohorte.
      </p>
      <button onClick={() => navigate("/app")}
        style={{ background: C.accent, border: "none", borderRadius: 8, padding: "12px 28px",
          cursor: "pointer", color: "#121212", fontSize: "0.9rem",
          fontWeight: 700, fontFamily: "Poppins" }}>
        Ir al inicio
      </button>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const TABS = [
  { id: "plan",     label: "🗓️ Plan" },
  { id: "sesion",   label: "💪 Sesión" },
  { id: "registro", label: "✏️ Registro" },
];

export default function PlanTrackerPage() {
  const { user } = useAuth();
  const [plan, setPlan]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("plan");
  const [week, setWeek]       = useState(null);
  const [session, setSession] = useState(1);
  const [logs, setLogs]       = useState({});

  const storageKey = `plan_logs_${user?.id}`;

  // Carga el plan y los logs al montar
  useEffect(() => {
    setLoading(true);
    api.getMyPlan()
      .then(data => {
        setPlan(data);
        setWeek(data.semanas?.[0]?.id || null);
        // Cargar logs locales
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) setLogs(JSON.parse(stored));
        } catch {}
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [storageKey]);

  const goToSession = (w, s) => { setWeek(w); setSession(s); setTab("sesion"); };

  // ── Estados de carga y error ─────────────────────────────────────────────
  if (loading) return <Skeleton />;

  if (error?.status === 403) {
    return <Bloqueado estado={error.data?.estado} nombre={error.data?.nombre} />;
  }

  if (error?.status === 404 && error.data?.error?.includes("inscripción")) {
    return <SinInscripcion nombre={error.data?.nombre} />;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: C.red, fontFamily: "Poppins", fontSize: 14 }}>
          Error al cargar el plan. Recarga la página o contacta a tu entrenador.
        </p>
      </div>
    );
  }

  if (!plan) return null;

  const nivelLabel = {
    iniciacion: "Iniciación",
    intermedio: "Intermedio",
    avanzado:   "Avanzado",
  }[plan.nivel] || plan.nivel;
  const nivelColor = NIVEL_COLOR[plan.nivel] || C.accent;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontFamily: "Antonio, sans-serif", fontSize: "1.8rem", color: C.text }}>
            {plan.trimestre} — Plan de Entrenamiento
          </h1>
          <span style={{ background: `${nivelColor}22`, color: nivelColor, fontSize: 10,
            fontWeight: 800, padding: "3px 10px", borderRadius: 999, fontFamily: "Poppins",
            whiteSpace: "nowrap" }}>
            {nivelLabel}
          </span>
        </div>
        <p style={{ color: C.sub, fontSize: "0.85rem", fontFamily: "Poppins" }}>
          {plan.nombre} · {plan.semanas.length} semanas
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? C.accentA : C.card,
              border: `1px solid ${tab === t.id ? C.accent : C.border}`,
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              color: tab === t.id ? C.accent : C.sub,
              fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              fontFamily: "Poppins", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "plan" && (
        <PlanTab semanas={plan.semanas} logs={logs} onSelect={goToSession} curWeek={week} />
      )}
      {tab === "sesion" && week && (
        <SesionTab semanas={plan.semanas} week={week} session={session} logs={logs}
          onWeekChange={setWeek} onSessionChange={setSession} onLog={() => setTab("registro")} />
      )}
      {tab === "registro" && week && (
        <RegistroTab week={week} session={session} semanas={plan.semanas}
          logs={logs} setLogs={setLogs} storageKey={storageKey} />
      )}
    </div>
  );
}
