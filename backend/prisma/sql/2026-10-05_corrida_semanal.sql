-- Actualización semanal de planes: cada corrida que el admin ejecuta desde n8n.
-- items marca lo que ya se procesó (evaluacionId del test S0, hasta = último registro leído)
-- para que la siguiente corrida no lo repita. Aditivo e idempotente.
CREATE TABLE IF NOT EXISTS plan_ai_corrida (
  id          UUID PRIMARY KEY,                -- = lote_id de las consultas de la corrida
  items       JSONB NOT NULL,                  -- [{ escaladorId, origen, evaluacionId?, semanas, hasta? }]
  consultas   INT NOT NULL,
  costo_est   NUMERIC(8, 2),                   -- US$ estimados al armarla
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
