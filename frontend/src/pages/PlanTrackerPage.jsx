/**
 * frontend/src/pages/PlanTrackerPage.jsx
 * Tracker universal T1–T4 × Iniciación/Intermedio/Avanzado
 * con módulo de Movilidad integrado (Sesión A / Sesión B × 3 niveles)
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  ZONAS, PERFIL_VACIO, ESCALA_VIA, ESCALA_BLOQUE, cargarPerfil, guardarPerfil,
  camposFaltantes, perfilCompleto, perfilDesdeTestS0, calcularParametros, fmtRangoKg,
} from "../plan/perfil";
import { personalizarBloques } from "../plan/personalizar";
import { evaluarSobrecarga, esSobrecarga, dolorVigente, regletaPrevia, aplicarAdaptaciones } from "../plan/adaptacion";
import {
  seriePse, mapaDolor, serieHangboard, esSesionTest, objetivoSalida, evaluarSalida,
  exportarCSV, exportarJSON, descargar,
} from "../plan/progresion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from "recharts";

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

function FichaSeccion({ titulo, color, children }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ color, fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
        textTransform: "uppercase", marginBottom: 4, fontFamily: "Poppins" }}>{titulo}</div>
      {children}
    </div>
  );
}

function Ficha({ f }) {
  const txt = { color: C.text, fontSize: 12, lineHeight: 1.55, fontFamily: "Poppins" };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "4px 11px 11px", marginBottom: 8 }}>
      <FichaSeccion titulo="Posición y ejecución" color={C.teal}>
        <ol style={{ margin: 0, paddingLeft: 18, listStyle: "decimal", color: C.teal }}>
          {f.como.map((t, i) => <li key={i} style={{ ...txt, marginBottom: 3 }}>{t}</li>)}
        </ol>
      </FichaSeccion>
      {f.errores?.length > 0 && (
        <FichaSeccion titulo="Errores frecuentes" color={C.orange}>
          {f.errores.map((t, i) => <div key={i} style={{ ...txt, marginBottom: 2 }}>✕ {t}</div>)}
        </FichaSeccion>
      )}
      {f.calidad && (
        <FichaSeccion titulo="Criterio de calidad" color={C.green}>
          <div style={txt}>{f.calidad}</div>
        </FichaSeccion>
      )}
      {f.parada && f.parada !== "—" && (
        <FichaSeccion titulo="Señal de parada" color={C.red}>
          <div style={txt}>{f.parada}</div>
        </FichaSeccion>
      )}
    </div>
  );
}

function Block({ b }) {
  const [open, setOpen] = useState(false);
  const [como, setComo] = useState(false);
  const hasParams = b.params && b.params.length > 0;
  const expandible = hasParams || b.ficha || b.avisos?.length > 0;

  if (b.bloqueado) {
    return (
      <div style={{ background: C.redA, border: `1px dashed ${C.red}55`, borderRadius: 10,
        padding: "10px 13px", marginBottom: 8, opacity: 0.75 }}>
        <div style={{ color: C.sub, fontSize: 12, fontWeight: 600, fontFamily: "Poppins",
          textDecoration: "line-through" }}>{b.n}</div>
        <div style={{ color: C.red, fontSize: 11, marginTop: 3, lineHeight: 1.5, fontFamily: "Poppins" }}>
          {b.motivoBloqueo}
        </div>
      </div>
    );
  }

  if (b.oculto) {
    return (
      <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10,
        padding: "10px 13px", marginBottom: 8, opacity: 0.6 }}>
        <div style={{ color: C.sub, fontSize: 12, fontWeight: 600, fontFamily: "Poppins",
          textDecoration: "line-through" }}>{b.n}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 3, lineHeight: 1.5, fontFamily: "Poppins" }}>
          {b.motivoOculto}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`,
      borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={() => expandible && setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "10px 13px", cursor: expandible ? "pointer" : "default" }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text,
          lineHeight: 1.3, fontFamily: "Poppins" }}>{b.n}</span>
        {b.avisos?.length > 0 && <span style={{ fontSize: 12 }}>⚠️</span>}
        {expandible && (
          <span style={{ color: C.muted, fontSize: 13, display: "inline-block",
            transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        )}
      </div>
      {open && expandible && (
        <div style={{ padding: "0 13px 13px" }}>
          {b.avisos?.map((a, i) => (
            <div key={i} style={{ background: C.goldA, border: `1px solid ${C.gold}33`, borderRadius: 7,
              padding: "7px 10px", marginBottom: 8, color: C.gold, fontSize: 11, lineHeight: 1.5,
              fontFamily: "Poppins" }}>{a}</div>
          ))}
          {b.ficha && (
            <>
              <button onClick={() => setComo(c => !c)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 6,
                  background: como ? C.tealA : "transparent", border: `1px solid ${como ? C.teal : C.border}`,
                  borderRadius: 7, padding: "7px 10px", cursor: "pointer", marginBottom: 8,
                  color: C.teal, fontSize: 12, fontWeight: 700, fontFamily: "Poppins" }}>
                <span style={{ flex: 1, textAlign: "left" }}>📘 ¿Cómo se hace?</span>
                <span style={{ display: "inline-block", transform: como ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s" }}>▾</span>
              </button>
              {como && <Ficha f={b.ficha} />}
            </>
          )}
          {hasParams && b.params.map(([k, v], i) => (
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
const SUGERENCIA_AMARILLO = {
  dedos: "usa una regleta 2 tamaños más grande o agarre abierto en vez de arqueado.",
  codo: "tracción con lastre −30% y sin excéntricos en esta sesión.",
  hombro: "sin bloqueos dinámicos y campus reducido.",
  espalda: "reduce la carga del core y evita posiciones que provoquen dolor.",
};

function SesionTab({ plan, week, session, logs, calc, perfil, onWeekChange, onSessionChange, onLog, onPerfil, onOverride }) {
  const semanas = plan.semanas;
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);
  const lg = logs[`${week}_${session}`];
  const override = !!lg?.override_dolor;
  const { bloques, alertas } = useMemo(() => {
    if (!sd) return { bloques: [], alertas: { amarillo: [], rojo: [] } };
    const { reducciones } = evaluarSobrecarga(semanas, logs);
    return aplicarAdaptaciones(personalizarBloques(plan, week, sd, calc), {
      reduccion: reducciones[week],
      dolor: dolorVigente(semanas, logs, week, session, perfil),
      regleta: regletaPrevia(semanas, logs, week, session),
      calc,
      override,
    });
  }, [plan, semanas, week, session, sd, calc, logs, perfil, override]);
  const fuenteDolor = f => (f === "perfil" ? "tu perfil" : `el registro de ${f.replace("_", "·S")}`);
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
          {sd.ai && (
            <span style={{ background: C.tealA, color: C.teal, fontSize: 9,
              fontWeight: 700, padding: "2px 7px", borderRadius: 999, fontFamily: "Poppins" }}>
              ✨ Personalizada{sd.aiRevisado ? " · revisada" : ""}
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

      {/* Adaptaciones (Fase 2) */}
      {alertas.naranja && (
        <div style={{ background: C.orangeA, border: `1px solid ${C.orange}55`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 10, color: C.orange, fontSize: 12,
          lineHeight: 1.5, fontFamily: "Poppins" }}>{alertas.naranja}</div>
      )}
      {alertas.rojo.length > 0 && (
        <div style={{ background: C.redA, border: `1px solid ${C.red}`, borderRadius: 9,
          padding: "11px 12px", marginBottom: 10, fontFamily: "Poppins" }}>
          {alertas.rojo.map(r => (
            <div key={r.grupo} style={{ color: C.red, fontSize: 12, fontWeight: 700, lineHeight: 1.5, marginBottom: 4 }}>
              🔴 Dolor nivel {r.nivel} en {r.zona}. Sesión suspendida para {r.grupo}. Consulta fisioterapia antes de continuar.
              <div style={{ color: C.sub, fontSize: 10, fontWeight: 400 }}>Fuente: {fuenteDolor(r.fuente)}</div>
            </div>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer",
            color: override ? C.red : C.sub, fontSize: 11 }}>
            <input type="checkbox" checked={override} onChange={e => onOverride(e.target.checked, alertas.rojo)}
              style={{ accentColor: C.red }} />
            Continuar bajo mi responsabilidad {override && `· registrado ${new Date(lg.override_dolor.ts).toLocaleString("es-CO")}`}
          </label>
        </div>
      )}
      {alertas.amarillo.length > 0 && (
        <div style={{ background: C.goldA, border: `1px solid ${C.gold}55`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 10, fontFamily: "Poppins" }}>
          {alertas.amarillo.map(a => (
            <div key={a.grupo} style={{ color: C.gold, fontSize: 12, lineHeight: 1.5, marginBottom: 3 }}>
              🟡 Dolor nivel 3 en {a.zona} ({fuenteDolor(a.fuente)}): {SUGERENCIA_AMARILLO[a.grupo]}
            </div>
          ))}
        </div>
      )}

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

      {!calc && (
        <div onClick={onPerfil} style={{ background: C.tealA, border: `1px solid ${C.teal}44`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 10, color: C.teal, fontSize: 12, lineHeight: 1.5,
          fontFamily: "Poppins", cursor: "pointer" }}>
          👤 Completa tu perfil para ver cargas en kg y grados calculados para ti →
        </div>
      )}

      {/* Bloques */}
      {bloques.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
            textTransform: "uppercase", marginBottom: 8, fontFamily: "Poppins" }}>
            Bloques de la sesión
          </div>
          {bloques.map((b, i) => <Block key={`${week}_${session}_${i}`} b={b} />)}
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
  { id: 'repeticiones_regleta_rep', label: 'T5 · Máximo dominadas seguidas',    unidad: 'rep', desc: 'Sin lastre · sin balanceo ni rebote' },
  { id: 'resistencia_continua_seg', label: 'T6 · Resistencia continua',         unidad: 'seg', desc: 'Suspensión isométrica máxima' },
  { id: 'campus_movimientos',       label: 'T7 · Campus movimientos',            unidad: 'mov', desc: 'Total de movimientos en tabla campus' },
  { id: 'grado_critico_un',         label: 'T9 · Abdominales en suspensión',    unidad: 'rep', desc: 'Piernas rectas hasta las manos · con control' },
  { id: 'powerslab_d_cm',           label: 'Powerslab Derecho',                 unidad: 'cm',  desc: 'Alcance máximo brazo derecho' },
  { id: 'powerslab_i_cm',           label: 'Powerslab Izquierdo',               unidad: 'cm',  desc: 'Alcance máximo brazo izquierdo' },
  { id: 'circuito_min',             label: 'Circuito estándar',                 unidad: 'mov', desc: 'Movimientos completados en 1 intento' },
];
const SEM_TEST = [
  { v: 'verde',    label: 'Óptimo',     bg: '#052010', border: '#22c55e60', color: '#22c55e' },
  { v: 'amarillo', label: 'Regular',    bg: '#1a1200', border: '#f59e0b60', color: '#f59e0b' },
  { v: 'rojo',     label: 'Por mejorar',bg: '#200505', border: '#ef444460', color: '#ef4444' },
];

