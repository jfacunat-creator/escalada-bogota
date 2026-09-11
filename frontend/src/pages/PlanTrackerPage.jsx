/**
 * frontend/src/pages/PlanTrackerPage.jsx
 * Tracker universal T1–T4 × Iniciación/Intermedio/Avanzado
 * con módulo de Movilidad integrado (Sesión A / Sesión B × 3 niveles)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ─── PALETA ──────────────────────────────────────────────
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

const NIVEL_COLOR = { iniciacion: C.teal, intermedio: C.accent, avanzado: C.orange };
const TIPO_COLOR  = { baja: C.teal, media: C.gold, alta: C.red };

// ─── MOVILIDAD DATA ──────────────────────────────────────
const MOV_NIVEL = { iniciacion: 1, intermedio: 2, avanzado: 3 };
const MOV_META  = {
  1: { label: "Nivel 1 · Iniciación",  bg: "#0A2E24", border: "#1D9E75", text: "#5DCAA5", accent: "#1D9E75" },
  2: { label: "Nivel 2 · Desarrollo",  bg: "#2E2200", border: "#EF9F27", text: "#EF9F27", accent: "#EF9F27" },
  3: { label: "Nivel 3 · Rendimiento", bg: "#2E1000", border: "#D85A30", text: "#D85A30", accent: "#D85A30" },
};

const MOV_SESSIONS = {
  A: {
    label: "Sesión A · Pre-sesión", sub: "10–12 min · Antes del muro o Tindeq",
    tip: "⏱️ Realizar ANTES del bloque principal. Complementa o sustituye la Fase 2 del calentamiento.",
    exercises: [
      { id: "wgs", name: "World's Greatest Stretch", sub: "Movilidad global + rotación torácica",
        contra: "Dolor lumbar agudo, FAI bilateral. Relativo: hiperlordosis marcada.",
        levels: {
          1: { mod: "Solo descenso de codo sin rotación torácica. Pie sobre bloque si falta rango.", series: "2 × 4 por lado", tempo: "3 s bajada / sin pausa", rest: "30 s entre series" },
          2: { mod: "Protocolo estándar: descenso de codo + apertura torácica completa hacia el techo.", series: "2 × 5 por lado", tempo: "2 s bajada + 2 s apertura", rest: "30 s entre series" },
          3: { mod: "Pausa isométrica 2 s en máxima apertura. Peso 1–2 kg en mano superior.", series: "3 × 6 por lado", tempo: "2 s + 2 s pausa + 2 s", rest: "30 s entre series" },
        }},
      { id: "frog", name: "Frog Pose", sub: "Apertura activa de cadera y aductores",
        contra: "FAI femoroacetabular, labrum acetabular dañado. Relativo: lesión aguda de aductores, más de 6 meses inactivo.",
        levels: {
          1: { mod: "Mariposa pasiva en suelo. Sin cuadrupedia ni basculación activa. Rango por tolerancia.", series: "2 × 8 oscilaciones", tempo: "2 s de tensión", rest: "30 s entre series" },
          2: { mod: "Cuadrupedia con antebrazos. Empuje activo de cadera hacia talones. Basculación pélvica.", series: "2 × 10 oscilaciones", tempo: "3 s tensión atrás", rest: "30 s entre series" },
          3: { mod: "Banda de resistencia en muslos + basculación anterior activa. Mayor demanda de aductores.", series: "3 × 10 oscilaciones", tempo: "4 s tensión / 2 s vuelta", rest: "30 s entre series" },
        }},
      { id: "disloc", name: "Dislocaciones de Hombro", sub: "Movilidad glenohumeral y escapular",
        contra: "Inestabilidad glenohumeral, rotura de manguito rotador, lesión de Bankart. Relativo: hiperlaxitud sin control motor.",
        levels: {
          1: { mod: "Solo retracciones y círculos escapulares. Sin banda ni pica. Movimiento lento y consciente.", series: "2 × 10", tempo: "Continuo lento", rest: "30 s" },
          2: { mod: "Pica o banda elástica con agarre muy amplio (pronación). Arco completo: muslos → glúteos.", series: "2 × 12", tempo: "3 s ida + 3 s vuelta", rest: "30 s" },
          3: { mod: "Agarre progresivamente más cerrado cada serie. Pausa 2 s tocando glúteos por detrás.", series: "3 × 10", tempo: "3 s + 2 s pausa + 3 s", rest: "30 s" },
        }},
      { id: "rotex", name: "Rotaciones Externas de Hombro", sub: "Infraespinoso + estabilidad escapular",
        contra: "Rotura completa de manguito rotador. Relativo: post-quirúrgico de hombro menos de 3 meses.",
        levels: {
          1: { mod: "Banda muy ligera o sin banda. Rango parcial. Codos a 90° pegados al torso como guía.", series: "2 × 10", tempo: "2 s apertura + 2 s regreso", rest: "45 s" },
          2: { mod: "Banda estándar, rango completo. Toalla entre codo y costado para evitar compensaciones.", series: "2 × 12–15", tempo: "2 s + 1 s pausa + 2 s excéntrico", rest: "45 s" },
          3: { mod: "Posición 90/90: codo en abducción 90°. Mayor demanda de infraespinoso y redondo menor.", series: "3 × 12", tempo: "2 s + 2 s pausa + 3 s excéntrico", rest: "45 s" },
        }},
    ],
  },
  B: {
    label: "Sesión B · Post-sesión", sub: "15–18 min · Tras entrenamiento o días de descanso",
    tip: "🧊 Realizar al FINALIZAR el entrenamiento funcional, en Sesión 3 (bloque suave) o en días de descanso activo.",
    exercises: [
      { id: "jeff", name: "Jefferson Curl", sub: "Flexibilidad activa cadena posterior",
        contra: "ABSOLUTA: hernia discal activa, osteoporosis severa, cirugía espinal reciente. Relativo: hiperlordosis marcada, dolor lumbar crónico.",
        levels: {
          1: { mod: "Cat-Cow en cuadrupedia (10 reps) + flexión de pie en suelo. Sin cajón ni peso.", series: "3 × 8", tempo: "3 s por dirección", rest: "60 s entre series" },
          2: { mod: "Suelo plano sin cajón. Peso 2–4 kg. Enrollar vértebra a vértebra desde el cuello.", series: "3 × 6", tempo: "4 s bajada + 4 s subida", rest: "60–90 s entre series" },
          3: { mod: "Sobre cajón o disco de peso. 5–8 kg. Descender por debajo del nivel de los pies.", series: "3 × 6", tempo: "5 s bajada + 2 s fondo + 5 s subida", rest: "60–90 s entre series" },
        }},
      { id: "cossack", name: "Cossack Squat", sub: "Movilidad activa de aductores y cadera",
        contra: "Lesión ligamentaria de rodilla aguda, condromalacia severa. Relativo: varo/valgo marcado, FAI unilateral.",
        levels: {
          1: { mod: "Asistido: manos en marco de puerta o TRX. Rango parcial, máximo 45° de flexión de rodilla.", series: "2 × 6 por lado", tempo: "3 s descenso + 2 s pausa + 2 s subida", rest: "45 s entre lados" },
          2: { mod: "Sin asistencia. Manos en suelo si falta rango. Talón de pierna extendida apoyado en suelo.", series: "3 × 8 por lado", tempo: "3 s + 2 s pausa + 2 s subida", rest: "45 s entre lados" },
          3: { mod: "Sin apoyo + kettlebell 5–10 kg en goblet al pecho.", series: "3 × 8 por lado", tempo: "3 s + 3 s pausa + 2 s subida", rest: "45 s entre lados" },
        }},
      { id: "pect", name: "Liberación Pectoral Menor", sub: "Miofascial + estiramiento pasivo en puerta",
        contra: "Ninguna absoluta. Relativo: fractura reciente de clavícula o cirugía de hombro reciente.",
        levels: {
          1: { mod: "Solo estiramiento pasivo en marco de puerta. Codo a 90° apoyado en el marco. Sin pelota.", series: "2 por lado", tempo: "60 s por lado", rest: "30 s al cambiar brazo" },
          2: { mod: "Pelota de tenis o lacrosse bajo la clavícula + estiramiento pasivo en marco de puerta.", series: "2 por lado", tempo: "90 s liberación + 45 s estiramiento", rest: "30 s al cambiar brazo" },
          3: { mod: "Pelota de lacrosse (alta densidad) + estiramiento activo: brazo en diagonal con 1 kg.", series: "2 por lado", tempo: "90 s liberación + 60 s activo", rest: "30 s al cambiar brazo" },
        }},
      { id: "muneca", name: "Flexores de Antebrazo y Muñeca", sub: "Inhibición miofascial + extensión activa",
        contra: "Síndrome del túnel carpiano agudo. Relativo: epicondilitis activa (reducir presión de pelota).",
        levels: {
          1: { mod: "Solo estiramiento de muñeca en cuadrupedia: dedos apuntando a rodillas, cadera hacia atrás.", series: "2 por brazo", tempo: "60 s continuo", rest: "30 s" },
          2: { mod: "Pelota en flexores del antebrazo (3–5 cm bajo el codo) + cuadrupedia con cadera atrás.", series: "2 por brazo", tempo: "60 s liberación + 60 s cuadrupedia", rest: "30 s" },
          3: { mod: "Pelota + cuadrupedia + extensión activa con banda: curl inverso 3 × 15 reps.", series: "2 por brazo + activo", tempo: "60 s + 60 s + 3 × 15", rest: "30 s" },
        }},
    ],
  },
};

// ─── HELPERS ─────────────────────────────────────────────
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

// ─── MOVILIDAD COMPONENTS ────────────────────────────────
function MovBlock({ ex, level, lv }) {
  const [open, setOpen] = useState(false);
  const d = ex.levels[level];
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`,
      borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ padding: "11px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: 700, fontFamily: "Poppins" }}>
            {ex.name}
          </span>
          <button onClick={() => setOpen(o => !o)}
            style={{ background: open ? `${C.red}22` : "none",
              border: `1px solid ${open ? C.red + "66" : C.border}`,
              borderRadius: 5, padding: "2px 8px", cursor: "pointer",
              color: open ? C.red : C.muted, fontSize: 10, fontWeight: 700, fontFamily: "Poppins" }}>
            CI
          </button>
        </div>
        <div style={{ color: C.sub, fontSize: 11, marginBottom: 8, fontFamily: "Poppins" }}>{ex.sub}</div>
        {open && (
          <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`,
            borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ color: C.red, fontSize: 12, lineHeight: 1.5, fontFamily: "Poppins" }}>
              {ex.contra}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 3, borderRadius: 2, background: lv.border,
            alignSelf: "stretch", flexShrink: 0 }} />
          <span style={{ color: C.text, fontSize: 12, lineHeight: 1.55, fontFamily: "Poppins" }}>
            {d.mod}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {[["Series/Reps", d.series], ["Tempo", d.tempo], ["Descanso", d.rest]].map(([k, v]) => (
            <div key={k} style={{ background: C.card, borderRadius: 7, padding: "6px 8px" }}>
              <div style={{ color: C.muted, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, fontFamily: "Poppins" }}>
                {k}
              </div>
              <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "Poppins" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovilidadTab({ nivel }) {
  const [movSess, setMovSess] = useState("A");
  const levelNum = MOV_NIVEL[nivel] || 2;
  const lv = MOV_META[levelNum];
  const sess = MOV_SESSIONS[movSess];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", padding: "3px 12px", borderRadius: 99,
          background: lv.bg, border: `1px solid ${lv.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: lv.text, fontFamily: "Poppins" }}>
            {lv.label}
          </span>
        </span>
        <span style={{ color: C.muted, fontSize: 11, fontFamily: "Poppins" }}>Según nivel del plan</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {Object.entries(MOV_SESSIONS).map(([key, val]) => (
          <button key={key} onClick={() => setMovSess(key)}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10,
              border: movSess === key ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
              background: movSess === key ? C.accentA : C.card,
              color: movSess === key ? C.accent : C.sub,
              cursor: "pointer", textAlign: "left", fontWeight: movSess === key ? 700 : 400 }}>
            <div style={{ fontSize: 13, fontFamily: "Poppins" }}>{val.label}</div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400, marginTop: 2, fontFamily: "Poppins" }}>
              {val.sub}
            </div>
          </button>
        ))}
      </div>
      <div style={{ background: C.goldA, border: `1px solid ${C.gold}44`, borderRadius: 9,
        padding: "10px 12px", marginBottom: 14, color: C.gold, fontSize: 12,
        lineHeight: 1.5, fontFamily: "Poppins" }}>
        {sess.tip}
      </div>
      {sess.exercises.map(ex => (
        <MovBlock key={ex.id} ex={ex} level={levelNum} lv={lv} />
      ))}
      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 9,
        border: `1px solid ${C.border}`, background: C.card,
        display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ color: C.red, fontSize: 13, flexShrink: 0 }}>⚠️</span>
        <span style={{ color: C.muted, fontSize: 11, lineHeight: 1.5, fontFamily: "Poppins" }}>
          El botón <strong style={{ color: C.sub }}>CI</strong> muestra contraindicaciones del ejercicio.
          Revísalas si tienes lesiones activas o molestias previas.
        </span>
      </div>
    </div>
  );
}

// ─── PLAN TAB ─────────────────────────────────────────────
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
            border: `1px solid ${isCur ? C.accent : C.border}`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ background: C.accentA, border: `1px solid ${C.accent}44`,
                borderRadius: 8, padding: "4px 8px", textAlign: "center", minWidth: 42 }}>
                <div style={{ color: C.accent, fontSize: 12, fontWeight: 800, fontFamily: "Antonio" }}>
                  {w.id}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {done > 0 && (
                  <span style={{ background: C.greenA, color: C.green, fontSize: 9,
                    fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                    fontFamily: "Poppins", marginBottom: 4, display: "inline-block" }}>
                    {done}/{w.sesiones.length} ✓
                  </span>
                )}
                <PseBar target={w.pse} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {w.sesiones.map(s => {
                const lg = logs[`${w.id}_${s.num}`];
                const tc = TIPO_COLOR[s.type?.toLowerCase()] || C.sub;
                return (
                  <button key={s.num} onClick={() => onSelect(w.id, s.num)}
                    style={{ flex: 1, minWidth: 60,
                      background: lg?.completed ? C.greenA : lg?.pse ? C.accentA : C.cardAlt,
                      border: `1px solid ${lg?.completed ? C.green : lg?.pse ? C.accent : C.border}`,
                      borderRadius: 8, padding: "6px 4px", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ color: lg?.completed ? C.green : lg?.pse ? C.accent : C.sub,
                      fontSize: 11, fontWeight: 700, fontFamily: "Poppins" }}>S{s.num}</div>
                    <div style={{ fontSize: 8, color: tc, marginTop: 2,
                      fontWeight: 600, fontFamily: "Poppins" }}>{s.type?.toUpperCase()}</div>
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

// ─── SESIÓN TAB ───────────────────────────────────────────
function SesionTab({ semanas, week, session, logs, onWeekChange, onSessionChange, onLog }) {
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);
  const lg = logs[`${week}_${session}`];
  const tc = TIPO_COLOR[sd?.type?.toLowerCase()] || C.accent;

  // Lógica de recomendación de movilidad
  const isLightSession = sd?.type?.toLowerCase() === "alta" || sd?.type?.toLowerCase() === "regen.";
  const movRec = sd
    ? isLightSession
      ? { sess: "B", color: C.teal,   msg: "Sesión B · Post-sesión (15–18 min) — al finalizar esta sesión." }
      : { sess: "A", color: C.accent, msg: "Sesión A · Pre-sesión (10–12 min) — antes del bloque principal." }
    : null;

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
              borderRadius: 7, padding: "4px 9px", cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0 }}>
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
          {sd.cal > 0 && (
            <span style={{ background: C.card, borderRadius: 7, padding: "3px 9px",
              color: C.sub, fontSize: 11, fontFamily: "Poppins" }}>🔥 Cal. {sd.cal} min</span>
          )}
          {sd.vac > 0 && (
            <span style={{ background: C.card, borderRadius: 7, padding: "3px 9px",
              color: C.sub, fontSize: 11, fontFamily: "Poppins" }}>🧊 VaC {sd.vac} min</span>
          )}
          {lg?.pse && (
            <span style={{ background: C.accentA, borderRadius: 7, padding: "3px 9px",
              color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: "Poppins" }}>
              PSE real: {lg.pse}
            </span>
          )}
        </div>
      </div>

      {/* Advertencia y nota */}
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

      {/* Botón registro */}
      <button onClick={onLog}
        style={{ width: "100%", background: lg?.pse ? C.greenA : C.accentA,
          border: `1px solid ${lg?.pse ? C.green : C.accent}`,
          borderRadius: 10, padding: "12px", cursor: "pointer",
          color: lg?.pse ? C.green : C.accent, fontSize: 13,
          fontWeight: 700, fontFamily: "Poppins", marginBottom: 12 }}>
        {lg?.pse ? `✓ Ver registro (PSE real: ${lg.pse})` : "📝 Registrar esta sesión"}
      </button>

      {/* Recordatorio de movilidad */}
      {movRec && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "11px 13px" }}>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, fontFamily: "Poppins" }}>
            🧘 Movilidad recomendada
          </div>
          <div style={{ color: movRec.color, fontSize: 13, lineHeight: 1.5, fontFamily: "Poppins" }}>
            {movRec.msg}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 3, fontFamily: "Poppins" }}>
            Ver pestaña 🧘 Movilidad para los ejercicios de tu nivel.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRUEBAS DEL PROTOCOLO ────────────────────────────────
