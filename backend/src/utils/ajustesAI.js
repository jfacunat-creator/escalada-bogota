/**
 * Ajustes del plan propuestos por la AI, con respaldo bibliográfico y aprobación humana.
 *
 *   1. construirTareas()   → una consulta a Claude por semana (test S0) o por sesión siguiente (reporte),
 *                            con la guía del programa y las secciones de los libros que tocan esos ejercicios.
 *   2. validarAjustes()    → descarta todo ajuste que no cumpla las reglas: parámetro existente, solo cambian
 *                            números, límites de variación, sentido permitido y cita LITERAL de la fuente.
 *   3. aplicarAjustes()    → superpone sobre el plan base los ajustes que un entrenador o admin aprobó.
 *
 * La AI nunca decide sola: lo que valida queda 'pendiente' hasta que alguien lo apruebe.
 */
const crypto = require("crypto");
const prisma = require("../config/prisma");
const mapa = require("../fuentes/mapa-temas.json");

const MODELO = "claude-opus-5-5";
const LIMITE_PASO = 0.15;    // variación máxima frente al valor vigente
const LIMITE_TOTAL = 0.30;   // variación máxima acumulada frente al plan base original
const MIN_CITA = 30;

const claveFragmento = f => `${f.libro}:${f.paginas[0]}-${f.paginas[1]}`;
const claveSesion = (semana, num) => `${semana}_${num}`;

