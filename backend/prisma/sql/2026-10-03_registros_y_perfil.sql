-- Registros de sesión y perfil de entrenamiento en la BD (antes solo en localStorage).
-- Aditivo: no modifica tablas existentes. Idempotente.

CREATE TABLE IF NOT EXISTS registro_sesion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalador_id  UUID NOT NULL REFERENCES escalador(id) ON DELETE CASCADE,
  trimestre     VARCHAR(3) NOT NULL DEFAULT 'T1',
  semana        VARCHAR(3) NOT NULL,
  sesion_num    INT NOT NULL,
  datos         JSONB NOT NULL,            -- registro completo (PSE, dolor por zona, regleta, notas, tests…)
  pse           SMALLINT,                  -- copia de datos.pse para consultas
  sobrecarga    BOOLEAN NOT NULL DEFAULT false,
  completada    BOOLEAN NOT NULL DEFAULT false,
  registrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),   -- momento del registro en el dispositivo
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (escalador_id, trimestre, semana, sesion_num)
);
CREATE INDEX IF NOT EXISTS idx_registro_sesion_escalador ON registro_sesion (escalador_id, trimestre);

CREATE TABLE IF NOT EXISTS perfil_entrenamiento (
  escalador_id  UUID PRIMARY KEY REFERENCES escalador(id) ON DELETE CASCADE,
  datos         JSONB NOT NULL,            -- tests S0, grados, años de campus, dolor activo…
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
