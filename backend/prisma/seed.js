/**
 * seed.js — Datos mínimos de arranque
 * Un programa · un ciclo · un entrenador · un escalador · un grupo · una inscripción · un pago
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Limpiando base de datos...\n");

  // Vaciar tablas en orden de dependencias (hijos antes que padres)
  await prisma.$executeRaw`TRUNCATE TABLE
    asistencia,
    resultado_test,
    remision,
    evaluacion,
    sesion,
    pago,
    inscripcion,
    puntos_liga,
    progreso_contenido,
    contenido_ciclo,
    consentimiento,
    responsable,
    grupo,
    escalador,
    entrenador,
    ciclo,
    programa,
    muro_aliado,
    aliado_salud
    CASCADE`;

  // Borrar usuarios que no sean admin
  await prisma.$executeRaw`DELETE FROM usuario WHERE email != 'admin@escaladabogota.com'`;

  // Tablas RRHH (pueden no existir si la migración no se corrió)
  try {
    await prisma.$executeRaw`TRUNCATE TABLE ausencia_entrenador, parafiscal, contrato_entrenador CASCADE`;
    console.log("✓ Tablas RRHH limpiadas");
  } catch (_) {
    console.log("  Tablas RRHH no encontradas — omitiendo");
  }

  console.log("✓ Base de datos limpia\n");

  // ─── 1. MURO (placeholder — modalidad autónoma no tiene sede fija) ──────
  const muro = await prisma.muroAliado.create({
    data: {
      nombre: "Sin sede física",
      direccion: "Modalidad autónoma — el escalador define su propio muro",
      zonasDisponibles: 0,
      convenioActivo: false,
    },
  });
  console.log("✓ Muro placeholder:", muro.nombre);

  // ─── 2. PROGRAMA ─────────────────────────────────────────────────────────
  const programa = await prisma.programa.create({
    data: {
      nombre: "Avanzado Adulto",
      poblacion: "adulto",
      nivel: "avanzado",
      duracionSemanas: 13,
      incluyeFisio: true,
      incluyeNutricion: true,
      descripcion:
        "Periodización con doble pico anual. Fisio mensual y nutrición por fase incluidas.",
      activo: true,
    },
  });
  console.log("✓ Programa:", programa.nombre);

  // ─── 3. CICLO (T3 2026 — vigente) ────────────────────────────────────────
  const ciclo = await prisma.ciclo.create({
    data: {
      codigo: "2026-T3",
      anio: 2026,
      trimestre: 3,
      fechaInicio: new Date("2026-07-07"),
      fechaFin: new Date("2026-10-03"),
      semanaEmpalme: new Date("2026-09-28"),
    },
  });
  console.log("✓ Ciclo:", ciclo.codigo, "(Jul 7 → Oct 3, 2026)");

  // ─── 4. ENTRENADOR ───────────────────────────────────────────────────────
  const entHash = await bcrypt.hash("ent2026", 12);
  const entUser = await prisma.usuario.create({
    data: {
      email: "entrenador@escaladabogota.com",
      passwordHash: entHash,
      rol: "entrenador",
    },
  });
  const entrenador = await prisma.entrenador.create({
    data: {
      usuarioId: entUser.id,
      nombre: "Juan Felipe García",
      licenciaLey181: "COL-2847-JFG",
      maxGrupos: 6,
      fechaIngreso: new Date("2025-03-01"),
    },
  });
  console.log("✓ Entrenador:", entrenador.nombre, "| email: entrenador@escaladabogota.com | pass: ent2026");

  // ─── 5. ESCALADOR (el dueño como alumno activo) ──────────────────────────
  const escHash = await bcrypt.hash("jfacunat2026", 12);
  const escUser = await prisma.usuario.create({
    data: {
      email: "jfacunat@gmail.com",
      passwordHash: escHash,
      rol: "escalador",
    },
  });
  const escalador = await prisma.escalador.create({
    data: {
      usuarioId: escUser.id,
      nombre: "Juan Felipe",
      apellido: "Acuña",
      fechaNacimiento: new Date("1990-01-01"),
      rangoEtario: "adulto",
      telefono: "+57 300 000 0000",
      contactoEmergencia: "Por definir",
      estado: "activo",
    },
  });
  console.log("✓ Escalador:", escalador.nombre, escalador.apellido, "| email: jfacunat@gmail.com | pass: jfacunat2026");

  // ─── 6. GRUPO ─────────────────────────────────────────────────────────────
  // Avanzado · Autónomo · T3 · en curso
  const grupo = await prisma.grupo.create({
    data: {
      programaId: programa.id,
      cicloId: ciclo.id,
      entrenadorId: entrenador.id,
      muroId: muro.id,
      modalidad: "autonomo",
      horario: "mar_jue_18_20",          // Mar y Jue 18–20 h
      cupoMaximo: 6,
      inscritosActual: 1,               // se actualiza al crear inscripción
      estado: "en_curso",
    },
  });
  console.log("✓ Grupo: Avanzado Adulto | Autónomo | Mar-Jue 18-20 | T3 | en curso");

  // ─── 7. INSCRIPCIÓN ──────────────────────────────────────────────────────
  // avanzado autónomo: 180 000/mes × 3 meses = 540 000/ciclo
  const PRECIO_CICLO = 540_000;
  const PRECIO_MES   = 180_000;

  const inscripcion = await prisma.inscripcion.create({
    data: {
      escaladorId: escalador.id,
      grupoId: grupo.id,
      estado: "activa",
      precioCiclo: PRECIO_CICLO,
    },
  });
  console.log("✓ Inscripción activa | Precio ciclo: $", PRECIO_CICLO.toLocaleString("es-CO"));

  // ─── 8. PAGO (primera mensualidad — pagada) ───────────────────────────────
  await prisma.pago.create({
    data: {
      inscripcionId: inscripcion.id,
      monto: PRECIO_MES,
      estado: "pagado",
      metodo: "transferencia",
      referencia: "REF-T3-001",
      fechaPago: new Date("2026-07-07"),
      fechaVencimiento: new Date("2026-07-07"),
    },
  });
  console.log("✓ Pago mes 1: $", PRECIO_MES.toLocaleString("es-CO"), "| pagado | transferencia");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  Seed mínimo completado");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin:       admin@escaladabogota.com / admin2026");
  console.log("  Escalador:   jfacunat@gmail.com       / jfacunat2026");
  console.log("  Entrenador:  entrenador@escaladabogota.com / ent2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
