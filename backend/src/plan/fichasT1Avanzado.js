/**
 * backend/src/plan/fichasT1Avanzado.js
 * Descripciones completas de ejercicios del programa T1 Avanzado.
 * Fuente: T1_Avanzado_Guia_Completa.md (v1.0 · Julio 2026).
 *
 * Se superpone al JSON de plan_contenido (que solo trae parámetros telegráficos).
 * Vive en el backend: GET /plan/my adjunta la ficha a cada bloque SOLO de las semanas del mes
 * que el escalador tiene pagado (antes iba en el JS del frontend y cualquiera podía leer el ciclo completo).
 * Clave: `${semana}_${sesion}` → nombre exacto del bloque en la BD → ficha.
 * Si la BD renombra un bloque, la ficha simplemente no se aplica.
 *
 * Ficha:
 *   como     — pasos de ejecución (posición del cuerpo)
 *   errores  — errores frecuentes
 *   calidad  — criterio de un movimiento bien hecho
 *   parada   — cuándo parar
 *   zonas    — zonas que carga el ejercicio (dedos/codo/hombro/espalda), para el semáforo
 *   quitar   — etiquetas de params que la ficha reemplaza (ej. "Ver" → "Glosario G")
 *   extra    — params adicionales a mostrar
 *   noApto   — sustitución completa si el escalador no es apto para campus
 */

// ─── FICHAS BASE (glosario A–J) ──────────────────────────
const ARQUEADO = 'Agarre ARQUEADO (half crimp) con los 4 dedos — índice, corazón, anular y meñique: 1ª articulación (la de la uña) doblada ~45°, 2ª articulación ~90°. Pulgar completamente FUERA, nunca encima de los otros dedos. Muñeca neutral.';
const ABIERTO = 'Agarre ABIERTO (open hand): dedos en curva suave, solo las yemas en contacto. 1ª articulación apenas doblada (~20°), 2ª casi recta (~10°). Pulgar relajado. Aprieta con intención contra la regleta aunque los dedos estén abiertos.';
const CUERPO_COLGADO = 'Brazos COMPLETAMENTE extendidos durante toda la suspensión. Hombros activos: "mételos" hacia abajo, lejos de las orejas. Cuerpo recto y quieto.';

const SUSPENSION_MAX = {
  zonas: ['dedos'],
  como: [ARQUEADO, CUERPO_COLGADO, 'Cuélgate suavemente (sin saltar a la regleta), cuenta los segundos con cronómetro y suelta controlado.'],
  errores: ['Doblar los codos al colgar. BRAZOS RECTOS siempre.', 'Dejar subir los hombros hacia las orejas.', 'Recortar el descanso: son 3–4 min completos con cronómetro.'],
  calidad: 'Aguantas EXACTAMENTE entre 6 y 8 seg con esfuerzo real. Si aguantas claramente más → la regleta es grande: baja a la siguiente (o añade lastre). Si no llegas a 6 seg → la regleta es pequeña: sube a la siguiente.',
  parada: 'Si el agarre empieza a abrirse o la posición cambia, para aunque no hayas completado las series. Dolor 3 en dedos → regleta más grande o agarre abierto; dolor 4 → para la sesión.',
};

const SUSPENSION_MANT = {
  zonas: ['dedos'],
  como: [ABIERTO, CUERPO_COLGADO],
  errores: ['Convertirla en una suspensión máxima: aquí NO se va al límite.'],
  calidad: 'Esfuerzo bajo. Solo mantienes el patrón motor.',
  parada: 'Cualquier molestia en dedos → termina el bloque.',
};

const TRACCION_LASTRE = {
  zonas: ['codo', 'hombro'],
  como: [
    'Barra estándar, agarre en pronación (palmas hacia adelante), manos al ancho de los hombros, lastre en el arnés o chaleco.',
    'Empieza colgado e INMÓVIL con brazos completamente extendidos; pausa de 1 seg abajo.',
    'Sube con INTENCIÓN de ir lo más rápido posible hasta que la barbilla supere la barra — aunque por el peso subas despacio.',
    'Baja completamente controlado contando 3 seg.',
  ],
  errores: ['Balancear el cuerpo para subir: PROHIBIDO.', 'Rebotar abajo en vez de partir desde brazos extendidos.', 'Llegar al fallo.'],
  calidad: 'Cada repetición parte quieta, sube explosiva y baja en 3 seg.',
  parada: 'Para la serie ANTES del fallo: si sientes que la próxima rep sería imposible, para ya.',
};

