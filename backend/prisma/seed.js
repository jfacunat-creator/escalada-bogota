const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando datos iniciales...\n");

  // ─── ADMIN ──────────────────────────────────────────────
  const adminUser = await prisma.usuario.upsert({
    where: { email: "admin@escaladabogota.com" },
    update: {},
    create: {
      email: "admin@escaladabogota.com",
      passwordHash: await bcrypt.hash("admin2026", 12),
      rol: "admin",
    },
  });
  console.log("✓ Admin creado:", adminUser.email);

  // ─── MUROS ALIADOS ─────────────────────────────────────
  const beta = await prisma.muroAliado.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      nombre: "BetaClimb",
      direccion: "Bogotá, D.C.",
      zonasDisponibles: 2,
      convenioActivo: true,
    },
  });

  const weya = await prisma.muroAliado.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      nombre: "Weya Centro de Escalada",
      direccion: "Bogotá, D.C.",
      zonasDisponibles: 2,
      convenioActivo: true,
    },
  });
  console.log("✓ Muros creados:", beta.nombre, "|", weya.nombre);

  // ─── PROGRAMAS (9) ─────────────────────────────────────
  const programasData = [
    {
      nombre: "Iniciación Adulto",
      poblacion: "adulto",
      nivel: "iniciacion",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Cero trabajo de dedos el primer año. Técnica de caída, lectura de vías, repertorio motor básico.",
    },
    {
      nombre: "Intermedio Adulto",
      poblacion: "adulto",
      nivel: "intermedio",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Progresión por tamaño de presa sin lastre. Test Hörst + circuito estándar.",
    },
    {
      nombre: "Avanzado Adulto",
      poblacion: "adulto",
      nivel: "avanzado",
      incluyeFisio: true,
      incluyeNutricion: true,
      descripcion: "Doble pico anual con efectos retardados. Fisio mensual y nutrición por fase incluidas.",
    },
    {
      nombre: "Iniciación Menor 6-9",
      poblacion: "menor",
      rangoEtarioMenor: "menor_6_9",
      nivel: "iniciacion",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Fases sensibles del desarrollo motor. Ratio 1:6. Cero campus ni lastre.",
    },
    {
      nombre: "Intermedio Menor 6-9",
      poblacion: "menor",
      rangoEtarioMenor: "menor_6_9",
      nivel: "intermedio",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Progresión motora respetando desarrollo. Ratio 1:6.",
    },
    {
      nombre: "Iniciación Menor 10-12",
      poblacion: "menor",
      rangoEtarioMenor: "menor_10_12",
      nivel: "iniciacion",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Fases sensibles del desarrollo motor. Ratio 1:8. Cero campus ni lastre.",
    },
    {
      nombre: "Intermedio Menor 10-12",
      poblacion: "menor",
      rangoEtarioMenor: "menor_10_12",
      nivel: "intermedio",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Progresión técnica y táctica. Ratio 1:8.",
    },
    {
      nombre: "Iniciación Menor 13-15",
      poblacion: "menor",
      rangoEtarioMenor: "menor_13_15",
      nivel: "iniciacion",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Introducción a fuerza controlada. Ratio 1:8. Sin lastre hasta los 16.",
    },
    {
      nombre: "Intermedio Menor 13-15",
      poblacion: "menor",
      rangoEtarioMenor: "menor_13_15",
      nivel: "intermedio",
      incluyeFisio: false,
      incluyeNutricion: false,
      descripcion: "Periodización adaptada a adolescentes. Ratio 1:8.",
    },
  ];

  for (const p of programasData) {
    await prisma.programa.upsert({
      where: {
        id: undefined,
      },
      update: {},
      create: {
        nombre: p.nombre,
        poblacion: p.poblacion,
        rangoEtarioMenor: p.rangoEtarioMenor || null,
        nivel: p.nivel,
        duracionSemanas: 13,
        incluyeFisio: p.incluyeFisio,
        incluyeNutricion: p.incluyeNutricion,
        descripcion: p.descripcion,
      },
    });
  }
  console.log("✓ 9 programas creados");

  // ─── CICLO PILOTO 2026-T4 ──────────────────────────────
  const cicloPiloto = await prisma.ciclo.upsert({
    where: { codigo: "2026-T4" },
    update: {},
    create: {
      codigo: "2026-T4",
      anio: 2026,
      trimestre: 4,
      fechaInicio: new Date("2026-10-05"),
      fechaFin: new Date("2027-01-02"),
      semanaEmpalme: new Date("2026-12-28"),
    },
  });
  console.log("✓ Ciclo piloto creado:", cicloPiloto.codigo);

  // ─── ALIADOS DE SALUD ──────────────────────────────────
  await prisma.aliadoSalud.createMany({
    data: [
      {
        nombre: "Liyeri Fisioterapia",
        tipo: "fisioterapia",
        direccion: "Bogotá, D.C.",
        activo: true,
      },
      {
        nombre: "Daniela Forero - Nutrición Deportiva",
        tipo: "nutricion",
        direccion: "Bogotá, D.C.",
        activo: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Aliados de salud creados");

  // ─── ENTRENADOR DEMO ───────────────────────────────────
  const entrenadorUser = await prisma.usuario.upsert({
    where: { email: "entrenador@escaladabogota.com" },
    update: {},
    create: {
      email: "entrenador@escaladabogota.com",
      passwordHash: await bcrypt.hash("entrenador2026", 12),
      rol: "entrenador",
      entrenador: {
        create: {
          nombre: "Entrenador Demo",
          licenciaLey181: "DEMO-001",
          maxGrupos: 6,
          fechaIngreso: new Date("2026-07-01"),
        },
      },
    },
  });
  console.log("✓ Entrenador demo creado:", entrenadorUser.email);

  // ─── ESCALADOR DEMO ────────────────────────────────────
  const escaladorUser = await prisma.usuario.upsert({
    where: { email: "escalador@escaladabogota.com" },
    update: {},
    create: {
      email: "escalador@escaladabogota.com",
      passwordHash: await bcrypt.hash("escalador2026", 12),
      rol: "escalador",
      escalador: {
        create: {
          nombre: "Carlos",
          apellido: "Demo",
          fechaNacimiento: new Date("1992-03-15"),
          rangoEtario: "adulto",
          pesoKg: 72.5,
          telefono: "3001234567",
          contactoEmergencia: "María Demo - 3009876543",
          estado: "activo",
        },
      },
    },
  });
  console.log("✓ Escalador demo creado:", escaladorUser.email);

  console.log("\n✅ Seed completado.");
  console.log("\nCredenciales de prueba:");
  console.log("  Admin:       admin@escaladabogota.com / admin2026");
  console.log("  Entrenador:  entrenador@escaladabogota.com / entrenador2026");
  console.log("  Escalador:   escalador@escaladabogota.com / escalador2026");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