// ─── REGISTRO TAB ─────────────────────────────────────────
function RegistroTab({ week, session, semanas, trimestre, logs, setLogs, storageKey, testSesiones, perfil }) {
  const ZONES = ["Dedos D", "Dedos I", "Codo D", "Codo I", "Hombro D", "Hombro I", "Espalda"];
  const logKey = `${week}_${session}`;
  const wd = semanas.find(w => w.id === week);
  const sd = wd?.sesiones.find(s => s.num === session);

  // Detectar si es sesión de test
  // S0: sesión 1 · S12: la sesión "TEST DE SALIDA" (sesión 2 en T1 Avanzado).
  // El formulario se muestra siempre; el envío al backend solo si hay sesión de test en el grupo.
  const testSesion = testSesiones?.find(t => t.semanaCode === week) || null;
  const esTest = esSesionTest(week, sd, wd);
  const esSalida = esTest && week === "S12";

  const initDraft = {
    pse: "", notas: "", regleta: "", tiempo: "", completed: false,
    ...ZONES.reduce((a, z) => ({ ...a, [`p_${z}`]: "0" }), {}),
    ...PRUEBAS_TEST.reduce((a, p) => ({ ...a, [`t_${p.id}`]: '', [`tsem_${p.id}`]: 'verde' }), {})
  };
  const [draft, setDraft] = useState(initDraft);
  const [saved, setSaved] = useState("");
  const [testError, setTestError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const stored = logs[logKey];
    setDraft(stored ? { ...initDraft, ...stored } : initDraft);
    setAviso('');
  }, [logKey]);

  const save = async () => {
    const entry = {
      ...draft, date: new Date().toLocaleDateString("es-CO"), ts: new Date().toISOString(), week, session,
      pse_objetivo: sd?.pse ?? null,
      sobrecarga: esSobrecarga(draft.pse, sd?.pse),
    };
    const all = { ...logs, [logKey]: entry };
    if (draft.pse !== "") {
      // n8n flujo 2 ajusta la sesión siguiente; si falla no afecta el registro local
      api.reportarSesion({
        trimestre, semana: week, sesionNum: session, pse: Number(draft.pse), pseObjetivo: sd?.pse ?? null,
        dolor: Object.fromEntries(ZONAS.map(z => [z.key, Number(draft[`p_${z.label}`] || 0)])),
        notas: draft.notas || "",
      }).catch(() => {});
    }
    const antes = evaluarSobrecarga(semanas, logs).reducciones;
    const nueva = Object.entries(evaluarSobrecarga(semanas, all).reducciones).find(([w]) => !antes[w]);
    setAviso(nueva
      ? `⚠️ Segunda sesión seguida con PSE ≥2 sobre el objetivo: el volumen de ${nueva[0]} se reduce un 20%.`
      : entry.sobrecarga ? `PSE ${draft.pse} supera en 2 o más el objetivo (${sd.pse}). Si se repite en la próxima sesión, se reducirá el volumen de la semana siguiente.` : "");
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

      {/* Resultados del test — S0 (línea base) y S12 (salida, comparada con S0) */}
      {esTest && (
        <div style={{ background: '#130e00', border: '1px solid #f59e0b30', borderRadius: 11, padding: "12px", marginBottom: 9 }}>
          <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 4, fontFamily: "Poppins" }}>
            Resultados del test · Protocolo Hörst
          </div>
          <div style={{ color: C.sub, fontSize: 10, fontFamily: "Poppins", marginBottom: 10 }}>
            Ingresa los valores que obtuviste. Deja en blanco los que no realizaste.
            {esSalida && " Cada resultado se compara con tu línea base S0 del perfil."}
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
              {esSalida && (() => {
                const obj = objetivoSalida(p.id, perfil);
                const ev = evaluarSalida(p.id, draft[`t_${p.id}`], perfil);
                if (!obj) return null;
                const col = ev?.cumple === true ? C.green : ev?.cumple === false ? C.red : C.sub;
                return (
                  <div style={{ marginTop: 5, fontSize: 10, lineHeight: 1.5, fontFamily: "Poppins" }}>
                    <div style={{ color: C.sub }}>{obj.texto}</div>
                    {ev && (
                      <div style={{ color: col, fontWeight: 700 }}>
                        {ev.cumple === true ? "✓ Cumplido · " : ev.cumple === false ? "✕ No cumplido · " : ""}{ev.texto}
                      </div>
                    )}
                  </div>
                );
              })()}
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
          fontWeight: 700, marginBottom: aviso ? 10 : 20, fontFamily: "Poppins" }}>
        {saved || "Guardar registro"}
      </button>
      {aviso && (
        <div style={{ background: C.orangeA, border: `1px solid ${C.orange}55`, borderRadius: 9,
          padding: "10px 12px", marginBottom: 20, color: C.orange, fontSize: 12,
          lineHeight: 1.5, fontFamily: "Poppins" }}>{aviso}</div>
      )}

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