const EXCENTRICO = {
  zonas: ['codo', 'hombro'],
  como: [
    'Sube a la posición alta (barbilla sobre la barra) CON AYUDA: cajón, compañero o banda. El esfuerzo de subir no cuenta.',
    'Arriba, toma el control con los dos brazos.',
    'Baja en el tiempo exacto contando en voz alta: "mil uno, mil dos, mil tres, mil cuatro, mil cinco…".',
    'Abajo, con brazos extendidos, vuelve a subir con ayuda. Descansa antes de la siguiente bajada.',
  ],
  errores: ['🚨 Bajar rápido: es el error más peligroso. Significa que el lastre es excesivo.', 'Esforzarte en la subida — solo la bajada importa.'],
  calidad: 'La bajada dura los segundos completos, sin tirones ni caídas al final.',
  parada: 'Si llegas abajo antes de contar "cinco" → reduce 2,5 kg. Semáforo 3 o más en dedos, codo u hombro → para inmediatamente.',
};

const BLOQUEO_ASISTIDO = {
  zonas: ['codo', 'hombro'],
  como: [
    'Haz una dominada normal con los 2 brazos hasta la posición alta: codo ~90°, barbilla sobre la barra.',
    'Suelta una mano y agarra con ella la banda elástica. La banda solo da estabilidad lateral — NO carga peso.',
    'El brazo que trabaja soporta casi todo el peso. Mantén 5 seg sin bajar.',
    'Baja con los 2 brazos controlado. Descansa. Orden: 2 series brazo derecho → 2 series brazo izquierdo.',
  ],
  errores: ['Colgarte de la banda (si la banda carga peso, el ejercicio no sirve).', 'Dejar caer el codo por debajo de 90° durante el bloqueo.'],
  calidad: 'La barbilla se mantiene sobre la barra los 5 seg completos.',
  parada: 'Si el codo cede antes de 5 seg o hay dolor en codo/hombro ≥3.',
};

const BLOQUEO_DINAMICO = {
  zonas: ['codo', 'hombro'],
  como: [
    'Sube con 2 brazos a la posición alta.',
    'Suelta 1 mano y mantén 5 seg con un solo brazo. Vuelve a poner la mano.',
    'Repite 3 veces sin bajar. Baja controlado. Cambia de brazo.',
    'Diferencia con S1: aquí NO hay banda, el brazo trabaja solo.',
  ],
  errores: ['Rotar el cuerpo para compensar.', 'Encoger el hombro del brazo que trabaja.'],
  calidad: 'Posición estable, sin bajar del ángulo de 90° en el codo.',
  parada: 'Si no aguantas los 5 seg o hay dolor en hombro/codo ≥3.',
};

const ANTAGONISTAS = {
  zonas: [],
  quitar: ['Ver'],
  extra: [
    ['Extensión dedos', '3 × 15 · Mete los 4 dedos en la banda pequeña. Ábrelos hacia fuera contra la resistencia. Vuelve lento.'],
    ['Face pull', '3 × 15 · Banda anclada a la altura de los ojos. Jala hacia tu cara separando los codos arriba y afuera. Aprieta entre los omóplatos. Vuelve lento.'],
    ['Rotación externa', '3 × 15 · Codo pegado al cuerpo a 90°, banda anclada al frente. Gira el antebrazo hacia afuera (como abriendo una puerta). Vuelve lento.'],
    ['Descanso', '1 min entre ejercicios'],
  ],
  como: ['Protocolo fijo de 3 ejercicios con banda elástica. Movimientos lentos y controlados, sobre todo en la vuelta.'],
  errores: ['Hacerlos rápido o con impulso.', 'Saltárselos: protegen hombros y codos del volumen de tracción.'],
  calidad: 'Fase de retorno lenta (2–3 seg).',
  parada: 'Molestia articular aguda en hombro.',
};

