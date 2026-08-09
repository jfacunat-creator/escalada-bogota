/**
 * seed.js v3 — Compatible con schema Prisma real.
 * Usa findFirst+create en vez de upsert donde no hay @unique en nombre.
 * Cadena: usuario → escalador/entrenador → cohorte → inscripcion → pago → sesion → asistencia → evaluacion
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// Helper: encontrar o crear (para modelos sin @unique en nombre)
async function findOrCreate(model, where, data) {
  const existing = await model.findFirst({ where });
  if (existing) return existing;
  return await model.create({ data });
}

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
  const beta = await findOrCreate(prisma.muroAliado,
    { nombre: "BetaClimb" },
    { nombre: "BetaClimb", direccion: "Cra 13 #93-40, Bogotá", zonasDisponibles: 3, convenioActivo: true }
  );
  const weya = await findOrCreate(prisma.muroAliado,
    { nombre: "Weya Centro de Escalada" },
    { nombre: "Weya Centro de Escalada", direccion: "Av. Boyacá #72-20, Bogotá", zonasDisponibles: 2, convenioActivo: true }
  );
  console.log("✓ Muros aliados:", beta.nombre, "|", weya.nombre);

  // ─── PROGRAMAS ──────────────────────────────────────────
  const progMap = {};
  const programasData = [
    { nombre: "Iniciación Adulto", poblacion: "adulto", nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Técnica de caída, lectura de vías, repertorio motor." },
    { nombre: "Intermedio Adulto", poblacion: "adulto", nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión por tamaño de presa. Test Hörst + circuito estándar." },
    { nombre: "Avanzado Adulto",   poblacion: "adulto", nivel: "avanzado",   incluyeFisio: true,  incluyeNutricion: true,  descripcion: "Doble pico anual. Fisio mensual y nutrición por fase incluidas." },
    { nombre: "Iniciación Menor 6-9",  poblacion: "menor", rangoEtarioMenor: "menor_6_9",  nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Fases sensibles del desarrollo motor. Ratio 1:6." },
    { nombre: "Intermedio Menor 6-9",  poblacion: "menor", rangoEtarioMenor: "menor_6_9",  nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión motora. Ratio 1:6." },
    { nombre: "Iniciación Menor 10-12",poblacion: "menor", rangoEtarioMenor: "menor_10_12",nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Fases sensibles. Ratio 1:8." },
    { nombre: "Intermedio Menor 10-12",poblacion: "menor", rangoEtarioMenor: "menor_10_12",nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Progresión técnica y táctica. Ratio 1:8." },
    { nombre: "Iniciación Menor 13-15",poblacion: "menor", rangoEtarioMenor: "menor_13_15",nivel: "iniciacion", incluyeFisio: false, incluyeNutricion: false, descripcion: "Introducción a fuerza controlada. Sin lastre hasta los 16." },
    { nombre: "Intermedio Menor 13-15",poblacion: "menor", rangoEtarioMenor: "menor_13_15",nivel: "intermedio", incluyeFisio: false, incluyeNutricion: false, descripcion: "Periodización adaptada a adolescentes. Ratio 1:8." },
  ];
  for (const p of programasData) {
    const prog = await findOrCreate(prisma.programa,
      { nombre: p.nombre },
      { nombre: p.nombre, poblacion: p.poblacion, rangoEtarioMenor: p.rangoEtarioMenor || null, nivel: p.nivel, duracionSemanas: 13, incluyeFisio: p.incluyeFisio, incluyeNutricion: p.incluyeNutricion, descripcion: p.descripcion }
    );
    progMap[p.nombre] = prog;
  }
  console.log("✓ 9 programas creados");

  // ─── CICLOS ─────────────────────────────────────────────
  const cicloT3 = await prisma.ciclo.upsert({
    where: { codigo: "2026-T3" },
    update: {},
    create: { codigo: "2026-T3", anio: 2026, trimestre: 3, fechaInicio: new Date("2026-07-07"), fechaFin: new Date("2026-10-03"), semanaEmpalme: new Date("2026-09-28") },
  });
  const cicloT4 = await prisma.ciclo.upsert({
    where: { codigo: "2026-T4" },
    update: {},
    create: { codigo: "2026-T4", anio: 2026, trimestre: 4, fechaInicio: new Date("2026-10-05"), fechaFin: new Date("2027-01-02"), semanaEmpalme: new Date("2026-12-28") },
  });
  console.log("✓ Ciclos T3 (activo) y T4 (próximo)");

  // ─── ALIADOS DE SALUD ────────────────────────────────────
  await findOrCreate(prisma.aliadoSalud,
    { nombre: "Liyeri Fisioterapia" },
    { nombre: "Liyeri Fisioterapia", tipo: "fisioterapia", direccion: "Bogotá, D.C.", activo: true }
  );
  await findOrCreate(prisma.aliadoSalud,
    { nombre: "Daniela Forero - Nutrición Deportiva" },
    { nombre: "Daniela Forero - Nutrición Deportiva", tipo: "nutricion", direccion: "Bogotá, D.C.", activo: true }
  );
  console.log("✓ Aliados de salud");

  // ─── ENTRENADORES ────────────────────────────────────────
  const jfgHash = await bcrypt.hash("jfg2026", 12);
  const jdgHash = await bcrypt.hash("jdg2026", 12);

  const jfgUser = await prisma.usuario.upsert({
    where: { email: "jfg@escaladabogota.com" },
    update: {},
    create: { email: "jfg@escaladabogota.com", passwordHash: jfgHash, rol: "entrenador" },
  });
  const jfg = await findOrCreate(prisma.entrenador,
    { usuarioId: jfgUser.id },
    { usuarioId: jfgUser.id, nombre: "Juan Felipe García", licenciaLey181: "COL-2847-JFG", maxGrupos: 4, fechaIngreso: new Date("2025-03-01") }
  );

  const jdgUser = await prisma.usuario.upsert({
    where: { email: "jdg@escaladabogota.com" },
    update: {},
    create: { email: "jdg@escaladabogota.com", passwordHash: jdgHash, rol: "entrenador" },
  });
  const jdg = await findOrCreate(prisma.entrenador,
    { usuarioId: jdgUser.id },
    { usuarioId: jdgUser.id, nombre: "Juan David González", licenciaLey181: "COL-3195-JDG", maxGrupos: 4, fechaIngreso: new Date("2025-06-01") }
  );
  console.log("✓ Entrenadores: JFG | JDG");

  // ─── COHORTES / GRUPOS ──────────────────────────────────
  const cohIni = await findOrCreate(prisma.cohorte,
    { cicloId: cicloT3.id, entrenadorId: jdg.id, horario: "Mar-Jue-Sáb 07:00–09:00" },
    { programaId: progMap["Iniciación Adulto"].id, cicloId: cicloT3.id, entrenadorId: jdg.id, muroId: beta.id, modalidad: "acompanado", horario: "Mar-Jue-Sáb 07:00–09:00", cupoMaximo: 8, inscritosActual: 0, estado: "en_curso" }
  );

  const cohInt = await findOrCreate(prisma.cohorte,
    { cicloId: cicloT3.id, entrenadorId: jfg.id, horario: "Lun-Mié-Vie 18:00–20:00" },
    { programaId: progMap["Intermedio Adulto"].id, cicloId: cicloT3.id, entrenadorId: jfg.id, muroId: weya.id, modalidad: "acompanado", horario: "Lun-Mié-Vie 18:00–20:00", cupoMaximo: 8, inscritosActual: 0, estado: "en_curso" }
  );

  const cohAvz = await findOrCreate(prisma.cohorte,
    { cicloId: cicloT3.id, entrenadorId: jfg.id, horario: "Mar-Jue 06:00–08:00" },
    { programaId: progMap["Avanzado Adulto"].id, cicloId: cicloT3.id, entrenadorId: jfg.id, muroId: beta.id, modalidad: "acompanado", horario: "Mar-Jue 06:00–08:00", cupoMaximo: 6, inscritosActual: 0, estado: "en_curso" }
  );

  // Grupos T4 abiertos
  await findOrCreate(prisma.cohorte,
    { cicloId: cicloT4.id, entrenadorId: jdg.id, horario: "Mar-Jue-Sáb 07:00–09:00" },
    { programaId: progMap["Iniciación Adulto"].id, cicloId: cicloT4.id, entrenadorId: jdg.id, muroId: beta.id, modalidad: "acompanado", horario: "Mar-Jue-Sáb 07:00–09:00", cupoMaximo: 8, inscritosActual: 0, estado: "abierta" }
  );
  await findOrCreate(prisma.cohorte,
    { cicloId: cicloT4.id, entrenadorId: jfg.id, horario: "Lun-Mié-Vie 06:30–08:30" },
    { programaId: progMap["Intermedio Adulto"].id, cicloId: cicloT4.id, entrenadorId: jfg.id, muroId: weya.id, modalidad: "autonomo", horario: "Lun-Mié-Vie 06:30–08:30", cupoMaximo: 8, inscritosActual: 0, estado: "abierta" }
  );
  console.log("✓ 5 grupos (3 T3 en_curso + 2 T4 abiertos)");

  // ─── ESCALADORES ────────────────────────────────────────
  const escHash = await bcrypt.hash("escalador2026", 12);
  const sofiaHash = await bcrypt.hash("sofia2026", 12);

  async function crearEscalador({ email, password, nombre, apellido, nacimiento, peso, telefono, emergencia }) {
    const user = await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: await bcrypt.hash(password, 12), rol: "escalador" },
    });
    const edad = new Date().getFullYear() - new Date(nacimiento).getFullYear();
    let rango = "adulto";
    if (edad < 10) rango = "menor_6_9";
    else if (edad < 13) rango = "menor_10_12";
    else if (edad < 16) rango = "menor_13_15";
    const esc = await findOrCreate(prisma.escalador,
      { usuarioId: user.id },
      { usuarioId: user.id, nombre, apellido, fechaNacimiento: new Date(nacimiento), rangoEtario: rango, pesoKg: peso, telefono, contactoEmergencia: emergencia, estado: "activo" }
    );
    return esc;
  }

  const sofia = await crearEscalador({ email: "sofia.torres@gmail.com", password: "sofia2026", nombre: "Sofía", apellido: "Torres", nacimiento: "1994-11-22", peso: 58.0, telefono: "3158769012", emergencia: "Carlos Torres - 3109876543" });
  const carlos = await crearEscalador({ email: "escalador@escaladabogota.com", password: "escalador2026", nombre: "Carlos", apellido: "Demo", nacimiento: "1992-03-15", peso: 72.5, telefono: "3001234567", emergencia: "María Demo - 3009876543" });
  const andres = await crearEscalador({ email: "andres.ruiz@gmail.com", password: "escalador2026", nombre: "Andrés", apellido: "Ruiz", nacimiento: "1990-06-08", peso: 68.0, telefono: "3141234567", emergencia: "Laura Ruiz - 3004567890" });
  const valentin = await crearEscalador({ email: "valentin.m@gmail.com", password: "escalador2026", nombre: "Valentín", apellido: "Morales", nacimiento: "1998-01-30", peso: 75.0, telefono: "3187654321", emergencia: "Ana Morales - 3123456789" });
  const lucia = await crearEscalador({ email: "lucia.p@gmail.com", password: "escalador2026", nombre: "Lucía", apellido: "Pedraza", nacimiento: "1996-09-14", peso: 54.5, telefono: "3205551234", emergencia: "Roberto Pedraza - 3012345678" });
  console.log("✓ 5 escaladores (Sofía, Carlos, Andrés, Valentín, Lucía)");

  // ─── INSCRIPCIONES + PAGOS ───────────────────────────────
  async function inscribir({ escaladorId, cohorteId, precio, metodo, pagado, mes }) {
    const existe = await prisma.inscripcion.findFirst({ where: { escaladorId, cohorteId } });
    if (existe) return existe;
    return await prisma.$transaction(async (tx) => {
      const insc = await tx.inscripcion.create({
        data: { escaladorId, cohorteId, estado: "activa", precioCiclo: precio },
      });
      await tx.pago.create({
        data: {
          inscripcionId: insc.id, monto: precio, metodo: metodo || "transferencia",
          estado: pagado ? "pagado" : "pendiente",
          fechaPago: pagado ? new Date(`2026-${String(mes || 7).padStart(2,'0')}-15`) : null,
          fechaVencimiento: new Date(`2026-${String(mes || 7).padStart(2,'0')}-05`),
          referencia: pagado ? `REF-${Math.random().toString(36).substr(2,8).toUpperCase()}` : null,
        },
      });
      // Actualizar contador
      await tx.cohorte.update({ where: { id: cohorteId }, data: { inscritosActual: { increment: 1 } } });
      return insc;
    });
  }

  await inscribir({ escaladorId: sofia.id, cohorteId: cohIni.id, precio: 350000, metodo: "transferencia", pagado: true, mes: 7 });
  await inscribir({ escaladorId: carlos.id, cohorteId: cohIni.id, precio: 350000, metodo: "efectivo", pagado: true, mes: 7 });
  await inscribir({ escaladorId: andres.id, cohorteId: cohInt.id, precio: 450000, metodo: "transferencia", pagado: true, mes: 7 });
  await inscribir({ escaladorId: valentin.id, cohorteId: cohInt.id, precio: 450000, pagado: false, mes: 8 });
  await inscribir({ escaladorId: lucia.id, cohorteId: cohAvz.id, precio: 600000, metodo: "transferencia", pagado: true, mes: 7 });
  console.log("✓ Inscripciones + pagos (cadena relacional completa)");

  // ─── SESIONES GRUPO INICIACIÓN T3 ───────────────────────
  const existingSesiones = await prisma.sesion.findFirst({ where: { cohorteId: cohIni.id } });
  const sesionesCohIni = [];

  if (!existingSesiones) {
    const dias = [2, 4, 6]; // Mar, Jue, Sáb
    let fecha = new Date("2026-07-07");
    let numSesion = 0;
    while (numSesion < 12) {
      const dow = fecha.getDay();
      if (dias.includes(dow)) {
        const tipo = numSesion === 0 ? "test" : numSesion === 11 ? "test" : numSesion === 5 ? "juego_cierre" : "regular";
        const dateStr = fecha.toISOString().split('T')[0];
        const sesion = await prisma.sesion.create({
          data: {
            cohorteId: cohIni.id, fecha: new Date(dateStr),
            horaInicio: new Date(dateStr + 'T07:00:00'), horaFin: new Date(dateStr + 'T09:00:00'),
            numeroSesion: numSesion + 1, tipo,
            notasEntrenador: tipo === "test_entrada" ? "Test de entrada — baseline Hörst" : tipo === "test_salida" ? "Test de salida — comparación final" : null,
          },
        });
        sesionesCohIni.push(sesion);
        numSesion++;
      }
      fecha.setDate(fecha.getDate() + 1);
      if (fecha > new Date("2026-10-03")) break;
    }
    console.log(`✓ ${sesionesCohIni.length} sesiones creadas para Iniciación T3`);
  } else {
    // Cargar sesiones existentes
    const sesiones = await prisma.sesion.findMany({ where: { cohorteId: cohIni.id }, orderBy: { numeroSesion: 'asc' } });
    sesionesCohIni.push(...sesiones);
    console.log(`✓ ${sesionesCohIni.length} sesiones ya existían para Iniciación T3`);
  }

  // ─── ASISTENCIAS SOFÍA ───────────────────────────────────
  for (let i = 0; i < sesionesCohIni.length; i++) {
    const asistio = i < 8;
    const exists = await prisma.asistencia.findFirst({
      where: { sesionId: sesionesCohIni[i].id, escaladorId: sofia.id }
    });
    if (!exists) {
      await prisma.asistencia.create({
        data: { sesionId: sesionesCohIni[i].id, escaladorId: sofia.id, asistio, observaciones: asistio ? null : "No asistió" },
      });
    }
  }
  console.log("✓ Asistencias Sofía (8/12)");

  // ─── EVALUACIONES SOFÍA ─────────────────────────────────
  const existingEvals = await prisma.evaluacion.findFirst({ where: { escaladorId: sofia.id } });

  if (!existingEvals) {
    const evalEntrada = await prisma.evaluacion.create({
      data: { escaladorId: sofia.id, cohorteId: cohIni.id, tipo: "entrada", fecha: new Date("2026-07-08"), estado: "realizada", notas: "Evaluación de entrada T3." },
    });
    const evalMid = await prisma.evaluacion.create({
      data: { escaladorId: sofia.id, cohorteId: cohIni.id, tipo: "salida", fecha: new Date("2026-07-29"), estado: "realizada", notas: "Mid-ciclo — semana 4." },
    });
    const evalSalida = await prisma.evaluacion.create({
      data: { escaladorId: sofia.id, cohorteId: cohIni.id, tipo: "salida", fecha: new Date("2026-08-05"), estado: "realizada", notas: "Evaluación final T3." },
    });

    const metricas = [
      { metrica: "fuerza_dedos_kg", unidad: "kg", vals: [{ eval: evalEntrada.id, v: 12.5, s: "amarillo" }, { eval: evalMid.id, v: 15.0, s: "verde" }, { eval: evalSalida.id, v: 16.8, s: "verde" }] },
      { metrica: "resistencia_seg", unidad: "seg", vals: [{ eval: evalEntrada.id, v: 45, s: "amarillo" }, { eval: evalMid.id, v: 58, s: "amarillo" }, { eval: evalSalida.id, v: 67, s: "verde" }] },
      { metrica: "lectura_vias", unidad: "pts", vals: [{ eval: evalEntrada.id, v: 4, s: "rojo" }, { eval: evalMid.id, v: 6, s: "amarillo" }, { eval: evalSalida.id, v: 7, s: "amarillo" }] },
    ];

    for (const m of metricas) {
      for (const v of m.vals) {
        await prisma.resultadoTest.create({
          data: { evaluacionId: v.eval, metrica: m.metrica, valor: v.v, unidad: m.unidad, semaforo: v.s },
        });
      }
    }
    console.log("✓ 3 evaluaciones + 9 resultados Sofía");
  } else {
    console.log("✓ Evaluaciones Sofía ya existían");
  }

  // ─── RESUMEN ─────────────────────────────────────────────
  console.log("\n✅ Seed completo.\n");
  console.log("Credenciales:");
  console.log("  Admin:       admin@escaladabogota.com      / admin2026");
  console.log("  JFG:         jfg@escaladabogota.com        / jfg2026");
  console.log("  JDG:         jdg@escaladabogota.com        / jdg2026");
  console.log("  Sofía:       sofia.torres@gmail.com        / sofia2026");
  console.log("  Carlos:      escalador@escaladabogota.com  / escalador2026");
  console.log("  Andrés/Valentín/Lucía:                     / escalador2026");
}

main()
  .catch(e => { console.error("Error en seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
