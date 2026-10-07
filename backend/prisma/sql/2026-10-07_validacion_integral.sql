-- Validación integral (2026-10-07). Aditivo e idempotente: no borra tablas ni datos.
--
-- 1. Defaults de id / updated_at: la mayoría de tablas se crearon sin DEFAULT en la BD
--    (Prisma los genera en el cliente), así que los INSERT en SQL crudo sin id fallaban
--    (crear entrenador, inscribir desde admin, pasar lista, registrar test, contenido…).
-- 2. entrenador.apellido / especialidad: el código los usa pero no existían → editar
--    y crear entrenadores devolvía error.
-- 3. Tarifa mensual única por modalidad (editable por el admin) y pago.periodo (mes que
--    cubre cada pago). Las mensualidades se cobran por MES, no por ciclo ni por nivel.
-- 4. 'wompi' como método de pago válido (el webhook lo escribe).
-- 5. Recalcula grupo.inscritos_actual con las inscripciones activas reales.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aliado_salud','asistencia','ciclo','consentimiento','contenido_ciclo','entrenador',
    'escalador','grupo','inscripcion','muro_aliado','pago','programa','progreso_contenido',
    'puntos_liga','remision','responsable','sesion','usuario'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'contenido_ciclo','entrenador','escalador','grupo','inscripcion','pago',
    'progreso_contenido','remision','usuario'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT now()', t);
  END LOOP;
END $$;

ALTER TABLE entrenador
  ADD COLUMN IF NOT EXISTS apellido     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS especialidad VARCHAR(200);
ALTER TABLE entrenador ALTER COLUMN fecha_ingreso SET DEFAULT CURRENT_DATE;

CREATE TABLE IF NOT EXISTS tarifa (
  modalidad      "ModalidadPlan" PRIMARY KEY,
  precio_mensual NUMERIC(10, 2) NOT NULL CHECK (precio_mensual > 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO tarifa (modalidad, precio_mensual) VALUES
  ('autonomo', 120000),
  ('acompanado', 350000)
ON CONFLICT (modalidad) DO NOTHING;

-- Mes que cubre cada pago (primer día del mes). Los pagos existentes toman el mes de su vencimiento.
ALTER TABLE pago ADD COLUMN IF NOT EXISTS periodo DATE;
UPDATE pago
   SET periodo = date_trunc('month', COALESCE(fecha_vencimiento, fecha_pago, created_at))::date
 WHERE periodo IS NULL;
ALTER TABLE pago ALTER COLUMN periodo SET DEFAULT date_trunc('month', CURRENT_DATE)::date;
ALTER TABLE pago ALTER COLUMN periodo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pago_inscripcion_periodo_key ON pago (inscripcion_id, periodo);

-- precio_ciclo queda como histórico: las inscripciones nuevas ya no lo usan.
ALTER TABLE inscripcion ALTER COLUMN precio_ciclo DROP NOT NULL;

ALTER TYPE "MetodoPago" ADD VALUE IF NOT EXISTS 'wompi';

UPDATE grupo g
   SET inscritos_actual = (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa');