const CONTINUIDAD = {
  zonas: ['dedos'],
  como: [
    'Travesías o vías largas en el muro, sin soltar durante toda la serie.',
    'Ritmo "alegre": ni máximo ni de paseo — puedes decir frases cortas mientras escalas.',
    'Cuenta: cada vez que mueves 1 mano de una presa a otra = 1 movimiento.',
    'Reposo activo: en el descanso sacude los antebrazos con el brazo colgando. No te quedes quieto.',
  ],
  errores: ['Ir demasiado rápido y acumular bomba antes de terminar los movimientos.'],
  calidad: 'Completas los movimientos indicados con el ritmo constante.',
  parada: 'Si no completas los movimientos → baja la dificultad, NO la cantidad de movimientos.',
};

const CAMPUS = (patron) => ({
  zonas: ['dedos', 'codo', 'hombro'],
  como: [
    'Campus board: pared con 15–20° de desplome, listones numerados de abajo (1) hacia arriba. SIN PIES — solo las manos tocan el campus.',
    patron,
    'Cierra el agarre en el momento exacto del contacto con el listón.',
  ],
  errores: ['Usar los pies.', 'Movimientos lentos o arrastrados — no generan potencia y cargan los tendones.'],
  calidad: '✅ Agarre limpio, cerrado y explosivo.',
  parada: 'Al primer movimiento lento → termina la serie. Dolor en dedos o codo ≥3 → para el campus.',
});
const PATRON_ALCANCES = 'Alcances: desde el listón 1 con ambas manos, lanza la mano derecha al 3, lleva la izquierda al 3, lanza la derecha al 5. Eso = 2 movimientos. Para ahí.';
const PATRON_ALC_EMP = 'Alcances + empujes: sube 1→3→5 alternando manos e inmediatamente baja 5→3→1 alternando. Subida + bajada = 1 serie.';
const PATRON_REBOTES = 'Rebotes: sube 1 listón (alcance) y de inmediato baja (empuje) sin pausa abajo. Máxima velocidad, mínimo tiempo de contacto.';

const FUERZA_CONTACTO = {
  zonas: ['dedos'],
  como: [
    'De pie en el muro con una mano agarrada a una presa (mano base) y los pies apoyados.',
    'Lanza la otra mano a una presa lejana.',
    'Cierra el agarre con MÁXIMA velocidad en el momento del contacto. La mano base permanece agarrada.',
    'Alterna las manos.',
  ],
  errores: ['Llegar a la presa y cerrar el agarre lento.', 'Elegir presas tan pequeñas que el contacto sea inseguro.'],
  calidad: 'Contacto explosivo: la mano "muerde" la presa al tocarla.',
  parada: 'Si la velocidad de cierre baja, termina la serie.',
};

const BOULDER = (intensidad, extra = []) => ({
  zonas: ['dedos', 'hombro'],
  como: [
    'Problemas cortos de 1 a 10 movimientos de alta intensidad.',
    intensidad,
    ...extra,
  ],
  errores: ['Elegir problemas fuera de la intensidad indicada.', 'Descansar menos de lo indicado.'],
  calidad: 'Ejecución limpia: sin movimientos torpes, sin tirones de emergencia.',
  parada: 'Dolor en dedos u hombros ≥3, o caída en la calidad técnica.',
});

const CORE = {
  zonas: ['espalda'],
  como: [
    'Plancha frontal: apoyado en antebrazos y puntas de pie. Cuerpo como una tabla: cabeza alineada con la columna, cadera ni arriba ni abajo. Aprieta el abdomen.',
    'Abdominales en suspensión: colgado de la barra con brazos extendidos. Sube las piernas RECTAS hasta 90° (paralelas al suelo). Baja en 3 seg. Sin balanceo.',
  ],
  errores: ['Hundir o levantar la cadera en la plancha.', 'Balancearte para subir las piernas.'],
  calidad: 'Control total en la bajada.',
  parada: 'Dolor lumbar.',
};

const CIRCUITO = {
  zonas: ['dedos'],
  como: [
    'Secuencia fija de 25–40 movimientos marcada en el muro (siempre el mismo circuito).',
    '1 intento continuo SIN SOLTAR.',
    'Registra: ¿completo? Si no, ¿en qué movimiento caíste?',
  ],
  errores: ['Cambiar de circuito entre sesiones: así no puedes comparar.', 'Descansar menos de 5 min entre intentos.'],
  calidad: 'Mismo circuito, mismo protocolo, registro exacto.',
  parada: 'Dolor en dedos ≥3.',
};