const PRUEBAS_TEST = [
  { id: 'barras_lastre_kg',         label: 'T2 · Barras con máximo lastre',     unidad: 'kg',  desc: '1RM dominada con lastre adicional' },
  { id: 'suspensiones_20mm_kg',     label: 'T4 · Suspensiones en regleta 20mm', unidad: 'kg',  desc: 'Isométrica 5 seg con máximo lastre' },
  { id: 'repeticiones_regleta_rep', label: 'T5 · Repeticiones en regleta',      unidad: 'rep', desc: 'Máximo de repeticiones al fallo' },
  { id: 'resistencia_continua_seg', label: 'T6 · Resistencia continua',         unidad: 'seg', desc: 'Suspensión isométrica máxima' },
  { id: 'campus_movimientos',       label: 'T7 · Campus movimientos',            unidad: 'mov', desc: 'Total de movimientos en tabla campus' },
  { id: 'grado_critico_un',         label: 'T9 · Grado crítico',                unidad: 'un',  desc: 'Grado de vía encadenado al 70%' },
  { id: 'powerslab_d_cm',           label: 'Powerslab Derecho',                 unidad: 'cm',  desc: 'Alcance máximo brazo derecho' },
  { id: 'powerslab_i_cm',           label: 'Powerslab Izquierdo',               unidad: 'cm',  desc: 'Alcance máximo brazo izquierdo' },
  { id: 'circuito_min',             label: 'Circuito estándar',                 unidad: 'min', desc: 'Tiempo de completación del circuito' },
];
const SEM_TEST = [
  { v: 'verde',    label: 'Óptimo',     bg: '#052010', border: '#22c55e60', color: '#22c55e' },
  { v: 'amarillo', label: 'Regular',    bg: '#1a1200', border: '#f59e0b60', color: '#f59e0b' },
  { v: 'rojo',     label: 'Por mejorar',bg: '#200505', border: '#ef444460', color: '#ef4444' },
];