// ─── TEXTO ───────────────────────────────────────────────
const RE_NUM = /(?<![A-Za-zÀ-ÿ])\d+(?:[.,]\d+)?/g;
const numeros = s => (String(s).match(RE_NUM) || []).map(n => Number(n.replace(",", ".")));
const esqueleto = s => normalizar(String(s).replace(RE_NUM, "#"));
function normalizar(s) {
  return String(s)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[“”«»"]/g, '"').replace(/[‘’´`]/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/-\s*\n\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
// En descansos y recuperaciones, "más" es menos exigente.
const esDescanso = (etiqueta, valor) => /descans|recupera|pausa|reposo|entre series|entre reps/i.test(`${etiqueta} ${valor}`);

// ─── TEMAS Y FUENTES ─────────────────────────────────────
function textoSesion(s) {
  return [s.name, ...(s.blocks || []).map(b => `${b.n} ${b.i || ""} ${JSON.stringify(b.params || [])}`)].join(" ").toLowerCase();
}

function temasDe(sesiones, { dolor = 0, origen }) {
  const temas = new Set();
  for (const s of sesiones) {
    const t = textoSesion(s);
    for (const [k, v] of Object.entries(mapa.temas)) {
      if (v.claves.some(c => t.includes(c.toLowerCase()))) temas.add(k);
    }
  }
  if (dolor >= 1) temas.add("recuperacion_lesiones");
  if (origen === "test_entrada") temas.add("evaluacion");
  return [...temas];
}

function fuentesDe(temas) {
  const lista = [...mapa.siempre, ...temas.flatMap(t => mapa.temas[t]?.fuentes || [])];
  return [...new Map(lista.map(f => [claveFragmento(f), f])).keys()];
}

async function leerFuentes(claves, trimestre, nivel) {
  const [frag, guia] = await Promise.all([
    claves.length
      ? prisma.$queryRawUnsafe(
          "SELECT clave, libro, seccion, pag_ini, pag_fin, texto FROM fuente_fragmento WHERE clave = ANY($1::text[])",
          claves
        )
      : [],
    prisma.$queryRawUnsafe("SELECT texto FROM fuente_guia WHERE trimestre = $1 AND nivel = $2", trimestre, nivel),
  ]);
  return { fragmentos: new Map(frag.map(f => [f.clave, f])), guia: guia[0]?.texto || null };
}

// ─── PLAN VIGENTE ────────────────────────────────────────
async function leerAprobados(escaladorId, trimestre) {
  return prisma.$queryRawUnsafe(
    `SELECT id, semana, sesion_num, bloque, etiqueta, valor_base, valor_propuesto, motivo, fuente, pagina, cita, revisado_at
     FROM plan_ai_ajuste
     WHERE escalador_id = $1::uuid AND trimestre = $2 AND estado = 'aprobado'
     ORDER BY revisado_at`,
    escaladorId, trimestre
  );
}

/** Plan base + ajustes aprobados. Marca las sesiones tocadas (ai, aiAjustes) para la app. */
function aplicarAjustes(semanas, aprobados) {
  if (!aprobados.length) return semanas;
  const porSesion = new Map();
  for (const a of aprobados) {
    const k = claveSesion(a.semana, a.sesion_num);
    if (!porSesion.has(k)) porSesion.set(k, []);
    porSesion.get(k).push(a);
  }
  return semanas.map(w => ({
    ...w,
    sesiones: (w.sesiones || []).map(s => {
      const lista = porSesion.get(claveSesion(w.id, s.num));
      if (!lista) return s;
      const aplicados = [];
      const blocks = (s.blocks || []).map(b => ({
        ...b,
        params: (b.params || []).map(([k, v]) => {
          const a = lista.filter(x => x.bloque === b.n && x.etiqueta === k).pop(); // el más reciente
          if (!a) return [k, v];
          aplicados.push(a);
          return [k, a.valor_propuesto];
        }),
      }));
      if (!aplicados.length) return s;
      return {
        ...s,
        blocks,
        ai: true,
        aiRevisado: true,
        aiAjustes: aplicados.map(a => ({
          bloque: a.bloque, etiqueta: a.etiqueta, base: a.valor_base, valor: a.valor_propuesto,
          motivo: a.motivo, fuente: etiquetaFuente(a.fuente, a.pagina),
        })),
      };
    }),
  }));
}

function etiquetaFuente(fuente, pagina) {
  if (fuente === "guia") return "Guía del programa";
  const libro = mapa.libros[fuente.split(":")[0]] || fuente;
  return `${libro.split(" — ")[0]}${pagina ? `, p. ${pagina}` : ""}`;
}

// ─── PROMPT ──────────────────────────────────────────────
const INSTRUCCIONES = `Eres el asistente técnico de un club de escalada en Bogotá. Propones ajustes a un plan de entrenamiento; un entrenador humano los revisa antes de que lleguen al escalador.

Reglas obligatorias:
1. El plan base es la referencia y está respaldado por la guía del programa. No lo rediseñas: solo propones cambiar el VALOR de parámetros que ya existen, cuando los datos del escalador lo justifican.
2. Solo cambias números dentro del valor (series, repeticiones, tiempos, porcentajes, descansos, tamaño de regleta). El resto del texto queda idéntico, carácter por carácter. No agregas ni quitas ejercicios, bloques ni parámetros.
3. Cada número cambia como máximo un ${LIMITE_PASO * 100} % respecto al valor actual (o ±1 en enteros de 10 o menos).
4. Las cargas en kg se calculan automáticamente desde el % del T2/T4: ajusta el porcentaje, no escribas kg nuevos salvo que el valor ya esté en kg.
5. Cada ajuste se apoya en UNA fuente entregada: la guía del programa (fuente "guia") o una sección bibliográfica (su clave, p. ej. "horst:45-48"). En "cita" copia un fragmento LITERAL de esa fuente (una a tres frases, mínimo ${MIN_CITA} caracteres) que respalde el criterio. Si la fuente es un libro, indica en "pagina" el número de la marca [p.N] donde está la cita; si es la guía, "pagina" es null. Las citas se verifican automáticamente: si no aparecen textuales, el ajuste se descarta.
6. En "motivo" explica en una o dos frases qué dato del escalador lleva al ajuste y cómo lo interpreta la fuente.
7. Si los datos no justifican cambios o no hay respaldo en las fuentes, no propongas nada: "ajustes" vacío y la razón en "sin_cambios_motivo". Es preferible no ajustar a ajustar sin respaldo.
8. La seguridad manda: ante dolor, sobrecarga o datos ambiguos, no aumentes la exigencia.
9. "bloque" y "etiqueta" se copian exactos del plan entregado.`;

const DESCRIPCION_TEST = {
  T2: "tracción máxima con lastre (kg adicionales)",
  T4: "suspensión 5 seg en regleta de 20 mm con lastre (kg adicionales)",
  T5: "máximo de dominadas seguidas (reps)",
  T6: "suspensión máxima sin lastre (seg)",
  T7: "campus: máximo de movimientos",
  T9: "abdominales en suspensión (reps)",
  PowerslabD: "powerslab derecha (cm)",
  PowerslabI: "powerslab izquierda (cm)",
  Circuito: "circuito estándar (movimientos)",
};

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ajustes", "sin_cambios_motivo"],
  properties: {
    ajustes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["semana", "num", "bloque", "etiqueta", "valor", "motivo", "fuente", "pagina", "cita"],
        properties: {
          semana: { type: "string" },
          num: { type: "integer" },
          bloque: { type: "string" },
          etiqueta: { type: "string" },
          valor: { type: "string" },
          motivo: { type: "string" },
          fuente: { type: "string" },
          pagina: { anyOf: [{ type: "integer" }, { type: "null" }] },
          cita: { type: "string" },
        },
      },
    },
    sin_cambios_motivo: { type: "string" },
  },
};

