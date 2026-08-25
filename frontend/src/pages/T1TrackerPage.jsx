/**
 * T1TrackerPage.jsx
 * Ruta: frontend/src/pages/T1TrackerPage.jsx
 *
 * INTEGRACIÓN:
 *   1. Copiar este archivo a frontend/src/pages/T1TrackerPage.jsx
 *   2. En App.jsx: agregar import + ruta (ver abajo)
 *   3. En AppLayout.jsx: agregar item al nav de escalador (ver abajo)
 *
 * CONTROL DE ACCESO:
 *   - Gate: escalador.estado === 'activo'
 *   - Si inactivo/congelado → pantalla bloqueada con link a Mis Pagos
 *   - El admin gestiona el acceso desde EscaladoresAdminPage
 *
 * DATOS:
 *   - Logs de sesión en localStorage, clave: t1_logs_{user.id}
 *   - (Migración futura: tabla progreso_t1 en el backend)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── PALETA ─────────────────────────────────────────────────────────────────
const C = {
  card:    '#1c1c1c',
  cardAlt: '#232323',
  border:  '#2e2e2e',
  accent:  '#D4AF37',
  accentA: 'rgba(212,175,55,0.15)',
  orange:  '#FF5C35',
  orangeA: 'rgba(255,92,53,0.14)',
  teal:    '#00D9B5',
  tealA:   'rgba(0,217,181,0.12)',
  purple:  '#A78BFA',
  purpleA: 'rgba(167,139,250,0.12)',
  gold:    '#D4AF37',
  goldA:   'rgba(212,175,55,0.14)',
  red:     '#EF4444',
  redA:    'rgba(239,68,68,0.12)',
  green:   '#22C55E',
  greenA:  'rgba(34,197,94,0.12)',
  text:    '#F0EDE8',
  sub:     '#A09A8C',
  muted:   '#555',
};

// ─── FASES ───────────────────────────────────────────────────────────────────
const PC = {
  eval:  { c: C.teal,   a: C.tealA,   l: 'Evaluación'  },
  acum:  { c: C.orange, a: C.orangeA, l: 'Acumulación'  },
  desc:  { c: C.teal,   a: C.tealA,   l: 'Descarga'     },
  exc:   { c: C.purple, a: C.purpleA, l: 'Excéntrico'   },
  recon: { c: C.gold,   a: C.goldA,   l: 'Reconversión' },
  real:  { c: C.red,    a: C.redA,    l: 'Realización'  },
};

// ─── SEMANAS ─────────────────────────────────────────────────────────────────
const WEEKS = [
  { id:'S0',  n:'Empalme',       pse:'3',   ph:'eval',  s:3, note:'No busques marcas — solo mídete.'},
  { id:'S1',  n:'Reintro',       pse:'6',   ph:'acum',  s:4, note:'Cargas deliberadamente bajas.'},
  { id:'S2',  n:'Construcción',  pse:'6–7', ph:'acum',  s:4, note:'Aumenta la carga progresivamente.'},
  { id:'S3',  n:'Carga alta',    pse:'7',   ph:'acum',  s:4, note:'Primer pico. Mantén la calidad técnica.'},
  { id:'S4',  n:'Pico acum.',    pse:'7–8', ph:'acum',  s:4, note:'Máxima carga del bloque.',badge:'🏥FISIO'},
  { id:'S5',  n:'Descarga',      pse:'3–4', ph:'desc',  s:3, note:'OBLIGATORIA. No aumentes el volumen.'},
  { id:'S6',  n:'Excéntrico ①',  pse:'7',   ph:'exc',   s:4, note:'Inicio del ciclo excéntrico.'},
  { id:'S7',  n:'Excéntrico ②',  pse:'7–8', ph:'exc',   s:4, note:'Normal sentirse pesado y lento.'},
  { id:'S8',  n:'Excéntrico ③',  pse:'8',   ph:'exc',   s:4, note:'Último excéntrico del año.',badge:'🏥FISIO'},
  { id:'S9',  n:'Reconversión',  pse:'7–8', ph:'recon', s:4, note:'Cambio hacia el rendimiento.'},
  { id:'S10', n:'Desc. corta',   pse:'3–4', ph:'desc',  s:3, note:'Descarga antes de la realización.'},
  { id:'S11', n:'Realización I', pse:'8',   ph:'real',  s:3, note:'De ENTRENAR a RENDIR.'},
  { id:'S12', n:'Realización II',pse:'5–8', ph:'real',  s:3, note:'Test de salida + cierre T1.',badge:'🏥FISIO'},
];

// ─── SESIONES ────────────────────────────────────────────────────────────────
const SD = {
S0:[
 {num:1,name:'Test completo de Hörst',type:'Test',cal:40,vac:15,pse:3,
  warn:'⚠️ 2 personas presentes. Estos números son tu línea base para S12.',
  blocks:[
   {n:'T2 — Tracción máxima con lastre',i:'🏋️',p:[['Protocolo','Sin lastre → +5 kg c/intento · 3 min descanso · hasta fallar'],['Anota','Último peso con que SÍ completaste la dominada']]},
   {n:'T4 — Suspensión 5 seg con lastre',i:'🤚',p:[['Regleta','20 mm · agarre arqueado'],['Protocolo','Sin lastre → +5 kg c/intento · 3 min descanso · hasta fallar'],['Anota','Último peso con que aguantaste los 5 seg completos']]},
   {n:'T5 — Máximo dominadas',i:'💪',p:[['Lastre','Ninguno'],['Regla','Sin balanceo · sin rebote · cada rep completa'],['Anota','Total dominadas con buena forma']]},
   {n:'T6 — Suspensión máxima sin lastre',i:'⏱️',p:[['Regleta','20 mm · agarre arqueado'],['Anota','Segundos totales']]},
   {n:'T7 — Campus: máximo movimientos',i:'🧗',p:[['Listones','~25 mm'],['Patrón','Sube alternando manos · baja alternando · sin parar'],['Anota','Cada contacto de 1 mano = 1 movimiento']]},
   {n:'T9 — Abdominales en suspensión',i:'🤸',p:[['Posición','Colgado · brazos extendidos'],['Movimiento','Piernas rectas hasta tocar manos · baja 3 seg'],['Anota','Reps con control']]},
   {n:'Powerslab — Lanzamiento campus',i:'🚀',p:[['Intentos','3 c/mano'],['Anota','Mejor marca D e I (cm)']]},
   {n:'Circuito estándar',i:'🔄',p:[['Intentos','1 solo'],['Anota','¿Completado? + movimiento de caída']]},
  ]},
 {num:2,name:'Análisis y planificación',type:'Planif.',cal:0,vac:0,pse:1,
  note:'💡 Sin actividad física.',
  blocks:[
   {n:'Revisión de resultados',i:'📊',p:[['Duración','20 min'],['Qué','Compara tus números con tablas de tu nivel.']]},
   {n:'Definición del proyecto T2',i:'🎯',p:[['Duración','20 min'],['Qué','Nombre de vía/boulder · sección difícil · por qué ese proyecto.']]},
   {n:'Punto débil anual',i:'📍',p:[['Duración','10 min'],['Qué','¿Cuál es tu número más bajo relativo a tu nivel?']]},
   {n:'Control nutricional',i:'🥗',p:[['Duración','30 min'],['Qué','Cita con nutricionista o registro honesto 3 días consecutivos.']]},
  ]},
 {num:3,name:'Recuperación activa + video',type:'Regen.',cal:0,vac:0,pse:2,
  warn:'⚠️ PSE máximo: 2.',
  blocks:[
   {n:'Foam rolling antebrazos',i:'🔵',p:[['Duración','10 min'],['Cómo','En punto doloroso → detente 20-30 seg.']]},
   {n:'Travesía muy fácil',i:'🚶',p:[['Duración','20 min'],['Nivel','3 grados bajo tu máximo.']]},
   {n:'Estiramientos largos',i:'🧘',p:[['Duración','15 min'],['Cómo','Posiciones de VaC · 2-3 min cada una.']]},
   {n:'Análisis de video',i:'🎥',p:[['Duración','30 min'],['Qué','3 observaciones concretas de tu temporada anterior.']]},
  ]},
],
S1:[
 {num:1,name:'Fuerza máxima + bloqueos + antagonistas',type:'Baja',cal:30,vac:15,pse:6,blocks:[
   {n:'Bloque 1 · Suspensiones máximas',i:'🤚',p:[['Series','6'],['Tiempo/serie','6–8 seg'],['Descanso','3–4 min (cronómetro)'],['Regleta','20 mm · agarre arqueado'],['Si >8 seg','→ Baja a 18 mm'],['Si <6 seg','→ Sube a 22 mm']]},
   {n:'Bloque 2 · Bloqueos 1 brazo asistido',i:'💪',p:[['Series','2 por brazo · 4 totales'],['Reps/serie','3 bloqueos × 5 seg'],['Descanso','2 min'],['Orden','D → D → I → I'],['Nota','Banda da solo estabilidad — NO carga peso.']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep · 1 min descanso entre ejercicios']]},
  ]},
 {num:2,name:'Continuidad + técnica punto débil',type:'Baja',cal:30,vac:15,pse:6,blocks:[
   {n:'Bloque 1 · Continuidad',i:'🔄',p:[['Series','5'],['Mov/serie','60–80'],['Descanso','3 min'],['Nivel','2 grados bajo tu máximo']]},
   {n:'Bloque 2 · Técnica punto débil',i:'🎯',p:[['Duración','20 min'],['Nivel','3 grados bajo tu máximo'],['Qué','Movimiento de S0. 10–15 reps con atención plena.']]},
  ]},
 {num:3,name:'Boulder suave: ejecución limpia',type:'Media',cal:30,vac:15,pse:5,blocks:[
   {n:'Bloque · Boulder al 85% limpio',i:'🪨',p:[['Series','8'],['Reps/serie','1 problema diferente'],['Tiempo máx.','2 min'],['Descanso','3 min'],['Ajuste','Si caes >2 veces → problema sobre 85%. Cambia.']]},
  ]},
 {num:4,name:'Mantenimiento físico + capilarización',type:'Alta',cal:20,vac:15,pse:4,blocks:[
   {n:'Bloque 1 · Core',i:'🏃',p:[['Plancha frontal','3 × 30–45 seg · 1 min descanso'],['Abd. suspensión','3 × 10 reps · 1,5 min descanso']]},
   {n:'Bloque 2 · Hombro antagonista',i:'🔄',p:[['Press neutro mancuernas','3 × 12 rep · 5–8 kg'],['Face pull con banda','3 × 15 rep · Ver glosario G']]},
   {n:'Bloque 3 · Capilarización',i:'🩸',p:[['Series','3'],['Tiempo/serie','3–4 min continuos'],['Descanso','2 min'],['Nivel','4–5 grados bajo tu máximo']]},
  ]},
],
S2:[
 {num:1,name:'Fuerza máxima + tracción con lastre',type:'Baja',cal:35,vac:15,pse:6,blocks:[
   {n:'Bloque 1 · Suspensiones máximas',i:'🤚',p:[['Series','8 (2 más que S1)'],['Regleta','18 mm · agarre arqueado'],['Tiempo/serie','6–8 seg'],['Descanso','3–4 min']]},
   {n:'Bloque 2 · Tracción con lastre — intención veloz',i:'🏋️',p:[['Series','4'],['Reps/serie','2–3'],['Descanso','3 min'],['Lastre','80–85% de T2 en S0'],['Velocidad','INTENCIÓN de subir lo más rápido posible'],['Regla','Para ANTES del fallo.']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Continuidad con reposos activos',type:'Baja',cal:30,vac:15,pse:6,blocks:[
   {n:'Bloque · Continuidad',i:'🔄',p:[['Series','6'],['Mov/serie','80'],['Descanso','3 min'],['Reposo activo','Sacude antebrazos durante TODO el descanso']]},
  ]},
 {num:3,name:'Campus intro: alcances',type:'Media',cal:35,vac:15,pse:5,
  note:'💡 2 series muy suaves de campus al final del calentamiento.',
  blocks:[{n:'Bloque · Campus — alcances',i:'🧗',p:[['Series','4'],['Mov/serie','2–3 alcances'],['Descanso','3–5 min'],['Listones','GRANDES (35 mm)'],['Patrón','Ambas en 1 → D al 3 → I al 3 → D al 5 = 2 mov. Para ahí.']]}]},
 {num:4,name:'Boulder de coordinación (60 min)',type:'Alta',cal:30,vac:15,pse:5,blocks:[
   {n:'Bloque · Boulder coordinación',i:'🎭',p:[['Duración','60 min'],['Nivel','1 grado bajo tu máximo'],['Tipo','Giros · pasos largos · cambios en movimiento. NO pura fuerza.']]},
  ]},
],
S3:[
 {num:1,name:'Fuerza máxima + bloqueos dinámicos + antagonistas',type:'Baja',cal:40,vac:15,pse:7,blocks:[
   {n:'Bloque 1 · Suspensiones máximas',i:'🤚',p:[['Series','8–10'],['Tiempo/serie','6–8 seg'],['Descanso','3–6 min'],['Regleta','18 mm · agarre arqueado'],['Regla','Si alguna serie <6 seg → descansa 6 min · PARA ese día.']]},
   {n:'Bloque 2 · Bloqueos dinámicos (sin banda)',i:'💪',p:[['Series','3 por brazo (6 totales)'],['Reps/serie','3 bloqueos × 5 seg'],['Posición','Sube con 2 brazos → suelta 1 mano → mantén 5 seg → repite 3x → baja.'],['Diferencia con S1','SIN banda.']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Continuidad + campus alcances y empujes',type:'Baja',cal:35,vac:15,pse:7,blocks:[
   {n:'Bloque 1 · Continuidad',i:'🔄',p:[['Series','6'],['Mov/serie','90–100'],['Descanso','2 min 30 seg'],['Si <90 mov','Baja dificultad — NO bajes la cantidad']]},
   {n:'Bloque 2 · Campus alcances + empujes',i:'🧗',p:[['Series','5'],['Descanso','4 min'],['Listones','GRANDES (35 mm)'],['Patrón','Sube: 1→3→5. Baja: 5→3→1. = 1 serie.']]},
  ]},
 {num:3,name:'Bloques físicos',type:'Media',cal:35,vac:15,pse:7,blocks:[
   {n:'Bloque · Boulder físico',i:'🪨',p:[['Series','6'],['Tiempo máx.','3 min'],['Descanso','3 min'],['Intensidad','85–90%'],['Tipo','Cantos pequeños · compresiones · pasos largos · techos']]},
  ]},
 {num:4,name:'Técnica fina filmada + core',type:'Alta',cal:20,vac:15,pse:4,blocks:[
   {n:'Bloque 1 · Técnica filmada',i:'🎥',p:[['Duración','30 min'],['Protocolo','1 problema · 5–6 reps · graba cada rep.'],['Análisis','Identifica 1 cosa concreta a corregir.']]},
   {n:'Bloque 2 · Core',i:'🏃',p:[['Abd. suspensión','3 × 12 · 1,5 min descanso'],['Plancha frontal','3 × 40 seg · 1 min descanso']]},
  ]},
],
S4:[
 {num:1,name:'Fuerza máxima pico + control T4 + antagonistas',type:'Baja',cal:40,vac:15,pse:8,
  warn:'⚠️ MÁXIMO pico de acumulación. FISIO al final de la semana.',
  blocks:[
   {n:'Bloque 1 · Suspensiones máximas',i:'🤚',p:[['Series','10 — MÁXIMO del bloque'],['Regleta','18 mm · agarre arqueado'],['Tiempo/serie','6–8 seg'],['Calidad manda','Si el agarre se abre → para.']]},
   {n:'Bloque 2 · Control informal T4',i:'✅',p:[['Series','1 única'],['Tiempo','5 seg'],['Regleta','20 mm · SIN lastre'],['Si NO aguantas','→ informa al entrenador.']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Continuidad máxima',type:'Baja',cal:35,vac:15,pse:7,blocks:[
   {n:'Bloque · Continuidad',i:'🔄',p:[['Series','6'],['Mov/serie','100 o más'],['Descanso','2 min 30 seg']]},
  ]},
 {num:3,name:'Campus alto + bloque al 90%',type:'Media',cal:40,vac:15,pse:7,
  note:'💡 2–3 series muy suaves de campus al final del calentamiento.',
  blocks:[
   {n:'Bloque 1 · Campus',i:'🧗',p:[['Series','5–6'],['Listones','GRANDES (35 mm)'],['Patrón','Alcances + empujes (igual que S3)']]},
   {n:'Bloque 2 · Boulder al 90%',i:'🪨',p:[['Series','6–8'],['Tiempo máx.','3 min'],['Descanso','3–4 min'],['Intensidad','90% — puedes caerte 1 de 3.']]},
  ]},
 {num:4,name:'FISIOTERAPIA + regenerativo',type:'Alta',cal:0,vac:0,pse:1,
  warn:'🏥 Informa TODAS las molestias desde S1.',
  blocks:[
   {n:'Fisioterapia',i:'🏥',p:[['Duración','60 min'],['Informa','Toda molestia de S1–S4.']]},
   {n:'Regenerativo',i:'🧘',p:[['Duración','20–30 min'],['PSE','1']]},
  ]},
],
S5:[
 {num:1,name:'Suspensiones mantenimiento + escalada placentera',type:'Baja',cal:25,vac:20,pse:4,
  warn:'⚠️ DESCARGA OBLIGATORIA. No aumentes el volumen.',
  blocks:[
   {n:'Suspensiones de mantenimiento',i:'🤚',p:[['Series','4'],['Tiempo/serie','5–6 seg'],['Descanso','4 min'],['Regleta','22–25 mm · agarre abierto']]},
   {n:'Escalada placentera',i:'😊',p:[['Duración','30–40 min'],['Regla','PSE máximo 4.']]},
  ]},
 {num:2,name:'Continuidad suave + movilidad',type:'Baja',cal:20,vac:20,pse:3,blocks:[
   {n:'Continuidad reducida',i:'🔄',p:[['Series','3'],['Mov/serie','60'],['Descanso','4 min'],['Nivel','3 grados bajo tu máximo']]},
   {n:'Movilidad larga',i:'🧘',p:[['Cadera/rana','3 min'],['Cadena posterior','2 min/pierna'],['Pectoral','2 min/lado'],['Dorsal','2 min/lado'],['Trapecio','1 min/lado']]},
  ]},
 {num:3,name:'Escalada libre',type:'Media',cal:0,vac:0,pse:3,
  note:'🔓 Sin estructura. PSE máximo 4. Si hay salida a roca → ideal.',blocks:[]},
],
S6:[
 {num:1,name:'Excéntrico + suspensiones + antagonistas',type:'Baja',cal:40,vac:20,pse:7,
  warn:'⚠️ Lee Glosario F antes de esta sesión. +40 años: USA LA MITAD del lastre.',
  blocks:[
   {n:'Bloque 1 · Excéntrico de tracción',i:'⬇️',p:[['Series','4'],['Reps/serie','3–4 bajadas'],['Tiempo/bajada','5 seg exactos'],['Descanso','3–5 min'],['Lastre','50–60% de T2'],['Subida','CON AYUDA. Solo la bajada importa.'],['Ajuste','Si llegas antes de "cinco" → reduce 2,5 kg.']]},
   {n:'Bloque 2 · Suspensiones reducidas',i:'🤚',p:[['Series','5'],['Tiempo/serie','6–8 seg'],['Descanso','4 min'],['Regleta','20 mm']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Continuidad',type:'Baja',cal:30,vac:15,pse:5,
  note:'💡 Sesión secundaria esta semana.',
  blocks:[{n:'Continuidad',i:'🔄',p:[['Series','5'],['Mov/serie','80'],['Descanso','3 min']]}]},
 {num:3,name:'Campus o fuerza de contacto',type:'Media',cal:35,vac:20,pse:6,
  warn:'⚠️ Campus SOLO si llevas ≥3 años Y no hay dolor activo. Si no → Opción B.',
  blocks:[
   {n:'Opción A · Campus',i:'🧗',p:[['Series','5'],['Reps/serie','2–3 rebotes'],['Descanso','4 min'],['Listones','GRANDES (35 mm)']]},
   {n:'Opción B · Fuerza de contacto en muro',i:'🤜',p:[['Series','5'],['Reps/serie','3–4 lanzamientos'],['Descanso','4 min'],['Movimiento','Lanza 1 mano a presa lejana · cierra con MÁXIMA velocidad · alterna.']]},
  ]},
 {num:4,name:'Antagonistas reforzados + core + suave',type:'Alta',cal:20,vac:20,pse:3,blocks:[
   {n:'Antagonistas reforzados',i:'🔄',p:[['Extensión dedos banda','4 × 20 rep'],['Face pull banda','4 × 15 rep'],['Rotación ext. hombro','4 × 15 rep']]},
   {n:'Core',i:'🏃',p:[['Plancha lateral','3 × 30 seg c/lado'],['Abd. suspensión','3 × 10 reps']]},
   {n:'Escalada suave',i:'🚶',p:[['Duración','20 min'],['PSE','Máximo 3']]},
  ]},
],
S7:[
 {num:1,name:'Excéntrico (incremento) + suspensiones + antagonistas',type:'Baja',cal:40,vac:20,pse:8,
  note:'💡 Normal sentirse pesado y lento. Mantén la calidad.',
  blocks:[
   {n:'Bloque 1 · Excéntrico — incremento',i:'⬇️',p:[['Series','5 (1 más que S6)'],['Tiempo/bajada','6 seg exactos'],['Lastre','Mismo que S6, o +2,5 kg si S6 fue cómodo']]},
   {n:'Bloque 2 · Suspensiones',i:'🤚',p:[['Series','5'],['Regleta','18 mm'],['Tiempo/serie','6–8 seg'],['Descanso','4 min']]},
   {n:'Bloque 3 · Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Circuitos intro',type:'Baja',cal:35,vac:15,pse:6,blocks:[
   {n:'Circuito estándar',i:'🔄',p:[['Intentos','1 continuo sin soltar'],['Registro','¿Completado? + movimiento exacto de caída']]},
  ]},
 {num:3,name:'Campus (pequeños) + bloque al límite',type:'Media',cal:40,vac:20,pse:7,blocks:[
   {n:'Campus en listones pequeños',i:'🧗',p:[['Series','4'],['Listones','PEQUEÑOS (15–18 mm)'],['Descanso','4–5 min']]},
   {n:'Boulder al límite',i:'🪨',p:[['Series','4–5'],['Tiempo máx.','3–4 min'],['Descanso','4–5 min'],['Intensidad','AL LÍMITE.']]},
  ]},
 {num:4,name:'Análisis táctico del proyecto',type:'Alta',cal:0,vac:0,pse:2,
  note:'💡 Sin actividad física.',
  blocks:[{n:'Análisis táctico',i:'🎯',p:[['Duración','60 min'],['Act. 1','Describe la sección más difícil de tu proyecto T2.'],['Act. 2','Elige 3 métodos de ascenso para esa sección.'],['Act. 3','Visualización: escala mentalmente esa sección 5 veces.']]}]},
],
S8:[
 {num:1,name:'Último excéntrico + suspensiones + antagonistas',type:'Baja',cal:40,vac:20,pse:8,
  warn:'⚠️ ÚLTIMO excéntrico del año. FISIO al final de la semana.',
  blocks:[
   {n:'Excéntrico — sesión final',i:'⬇️',p:[['Series','5–6'],['Tiempo/bajada','6 seg exactos'],['Lastre','Mismo que S7, o +2,5 kg'],['Nota','⚠️ Este ejercicio NO se repite en el año.']]},
   {n:'Suspensiones',i:'🤚',p:[['Series','5'],['Regleta','18 mm'],['Tiempo/serie','6–8 seg'],['Descanso','4 min']]},
   {n:'Antagonistas',i:'🔄',p:[['Ver','Glosario G'],['Series','3 × 15 rep']]},
  ]},
 {num:2,name:'Circuitos con registro oficial',type:'Baja',cal:35,vac:15,pse:6,blocks:[
   {n:'Circuito — registro',i:'📊',p:[['Intentos','2 (≥5 min entre ellos)'],['Comparar','vs. resultado de S7-S2']]},
  ]},
 {num:3,name:'Campus (pequeños) + bloques 85–90%',type:'Media',cal:40,vac:20,pse:7,blocks:[
   {n:'Campus en pequeños',i:'🧗',p:[['Series','4'],['Listones','PEQUEÑOS (15–18 mm)']]},
   {n:'Boulder 85–90%',i:'🪨',p:[['Series','5–6'],['Descanso','3–4 min']]},
  ]},
 {num:4,name:'FISIOTERAPIA + antagonistas + suave',type:'Alta',cal:0,vac:0,pse:2,
  warn:'🏥 Tercera sesión de fisio del trimestre. Informa TODO el ciclo excéntrico.',
  blocks:[
   {n:'Fisioterapia',i:'🏥',p:[['Duración','60 min'],['Revisión','Evaluación post-ciclo excéntrico.']]},
   {n:'Antagonistas + escalada suave',i:'🔄',p:[['Antagonistas','Glosario G · 3 × 15 rep'],['Escalada','20 min · PSE máximo 2']]},
  ]},
],
S9:[
 {num:1,name:'Suspensiones + tracción con lastre',type:'Baja',cal:35,vac:15,pse:7,blocks:[
   {n:'Suspensiones',i:'🤚',p:[['Series','7'],['Regleta','18 mm'],['Tiempo/serie','6–8 seg'],['Descanso','3–4 min']]},
   {n:'Tracción con lastre',i:'🏋️',p:[['Series','4'],['Reps/serie','2–3'],['Lastre','80–85% de T2'],['Velocidad','Intención explosiva en subida']]},
  ]},
 {num:2,name:'Circuitos + táctica Watts',type:'Baja',cal:35,vac:15,pse:6,blocks:[
   {n:'Circuito',i:'🔄',p:[['Intentos','2'],['Descanso','≥5 min entre intentos']]},
   {n:'Táctica Watts',i:'⚡',p:[['Duración','30 min'],['Qué','1 sección del proyecto T2. Rápido en descansos · lento en el crux.']]},
  ]},
 {num:3,name:'Bloque en formato competencia',type:'Media',cal:35,vac:15,pse:7,blocks:[
   {n:'Formato competencia',i:'🏆',p:[['Series','5'],['Tiempo/problema','4 min exactos'],['Descanso','5 min'],['Regla','Cuando suena → para inmediatamente.']]},
  ]},
 {num:4,name:'Continuidad regenerativa',type:'Alta',cal:25,vac:20,pse:4,blocks:[
   {n:'Continuidad suave',i:'🔄',p:[['Series','4'],['Mov/serie','60'],['Descanso','4 min'],['Nivel','3 grados bajo tu máximo']]},
  ]},
],
S10:[
 {num:1,name:'Mantenimiento suave',type:'Baja',cal:25,vac:15,pse:4,
  warn:'⚠️ Descarga obligatoria.',
  blocks:[
   {n:'Suspensiones de mantenimiento',i:'🤚',p:[['Series','4'],['Regleta','20–22 mm'],['Tiempo/serie','5–6 seg'],['Descanso','4 min']]},
   {n:'Escalada suave',i:'🚶',p:[['Duración','30 min'],['PSE','Máximo 4']]},
  ]},
 {num:2,name:'Movilidad + técnica suave',type:'Baja',cal:20,vac:20,pse:3,blocks:[
   {n:'Movilidad larga',i:'🧘',p:[['Protocolo','Igual que S5-S2. Cada posición 2–3 min.']]},
   {n:'Técnica suave',i:'🎯',p:[['Duración','20 min'],['Nivel','3–4 grados bajo tu máximo']]},
  ]},
 {num:3,name:'Visualización del proyecto T2',type:'Media',cal:0,vac:0,pse:1,
  note:'💡 Sin actividad física.',
  blocks:[
   {n:'Visualización interna',i:'🧠',p:[['Duración','15 min'],['Qué','Escala mentalmente tu proyecto de inicio a fin.']]},
   {n:'Visualización externa',i:'🎥',p:[['Duración','15 min'],['Qué','Videos en vías similares. 2–3 posiciones de referencia.']]},
   {n:'Planificación escrita',i:'✍️',p:[['Duración','10 min'],['Qué','Cada sección del proyecto + método elegido.']]},
  ]},
],
S11:[
 {num:1,name:'Simulación de rendimiento',type:'Baja',cal:40,vac:20,pse:8,
  warn:'🎯 MENTALIDAD: de ENTRENAR a RENDIR. Bien descansado · bien comido.',
  blocks:[
   {n:'Calentamiento ampliado',i:'🔥',p:[['Extra al final','4 bloques progresivos + 3 suspensiones máximas · 5 min descanso entre c/u.']]},
   {n:'Simulación completa',i:'🎯',p:[['Paso 1: Lectura','6 min exactos. Plan A y B para cada sección difícil.'],['Paso 2: Intento 1','1 solo intento. Anota exactamente.'],['Descanso','Mínimo 25 min.'],['Paso 3: Intento 2','El segundo y último del día. Anota el resultado.']]},
  ]},
 {num:2,name:'Activación (antes de S11-S1)',type:'Baja',cal:0,vac:15,pse:6,
  note:'💡 Hacer el día anterior o dos días ANTES de S11-S1.',
  blocks:[{n:'Activación',i:'⚡',p:[['Bloques progresivos','4 series: fácil → medio → 80% → 85%. Descanso 3 min.'],['Suspensiones','3 × 6 seg en 18 mm. Descanso 3 min.'],['PSE total','Máximo 6.']]}]},
 {num:3,name:'Segunda simulación o secciones',type:'Media',cal:35,vac:15,pse:7,blocks:[
   {n:'Elige según cómo te sientas',i:'🎯',p:[['Opción A — Recuperado','→ Repite el protocolo de S11-S1.'],['Opción B — Fallaste en la misma sección','→ Trabaja SOLO esa sección. 6–8 reps. Descanso ≥20 min.']]},
  ]},
],
S12:[
 {num:1,name:'Rendimiento libre',type:'Baja',cal:40,vac:20,pse:7,blocks:[
   {n:'Rendimiento libre',i:'🔓',p:[['Estructura','Sin estructura rígida'],['Si te sientes bien','→ Intenta el proyecto'],['Si no','→ Trabaja secciones']]},
  ]},
 {num:2,name:'TEST DE SALIDA (vs. S0)',type:'Baja',cal:40,vac:15,pse:6,
  warn:'🎯 Repite los tests exactamente igual que en S0.',
  blocks:[{n:'Tests de salida',i:'📊',p:[['T2','Objetivo: +3–5% vs S0'],['T4','Objetivo: +3–5% vs S0'],['T7','Objetivo: mejora vs S0'],['Powerslab','Objetivo: mejora vs S0'],['Circuito','Objetivo: +10% vs S0']]}]},
 {num:3,name:'Cierre + plan T2 + fisio + nutrición',type:'Media',cal:0,vac:0,pse:2,
  warn:'🏥 FISIOTERAPIA obligatoria. Fin del trimestre T1.',
  blocks:[
   {n:'Revisión',i:'📊',p:[['Duración','30 min'],['Qué','S0 vs S12. ¿Qué mejoró más? ¿Menos?']]},
   {n:'Plan T2',i:'🗓️',p:[['Duración','30 min'],['Qué','Proyecto definitivo T2 · semanas de pico · ajustes.']]},
   {n:'Fisioterapia',i:'🏥',p:[['Duración','60 min']]},
   {n:'Control nutricional',i:'🥗',p:[['Duración','30 min']]},
  ]},
],
};

// ─── GLOSARIO ─────────────────────────────────────────────────────────────────
const GLOSS = [
 {id:'A',t:'Agarre arqueado',s:'Half Crimp — el estándar',items:[['Dedos','Índice, corazón, anular y meñique (los 4)'],['1ª articulación','~45°'],['2ª articulación','~90°'],['Pulgar','Completamente fuera'],['Codos','Extendidos durante toda la suspensión'],['Error','⚠️ Doblar los codos al colgar. BRAZOS RECTOS.']]},
 {id:'B',t:'Agarre extendido',s:'Open Hand — para tendones',items:[['Dedos','Relativamente extendidos'],['1ª articulación','~20°'],['2ª articulación','~10°'],['Error','⚠️ Aprieta con intención aunque los dedos estén abiertos.']]},
 {id:'C',t:'Tracciones / Dominadas',items:[['Partida','Colgado · brazos extendidos · pronación · ancho de hombros'],['Subida','Controlada hasta que la barbilla supere la barra'],['Bajada','3 segundos'],['Error','⚠️ Balanceo. PROHIBIDO.']]},
 {id:'D',t:'Bloqueos de brazos',items:[['Bloqueo alto (~90°)','Barbilla sobre la barra. Mantén sin moverse.'],['1 brazo asistido','Sube con 2 brazos → suelta 1 mano → agarra la banda (estabilidad lateral, no peso) → mantén el tiempo → baja con 2.']]},
 {id:'E',t:'Campus board',items:[['Regla','⚠️ SIN PIES'],['Grandes (35 mm)','Trabajo de brazo y potencia'],['Pequeños (15–18 mm)','Trabajo de dedo'],['Alcances','Sube alternando manos'],['Empujes','Baja alternando manos'],['Rebotes','Sube 1 listón → baja inmediatamente → repite. Máxima velocidad.'],['Señal OK','✅ Agarre limpio y explosivo.']]},
 {id:'F',t:'Excéntrico de tracción',s:'⚠️ Solo S6–S8. No se repite.',items:[['+40 años','⚠️ USA LA MITAD del lastre'],['Lastre','50–60% del T2 de S0'],['Paso 1','Sube CON AYUDA'],['Paso 2','Baja en exactamente 5–6 seg'],['Error peligroso','🚨 Bajar rápido = lastre excesivo.']]},
 {id:'G',t:'Antagonistas',s:'Protocolo fijo',items:[['Extensión dedos con banda','Introduce los 4 dedos. Extiende hacia fuera. Vuelve lento. — 3 × 15'],['Face pull con banda','Ancla a altura de ojos. Jala separando codos arriba y afuera. Aprieta omóplatos. — 3 × 15'],['Rotación ext. hombro','Codo a 90°. Gira antebrazo hacia afuera. — 3 × 15'],['Descanso','1 min entre ejercicios']]},
 {id:'H',t:'Continuidad',items:[['Nivel','2 grados bajo tu máximo a vista'],['Ritmo','"Alegre" — puedes hablar frases cortas mientras escalas'],['Contar','Cada movimiento de 1 mano = 1 movimiento'],['Error','⚠️ Ir muy rápido y acumular bomba antes de terminar.']]},
 {id:'I',t:'Bloque / Boulder',items:[['Al 85%','Complétalo con esfuerzo, sin caerte'],['Al 90%','Cerca del límite. Puedes caer 1 de 3.'],['Al límite','El problema más difícil que puedes intentar hoy.'],['Ejecución limpia','Sin movimientos torpes, sin caerte.']]},
 {id:'J',t:'Circuito',items:[['Qué es','Secuencia fija 25–40 mov en el muro'],['Regla','1 intento continuo sin soltar'],['Descanso mínimo entre intentos','5 min']]},
];

// ─── CALENTAMIENTO ────────────────────────────────────────────────────────────
const WARMUP = [
 {n:'FASE 1 — General',d:'10–15 min',items:[
  {n:'Trote suave / bici estática',d:'8–10 min · ritmo donde puedes hablar.'},
  {n:'Apertura y cierre de manos',d:'3 × 50 rep · enérgico pero sin dolor.'},
  {n:'Rotaciones de muñeca',d:'30 seg cada lado · ambas muñecas.'},
  {n:'Flexión-extensión de codo',d:'20 rep · lento y completo.'},
  {n:'Rotaciones de hombro',d:'20 rep cada lado · círculos grandes.'},
  {n:'Movilidad de cadera',d:'20 rep por pierna.'},
 ]},
 {n:'FASE 2 — Específica',d:'10–15 min',items:[
  {n:'Travesía 3+3',d:'3–5 series · 30–50 mov · descanso 1 min. Presas grandes. Sin fuerza. Lento.'},
  {n:'Suspensión suave en barra',d:'3 series · 10–15 seg · descanso 1 min. Solo para activar hombros y agarre.'},
  {n:'Suspensión suave en hangboard',d:'2 series · 8–10 seg · 25 mm · agarre abierto · sin lastre.'},
 ]},
 {n:'FASE 3 — Mental',d:'5 min',items:[
  {n:'Visualización de la sesión',d:'Cierra los ojos. ¿Cómo está el agarre? ¿Qué ritmo lleva el movimiento?'},
 ]},
];

// ─── VUELTA A LA CALMA ────────────────────────────────────────────────────────
const COOLDOWN = [
 {n:'Flexores de dedos',d:'2 min total',h:'Extiende los 4 dedos hacia atrás con la otra mano. 30 seg · descansa 10 seg · repite 3–4 veces. Ambas manos.'},
 {n:'Extensores de dedos y muñeca',d:'1 min/mano',h:'Entrelaza los dedos. Dobla la muñeca hacia ti. 30 seg.'},
 {n:'Flexores del codo (bíceps)',d:'1 min/brazo',h:'Apoya la mano en la pared con el pulgar hacia abajo. Gira el cuerpo hacia afuera.'},
 {n:'Dorsal',d:'1,5 min/lado',h:'Agárrate a la barra. Pasa la pierna del mismo lado por detrás. Desplázate hacia el lado del agarre.'},
 {n:'Pectoral',d:'1 min/lado',h:'Codo a 90° en la pared. Gira el cuerpo hacia el lado contrario.'},
 {n:'Trapecio',d:'1 min/lado',h:'Inclina la cabeza hacia el lado contrario. Baja el hombro del mismo lado.'},
 {n:'Aductores / caderas',d:'1,5 min',h:'Sentado con plantas de los pies juntas. Deja caer las rodillas.'},
];

// ─── COMPONENTES ─────────────────────────────────────────────────────────────
function PseBar({ target }) {
  const max = String(target).includes('–')
    ? parseFloat(String(target).split('–')[1])
    : parseFloat(target) || 5;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{ width: 16, height: 6, borderRadius: 3, background: i < max ? C.accent : C.border }} />
      ))}
      <span style={{ color: C.sub, fontSize: 11, marginLeft: 4, fontFamily: 'Poppins' }}>PSE {target}</span>
    </div>
  );
}

function Block({ b }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#232323', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer' }}>
        <span style={{ fontSize: 18 }}>{b.i}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3, fontFamily: 'Poppins' }}>{b.n}</span>
        <span style={{ color: C.muted, fontSize: 14, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '0 13px 13px' }}>
          {b.p.map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.sub, fontSize: 10, fontWeight: 700, minWidth: 100, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 2, flexShrink: 0, fontFamily: 'Poppins' }}>{k}</span>
              <span style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 1.5, fontFamily: 'Poppins' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PANTALLA BLOQUEADA ───────────────────────────────────────────────────────
function AccesoInactivo({ estado }) {
  const navigate = useNavigate();
  const label = { inactivo: 'inactivo', congelado: 'congelado' }[estado] || 'inactivo';
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1c1c1c', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
        🔒
      </div>
      <h2 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.6rem', color: C.text, marginBottom: 8 }}>Plan T1 Avanzado</h2>
      <p style={{ color: C.sub, fontSize: '0.9rem', marginBottom: 6, fontFamily: 'Poppins' }}>
        Tu perfil está <strong style={{ color: '#f59e0b' }}>{label}</strong>.
      </p>
      <p style={{ color: C.sub, fontSize: '0.85rem', marginBottom: 28, lineHeight: 1.6, fontFamily: 'Poppins' }}>
        Para acceder al plan de entrenamiento debes tener tu ciclo al día.
        Revisa el estado de tus pagos o contacta a tu entrenador.
      </p>
      <button
        onClick={() => navigate('/app/mis-pagos')}
        style={{ background: C.accent, border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', color: '#121212', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Poppins', marginRight: 12 }}>
        Ver mis pagos
      </button>
      <button
        onClick={() => navigate('/app')}
        style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 28px', cursor: 'pointer', color: C.sub, fontSize: '0.9rem', fontFamily: 'Poppins' }}>
        Volver al inicio
      </button>
    </div>
  );
}

// ─── PLAN TAB ─────────────────────────────────────────────────────────────────
function PlanTab({ logs, onSelect, curWeek }) {
  const grouped = WEEKS.reduce((acc, w) => {
    const l = PC[w.ph].l;
    if (!acc[l]) acc[l] = { c: PC[w.ph].c, weeks: [] };
    acc[l].weeks.push(w);
    return acc;
  }, {});
  return (
    <div>
      <p style={{ color: C.sub, fontSize: 12, marginBottom: 16, fontFamily: 'Poppins' }}>
        13 semanas · 39 sesiones · Toca una semana para ir a la sesión
      </p>
      {Object.entries(grouped).map(([phase, { c, weeks }]) => (
        <div key={phase} style={{ marginBottom: 20 }}>
          <div style={{ color: c, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Poppins' }}>{phase}</div>
          {weeks.map(w => {
            const ph = PC[w.ph];
            const done = Array.from({ length: w.s }, (_, i) => logs[`${w.id}_${i + 1}`]?.pse).filter(Boolean).length;
            const isCur = w.id === curWeek;
            return (
              <div key={w.id} style={{ background: isCur ? ph.a : C.card, border: `1px solid ${isCur ? ph.c : C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ background: ph.a, border: `1px solid ${ph.c}44`, borderRadius: 8, padding: '4px 9px', textAlign: 'center', minWidth: 42 }}>
                    <div style={{ color: ph.c, fontSize: 12, fontWeight: 800, fontFamily: 'Antonio' }}>{w.id}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: 'Poppins' }}>{w.n}</span>
                      {w.badge && <span style={{ background: `${C.red}22`, color: C.red, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 999, fontFamily: 'Poppins' }}>{w.badge}</span>}
                      {done > 0 && <span style={{ background: C.greenA, color: C.green, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, fontFamily: 'Poppins' }}>{done}/{w.s} ✓</span>}
                    </div>
                    <div style={{ color: C.sub, fontSize: 11, marginBottom: 5, fontFamily: 'Poppins' }}>{w.note}</div>
                    <PseBar target={w.pse} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: w.s }, (_, i) => {
                    const sn = i + 1; const lg = logs[`${w.id}_${sn}`]; const sd = SD[w.id]?.[i];
                    return (
                      <button key={sn} onClick={() => onSelect(w.id, sn)}
                        style={{ flex: 1, background: lg?.completed ? C.greenA : lg?.pse ? `${C.accent}22` : '#232323', border: `1px solid ${lg?.completed ? C.green : lg?.pse ? C.accent : C.border}`, borderRadius: 8, padding: '6px 4px', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ color: lg?.completed ? C.green : lg?.pse ? C.accent : C.sub, fontSize: 11, fontWeight: 700, fontFamily: 'Poppins' }}>S{sn}</div>
                        <div style={{ color: C.muted, fontSize: 9, marginTop: 1, fontFamily: 'Poppins' }}>{sd?.type || '—'}</div>
                        {lg?.pse && <div style={{ color: C.accent, fontSize: 9, marginTop: 1 }}>PSE {lg.pse}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── SESIÓN TAB ───────────────────────────────────────────────────────────────
function SesionTab({ week, session, logs, onWeekChange, onSessionChange, onLog }) {
  const wd = WEEKS.find(w => w.id === week);
  const sd = SD[week]?.find(s => s.num === session);
  const ph = PC[wd?.ph] || PC.acum;
  const lg = logs[`${week}_${session}`];
  if (!sd) return <div style={{ padding: 20, color: C.sub, textAlign: 'center', fontFamily: 'Poppins' }}>Sin sesión {session} para {week}</div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, marginBottom: 10, scrollbarWidth: 'none' }}>
        {WEEKS.map(w => (
          <button key={w.id} onClick={() => { onWeekChange(w.id); onSessionChange(1); }}
            style={{ background: w.id === week ? PC[w.ph].a : '#232323', border: `1px solid ${w.id === week ? PC[w.ph].c : C.border}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: w.id === week ? PC[w.ph].c : C.sub, fontSize: 11, fontWeight: 700, fontFamily: 'Poppins' }}>{w.id}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {Array.from({ length: wd.s }, (_, i) => {
          const sn = i + 1; const sl = logs[`${week}_${sn}`];
          return (
            <button key={sn} onClick={() => onSessionChange(sn)}
              style={{ flex: 1, background: sn === session ? ph.a : '#232323', border: `1px solid ${sn === session ? ph.c : C.border}`, borderRadius: 8, padding: '7px 4px', cursor: 'pointer' }}>
              <div style={{ color: sn === session ? ph.c : C.sub, fontSize: 12, fontWeight: 700, fontFamily: 'Poppins' }}>S{sn}</div>
              {sl?.pse && <div style={{ color: C.green, fontSize: 9, marginTop: 1 }}>✓</div>}
            </button>
          );
        })}
      </div>
      <div style={{ background: ph.a, border: `1px solid ${ph.c}`, borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ background: ph.c, color: '#121212', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.5, fontFamily: 'Poppins' }}>{week}·S{session}</span>
          {sd.type && <span style={{ color: C.sub, fontSize: 11, fontFamily: 'Poppins' }}>{sd.type}</span>}
          {lg?.completed && <span style={{ background: C.greenA, color: C.green, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, fontFamily: 'Poppins' }}>✓ Completada</span>}
        </div>
        <div style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, fontFamily: 'Antonio' }}>{sd.name}</div>
        <PseBar target={sd.pse} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {sd.cal > 0 && <span style={{ background: '#1c1c1c', borderRadius: 7, padding: '3px 9px', color: C.sub, fontSize: 11, fontFamily: 'Poppins' }}>🔥 Cal. {sd.cal} min</span>}
          {sd.vac > 0 && <span style={{ background: '#1c1c1c', borderRadius: 7, padding: '3px 9px', color: C.sub, fontSize: 11, fontFamily: 'Poppins' }}>🧊 VaC {sd.vac} min</span>}
          {lg?.pse && <span style={{ background: `${C.accent}22`, borderRadius: 7, padding: '3px 9px', color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: 'Poppins' }}>PSE real: {lg.pse}</span>}
        </div>
      </div>
      {sd.warn && <div style={{ background: `${C.red}14`, border: `1px solid ${C.red}33`, borderRadius: 9, padding: '10px 12px', marginBottom: 10, color: C.red, fontSize: 12, lineHeight: 1.5, fontFamily: 'Poppins' }}>{sd.warn}</div>}
      {sd.note && <div style={{ background: `${C.accent}14`, border: `1px solid ${C.accent}33`, borderRadius: 9, padding: '10px 12px', marginBottom: 10, color: C.accent, fontSize: 12, lineHeight: 1.5, fontFamily: 'Poppins' }}>{sd.note}</div>}
      {sd.blocks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Poppins' }}>Bloques de la sesión</div>
          {sd.blocks.map((b, i) => <Block key={i} b={b} />)}
        </div>
      )}
      <button onClick={onLog}
        style={{ width: '100%', background: lg?.pse ? C.greenA : `${C.accent}22`, border: `1px solid ${lg?.pse ? C.green : C.accent}`, borderRadius: 10, padding: '12px', cursor: 'pointer', color: lg?.pse ? C.green : C.accent, fontSize: 13, fontWeight: 700, fontFamily: 'Poppins' }}>
        {lg?.pse ? `✓ Ver registro (PSE real: ${lg.pse})` : '📝 Registrar esta sesión'}
      </button>
    </div>
  );
}

// ─── REFERENCIA TAB ────────────────────────────────────────────────────────────
function RefTab() {
  const [rt, setRt] = useState('warm');
  const [ge, setGe] = useState(null);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['warm', '🔥 Calentamiento'], ['gloss', '📖 Glosario'], ['cool', '🧊 Vuelta a la calma']].map(([id, lbl]) => (
          <button key={id} onClick={() => { setRt(id); setGe(null); }}
            style={{ background: rt === id ? `${C.accent}22` : '#232323', border: `1px solid ${rt === id ? C.accent : C.border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: rt === id ? C.accent : C.sub, fontSize: 12, fontWeight: rt === id ? 700 : 400, fontFamily: 'Poppins' }}>
            {lbl}
          </button>
        ))}
      </div>
      {rt === 'warm' && (
        <div>
          <div style={{ background: `${C.accent}14`, border: `1px solid ${C.accent}33`, borderRadius: 9, padding: '9px 12px', marginBottom: 14, color: C.accent, fontSize: 12, fontFamily: 'Poppins' }}>
            Obligatorio antes de cualquier ejercicio de fuerza o intensidad. Mínimo 25 min.
          </div>
          {WARMUP.map((ph, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: 'Poppins' }}>{ph.n}</span>
                <span style={{ background: `${C.accent}22`, color: C.accent, fontSize: 10, padding: '2px 8px', borderRadius: 999, fontFamily: 'Poppins' }}>{ph.d}</span>
              </div>
              {ph.items.map((item, j) => (
                <div key={j} style={{ background: C.card, borderRadius: 9, padding: '9px 12px', marginBottom: 5 }}>
                  <div style={{ color: C.text, fontSize: 12, fontWeight: 600, marginBottom: 3, fontFamily: 'Poppins' }}>{item.n}</div>
                  <div style={{ color: C.sub, fontSize: 11, lineHeight: 1.5, fontFamily: 'Poppins' }}>{item.d}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {rt === 'gloss' && !ge && (
        <div>
          {GLOSS.map(g => (
            <button key={g.id} onClick={() => setGe(g)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, borderRadius: 7, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: C.accent, fontSize: 15, fontWeight: 800, fontFamily: 'Antonio' }}>{g.id}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: 'Poppins' }}>{g.t}</div>
                {g.s && <div style={{ color: C.sub, fontSize: 11, marginTop: 1, fontFamily: 'Poppins' }}>{g.s}</div>}
              </div>
              <span style={{ color: C.muted }}>›</span>
            </button>
          ))}
        </div>
      )}
      {rt === 'gloss' && ge && (
        <div>
          <button onClick={() => setGe(null)}
            style={{ background: '#232323', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', color: C.sub, fontSize: 11, marginBottom: 12, fontFamily: 'Poppins' }}>
            ← Volver
          </button>
          <div style={{ background: `${C.accent}14`, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 3, fontFamily: 'Poppins' }}>GLOSARIO {ge.id}</div>
            <div style={{ color: C.text, fontSize: 18, fontWeight: 700, fontFamily: 'Antonio' }}>{ge.t}</div>
            {ge.s && <div style={{ color: C.sub, fontSize: 11, marginTop: 3, fontFamily: 'Poppins' }}>{ge.s}</div>}
          </div>
          {ge.items.map(([k, v], i) => (
            <div key={i} style={{ background: C.card, borderRadius: 9, padding: '9px 12px', marginBottom: 5 }}>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, fontFamily: 'Poppins' }}>{k}</div>
              <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5, fontFamily: 'Poppins' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {rt === 'cool' && (
        <div>
          <div style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33`, borderRadius: 9, padding: '9px 12px', marginBottom: 14, color: C.teal, fontSize: 12, fontFamily: 'Poppins' }}>
            Obligatorio al final de todas las sesiones de intensidad. Mínimo 10 min.
          </div>
          {COOLDOWN.map((item, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: '11px 13px', marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: 'Poppins' }}>{item.n}</span>
                <span style={{ background: `${C.teal}14`, color: C.teal, fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 600, marginLeft: 8, whiteSpace: 'nowrap', fontFamily: 'Poppins' }}>{item.d}</span>
              </div>
              <div style={{ color: C.sub, fontSize: 11, lineHeight: 1.5, fontFamily: 'Poppins' }}>{item.h}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REGISTRO TAB ─────────────────────────────────────────────────────────────
function RegistroTab({ week, session, logs, setLogs, storageKey }) {
  const ZONES = ['Dedos D', 'Dedos I', 'Codo D', 'Codo I', 'Hombro D', 'Hombro I', 'Espalda'];
  const logKey = `${week}_${session}`;
  const sd = SD[week]?.find(s => s.num === session);
  const wd = WEEKS.find(w => w.id === week);
  const ph = PC[wd?.ph] || PC.acum;
  const initDraft = { pse: '', notas: '', regleta: '', tiempo: '', completed: false, ...ZONES.reduce((a, z) => ({ ...a, [`p_${z}`]: '0' }), {}) };
  const [draft, setDraft] = useState(initDraft);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    const stored = logs[logKey];
    setDraft(stored ? { ...initDraft, ...stored } : initDraft);
  }, [logKey]);

  const save = () => {
    const entry = { ...draft, date: new Date().toLocaleDateString('es-CO'), week, session };
    const all = { ...logs, [logKey]: entry };
    setLogs(all);
    try { localStorage.setItem(storageKey, JSON.stringify(all)); setSaved('✓ Guardado'); }
    catch { setSaved('Error al guardar'); }
    setTimeout(() => setSaved(''), 2500);
  };

  const history = Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);

  return (
    <div>
      <div style={{ background: ph.a, border: `1px solid ${ph.c}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ color: ph.c, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 3, fontFamily: 'Poppins' }}>REGISTRO ACTUAL</div>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: 'Antonio' }}>{week} · S{session}</div>
        <div style={{ color: C.sub, fontSize: 11, marginTop: 2, fontFamily: 'Poppins' }}>{sd?.name || '—'}</div>
      </div>

      {/* PSE */}
      <div style={{ background: C.card, borderRadius: 11, padding: '12px', marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: 'Poppins' }}>PSE real (0–10)</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[...Array(11)].map((_, i) => (
            <button key={i} onClick={() => setDraft(d => ({ ...d, pse: String(i) }))}
              style={{ width: 36, height: 36, borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins',
                background: draft.pse === String(i) ? (i <= 4 ? C.greenA : i <= 7 ? `${C.accent}22` : C.redA) : '#232323',
                border: `2px solid ${draft.pse === String(i) ? (i <= 4 ? C.green : i <= 7 ? C.accent : C.red) : C.border}`,
                color: draft.pse === String(i) ? (i <= 4 ? C.green : i <= 7 ? C.accent : C.red) : C.sub }}>
              {i}
            </button>
          ))}
        </div>
        {sd?.pse && <div style={{ color: C.muted, fontSize: 10, marginTop: 6, fontFamily: 'Poppins' }}>Objetivo: PSE {sd.pse}</div>}
      </div>

      {/* Semáforo de dolor */}
      <div style={{ background: C.card, borderRadius: 11, padding: '12px', marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: 'Poppins' }}>🚦 Semáforo de dolor por zona (0–4)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ZONES.map(z => (
            <div key={z} style={{ background: '#232323', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: C.sub, fontSize: 10, marginBottom: 5, fontFamily: 'Poppins' }}>{z}</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2, 3, 4].map(v => {
                  const cur = parseInt(draft[`p_${z}`] || 0);
                  return (
                    <button key={v} onClick={() => setDraft(d => ({ ...d, [`p_${z}`]: String(v) }))}
                      style={{ width: 22, height: 22, borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 10, fontFamily: 'Poppins',
                        background: cur === v ? (v === 0 ? C.greenA : v <= 2 ? `${C.accent}22` : C.redA) : C.border,
                        border: `1px solid ${cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : 'transparent'}`,
                        color: cur === v ? (v === 0 ? C.green : v <= 2 ? C.accent : C.red) : C.sub }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 10, fontFamily: 'Poppins' }}>
          <span style={{ color: C.green }}>🟢 0–2 continúa</span>
          <span style={{ color: C.accent }}>🟡 3 reduce carga</span>
          <span style={{ color: C.red }}>🔴 4+ para + fisio</span>
        </div>
      </div>

      {/* Regleta + tiempo */}
      <div style={{ background: C.card, borderRadius: 11, padding: '12px', marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: 'Poppins' }}>Hangboard (si aplica)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['regleta', 'Regleta usada', 'ej: 18 mm'], ['tiempo', 'Tiempo aguantado', 'ej: 7 seg']].map(([key, label, ph]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{ color: C.sub, fontSize: 10, marginBottom: 4, fontFamily: 'Poppins' }}>{label}</div>
              <input value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} placeholder={ph}
                style={{ width: '100%', background: '#232323', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 9px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Poppins' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div style={{ background: C.card, borderRadius: 11, padding: '12px', marginBottom: 9 }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: 'Poppins' }}>Nota libre</div>
        <textarea value={draft.notas} onChange={e => setDraft(d => ({ ...d, notas: e.target.value }))}
          placeholder="Resultados · sensaciones · qué ajustar..."
          style={{ width: '100%', background: '#232323', border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px', color: C.text, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box', fontFamily: 'Poppins', lineHeight: 1.5 }} />
      </div>

      {/* Completada */}
      <div onClick={() => setDraft(d => ({ ...d, completed: !d.completed }))}
        style={{ background: draft.completed ? C.greenA : C.card, border: `1px solid ${draft.completed ? C.green : C.border}`, borderRadius: 11, padding: '12px 14px', marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: draft.completed ? C.green : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {draft.completed && <span style={{ color: '#121212', fontSize: 12, fontWeight: 900 }}>✓</span>}
        </div>
        <span style={{ color: draft.completed ? C.green : C.sub, fontSize: 13, fontWeight: 600, fontFamily: 'Poppins' }}>Sesión completada</span>
      </div>

      <button onClick={save}
        style={{ width: '100%', background: C.accent, border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', color: '#121212', fontSize: 14, fontWeight: 700, marginBottom: 20, fontFamily: 'Poppins' }}>
        {saved || 'Guardar registro'}
      </button>

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Poppins' }}>Historial</div>
          {history.map(([k, v]) => (
            <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: v.completed ? C.greenA : `${C.accent}22`, borderRadius: 5, padding: '3px 8px', minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ color: v.completed ? C.green : C.accent, fontSize: 10, fontWeight: 800, fontFamily: 'Poppins' }}>{k}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Poppins' }}>
                  {SD[v.week]?.find(s => s.num === v.session)?.name || '—'}
                </div>
                <div style={{ color: C.sub, fontSize: 10, fontFamily: 'Poppins' }}>{v.date}{v.pse ? ` · PSE ${v.pse}` : ''}</div>
              </div>
              {v.completed && <span style={{ color: C.green, fontSize: 12, flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function T1TrackerPage() {
  const { user } = useAuth();
  const escalador = user?.escalador;

  // ── Gate de acceso ──────────────────────────────────────
  if (escalador?.estado !== 'activo') {
    return <AccesoInactivo estado={escalador?.estado} />;
  }

  // ── Estado de la app ────────────────────────────────────
  const storageKey = `t1_logs_${user.id}`;
  const [tab, setTab] = useState('plan');
  const [week, setWeek] = useState('S0');
  const [session, setSession] = useState(1);
  const [logs, setLogs] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setLogs(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  const goToSession = (w, s) => { setWeek(w); setSession(s); setTab('sesion'); };

  const tabs = [
    { id: 'plan', label: '🗓️ Plan' },
    { id: 'sesion', label: '💪 Sesión' },
    { id: 'ref', label: '📖 Referencia' },
    { id: 'registro', label: '✏️ Registro' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Antonio, sans-serif', fontSize: '1.8rem', color: C.text, marginBottom: 4 }}>
          Plan T1 Avanzado
        </h1>
        <p style={{ color: C.sub, fontSize: '0.85rem', fontFamily: 'Poppins' }}>
          {escalador?.nombre} · Acumulación estructural · 13 semanas
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? `${C.accent}22` : '#1c1c1c', border: `1px solid ${tab === t.id ? C.accent : C.border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: tab === t.id ? C.accent : C.sub, fontSize: 12, fontWeight: tab === t.id ? 700 : 400, fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'plan' && <PlanTab logs={logs} onSelect={goToSession} curWeek={week} />}
      {tab === 'sesion' && <SesionTab week={week} session={session} logs={logs} onWeekChange={setWeek} onSessionChange={setSession} onLog={() => setTab('registro')} />}
      {tab === 'ref' && <RefTab />}
      {tab === 'registro' && <RegistroTab week={week} session={session} logs={logs} setLogs={setLogs} storageKey={storageKey} />}
    </div>
  );
}