// ─── REGISTRO TAB ─────────────────────────────────────────
function RegistroTab({ week, session, semanas, logs, setLogs, storageKey, testSesiones }) {
  const ZONES = ["Dedos D", "Dedos I", "Codo D", "Codo I", "Hombro D", "Hombro I", "Espalda"];
  const logKey = `${week}_${session}`;
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);

  // Detectar si es sesión de test
  const testSesion = testSesiones?.find(t => t.semanaCode === week) || null;
  const esTest = testSesion !== null && session === 1;

  const initDraft = {
    pse: "", notas: "", regleta: "", tiempo: "", completed: false,
    ...ZONES.reduce((a, z) => ({ ...a, [`p_${z}`]: "0" }), {}),
    ...PRUEBAS_TEST.reduce((a, p) => ({ ...a, [`t_${p.id}`]: '', [`tsem_${p.id}`]: 'verde' }), {})
  };
  const [draft, setDraft] = useState(initDraft);
  const [saved, setSaved] = useState("");
  const [testError, setTestError] = useState('');

  useEffect(() => {
    const stored = logs[logKey];
    setDraft(stored ? { ...initDraft, ...stored } : initDraft);
  }, [logKey]);

  const save = async () => {
    const entry = { ...draft, date: new Date().toLocaleDateString("es-CO"), week, session };
    const all = { ...logs, [logKey]: entry };
    setLogs(all);
    setTestError('');
    try { localStorage.setItem(storageKey, JSON.stringify(all)); } catch {}

    // Si es sesión de test, enviar resultados al backend
    if (esTest && testSesion?.id) {
      const resultados = PRUEBAS_TEST
        .filter(p => draft[`t_${p.id}`] !== '' && !isNaN(parseFloat(draft[`t_${p.id}`])))
        .map(p => ({ metrica: p.id, valor: parseFloat(draft[`t_${p.id}`]), unidad: p.unidad, semaforo: draft[`tsem_${p.id}`] || 'verde' }));

      if (resultados.length > 0) {
        try {
          await api.registrarMiTest(testSesion.id, resultados);
          setSaved("✓ Test y registro guardados");
        } catch (e) {
          if (e.status === 409) setSaved("✓ Registro guardado · test ya registrado");
          else { setTestError(e.error || 'Error al guardar test. Intenta de nuevo.'); setSaved(''); return; }
        }
      } else {
        setSaved("✓ Guardado");
      }
    } else {
      setSaved("✓ Guardado");
    }
    setTimeout(() => setSaved(""), 3000);
  };

  const history = Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);

  return (
    <div>
      <div style={{ background: C.accentA, border: `1px solid ${C.accent}44`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700,
          letterSpacing: 1, marginBottom: 3, fontFamily: "Poppins" }}>REGISTRO ACTUAL</div>
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

      {/* Resultados del test — solo en semanas S0/S12 sesión 1 */}
      {esTest && (
        <div style={{ background: '#130e00', border: '1px solid #f59e0b30', borderRadius: 11, padding: "12px", marginBottom: 9 }}>
          <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 4, fontFamily: "Poppins" }}>
            Resultados del test · Protocolo Hörst
          </div>
          <div style={{ color: C.sub, fontSize: 10, fontFamily: "Poppins", marginBottom: 10 }}>
            Ingresa los valores que obtuviste. Deja en blanco los que no realizaste.
          </div>
          {PRUEBAS_TEST.map(p => (
            <div key={p.id} style={{ background: C.cardAlt, borderRadius: 8, padding: "9px 10px", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "Poppins" }}>{p.label}</div>
                  <div style={{ color: C.muted, fontSize: 9, fontFamily: "Poppins", marginTop: 1 }}>{p.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <input
                    type="number" step="0.1" min="0" placeholder="—"
                    value={draft[`t_${p.id}`]}
                    onChange={e => setDraft(d => ({ ...d, [`t_${p.id}`]: e.target.value }))}
                    style={{ width: 68, padding: "5px 7px", background: '#111', border: `1px solid ${C.border}`,
                      borderRadius: 6, color: C.text, fontFamily: "Antonio", fontSize: 14, textAlign: "right",
                      outline: "none" }}
                  />
                  <span style={{ color: C.muted, fontSize: 10, fontFamily: "Poppins", width: 24 }}>{p.unidad}</span>
                </div>
              </div>
              {draft[`t_${p.id}`] !== '' && (
                <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                  {SEM_TEST.map(s => (
                    <button key={s.v} onClick={() => setDraft(d => ({ ...d, [`tsem_${p.id}`]: s.v }))}
                      style={{ flex: 1, padding: "3px 5px", borderRadius: 5,
                        border: `1px solid ${draft[`tsem_${p.id}`] === s.v ? s.border : C.border}`,
                        background: draft[`tsem_${p.id}`] === s.v ? s.bg : 'transparent',
                        color: draft[`tsem_${p.id}`] === s.v ? s.color : C.muted,
                        fontFamily: "Poppins", fontSize: 9, fontWeight: draft[`tsem_${p.id}`] === s.v ? 700 : 400,
                        cursor: "pointer" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {testError && (
            <div style={{ padding: "7px 10px", background: "#200505", border: "1px solid #ef444440",
              borderRadius: 7, color: "#ef4444", fontSize: 11, fontFamily: "Poppins", marginTop: 6 }}>
              {testError}
            </div>
          )}
          {!testSesion?.id && (
            <div style={{ color: C.muted, fontSize: 10, fontFamily: "Poppins", marginTop: 4 }}>
              ℹ️ Conéctate con tu grupo activo para guardar los resultados en el sistema.
            </div>
          )}
        </div>
      )}

      {/* Hangboard (solo si no es sesión de test) */}
      {!esTest && <div style={{ background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" }}>Hangboard (si aplica)</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["regleta", "Regleta usada", "ej: 18 mm"], ["tiempo", "Tiempo aguantado", "ej: 7 seg"]].map(([key, label, ph]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: "Poppins" }}>{label}</div>
              <input value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                placeholder={ph}
                style={{ width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`,
                  borderRadius: 7, padding: "7px 9px", color: C.text, fontSize: 12,
                  outline: "none", boxSizing: "border-box", fontFamily: "Poppins" }} />
            </div>
          ))}
        </div>
      </div>}

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
            const [wid, snum] = k.split("_");
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
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 600,
                    fontFamily: "Poppins", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

// ─── PANTALLAS ESPECIALES ─────────────────────────────────
function Skeleton() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 0", textAlign: "center" }}>
      <div style={{ color: C.sub, fontFamily: "Poppins", fontSize: 14 }}>Cargando tu plan...</div>
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
        Para acceder al plan debes tener tu ciclo al día.
        Revisa el estado de tus pagos o contacta a tu entrenador.
      </p>
      <button onClick={() => navigate("/app/mis-pagos")}
        style={{ background: C.accent, border: "none", borderRadius: 8, padding: "12px 28px",
          cursor: "pointer", color: "#121212", fontSize: "0.9rem",
          fontWeight: 700, fontFamily: "Poppins", marginRight: 12 }}>
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
        Aún no tienes un grupo activo asignado. Habla con tu entrenador.
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

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────
const TABS = [
  { id: "plan",      label: "🗓️ Plan"      },
  { id: "sesion",    label: "💪 Sesión"    },
  { id: "registro",  label: "✏️ Registro"  },
  { id: "movilidad", label: "🧘 Movilidad" },
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

  useEffect(() => {
    setLoading(true);
    api.getMyPlan()
      .then(data => {
        setPlan(data);
        setWeek(data.semanas?.[0]?.id || null);
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) setLogs(JSON.parse(stored));
        } catch {}
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [storageKey]);

  const goToSession = (w, s) => { setWeek(w); setSession(s); setTab("sesion"); };

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

  const nivelLabel  = { iniciacion: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" }[plan.nivel] || plan.nivel;
  const nivelColor  = NIVEL_COLOR[plan.nivel] || C.accent;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontFamily: "Antonio, sans-serif", fontSize: "1.8rem", color: C.text }}>
            {plan.trimestre} — Plan de Entrenamiento
          </h1>
          <span style={{ background: `${nivelColor}22`, color: nivelColor, fontSize: 10,
            fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            fontFamily: "Poppins", whiteSpace: "nowrap" }}>
            {nivelLabel}
          </span>
        </div>
        <p style={{ color: C.sub, fontSize: "0.85rem", fontFamily: "Poppins" }}>
          {plan.nombre} · {plan.semanas.length} semanas
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
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
          logs={logs} setLogs={setLogs} storageKey={storageKey} testSesiones={plan.testSesiones} />
      )}
      {tab === "movilidad" && (
        <MovilidadTab nivel={plan.nivel} />
      )}
    </div>
  );
}