const ESCALADA_SUAVE = {
  zonas: [],
  como: ['Escalada muy por debajo de tu nivel, ritmo de paseo. El objetivo es irrigar, no cansar.'],
  errores: ['Subir la dificultad "porque te sientes bien".'],
  calidad: 'Respiración tranquila todo el tiempo.',
  parada: 'Si el PSE supera el máximo indicado.',
};

const FISIO = {
  zonas: [],
  como: ['Sesión con fisioterapia. Lleva tu registro de dolor: informa TODAS las molestias, aunque sean leves.', 'Revisión de tendones de dedos (poleas), codos y hombros.'],
  errores: ['Omitir molestias "porque ya pasaron".'],
  calidad: 'Sales con indicaciones concretas para las próximas semanas.',
  parada: '—',
};

const MOVILIDAD_LARGA = {
  zonas: [],
  como: [
    'Cadera / rana (3 min): sentado con las plantas juntas, rodillas hacia el suelo, espalda recta.',
    'Cadena posterior (2 min/pierna): sentado, pierna extendida, dobla el tronco hacia ella.',
    'Pectoral (2 min/lado): brazo en la pared a 90°, gira el tronco hacia el lado contrario.',
    'Dorsal (2 min/lado): agárrate a la barra, pasa la pierna del mismo lado por detrás y desplázate hacia el lado del agarre.',
    'Trapecio (1 min/lado): inclina la cabeza al lado contrario y baja el hombro.',
  ],
  errores: ['Rebotar en los estiramientos.'],
  calidad: 'Respiración lenta, sin dolor.',
  parada: 'Dolor punzante.',
};

const TEST = (como, anota) => ({
  zonas: [],
  como: [...como, 'Descanso mínimo de 5 min entre tests distintos. Debe haber 2 personas: una escala, otra cronometra y anota.'],
  errores: ['Hacer el test cansado: requiere 2 días de descanso previo y calentamiento completo de 35–40 min.'],
  calidad: anota,
  parada: 'Dolor ≥3 en cualquier zona → no continúes con ese test.',
});

// ─── OVERLAY POR SESIÓN ──────────────────────────────────
const SUSP_SESION = (nota) => ({ ...SUSPENSION_MAX, como: [...SUSPENSION_MAX.como, nota] });