function sesionParaPrompt(semana, s) {
  return {
    semana, num: s.num, nombre: s.name, pse_objetivo: s.pse ?? null,
    bloques: (s.blocks || []).map(b => ({ bloque: b.n, params: (b.params || []).map(([etiqueta, valor]) => ({ etiqueta, valor })) })),
  };
}

function armarRequest({ trimestre, nivel, guia, fragmentos, datos, sesiones, soloReducir, bibliografiaEnCache }) {
  const bibliografia = "Secciones bibliográficas:\n\n" + [...fragmentos.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave)) // orden estable: el prefijo cacheado no puede variar
    .map(f => `<fuente clave="${f.clave}" libro="${mapa.libros[f.libro]}" seccion="${f.seccion}">\n${f.texto}\n</fuente>`)
    .join("\n\n");
  const restriccion = soloReducir
    ? "\n\nRESTRICCIÓN DE ESTA CONSULTA: el escalador reportó dolor o sobrecarga. SOLO puedes reducir la exigencia (menos series, repeticiones, tiempo o porcentaje; más descanso)."
    : "";
  // Todo lo que se repite entre las consultas de un mismo lote va en system y se cachea:
  // la guía siempre; la bibliografía completa en el test S0 (11 consultas seguidas con las mismas fuentes).
  const system = [
    { type: "text", text: INSTRUCCIONES },
    { type: "text", text: `<guia programa="${trimestre} ${nivel}">\n${guia}\n</guia>` },
    ...(bibliografiaEnCache ? [{ type: "text", text: bibliografia }] : []),
  ];
  system[system.length - 1].cache_control = { type: "ephemeral" };
  return {
    model: MODELO,
    max_tokens: 32000,
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: ESQUEMA } },
    system,
    messages: [{
      role: "user",
      content: [
        ...(bibliografiaEnCache ? [] : [{ type: "text", text: bibliografia }]),
        {
          type: "text",
          text: `Datos del escalador:\n${JSON.stringify(datos, null, 1)}\n\nPlan vigente de las sesiones a revisar:\n${JSON.stringify(sesiones, null, 1)}${restriccion}\n\nPropón los ajustes que correspondan siguiendo las reglas.`,
        },
      ],
    }],
  };
}

