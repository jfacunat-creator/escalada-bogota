-- Meses del ciclo (2026-10-08). Aditivo e idempotente: no borra tablas ni datos.
--
-- El servicio se paga por MES (4 semanas). Un ciclo (mesociclo / grupo) dura 13 semanas:
-- S0 (empalme y test de entrada) + S1–S12, y se divide en 3 meses:
--   Mes 1 = S0–S4 (días 0–34) · Mes 2 = S5–S8 (días 35–62) · Mes 3 = S9–S12 (día 63 → fin del ciclo)
-- La configuración del grupo es la misma los 3 meses; inscritos, pagos e ingresos se cuentan por mes.
--
-- 1. ciclo_mes_de(inicio, fecha): mes (1–3) del ciclo al que pertenece una fecha.
-- 2. Vista ciclo_mes: fechas de inicio y fin de cada mes y su mes calendario aproximado (periodo).
-- 3. pago.mes: cada mensualidad cubre UN mes del ciclo de su grupo (único por inscripción y mes).
--    pago.periodo queda como el mes calendario aproximado y se mantiene con un trigger.
-- 4. contenido_ciclo.mes: material visible solo en ese mes (NULL = todo el ciclo).

BEGIN;

CREATE OR REPLACE FUNCTION ciclo_mes_de(inicio DATE, fecha DATE) RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN fecha < inicio + 35 THEN 1 WHEN fecha < inicio + 63 THEN 2 ELSE 3 END
$$;

CREATE OR REPLACE VIEW ciclo_mes AS
SELECT x.ciclo_id, x.codigo, x.mes, x.fecha_inicio, x.fecha_fin,
       date_trunc('month', x.fecha_inicio + (x.fecha_fin - x.fecha_inicio) / 2)::date AS periodo,
       x.codigo || '-M' || x.mes AS clave
FROM (
  SELECT c.id AS ciclo_id, c.codigo, m.mes,
         LEAST(c.fecha_inicio + m.desde, c.fecha_fin) AS fecha_inicio,
         CASE WHEN m.hasta IS NULL THEN c.fecha_fin ELSE LEAST(c.fecha_inicio + m.hasta, c.fecha_fin) END AS fecha_fin
  FROM ciclo c
  CROSS JOIN (VALUES (1, 0, 34), (2, 35, 62), (3, 63, NULL)) AS m(mes, desde, hasta)
) x;

-- ─── pago.mes ────────────────────────────────────────────
ALTER TABLE pago ADD COLUMN IF NOT EXISTS mes SMALLINT;
-- Pagos existentes (cobrados por mes calendario): el mes del ciclo que contiene su vencimiento;
-- los siguientes pagos de la misma inscripción pasan al mes siguiente (dos meses calendario
-- pueden caer en el mismo mes del ciclo).
WITH base AS (
  SELECT p.id,
         ciclo_mes_de(ci.fecha_inicio, COALESCE(p.fecha_vencimiento, p.periodo)) AS m,
         ROW_NUMBER() OVER w AS rn,
         MIN(ciclo_mes_de(ci.fecha_inicio, COALESCE(p.fecha_vencimiento, p.periodo))) OVER (PARTITION BY p.inscripcion_id) AS m0
  FROM pago p
  JOIN inscripcion i ON i.id = p.inscripcion_id
  JOIN grupo g  ON g.id = i.grupo_id
  JOIN ciclo ci ON ci.id = g.ciclo_id
  WHERE p.mes IS NULL
  WINDOW w AS (PARTITION BY p.inscripcion_id ORDER BY p.periodo, p.created_at)
)
UPDATE pago p SET mes = LEAST(3, GREATEST(b.m, b.m0 + b.rn - 1))
  FROM base b WHERE b.id = p.id;

DO $$
DECLARE dup text;
BEGIN
  SELECT string_agg(inscripcion_id::text || ' (mes ' || mes || ')', ', ') INTO dup
  FROM (SELECT inscripcion_id, mes FROM pago GROUP BY 1, 2 HAVING COUNT(*) > 1) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Hay inscripciones con dos pagos en el mismo mes del ciclo: %. Revísalas antes de migrar.', dup;
  END IF;
END $$;

ALTER TABLE pago ALTER COLUMN mes SET NOT NULL;
ALTER TABLE pago DROP CONSTRAINT IF EXISTS pago_mes_check;
ALTER TABLE pago ADD CONSTRAINT pago_mes_check CHECK (mes BETWEEN 1 AND 3);
DROP INDEX IF EXISTS pago_inscripcion_periodo_key;
CREATE UNIQUE INDEX IF NOT EXISTS pago_inscripcion_mes_key ON pago (inscripcion_id, mes);

-- periodo = mes calendario aproximado del mes del ciclo (para reportes por mes calendario).
CREATE OR REPLACE FUNCTION pago_periodo_de_mes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.periodo := COALESCE(
    (SELECT cm.periodo FROM inscripcion i
       JOIN grupo g ON g.id = i.grupo_id
       JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id AND cm.mes = NEW.mes
      WHERE i.id = NEW.inscripcion_id),
    NEW.periodo);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pago_periodo_de_mes ON pago;
CREATE TRIGGER pago_periodo_de_mes BEFORE INSERT OR UPDATE OF mes, inscripcion_id ON pago
  FOR EACH ROW EXECUTE FUNCTION pago_periodo_de_mes();
UPDATE pago SET mes = mes; -- recalcula periodo de los existentes

-- Mensualidades sin pagar que vencían antes de empezar su mes: vencen el 5.º día de ese mes.
UPDATE pago p
   SET fecha_vencimiento = cm.fecha_inicio + 4,
       estado = CASE WHEN cm.fecha_inicio + 4 < CURRENT_DATE THEN 'vencido' ELSE 'pendiente' END::"EstadoPago",
       updated_at = NOW()
  FROM inscripcion i
  JOIN grupo g ON g.id = i.grupo_id
  JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id
 WHERE p.inscripcion_id = i.id AND cm.mes = p.mes
   AND p.estado <> 'pagado' AND p.fecha_vencimiento < cm.fecha_inicio;

-- ─── contenido_ciclo.mes ─────────────────────────────────
ALTER TABLE contenido_ciclo ADD COLUMN IF NOT EXISTS mes SMALLINT;
ALTER TABLE contenido_ciclo DROP CONSTRAINT IF EXISTS contenido_ciclo_mes_check;
ALTER TABLE contenido_ciclo ADD CONSTRAINT contenido_ciclo_mes_check CHECK (mes IS NULL OR mes BETWEEN 1 AND 3);

COMMIT;