const T1_AVANZADO = {
  S0_1: {
    'T2 — Tracción máxima con lastre': TEST([
      'Barra estándar, pronación, ancho de hombros, sin balanceo. Arnés con discos.',
      'Haz 1 dominada sin lastre. Si la completas, añade 5 kg y descansa 3 min EXACTOS.',
      'Repite +5 kg por intento con 3 min de descanso hasta que NO completes la dominada (barbilla sobre la barra).',
    ], 'Anota el último peso con el que SÍ completaste la dominada (ej: "T2 = 25 kg adicionales").'),
    'T4 — Suspensión 5 seg con lastre': TEST([
      `Regleta 20 mm. ${ARQUEADO}`, CUERPO_COLGADO,
      'Sin lastre: cuélgate 5 seg. Descansa 3 min. Añade 5 kg y repite. Sigue +5 kg hasta que NO aguantes los 5 seg completos.',
    ], 'Anota el último peso con el que SÍ aguantaste los 5 seg.'),
    'T5 — Máximo dominadas seguidas': TEST([
      'Sin lastre, pronación, ancho de hombros, desde brazos completamente extendidos.',
      'Cada rep: barbilla sobre la barra y bajada hasta extensión completa. Sin balanceo, sin rebote abajo.',
    ], 'Anota el total de dominadas con buena forma.'),
    'T6 — Suspensión máxima sin lastre': TEST([`Regleta 20 mm. ${ARQUEADO}`, CUERPO_COLGADO, 'Aguanta hasta que los dedos se abran solos.'], 'Anota los segundos totales.'),
    'T7 — Campus: máximo movimientos': TEST([
      'Listones medianos (~25 mm). Sin pies.',
      'Sube alternando manos; al llegar arriba baja alternando; continúa sin parar.',
      'Cada vez que 1 mano toca 1 listón = 1 movimiento.',
    ], 'Para cuando no alcances el siguiente listón o pierdas el control. Anota los movimientos.'),
    'T9 — Abdominales en suspensión': TEST([
      'Colgado de la barra con brazos extendidos.',
      'Sube las piernas RECTAS hasta tocar las manos con los pies (o lo máximo posible). Baja controlado y lento, sin balanceo.',
    ], 'Anota las reps completadas con control.'),
    'Powerslab — Lanzamiento campus': TEST([
      'Frente al campus (listones ~25 mm), agarra el listón de partida con ambas manos.',
      'Con 1 mano lanza lo más lejos posible hacia arriba y cierra en el listón más lejano que alcances.',
      'Mide en cm desde el listón de partida. Descansa 3 min. 3 intentos con cada mano.',
    ], 'Anota la mejor marca de cada mano (D e I).'),
    'Circuito estándar': { ...CIRCUITO, como: [...CIRCUITO.como, 'En el test: 1 solo intento. Es tu referencia para S12.'] },
  },

  S0_3: {
    'Foam rolling antebrazos': {
      zonas: [],
      como: ['Rueda lentamente el antebrazo sobre el rodillo, de la muñeca al codo.', 'Cuando encuentres un punto doloroso, detente ahí 20–30 seg. Ambos brazos.'],
      errores: ['Rodar rápido sin detenerte en los puntos de tensión.'],
      calidad: 'Molestia tolerable que disminuye mientras mantienes la presión.',
      parada: 'Dolor punzante o adormecimiento.',
    },
    'Travesía muy fácil': { ...ESCALADA_SUAVE, como: ['Travesía a ritmo de paseo, 3 grados bajo tu máximo. Solo irrigar los músculos, no cansarlos.'] },
    'Estiramientos largos': {
      zonas: [],
      como: ['Las posiciones del protocolo de vuelta a la calma (flexores y extensores de dedos, bíceps, dorsal, pectoral, trapecio, aductores), manteniendo cada una 2–3 min.'],
      errores: ['Rebotar o forzar el rango.'],
      calidad: 'Respiración lenta; la tensión baja con el tiempo.',
      parada: 'Dolor punzante.',
    },
  },

  S1_1: {
    'Bloque 1 · Suspensiones máximas': SUSP_SESION('Empieza en 20 mm. Si en la serie 2 aguantas más de 8 seg con facilidad → usa 18 mm el resto. Si no llegas a 6 seg → 22 mm.'),
    'Bloque 2 · Bloqueos 1 brazo asistido': BLOQUEO_ASISTIDO,
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S1_2: {
    'Bloque 1 · Continuidad': { ...CONTINUIDAD, parada: 'Si no completas 60 mov en una serie → baja 1 grado en las series restantes. Si completas 80 con facilidad → sube 1 grado la próxima semana.' },
    'Bloque 2 · Técnica punto débil': {
      zonas: [],
      como: ['Después de 10 min de descanso post-continuidad.', 'Elige el movimiento técnico que identificaste como punto débil en S0-Sesión 2.', 'Repítelo 10–15 veces con conciencia plena de lo que hace cada parte del cuerpo, sin fatiga.'],
      errores: ['Convertirlo en un bloque de fuerza.'],
      calidad: 'Cada repetición es más fluida que la anterior.',
      parada: 'Si aparece fatiga, descansa: la técnica se entrena fresco.',
    },
  },
  S1_3: { 'Bloque · Boulder al 85% limpio': BOULDER('Al 85%: problemas que puedes completar con esfuerzo, SIN caerte. Criterio limpio: sin caídas, sin movimientos torpes, sin gritos de esfuerzo.', ['Si te caes en más de 2 intentos seguidos en el mismo problema → está por encima del 85%: elige uno más fácil.']) },
  S1_4: {
    'Bloque 1 · Core': CORE,
    'Bloque 2 · Hombro antagonista': {
      zonas: ['hombro'],
      como: ['Press neutro: acostado boca arriba, mancuernas de 5–8 kg con las palmas enfrentadas. Sube en 2 seg, baja en 3 seg.', ANTAGONISTAS.extra[1][1]],
      errores: ['Arquear la espalda en el press.'],
      calidad: 'Tempo controlado (2 seg subida / 3 seg bajada).',
      parada: 'Dolor en hombro ≥3.',
    },
    'Bloque 3 · Capilarización': {
      zonas: [],
      como: ['Travesía muy fácil sin soltar durante 3–4 min. Ritmo MUY lento.'],
      errores: ['Escalar demasiado difícil: la capilarización necesita baja intensidad.'],
      calidad: 'Los antebrazos se ponen ligeramente hinchados y calientes.',
      parada: 'Si sientes quemazón intensa → la dificultad es demasiado alta. Baja.',
    },
  },

  S2_1: {
    'Bloque 1 · Suspensiones máximas': SUSP_SESION('Regleta 18 mm. Si el PSE real es ≤7 al terminar, prueba 15 mm en 1–2 series.'),
    'Bloque 2 · Tracción con lastre — intención veloz': TRACCION_LASTRE,
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S2_2: { 'Bloque · Continuidad': CONTINUIDAD },
  S2_3: { 'Bloque · Campus — alcances': CAMPUS(PATRON_ALCANCES) },
  S2_4: {
    'Bloque · Boulder coordinación': BOULDER('Problemas técnicamente complejos: giros del cuerpo, pasos largos, cambios de presa en movimiento, equilibrio. NO de pura fuerza.', ['Sin series fijas: descansa cuando lo necesites. Objetivo: explorar movimientos, no rendir al máximo.']),
  },

  S3_1: {
    'Bloque 1 · Suspensiones máximas': SUSP_SESION('Si con 3 min de descanso no te recuperas, extiende hasta 6 min. Si alguna serie no llega a 6 seg → descansa 6 min completos y PARA: no más series hoy.'),
    'Bloque 2 · Bloqueos dinámicos (sin banda)': BLOQUEO_DINAMICO,
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S3_2: {
    'Bloque 1 · Continuidad': CONTINUIDAD,
    'Bloque 2 · Campus: alcances + empujes': CAMPUS(PATRON_ALC_EMP),
  },
  S3_3: { 'Bloque · Boulder físico': BOULDER('Al 85–90%, problemas de fuerza: cantos pequeños, compresiones, pasos largos, techos.', ['Puedes caerte 1–2 veces en el mismo problema. Complétalo antes de cambiar.']) },
  S3_4: {
    'Bloque 1 · Técnica filmada': {
      zonas: [],
      como: ['Elige 1 problema 3 grados bajo tu máximo. Escálalo 5–6 veces grabando cada repetición.', 'Compara con un video de referencia (escalador de nivel superior en movimientos similares).', 'Escribe 1 cosa concreta a corregir.'],
      errores: ['Analizar sin escribir la corrección.'],
      calidad: 'Sales con 1 corrección concreta por escrito.',
      parada: '—',
    },
    'Bloque 2 · Core': CORE,
  },

  S4_1: {
    'Bloque 1 · Suspensiones máximas': SUSP_SESION('10 series es el MÁXIMO del bloque. La calidad manda: si el agarre se abre o la posición cambia, para aunque no llegues a 10.'),
    'Bloque 2 · Control informal T4': {
      zonas: ['dedos'],
      como: [`Regleta 20 mm, SIN lastre. ${ARQUEADO}`, CUERPO_COLGADO, '1 única suspensión de 5 seg. No es un test oficial: solo verifica que el volumen de S1–S4 no te ha sobrecargado.'],
      errores: ['Añadir lastre o repetir.'],
      calidad: 'Aguantas los 5 seg sin esfuerzo excesivo.',
      parada: 'Si NO aguantas los 5 seg → informa al entrenador.',
    },
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S4_2: { 'Bloque · Continuidad': CONTINUIDAD },
  S4_3: {
    'Bloque 1 · Campus': CAMPUS(PATRON_ALC_EMP),
    'Bloque 2 · Boulder al 90%': BOULDER('Al 90%: cerca del límite, un nivel más difícil que en S3. Te puedes caer 1 de cada 3 intentos. Lo importante es el intento.'),
  },
  S4_4: { Fisioterapia: FISIO, Regenerativo: { ...ESCALADA_SUAVE, como: ['Travesía muy fácil o foam rolling. PSE 1. Sin esfuerzo.'] } },

  S5_1: {
    'Bloque 1 · Suspensiones de mantenimiento': SUSPENSION_MANT,
    'Bloque 2 · Escalada placentera': { ...ESCALADA_SUAVE, como: ['Lo que quieras, sin presión. Nada al límite.'] },
  },
  S5_2: {
    'Bloque 1 · Continuidad reducida': CONTINUIDAD,
    'Bloque 2 · Movilidad larga': MOVILIDAD_LARGA,
  },

  S6_1: {
    'Bloque 1 · Excéntrico de tracción': { ...EXCENTRICO, como: [...EXCENTRICO.como, 'Esta semana: bajada de 5 seg exactos.'] },
    'Bloque 2 · Suspensiones reducidas': SUSP_SESION('Regleta 20 mm. Volumen reducido (5 series) para no sobrecargar mientras haces el excéntrico.'),
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S6_2: { 'Bloque · Continuidad': CONTINUIDAD },
  S6_3: {
    'Opción A · Campus (si eres apto)': CAMPUS(PATRON_REBOTES),
    'Opción B · Fuerza de contacto en muro': FUERZA_CONTACTO,
  },
  S6_4: {
    'Bloque 1 · Antagonistas reforzados': { ...ANTAGONISTAS, quitar: [], extra: [], como: ['Mismos 3 ejercicios del protocolo G pero con más series: extensión de dedos 4 × 20, face pull 4 × 15, rotación externa 4 × 15. 1 min entre ejercicios.', ...ANTAGONISTAS.extra.slice(0, 3).map(([k, v]) => `${k}: ${v.split(' · ').slice(1).join(' · ')}`)] },
    'Bloque 2 · Core': {
      ...CORE,
      como: ['Plancha lateral: apoyado en un antebrazo (codo bajo el hombro) y el borde del pie. Cuerpo en línea recta, cadera arriba.', CORE.como[1]],
    },
    'Bloque 3 · Escalada suave': ESCALADA_SUAVE,
  },

  S7_1: {
    'Bloque 1 · Excéntrico — incremento': { ...EXCENTRICO, como: [...EXCENTRICO.como, 'Esta semana: bajada de 6 seg exactos (1 más que S6). Es normal sentirse pesado.'] },
    'Bloque 2 · Suspensiones': SUSPENSION_MAX,
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S7_2: { 'Bloque · Circuito estándar': { ...CIRCUITO, como: [...CIRCUITO.como, 'Circuito intro: 25–35 movimientos difíciles al 85–90% de tu máximo de bloque. Objetivo: completarlo al final de S9.'] } },
  S7_3: {
    'Bloque 1 · Campus en listones pequeños': {
      ...CAMPUS(`${PATRON_ALCANCES} Listones pequeños (15–18 mm): trabajo de dedo.`),
      noApto: { n: 'Bloque 1 · Fuerza de contacto en muro (sustituye campus)', params: [['Series', '5–6'], ['Reps/serie', '2–3 lanzamientos'], ['Descanso', '4 min']], ficha: FUERZA_CONTACTO },
    },
    'Bloque 2 · Boulder al límite': BOULDER('Al límite: el problema más difícil que puedes intentar hoy. Puedes caer varias veces.'),
  },
  S7_4: {
    'Análisis táctico': {
      zonas: [],
      como: ['Elige 3 secciones de tu proyecto T2.', 'Para cada una, practica 3 formas DIFERENTES de resolverla y anota cuál es la más eficiente energéticamente.', 'Sales con plan A, B y C por sección.'],
      errores: ['Probar siempre la misma solución.'],
      calidad: 'PSE máximo 6.',
      parada: '—',
    },
  },

  S8_1: {
    'Bloque 1 · Excéntrico — sesión final': { ...EXCENTRICO, como: [...EXCENTRICO.como, 'Bajada de 6 seg. ⚠️ Último excéntrico del año: este ejercicio NO se repite.'] },
    'Bloque 2 · Suspensiones': SUSPENSION_MAX,
    'Bloque 3 · Antagonistas': ANTAGONISTAS,
  },
  S8_2: { 'Bloque · Circuito — registro': { ...CIRCUITO, como: [...CIRCUITO.como, 'Mismo circuito de S7-Sesión 2. Compara movimientos por intento con S7.'] } },
  S8_3: {
    'Bloque 1 · Campus en pequeños': {
      ...CAMPUS(`Alcances + empujes + rebotes: una vuelta completa de los 3 tipos = 1 serie. ${PATRON_REBOTES}`),
      noApto: { n: 'Bloque 1 · Fuerza de contacto en muro (sustituye campus)', params: [['Series', '6'], ['Reps/serie', '3–4 lanzamientos'], ['Descanso', '4 min']], ficha: FUERZA_CONTACTO },
    },
    'Bloque 2 · Boulder 85–90%': BOULDER('Al 85–90%: cerca del límite. Te puedes caer 1 de cada 3 intentos.'),
  },
  S8_4: { Fisioterapia: FISIO, Antagonistas: ANTAGONISTAS, 'Escalada suave': ESCALADA_SUAVE },

  S9_1: {
    'Bloque 1 · Suspensiones': SUSP_SESION('Si no llegas a 6 seg en 18 mm, usa 20 mm temporalmente: es la pesadez residual del excéntrico.'),
    'Bloque 2 · Tracción con lastre': { ...TRACCION_LASTRE, como: [...TRACCION_LASTRE.como, 'Solo 2 reps por serie para no acercarte al fallo.'] },
  },
  S9_2: {
    'Bloque 1 · Circuito': { ...CIRCUITO, como: [...CIRCUITO.como, 'Mismo circuito de S7–S8. ¿Mejor resultado? Anótalo.'] },
    'Bloque 2 · Táctica Watts': {
      zonas: ['dedos'],
      como: ['Regla de Watts: los antebrazos necesitan ≥20 min para recuperarse tras un esfuerzo máximo.', 'Trabaja el ritmo en tu proyecto o circuito: rápido en los tramos de descanso, lento y preciso en el crux.'],
      errores: ['Volver a intentar antes de 20 min.'],
      calidad: 'Ritmo distinto y deliberado en cada tramo.',
      parada: 'Dolor en dedos ≥3.',
    },
  },
  S9_3: {
    'Bloque · Formato competencia': BOULDER('Al límite, con lectura cronometrada: lee el problema desde el suelo sin tocarlo y ejecuta un plan.', ['Cuando suena el tiempo → para inmediatamente, como en competencia.']),
  },
  S9_4: { 'Bloque · Continuidad suave': CONTINUIDAD },

  S10_1: {
    'Bloque 1 · Suspensiones de mantenimiento': SUSPENSION_MANT,
    'Bloque 2 · Escalada suave': ESCALADA_SUAVE,
  },
  S10_2: {
    'Bloque 1 · Movilidad larga': MOVILIDAD_LARGA,
    'Bloque 2 · Técnica suave': {
      zonas: [],
      como: ['1 movimiento técnico. Repítelo 10–15 veces con conciencia plena, sin fatiga.'],
      errores: ['Meter intensidad: es semana de descarga.'],
      calidad: 'Fluidez creciente.',
      parada: 'Cualquier fatiga.',
    },
  },

  S11_1: {
    'Simulación completa': {
      zonas: [],
      como: [
        'Lectura: 6 min EXACTOS observando desde el suelo, sin tocar. Plan A y plan B para cada sección difícil.',
        'Intento 1: un solo intento. Anota exactamente dónde caíste (o "completado").',
        'Descanso mínimo 25 min: muévete suave, come algo pequeño si lo necesitas, nada intenso.',
        'Intento 2: el segundo y último del día. Anota el resultado.',
      ],
      errores: ['Hacer intentos extra "porque estabas cerca".'],
      calidad: 'Registro exacto del movimiento de caída en cada intento.',
      parada: 'Después del segundo intento.',
    },
  },
  S11_2: {
    'Bloque de activación': {
      zonas: ['dedos'],
      como: ['4 bloques progresivos: fácil → medio → 80% → 85%, 3 min de descanso.', `3 suspensiones de 6 seg en 18 mm. ${ARQUEADO}`],
      errores: ['Convertirla en entrenamiento: PSE máximo 6.'],
      calidad: 'Sales fresco y activado, no cansado.',
      parada: 'Si el PSE pasa de 6.',
    },
  },
};

function fichaT1Avanzado(semana, sesion, nombreBloque) {
  return T1_AVANZADO[`${semana}_${sesion}`]?.[nombreBloque] || null;
}

module.exports = { fichaT1Avanzado };