// ─── PROGRESIÓN (dashboard) ───────────────────────────────
const NIVEL_DOLOR = v => (v >= 4 ? { bg: C.redA, bd: C.red, c: C.red }
  : v === 3 ? { bg: C.goldA, bd: C.gold, c: C.gold }
  : v > 0 ? { bg: C.greenA, bd: `${C.green}55`, c: C.green }
  : { bg: C.cardAlt, bd: "transparent", c: C.muted });

function TooltipBox({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
      fontSize: 11, color: C.text, fontFamily: "Poppins", lineHeight: 1.5, maxWidth: 220 }}>
      {render(payload[0].payload)}
    </div>
  );
}

function PuntoPse({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return payload.sobrecarga
    ? <g><circle cx={cx} cy={cy} r={6} fill={C.red} stroke={C.card} strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill={C.red}>▲</text></g>
    : <circle cx={cx} cy={cy} r={4} fill={C.teal} stroke={C.card} strokeWidth={2} />;
}

function ProgresionView({ plan, logs, perfil }) {
  const [tabla, setTabla] = useState(false);
  const pse = useMemo(() => seriePse(plan.semanas, logs), [plan, logs]);
  const dolor = useMemo(() => mapaDolor(plan.semanas, logs), [plan, logs]);
  const hang = useMemo(() => serieHangboard(plan.semanas, logs), [plan, logs]);
  const sobrecargas = pse.filter(p => p.sobrecarga).length;

  const card = { background: C.card, borderRadius: 11, padding: "12px", marginBottom: 10 };
  const titulo = { color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 4, fontFamily: "Poppins" };
  const sub = { color: C.muted, fontSize: 10, marginBottom: 10, fontFamily: "Poppins" };
  const eje = { fill: C.sub, fontSize: 10, fontFamily: "Poppins" };
  const vacio = txt => <div style={{ color: C.muted, fontSize: 12, padding: "18px 0", textAlign: "center", fontFamily: "Poppins" }}>{txt}</div>;
  const nombreArchivo = ext => `${plan.trimestre}_${plan.nivel}_${(plan.nombre || "escalador").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;
  const btnExport = { flex: 1, background: C.accentA, border: `1px solid ${C.accent}`, borderRadius: 9, padding: "10px",
    cursor: "pointer", color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: "Poppins" };

  return (
    <div>
      {/* PSE real vs objetivo */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div style={{ ...titulo, flex: 1 }}>PSE por sesión</div>
          {pse.length > 0 && (
            <button onClick={() => setTabla(t => !t)} style={{ background: "none", border: "none", color: C.sub,
              fontSize: 10, cursor: "pointer", fontFamily: "Poppins", textDecoration: "underline" }}>
              {tabla ? "Ver gráfico" : "Ver tabla"}
            </button>
          )}
        </div>
        <div style={sub}>
          {pse.length} sesiones registradas{sobrecargas > 0 && ` · ${sobrecargas} con sobrecarga (▲ PSE real ≥2 sobre el objetivo)`}
        </div>
        {pse.length === 0 ? vacio("Registra tu PSE al final de cada sesión para ver la curva.") : tabla ? (
          <div style={{ fontSize: 11, fontFamily: "Poppins" }}>
            {pse.map(p => (
              <div key={p.key} style={{ display: "flex", gap: 8, padding: "4px 0", borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.sub, width: 56 }}>{p.label}</span>
                <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
                <span style={{ color: C.text }}>{p.real}</span>
                <span style={{ color: C.muted }}>/ {p.objetivo ?? "—"}</span>
                <span style={{ width: 14, color: C.red }}>{p.sobrecarga ? "▲" : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pse} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" tick={eje} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={12} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={eje} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ stroke: C.muted, strokeWidth: 1 }} content={<TooltipBox render={d => (
                <>
                  <div style={{ fontWeight: 700 }}>{d.label} · {d.nombre}</div>
                  <div>PSE real: <b>{d.real}</b> · objetivo: {d.objetivo ?? "—"}</div>
                  {d.sobrecarga && <div style={{ color: C.red }}>▲ Sobrecarga</div>}
                </>
              )} />} />
              <Legend verticalAlign="top" height={22} iconType="plainline"
                formatter={v => <span style={{ color: C.sub, fontSize: 10, fontFamily: "Poppins" }}>{v}</span>} />
              <Line name="Objetivo" dataKey="objetivo" type="stepAfter" stroke={C.sub} strokeWidth={2}
                strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
              <Line name="PSE real" dataKey="real" type="linear" stroke={C.teal} strokeWidth={2}
                dot={<PuntoPse />} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mapa de calor de dolor */}
      <div style={card}>
        <div style={titulo}>🚦 Dolor por zona y semana</div>
        <div style={sub}>Máximo registrado en la semana · 0–2 continúa · 3 reduce · 4+ para y fisio</div>
        {dolor.length === 0 ? vacio("Aún no hay semanas registradas.") : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 3, fontFamily: "Poppins", fontSize: 11 }}>
              <thead>
                <tr>
                  <th />
                  {dolor.map(d => <th key={d.semana} style={{ color: C.sub, fontWeight: 600, fontSize: 10, padding: "0 2px" }}>{d.semana}</th>)}
                </tr>
              </thead>
              <tbody>
                {ZONAS.map(z => (
                  <tr key={z.key}>
                    <td style={{ color: C.sub, fontSize: 10, paddingRight: 6, whiteSpace: "nowrap" }}>{z.label}</td>
                    {dolor.map(d => {
                      const v = d.zonas[z.key];
                      const st = NIVEL_DOLOR(v);
                      return (
                        <td key={d.semana} title={`${z.label} · ${d.semana}: nivel ${v}`}
                          style={{ width: 30, height: 26, textAlign: "center", borderRadius: 5, background: st.bg,
                            border: `1px solid ${st.bd}`, color: v >= 3 ? st.c : C.sub, fontWeight: v >= 3 ? 800 : 400 }}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hangboard */}
      <div style={card}>
        <div style={titulo}>🤚 Tiempo aguantado en hangboard</div>
        <div style={sub}>Banda verde: zona objetivo 6–8 seg. El tooltip muestra la regleta usada.</div>
        {hang.length < 2 ? vacio("Anota regleta y tiempo en al menos 2 sesiones para ver la tendencia.") : (
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={hang} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
              <ReferenceArea y1={6} y2={8} fill={C.green} fillOpacity={0.08} stroke="none" />
              <XAxis dataKey="label" tick={eje} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={12} />
              <YAxis tick={eje} tickLine={false} axisLine={false} unit="s" domain={[0, dataMax => Math.max(12, Math.ceil(dataMax + 1))]} />
              <Tooltip cursor={{ stroke: C.muted, strokeWidth: 1 }} content={<TooltipBox render={d => (
                <>
                  <div style={{ fontWeight: 700 }}>{d.label}</div>
                  <div>{d.tiempo} seg{d.regleta ? ` en ${d.regleta} mm` : ""}</div>
                  <div style={{ color: d.tiempo > 8 ? C.gold : d.tiempo < 6 ? C.orange : C.green }}>
                    {d.tiempo > 8 ? "Regleta grande → bajar" : d.tiempo < 6 ? "Regleta pequeña → subir" : "En zona objetivo"}
                  </div>
                </>
              )} />} />
              <Line dataKey="tiempo" stroke={C.teal} strokeWidth={2} dot={{ r: 4, fill: C.teal, stroke: C.card, strokeWidth: 2 }}
                activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Exportación */}
      <div style={card}>
        <div style={titulo}>📤 Exportar trimestre</div>
        <div style={sub}>Todos tus registros, perfil y comparativa S0 vs S12 para compartir con tu entrenador.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnExport}
            onClick={() => descargar(nombreArchivo("csv"), "﻿" + exportarCSV(plan.semanas, logs, PRUEBAS_TEST), "text/csv;charset=utf-8")}>
            CSV (Excel)
          </button>
          <button style={btnExport}
            onClick={() => descargar(nombreArchivo("json"), exportarJSON({ plan, perfil, logs, pruebas: PRUEBAS_TEST }), "application/json")}>
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PERFIL TAB ───────────────────────────────────────────
const CAMPOS_TEST = [
  ["t2", "T2 · Tracción máx. con lastre", "kg extra"],
  ["t4", "T4 · Suspensión 5 seg 20 mm", "kg extra"],
  ["t5", "T5 · Máximo dominadas", "rep"],
  ["t6", "T6 · Suspensión máx. sin lastre", "seg"],
  ["t7", "T7 · Campus máx. movimientos", "mov"],
  ["t9", "T9 · Abdominales en suspensión", "rep"],
  ["powerslabD", "Powerslab mano D", "cm"],
  ["powerslabI", "Powerslab mano I", "cm"],
  ["circuito", "Circuito estándar", "mov"],
];
const CAMPOS_NUM = ["peso", "edad", "anosCampus", ...CAMPOS_TEST.map(([k]) => k)];
const REQ = new Set(["peso", "edad", "t2", "t4", "gradoMaxVista"]);

function PerfilTab({ perfil, logs, nombre, onboarding, onSave }) {
  const [draft, setDraft] = useState(() => {
    const base = perfil || { ...PERFIL_VACIO, nombre: nombre || "", ...perfilDesdeTestS0(logs) };
    return Object.fromEntries(Object.entries(base).map(([k, v]) =>
      [k, CAMPOS_NUM.includes(k) && v !== "" && v != null ? String(v) : v]));
  });
  const [msg, setMsg] = useState("");
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const desdeS0 = perfilDesdeTestS0(logs);
  const hayS0 = Object.keys(desdeS0).length > 0;

  const normalizado = useMemo(() => ({
    ...draft,
    ...Object.fromEntries(CAMPOS_NUM.map(k => [k, draft[k] === "" || draft[k] == null ? "" : Number(draft[k])])),
  }), [draft]);
  const faltan = camposFaltantes(normalizado);
  const calc = faltan.length === 0 ? calcularParametros(normalizado) : null;

  const guardar = () => {
    if (faltan.length) { setMsg(`Falta: ${faltan.join(", ")}`); return; }
    try { onSave(normalizado); setMsg("✓ Perfil guardado"); }
    catch { setMsg("Error al guardar"); }
    setTimeout(() => setMsg(""), 2500);
  };

  const card = { background: C.card, borderRadius: 11, padding: "12px", marginBottom: 9 };
  const titulo = { color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 8, fontFamily: "Poppins" };
  const input = { width: "100%", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "7px 9px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Poppins" };
  const campo = (k, label, unidad, type = "number") => (
    <div>
      <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: "Poppins" }}>
        {label}{REQ.has(k) && <span style={{ color: C.accent }}> *</span>}
        {unidad && <span style={{ color: C.muted }}> · {unidad}</span>}
      </div>
      <input type={type} inputMode={type === "number" ? "decimal" : undefined} step="any"
        value={draft[k] ?? ""} onChange={e => set(k, e.target.value)} style={input} />
    </div>
  );
  const grado = (k, label, escala) => (
    <div>
      <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: "Poppins" }}>
        {label}{REQ.has(k) && <span style={{ color: C.accent }}> *</span>}
      </div>
      <select value={draft[k] || ""} onChange={e => set(k, e.target.value)} style={input}>
        <option value="">—</option>
        {escala.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    </div>
  );
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };

  return (
    <div>
      {onboarding && (
        <div style={{ background: C.accentA, border: `1px solid ${C.accent}44`, borderRadius: 12,
          padding: "13px 14px", marginBottom: 12 }}>
          <div style={{ color: C.accent, fontSize: 14, fontWeight: 700, fontFamily: "Antonio", marginBottom: 4 }}>
            Configura tu perfil para empezar
          </div>
          <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.5, fontFamily: "Poppins" }}>
            Con tu peso, edad, resultados de test y grado máximo, la app calcula tus cargas en kg,
            los grados de cada bloque y las sustituciones según tu estado. Los campos con
            <span style={{ color: C.accent }}> *</span> son obligatorios.
          </div>
        </div>
      )}

      <div style={card}>
        <div style={titulo}>Datos personales</div>
        <div style={grid}>
          <div style={{ gridColumn: "1 / -1" }}>{campo("nombre", "Nombre", null, "text")}</div>
          {campo("peso", "Peso", "kg")}
          {campo("edad", "Edad", "años")}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: "Poppins" }}>Género</div>
            <select value={draft.genero || ""} onChange={e => set("genero", e.target.value)} style={input}>
              <option value="">—</option>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
              <option value="otro">Otro / prefiero no decir</option>
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...titulo, marginBottom: 0, flex: 1 }}>Resultados de test S0 (línea base)</div>
          {hayS0 && (
            <button onClick={() => setDraft(d => ({ ...d, ...Object.fromEntries(Object.entries(desdeS0).map(([k, v]) => [k, String(v)])) }))}
              style={{ background: "transparent", border: `1px solid ${C.teal}66`, borderRadius: 6,
                padding: "3px 8px", color: C.teal, fontSize: 10, cursor: "pointer", fontFamily: "Poppins" }}>
              ↺ Usar mi registro S0
            </button>
          )}
        </div>
        <div style={grid}>
          {CAMPOS_TEST.map(([k, label, u]) => <div key={k}>{campo(k, label, u)}</div>)}
        </div>
      </div>

      <div style={card}>
        <div style={titulo}>Capacidades</div>
        <div style={grid}>
          {grado("gradoMaxVista", "Grado máx. a vista", ESCALA_VIA)}
          {grado("gradoMaxBloque", "Grado máx. bloque", ESCALA_BLOQUE)}
          {campo("anosCampus", "Experiencia en campus", "años")}
        </div>
      </div>

      <div style={card}>
        <div style={titulo}>🚦 Dolor activo por zona (0–4)</div>
        <div style={grid}>
          {ZONAS.map(z => {
            const cur = Number(draft.lesionesActivas?.[z.key] ?? 0);
            return (
              <div key={z.key} style={{ background: C.cardAlt, borderRadius: 8, padding: "7px 9px" }}>
                <div style={{ color: C.sub, fontSize: 10, marginBottom: 5, fontFamily: "Poppins" }}>{z.label}</div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2, 3, 4].map(v => (
                    <button key={v} onClick={() => set("lesionesActivas", { ...draft.lesionesActivas, [z.key]: v })}
                      style={{ width: 22, height: 22, borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: 10,
                        fontFamily: "Poppins",
                        background: cur === v ? (v === 0 ? C.greenA : v <= 2 ? C.accentA : C.redA) : C.border,
                        border: `1px solid ${cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : "transparent"}`,
                        color: cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : C.sub }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {calc && (
        <div style={{ ...card, border: `1px solid ${C.teal}44` }}>
          <div style={{ ...titulo, color: C.teal }}>Tus parámetros calculados</div>
          {[
            ["Tracción con lastre", calc.lastreTraccion && `${fmtRangoKg(calc.lastreTraccion.min, calc.lastreTraccion.max)} (80–85% de T2)`],
            ["Excéntrico S6–S8", calc.lastreExcentrico && `${fmtRangoKg(calc.lastreExcentrico.min, calc.lastreExcentrico.max)} (${calc.lastreExcentrico.pct.join("–")}% de T2${calc.protocoloMayor40 ? " · protocolo +40" : ""})`],
            ["Continuidad", calc.gradoContinuidad],
            ["Técnica / recuperación", calc.gradoTecnica],
            ["Capilarización", calc.gradoCapilarizacion],
            ["Boulder 85% / 90%", calc.gradoBoulder85 && `${calc.gradoBoulder85} / ${calc.gradoBoulder90}`],
            ["Campus", calc.campusApto ? "✓ Apto" : "✕ No apto → fuerza de contacto en muro"],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.sub, fontSize: 10, fontWeight: 700, minWidth: 120, textTransform: "uppercase",
                letterSpacing: 0.4, paddingTop: 2, fontFamily: "Poppins" }}>{k}</span>
              <span style={{ color: C.text, fontSize: 12, flex: 1, fontFamily: "Poppins" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={guardar}
        style={{ width: "100%", background: faltan.length ? C.cardAlt : C.accent,
          border: faltan.length ? `1px solid ${C.border}` : "none", borderRadius: 10, padding: "12px",
          cursor: "pointer", color: faltan.length ? C.sub : "#121212", fontSize: 14, fontWeight: 700,
          marginBottom: 20, fontFamily: "Poppins" }}>
        {msg || (faltan.length ? `Falta: ${faltan.join(", ")}` : onboarding ? "Guardar y empezar" : "Guardar perfil")}
      </button>
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
  { id: "perfil",    label: "👤 Perfil"    },
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
  const [perfil, setPerfil]   = useState(() => (user?.id ? cargarPerfil(user.id) : null));
  const [vistaRegistro, setVistaRegistro] = useState("registrar");

  const storageKey = `plan_logs_${user?.id}`;
  const calc = useMemo(() => (perfilCompleto(perfil) ? calcularParametros(perfil) : null), [perfil]);

  useEffect(() => { if (user?.id) setPerfil(cargarPerfil(user.id)); }, [user?.id]);

  const onSavePerfil = p => { guardarPerfil(user.id, p); setPerfil(cargarPerfil(user.id)); };

  // Override del semáforo rojo: queda registrado en el log de la sesión
  const onOverride = (activo, rojos) => {
    const key = `${week}_${session}`;
    const entry = { ...logs[key], week, session };
    if (activo) entry.override_dolor = { ts: new Date().toISOString(), zonas: rojos.map(r => ({ zona: r.zona, nivel: r.nivel })) };
    else delete entry.override_dolor;
    const all = { ...logs, [key]: entry };
    setLogs(all);
    try { localStorage.setItem(storageKey, JSON.stringify(all)); } catch {}
  };

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
  const onboarding  = !perfilCompleto(perfil);

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
        <span title={plan.fuente === "ai"
            ? `${plan.aiSesiones} sesiones ajustadas a tus resultados del test S0`
            : "Se personaliza cuando registres tu test S0"}
          style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 700, padding: "3px 9px",
            borderRadius: 999, fontFamily: "Poppins",
            background: plan.fuente === "ai" ? C.tealA : C.cardAlt,
            color: plan.fuente === "ai" ? C.teal : C.sub,
            border: `1px solid ${plan.fuente === "ai" ? `${C.teal}55` : C.border}` }}>
          {plan.fuente === "ai" ? "✨ Plan personalizado" : "Plan base · test S0 pendiente"}
        </span>
      </div>

      {onboarding && (
        <PerfilTab perfil={perfil} logs={logs} nombre={user?.escalador?.nombre} onboarding onSave={onSavePerfil} />
      )}

      {/* Tabs */}
      {!onboarding && <>
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
        <SesionTab plan={plan} week={week} session={session} logs={logs} calc={calc} perfil={perfil}
          onWeekChange={setWeek} onSessionChange={setSession} onLog={() => setTab("registro")}
          onPerfil={() => setTab("perfil")} onOverride={onOverride} />
      )}
      {tab === "registro" && week && (
        <>
          <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 9, padding: 3, marginBottom: 12 }}>
            {[["registrar", "✏️ Registrar sesión"], ["progresion", "📈 Progresión"]].map(([id, label]) => (
              <button key={id} onClick={() => setVistaRegistro(id)}
                style={{ flex: 1, background: vistaRegistro === id ? C.accentA : "transparent",
                  border: `1px solid ${vistaRegistro === id ? C.accent : "transparent"}`, borderRadius: 7,
                  padding: "7px", cursor: "pointer", color: vistaRegistro === id ? C.accent : C.sub,
                  fontSize: 12, fontWeight: vistaRegistro === id ? 700 : 400, fontFamily: "Poppins" }}>
                {label}
              </button>
            ))}
          </div>
          {vistaRegistro === "registrar" ? (
            <RegistroTab week={week} session={session} semanas={plan.semanas} trimestre={plan.trimestre} perfil={perfil}
              logs={logs} setLogs={setLogs} storageKey={storageKey} testSesiones={plan.testSesiones} />
          ) : (
            <ProgresionView plan={plan} logs={logs} perfil={perfil} />
          )}
        </>
      )}
      {tab === "movilidad" && (
        <MovilidadTab nivel={plan.nivel} />
      )}
      {tab === "perfil" && (
        <PerfilTab key={perfil?.actualizado} perfil={perfil} logs={logs} nombre={user?.escalador?.nombre} onSave={onSavePerfil} />
      )}
      </>}
    </div>
  );
}
