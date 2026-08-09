/**
 * seed.js — Datos demo completos y relacionalmente coherentes.
 * Cadena garantizada: usuario → escalador/entrenador → cohorte → inscripcion → pago → sesion → asistencia → evaluacion
 * Ejecutar: node prisma/seed.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed completo...\n");

  // ─── ADMIN ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin2026", 12);
  await prisma.usuario.upsert({
    where: { email: "admin@escaladabogota.com" },
    update: {},
    create: { email: "admin@escaladabogota.com", passwordHash: adminHash, rol: "admin" },
  });
  console.log("✓ Admin creado");

  // ─── MUROS ALIADOS ──────────────────────────────────────
  const beta = await prisma.muroAliado.upsert({
    where: { nombre: "BetaClimb" },
    update: {},
    create: { nombre: "BetaClimb", direccion: "Cra 13 #93-40, Bogotá", zonasDisponibles: 3, convenioActivo: true },
  });
  const weya = await prisma.muroAliado.upsert({
    where: { nombre: "Weya Centro de Escalada" },
    update: {},
    create: { nombre: "Weya Centro de Escalada", direccion: "Av. Boyacá #72-20, Bogotá", zonasDisponibles: 2, convenioActivo: true },
  });
  console.log("✓ Muros aliados:", beta.nombre, "|", weya.nombre);

  // ─── PROGRAMAS ──────────────────────────────────────────
  const progMap = {};
  const programasData = [
    { nombre: "Iniciación Adulto", poblacion: "adulto", nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Técnica de caída, lectura de vías, repertorio motor. Cero trabajo de dedos el primer año." },
    { nombre: "Intermedio Adulto", poblacion: "adulto", nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión por tamaño de presa sin lastre. Test Hörst + circuito estándar." },
    { nombre: "Avanzado Adulto",   poblacion: "adulto", nivel: "avanzado",   incluyeFisio: true,  incluyeNutricion: true,  descripcion: "Doble pico anual con efectos retardados. Fisio mensual y nutrición por fase incluidas." },
    { nombre: "Iniciación Menor 6-9",  poblacion: "menor", rangoEtarioMenor: "menor_6_9",  nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Fases sensibles del desarrollo motor. Ratio 1:6. Cero campus ni lastre." },
    { nombre: "Intermedio Menor 6-9",  poblacion: "menor", rangoEtarioMenor: "menor_6_9",  nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión motora respetando desarrollo. Ratio 1:6." },
    { nombre: "Iniciación Menor 10-12",poblacion: "menor", rangoEtarioMenor: "menor_10_12",nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Fases sensibles del desarrollo motor. Ratio 1:8." },
    { nombre: "Intermedio Menor 10-12",poblacion: "menor", rangoEtarioMenor: "menor_10_12",nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión técnica y táctica. Ratio 1:8." },
    { nombre: "Iniciación Menor 13-15",poblacion: "menor", rangoEtarioMenor: "menor_13_15",nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Introducción a fuerza controlada. Sin lastre hasta los 16." },
    { nombre: "Intermedio Menor 13-15",poblacion: "menor", rangoEtarioMenor: "menor_13_15",nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Periodización adaptada a adolescentes. Ratio 1:8." },
  ];
  for (const p of programasData) {
    const prog = await prisma.programa.upsert({
      where: { nombre: p.nombre },
      update: {},
      create: { nombre: p.nombre, poblacion: p.poblacion, rangoEtarioMenor: p.rangoEtarioMenor || null, nivel: p.nivel, duracionSemanas: 13, incluyeFisio: p.incluyeFisio, incluyeNutricion: p.incluyeNutricion, descripcion: p.descripcion },
    });
    progMap[p.nivel + "_" + p.poblacion] = prog;
  }
  console.log("✓ 9 programas creados");

  // ─── CICLOS ─────────────────────────────────────────────
  // T3 activo (jul-sep 2026, estado en_curso)
  const cicloT3 = await prisma.ciclo.upsert({
    where: { codigo: "2026-T3" },
    update: {},
    create: { codigo: "2026-T3", anio: 2026, trimestre: 3, fechaInicio: new Date("2026-07-07"), fechaFin: new Date("2026-10-03"), semanaEmpalme: new Date("2026-09-28") },
  });
  // T4 próximo (oct 2026 - ene 2027, estado abierta)
  const cicloT4 = await prisma.ciclo.upsert({
    where: { codigo: "2026-T4" },
    update: {},
    create: { codigo: "2026-T4", anio: 2026, trimestre: 4, fechaInicio: new Date("2026-10-05"), fechaFin: new Date("2027-01-02"), semanaEmpalme: new Date("2026-12-28") },
  });
  console.log("✓ Ciclos T3 (activo) y T4 (próximo) creados");

  // ─── ALIADOS DE SALUD ────────────────────────────────────
  await prisma.aliadoSalud.createMany({
    data: [
      { nombre: "Liyeri Fisioterapia", tipo: "fisioterapia", direccion: "Bogotá, D.C.", activo: true },
      { nombre: "Daniela Forero - Nutrición Deportiva", tipo: "nutricion", direccion: "Bogotá, D.C.", activo: true },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Aliados de salud creados");

  // ─── ENTRENADORES ────────────────────────────────────────
  const entHash = await bcrypt.hash("entrenador2026", 12);
  const jfgHash = await bcrypt.hash("jfg2026", 12);
  const jdgHash = await bcrypt.hash("jdg2026", 12);

  const entDemo = await prisma.usuario.upsert({
    where: { email: "entrenador@escaladabogota.com" },
    update: {},
    create: {
      email: "entrenador@escaladabogota.com", passwordHash: entHash, rol: "entrenador",
      entrenador: { create: { nombre: "Entrenador Demo", licenciaLey181: "DEMO-001", maxGrupos: 6, fechaIngreso: new Date("2026-07-01") } },
    },
    include: { entrenador: true },
  });

  const jfgUser = await prisma.usuario.upsert({
    where: { email: "jfg@escaladabogota.com" },
    update: {},
    create: {
      email: "jfg@escaladabogota.com", passwordHash: jfgHash, rol: "entrenador",
      entrenador: { create: { nombre: "Juan Felipe García", licenciaLey181: "COL-2847-JFG", maxGrupos: 4, fechaIngreso: new Date("2025-03-01") } },
    },
    include: { entrenador: true },
  });

  const jdgUser = await prisma.usuario.upsert({
    where: { email: "jdg@escaladabogota.com" },
    update: {},
    create: {
      email: "jdg@escaladabogota.com", passwordHash: jdgHash, rol: "entrenador",
      entrenador: { create: { nombre: "Juan David González", licenciaLey181: "COL-3195-JDG", maxGrupos: 4, fechaIngreso: new Date("2025-06-01") } },
    },
    include: { entrenador: true },
  });

  const jfg = jfgUser.entrenador;
  const jdg = jdgUser.entrenador;
  console.log("✓ Entrenadores creados: JFG | JDG | Demo");

  // ─── GRUPOS / COHORTES T3 (activos) ─────────────────────
  const cohIni = await prisma.cohorte.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { estado: "en_curso" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      programaId: progMap["iniciacion_adulto"].id,
      cicloId: cicloT3.id,
      entrenadorId: jdg.id,
      muroId: beta.id,
      modalidad: "acompanado",
      horario: "Mar-Jue-Sáb 07:00–09:00",
      cupoMaximo: 8,
      inscritosActual: 4,
      estado: "en_curso",
    },
  });

  const cohInt = await prisma.cohorte.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: { estado: "en_curso" },
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      programaId: progMap["intermedio_adulto"].id,
      cicloId: cicloT3.id,
      entrenadorId: jfg.id,
      muroId: weya.id,
      modalidad: "acompanado",
      horario: "Lun-Mié-Vie 18:00–20:00",
      cupoMaximo: 8,
      inscritosActual: 3,
      estado: "en_curso",
    },
  });

  const cohAvz = await prisma.cohorte.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: { estado: "en_curso" },
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      programaId: progMap["avanzado_adulto"].id,
      cicloId: cicloT3.id,
      entrenadorId: jfg.id,
      muroId: beta.id,
      modalidad: "acompanado",
      horario: "Mar-Jue 06:00–08:00",
      cupoMaximo: 6,
      inscritosActual: 2,
      estado: "en_curso",
    },
  });

  // Grupo T4 abierto (para que los escaladores puedan inscribirse desde la web)
  await prisma.cohorte.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      programaId: progMap["iniciacion_adulto"].id,
      cicloId: cicloT4.id,
      entrenadorId: jdg.id,
      muroId: beta.id,
      modalidad: "acompanado",
      horario: "Mar-Jue-Sáb 07:00–09:00",
      cupoMaximo: 8,
      inscritosActual: 0,
      estado: "abierta",
    },
  });

  await prisma.cohorte.upsert({
    where: { id: "00000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000005",
      programaId: progMap["intermedio_adulto"].id,
      cicloId: cicloT4.id,
      entrenadorId: jfg.id,
      muroId: weya.id,
      modalidad: "autonomo",
      horario: "Lun-Mié-Vie 06:30–08:30",
      cupoMaximo: 8,
      inscritosActual: 0,
      estado: "abierta",
    },
  });
  console.log("✓ 5 grupos/cohortes creados (3 T3 en_curso + 2 T4 abiertos)");

  // ─── ESCALADORES DEMO ────────────────────────────────────
  const escHash = await bcrypt.hash("escalador2026", 12);
  const sofiaHash = await bcrypt.hash("sofia2026", 12);

  const sofiaUser = await prisma.usuario.upsert({
    where: { email: "sofia.torres@gmail.com" },
    update: {},
    create: {
      email: "sofia.torres@gmail.com", passwordHash: sofiaHash, rol: "escalador",
      escalador: { create: { nombre: "Sofía", apellido: "Torres", fechaNacimiento: new Date("1994-11-22"), rangoEtario: "adulto", pesoKg: 58.0, telefono: "3158769012", contactoEmergencia: "Carlos Torres - 3109876543", estado: "activo" } },
    },
    include: { escalador: true },
  });

  const carlosUser = await prisma.usuario.upsert({
    where: { email: "escalador@escaladabogota.com" },
    update: {},
    create: {
      email: "escalador@escaladabogota.com", passwordHash: escHash, rol: "escalador",
      escalador: { create: { nombre: "Carlos", apellido: "Demo", fechaNacimiento: new Date("1992-03-15"), rangoEtario: "adulto", pesoKg: 72.5, telefono: "3001234567", contactoEmergencia: "María Demo - 3009876543", estado: "activo" } },
    },
    include: { escalador: true },
  });

  const andrésUser = await prisma.usuario.upsert({
    where: { email: "andres.ruiz@gmail.com" },
    update: {},
    create: {
      email: "andres.ruiz@gmail.com", passwordHash: escHash, rol: "escalador",
      escalador: { create: { nombre: "Andrés", apellido: "Ruiz", fechaNacimiento: new Date("1990-06-08"), rangoEtario: "adulto", pesoKg: 68.0, telefono: "3141234567", contactoEmergencia: "Laura Ruiz - 3004567890", estado: "activo" } },
    },
    include: { escalador: true },
  });

  const valentinUser = await prisma.usuario.upsert({
    where: { email: "valentin.m@gmail.com" },
    update: {},
    create: {
      email: "valentin.m@gmail.com", passwordHash: escHash, rol: "escalador",
      escalador: { create: { nombre: "Valentín", apellido: "Morales", fechaNacimiento: new Date("1998-01-30"), rangoEtario: "adulto", pesoKg: 75.0, telefono: "3187654321", contactoEmergencia: "Ana Morales - 3123456789", estado: "activo" } },
    },
    include: { escalador: true },
  });

  const luciaUser = await prisma.usuario.upsert({
    where: { email: "lucia.p@gmail.com" },
    update: {},
    create: {
      email: "lucia.p@gmail.com", passwordHash: escHash, rol: "escalador",
      escalador: { create: { nombre: "Lucía", apellido: "Pedraza", fechaNacimiento: new Date("1996-09-14"), rangoEtario: "adulto", pesoKg: 54.5, telefono: "3205551234", contactoEmergencia: "Roberto Pedraza - 3012345678", estado: "activo" } },
    },
    include: { escalador: true },
  });

  const [sofia, carlos, andres, valentin, lucia] = [
    sofiaUser.escalador, carlosUser.escalador,
    andrésUser.escalador, valentinUser.escalador, luciaUser.escalador,
  ];
  console.log("✓ 5 escaladores creados (Sofía, Carlos, Andrés, Valentín, Lucía)");

  // ─── INSCRIPCIONES + PAGOS ───────────────────────────────
  // Helper: crear inscripcion + pago transaccionalmente
  async function inscribir({ escaladorId, cohorteId, precio, metodo, pagado, mes, anio }) {
    // Verificar si ya existe
    const existe = await prisma.inscripcion.findFirst({ where: { escaladorId, cohorteId } });
    if (existe) return existe;

    return await prisma.$transaction(async (tx) => {
      const insc = await tx.inscripcion.create({
        data: { escaladorId, cohorteId, estado: "activa", precioCiclo: precio },
      });
      // Pago del ciclo
      await tx.pago.create({
        data: {
          inscripcionId: insc.id,
          monto: precio,
          metodo: metodo || "transferencia",
          estado: pagado ? "pagado" : "pendiente",
          fechaPago: pagado ? new Date(`${anio || 2026}-${String(mes || 7).padStart(2,'0')}-15`) : null,
          fechaVencimiento: new Date(`${anio || 2026}-${String(mes || 7).padStart(2,'0')}-05`),
          referencia: pagado ? `REF-${Math.random().toString(36).substr(2,8).toUpperCase()}` : null,
        },
      });
      return insc;
    });
  }

  // Sofía → Iniciación T3 (pagado)
  const inscSofia = await inscribir({ escaladorId: sofia.id, cohorteId: cohIni.id, precio: 350000, metodo: "transferencia", pagado: true, mes: 7 });
  // Carlos → Iniciación T3 (pagado)
  await inscribir({ escaladorId: carlos.id, cohorteId: cohIni.id, precio: 350000, metodo: "efectivo", pagado: true, mes: 7 });
  // Andrés → Intermedio T3 (pagado)
  await inscribir({ escaladorId: andres.id, cohorteId: cohInt.id, precio: 450000, metodo: "transferencia", pagado: true, mes: 7 });
  // Valentín → Intermedio T3 (pendiente)
  await inscribir({ escaladorId: valentin.id, cohorteId: cohInt.id, precio: 450000, pagado: false, mes: 8 });
  // Lucía → Avanzado T3 (pagado)
  await inscribir({ escaladorId: lucia.id, cohorteId: cohAvz.id, precio: 600000, metodo: "transferencia", pagado: true, mes: 7 });
  // Andrés → también T2 previo (para activar renovación)
  console.log("✓ Inscripciones + pagos creados (cadena relacional completa)");

  // ─── SESIONES GRUPO INICIACIÓN T3 ───────────────────────
  // 4 semanas × 3 sesiones = 12 sesiones
  const sesionesCohIni = [];
  const dias = [2, 4, 6]; // Mar, Jue, Sáb (0=Dom)
  let fecha = new Date("2026-07-07");
  let numSesion = 0;
  while (numSesion < 12) {
    const dow = fecha.getDay();
    if (dias.includes(dow)) {
      const tipo = numSesion === 0 ? "test_entrada" : numSesion === 11 ? "test_salida" : numSesion === 5 ? "juego_cierre" : "regular";
      const sesion = await prisma.sesion.create({
        data: {
          cohorteId: cohIni.id,
          fecha: new Date(fecha),
          horaInicio: new Date(fecha.toISOString().split('T')[0] + 'T07:00:00'),
          horaFin: new Date(fecha.toISOString().split('T')[0] + 'T09:00:00'),
          numeroSesion: numSesion + 1,
          tipo,
          notasEntrenador: tipo === "test_entrada" ? "Test de entrada — baseline Hörst" : tipo === "test_salida" ? "Test de salida — comparación final" : null,
        },
      });
      sesionesCohIni.push(sesion);
      numSesion++;
    }
    fecha.setDate(fecha.getDate() + 1);
    if (fecha > new Date("2026-10-03")) break;
  }
  console.log(`✓ ${sesionesCohIni.length} sesiones creadas para grupo Iniciación T3`);

  // ─── ASISTENCIAS SOFÍA ───────────────────────────────────
  for (let i = 0; i < sesionesCohIni.length; i++) {
    const asistio = i < 8; // asistió a las primeras 8
    await prisma.asistencia.upsert({
      where: { sesionId_escaladorId: { sesionId: sesionesCohIni[i].id, escaladorId: sofia.id } },
      update: {},
      create: {
        sesionId: sesionesCohIni[i].id,
        escaladorId: sofia.id,
        asistio,
        observaciones: asistio ? null : "No asistió",
      },
    });
  }
  console.log("✓ Asistencias Sofía registradas (8/12)");

  // ─── EVALUACIONES SOFÍA (3 para mostrar progreso) ────────
  const evalEntrada = await prisma.evaluacion.upsert({
    where: { id: "00000000-0000-0000-aaa0-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-aaa0-000000000001",
      escaladorId: sofia.id,
      cohorteId: cohIni.id,
      tipo: "entrada",
      fecha: new Date("2026-07-08"),
      estado: "completada",
      notas: "Evaluación de entrada T3. Primera vez en el sistema.",
    },
  });

  const evalMid = await prisma.evaluacion.upsert({
    where: { id: "00000000-0000-0000-aaa0-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-aaa0-000000000002",
      escaladorId: sofia.id,
      cohorteId: cohIni.id,
      tipo: "salida",
      fecha: new Date("2026-07-29"),
      estado: "completada",
      notas: "Mid-ciclo — semana 4. Buen avance técnico.",
    },
  });

  const evalSalida = await prisma.evaluacion.upsert({
    where: { id: "00000000-0000-0000-aaa0-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-aaa0-000000000003",
      escaladorId: sofia.id,
      cohorteId: cohIni.id,
      tipo: "salida",
      fecha: new Date("2026-08-05"),
      estado: "completada",
      notas: "Evaluación final T3 — semana 8.",
    },
  });

  // Resultados de las evaluaciones
  const metricas = [
    { metrica: "fuerza_dedos_kg", unidad: "kg",
      vals: [{ eval: evalEntrada.id, v: 12.5 }, { eval: evalMid.id, v: 15.0 }, { eval: evalSalida.id, v: 16.8 }] },
    { metrica: "resistencia_seg", unidad: "seg",
      vals: [{ eval: evalEntrada.id, v: 45 }, { eval: evalMid.id, v: 58 }, { eval: evalSalida.id, v: 67 }] },
    { metrica: "flexibilidad_cm", unidad: "cm",
      vals: [{ eval: evalEntrada.id, v: 12 }, { eval: evalMid.id, v: 14 }, { eval: evalSalida.id, v: 16 }] },
    { metrica: "lectura_vias", unidad: "pts",
      vals: [{ eval: evalEntrada.id, v: 4 }, { eval: evalMid.id, v: 6 }, { eval: evalSalida.id, v: 7 }] },
  ];

  for (const m of metricas) {
    for (const v of m.vals) {
      await prisma.resultadoTest.upsert({
        where: { evaluacionId_metrica: { evaluacionId: v.eval, metrica: m.metrica } },
        update: { valor: v.v },
        create: {
          evaluacionId: v.eval,
          metrica: m.metrica,
          valor: v.v,
          unidad: m.unidad,
          semaforo: v.v >= 15 ? "verde" : v.v >= 10 ? "amarillo" : "rojo",
        },
      });
    }
  }
  console.log("✓ 3 evaluaciones + resultados Sofía creados");

  // ─── ESCALADOR DEMO ──────────────────────────────────────
  console.log("\n✅ Seed completo.\n");
  console.log("Credenciales:");
  console.log("  Admin:       admin@escaladabogota.com      / admin2026");
  console.log("  JFG:         jfg@escaladabogota.com        / jfg2026");
  console.log("  JDG:         jdg@escaladabogota.com        / jdg2026");
  console.log("  Sofía:       sofia.torres@gmail.com        / sofia2026");
  console.log("  Carlos:      escalador@escaladabogota.com  / escalador2026");
  console.log("  Demo extras: andres/valentin/lucia         / escalador2026");
}

main()
  .catch(e => { console.error("Error en seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