// ─── CONTEXTO DEL ESCALADOR ──────────────────────────────
async function contextoEscalador(escaladorId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT e.peso_kg, e.rango_etario, p.nivel, c2.trimestre
     FROM escalador e
     JOIN inscripcion i ON i.escalador_id = e.id AND i.estado = 'activa'
     JOIN grupo g ON g.id = i.grupo_id
     JOIN programa p ON p.id = g.programa_id
     LEFT JOIN ciclo c2 ON c2.id = g.ciclo_id
     WHERE e.id = $1::uuid
     ORDER BY i.created_at DESC LIMIT 1`,
    escaladorId
  );
  if (!rows.length) return null;
  const r = rows[0];
  const perfil = await prisma.$queryRawUnsafe("SELECT datos FROM perfil_entrenamiento WHERE escalador_id = $1::uuid", escaladorId);
  return {
    nivel: r.nivel,
    trimestre: r.trimestre ? `T${r.trimestre}` : "T1",
    pesoKg: r.peso_kg === null ? null : Number(r.peso_kg),
    rangoEtario: r.rango_etario,
    perfil: perfil[0]?.datos || null,
  };
}

async function planVigente(escaladorId, trimestre, nivel) {
  const plan = await prisma.$queryRawUnsafe("SELECT semanas FROM plan_contenido WHERE trimestre = $1 AND nivel = $2", trimestre, nivel);
  if (!plan.length) return null;
  const base = plan[0].semanas;
  return { base, vigente: aplicarAjustes(base, await leerAprobados(escaladorId, trimestre)) };
}

const tieneParams = s => (s.blocks || []).some(b => (b.params || []).some(([, v]) => numeros(v).length));

/**
 * @param origen 'test_entrada' → una tarea por semana de entrenamiento (S1–S11) a partir de los resultados del S0.
 *               'reporte'      → una tarea para la sesión siguiente a la reportada.
 * @returns { loteId, tareas: [{ meta, firma, request }] } o null si no hay nada que consultar.
 */
async function construirTareas({ escaladorId, origen, resultados = [], reporte = null }) {
  const esc = await contextoEscalador(escaladorId);
  if (!esc) return null;
  const plan = await planVigente(escaladorId, esc.trimestre, esc.nivel);
  if (!plan) return null;

  const datos = {
    nivel: esc.nivel, rangoEtario: esc.rangoEtario, pesoKg: esc.pesoKg, perfil: esc.perfil,
    testEntradaS0: Object.fromEntries(resultados.map(r => [r.codigo, { valor: r.valor, unidad: r.unidad, prueba: DESCRIPCION_TEST[r.codigo] || r.metrica }])),
  };

  let grupos = [];
  let soloReducir = false;
  if (origen === "test_entrada") {
    grupos = plan.vigente
      .filter(w => /^S([1-9]|1[01])$/.test(w.id))
      .map(w => ({ semana: w.id, sesiones: (w.sesiones || []).filter(tieneParams).map(s => ({ semana: w.id, s })) }))
      .filter(g => g.sesiones.length);
  } else {
    const sig = reporte?.siguiente;
    const w = sig && plan.vigente.find(x => x.id === sig.semana);
    const s = w?.sesiones.find(x => x.num === sig.sesionNum);
    if (!s || !tieneParams(s)) return null;
    soloReducir = reporte.dolor >= 3 || reporte.pse >= 9 || (reporte.pseObjetivo != null && reporte.pse - reporte.pseObjetivo >= 2);
    datos.reporte = {
      sesionReportada: `${reporte.semana}·S${reporte.sesionNum}`,
      pse: reporte.pse, pseObjetivo: reporte.pseObjetivo, dolorMaximo: reporte.dolor, dolorPorZona: reporte.dolorZonas, notas: reporte.notas,
    };
    datos.registrosRecientes = await registrosRecientes(escaladorId, esc.trimestre);
    grupos = [{ semana: w.id, sesiones: [{ semana: w.id, s }] }];
  }

  // Test S0: todas las fuentes, compartidas y cacheadas entre las consultas del lote.
  // Reporte: una sola consulta, solo las secciones de los temas de esa sesión.
  const todas = origen === "test_entrada";
  const loteId = crypto.randomUUID();
  const tareas = [];
  for (const g of grupos) {
    const sesiones = g.sesiones.map(x => x.s);
    const claves = todas
      ? fuentesDe(Object.keys(mapa.temas))
      : fuentesDe(temasDe(sesiones, { dolor: reporte?.dolor || 0, origen }));
    const { fragmentos, guia } = await leerFuentes(claves, esc.trimestre, esc.nivel);
    if (!guia) throw new Error(`Falta la guía ${esc.trimestre} ${esc.nivel} en fuente_guia (npm run fuentes:cargar)`);
    const meta = {
      loteId, escaladorId, origen, trimestre: esc.trimestre, nivel: esc.nivel, soloReducir,
      sesiones: g.sesiones.map(x => claveSesion(x.semana, x.s.num)),
      fuentes: [...fragmentos.keys()],
    };
    tareas.push({
      meta,
      firma: firmar(meta),
      request: armarRequest({
        trimestre: esc.trimestre, nivel: esc.nivel, guia, fragmentos, datos, soloReducir, bibliografiaEnCache: todas,
        sesiones: g.sesiones.map(x => sesionParaPrompt(x.semana, x.s)),
      }),
    });
  }
  return tareas.length ? { loteId, tareas } : null;
}

async function registrosRecientes(escaladorId, trimestre) {
  const filas = await prisma.$queryRawUnsafe(
    `SELECT semana, sesion_num, pse, sobrecarga, datos FROM registro_sesion
     WHERE escalador_id = $1::uuid AND trimestre = $2 ORDER BY registrado_at DESC LIMIT 6`,
    escaladorId, trimestre
  );
  return filas.map(f => ({
    sesion: `${f.semana}·S${f.sesion_num}`, pse: f.pse, sobrecarga: f.sobrecarga,
    dolor: Object.fromEntries(Object.entries(f.datos || {}).filter(([k, v]) => k.startsWith("p_") && Number(v) > 0).map(([k, v]) => [k.slice(2), Number(v)])),
    notas: String(f.datos?.notas || "").slice(0, 300) || undefined,
  }));
}

// ─── FIRMA (integridad de meta en el ida y vuelta por n8n) ──
function firmar(meta) {
  return crypto.createHmac("sha256", process.env.N8N_WEBHOOK_SECRET || "").update(JSON.stringify(meta)).digest("hex");
}
function firmaValida(meta, firma) {
  const esperada = Buffer.from(firmar(meta));
  const recibida = Buffer.from(String(firma || ""));
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

// ─── VALIDACIÓN ──────────────────────────────────────────
function textoRespuesta(respuesta) {
  if (respuesta?.stop_reason === "refusal") throw new Error("La AI declinó la consulta (refusal)");
  if (respuesta?.stop_reason === "max_tokens") throw new Error("Respuesta truncada (max_tokens)");
  const bloques = (respuesta?.content || []).filter(b => b.type === "text");
  if (!bloques.length) throw new Error("La respuesta no trae texto");
  return JSON.parse(bloques[bloques.length - 1].text);
}

function variacionOk(base, nuevo, limite, minEntero) {
  const tope = Math.max(limite * Math.abs(base), Number.isInteger(base) && base <= 10 ? minEntero : 0);
  return Math.abs(nuevo - base) <= tope + 1e-9;
}

function citaEnFuente(a, meta, fuentes) {
  const cita = normalizar(a.cita);
  if (cita.length < MIN_CITA) return "cita demasiado corta";
  if (a.fuente === "guia") {
    return normalizar(fuentes.guia).includes(cita) ? null : "la cita no aparece textual en la guía";
  }
  if (!meta.fuentes.includes(a.fuente)) return `fuente ${a.fuente} no entregada en esta consulta`;
  const f = fuentes.fragmentos.get(a.fuente);
  if (!f) return `fuente ${a.fuente} no encontrada`;
  if (!Number.isInteger(a.pagina) || a.pagina < f.pag_ini || a.pagina > f.pag_fin) return "página fuera de la sección citada";
  // Texto de esa página (y la siguiente, por citas que cruzan el salto de página)
  const partes = f.texto.split(/\[p\.(\d+)\]/);
  const paginas = new Map();
  for (let i = 1; i < partes.length; i += 2) paginas.set(Number(partes[i]), partes[i + 1]);
  const texto = normalizar(`${paginas.get(a.pagina) || ""} ${paginas.get(a.pagina + 1) || ""}`);
  return texto.includes(cita) ? null : `la cita no aparece textual en la p. ${a.pagina}`;
}

/**
 * @returns { validos: [fila para plan_ai_ajuste], descartados: [{ ajuste, motivo }], sinCambios }
 */
async function validarAjustes(meta, respuesta) {
  const salida = textoRespuesta(respuesta);
  const plan = await planVigente(meta.escaladorId, meta.trimestre, meta.nivel);
  if (!plan) throw new Error("Plan base no encontrado");
  const fuentes = await leerFuentes(meta.fuentes, meta.trimestre, meta.nivel);
  const buscar = (semanas, semana, num) => semanas.find(w => w.id === semana)?.sesiones.find(s => s.num === num);

  const validos = [];
  const descartados = [];
  const vistos = new Set();
  for (const a of salida.ajustes || []) {
    const descartar = motivo => descartados.push({ ajuste: a, motivo });
    const k = claveSesion(a.semana, a.num);
    if (!meta.sesiones.includes(k)) { descartar("sesión fuera de la consulta"); continue; }
    const id = `${k}|${a.bloque}|${a.etiqueta}`;
    if (vistos.has(id)) { descartar("ajuste duplicado"); continue; }

    const vigente = buscar(plan.vigente, a.semana, a.num)?.blocks?.find(b => b.n === a.bloque)?.params?.find(p => p[0] === a.etiqueta);
    const original = buscar(plan.base, a.semana, a.num)?.blocks?.find(b => b.n === a.bloque)?.params?.find(p => p[0] === a.etiqueta);
    if (!vigente || !original) { descartar("bloque o parámetro inexistente en el plan"); continue; }
    const actual = String(vigente[1]);
    const nuevo = String(a.valor);
    if (normalizar(actual) === normalizar(nuevo)) { descartar("sin cambio"); continue; }
    if (esqueleto(actual) !== esqueleto(nuevo)) { descartar("cambió texto además de números"); continue; }

    const nAct = numeros(actual), nNuevo = numeros(nuevo), nOrig = numeros(original[1]);
    if (nAct.length !== nNuevo.length) { descartar("cambió la cantidad de números"); continue; }
    const masDescanso = esDescanso(a.etiqueta, actual);
    let error = null;
    nAct.forEach((b, i) => {
      if (error) return;
      const n = nNuevo[i];
      if (!variacionOk(b, n, LIMITE_PASO, 1)) error = `variación mayor al ${LIMITE_PASO * 100} % (${b} → ${n})`;
      else if (nOrig.length === nAct.length && !variacionOk(nOrig[i], n, LIMITE_TOTAL, 2)) error = `se aleja más del ${LIMITE_TOTAL * 100} % del plan base (${nOrig[i]} → ${n})`;
      else if (meta.soloReducir && (masDescanso ? n < b : n > b)) error = "aumenta la exigencia con dolor o sobrecarga";
    });
    if (error) { descartar(error); continue; }

    if (String(a.motivo || "").trim().length < 20) { descartar("motivo insuficiente"); continue; }
    const errCita = citaEnFuente(a, meta, fuentes);
    if (errCita) { descartar(errCita); continue; }

    vistos.add(id);
    validos.push({
      semana: a.semana, sesionNum: a.num, bloque: a.bloque, etiqueta: a.etiqueta,
      valorBase: actual, valorPropuesto: nuevo, motivo: String(a.motivo).trim(),
      fuente: a.fuente, pagina: a.fuente === "guia" ? null : a.pagina, cita: String(a.cita).trim(),
    });
  }
  return { validos, descartados, sinCambios: salida.sin_cambios_motivo || "" };
}

async function guardarPropuestas(meta, validos) {
  for (const v of validos) {
    // Una propuesta nueva reemplaza a la pendiente anterior del mismo parámetro.
    await prisma.$executeRawUnsafe(
      `UPDATE plan_ai_ajuste SET estado = 'reemplazado'
       WHERE escalador_id = $1::uuid AND trimestre = $2 AND semana = $3 AND sesion_num = $4
         AND bloque = $5 AND etiqueta = $6 AND estado = 'pendiente'`,
      meta.escaladorId, meta.trimestre, v.semana, v.sesionNum, v.bloque, v.etiqueta
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO plan_ai_ajuste (escalador_id, trimestre, semana, sesion_num, bloque, etiqueta, valor_base,
         valor_propuesto, motivo, fuente, pagina, cita, origen, lote_id)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::uuid)`,
      meta.escaladorId, meta.trimestre, v.semana, v.sesionNum, v.bloque, v.etiqueta, v.valorBase,
      v.valorPropuesto, v.motivo, v.fuente, v.pagina, v.cita, meta.origen, meta.loteId
    );
  }
}

module.exports = {
  claveFragmento, construirTareas, validarAjustes, guardarPropuestas, aplicarAjustes, leerAprobados,
  firmaValida, etiquetaFuente,
  // expuestos para pruebas
  _interno: { numeros, esqueleto, normalizar, variacionOk, temasDe, fuentesDe, citaEnFuente, armarRequest },
};
