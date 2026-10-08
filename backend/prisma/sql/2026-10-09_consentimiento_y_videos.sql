-- Consentimiento de menores y videos para revisión (2026-10-09). Aditivo e idempotente: no borra tablas ni datos.
--
-- 1. Consentimiento de menores (Ley 1098/2006): si el escalador tiene menos de 18 años al registrarse o
--    inscribirse, su representante legal diligencia el formato en la app. Se reutilizan las tablas existentes
--    `responsable` (datos del representante) y `consentimiento` (tipo = 'menores'). El formato es digital:
--    la firma es el nombre completo escrito por el representante, con fecha/hora e IP, y no hay PDF
--    (documento_url pasa a ser opcional).
-- 2. video_revision: enlaces (YouTube o Google Drive) que sube el escalador para que su entrenador
--    revise la ejecución de una sesión puntual del plan (trimestre + semana + sesión). Siempre visibles.
-- 3. video_observacion: observaciones del entrenador o del administrador sobre cada video.

BEGIN;

ALTER TABLE responsable    ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10);   -- CC · CE · PA
ALTER TABLE consentimiento ALTER COLUMN documento_url DROP NOT NULL;
ALTER TABLE consentimiento ADD COLUMN IF NOT EXISTS firma      VARCHAR(200);      -- nombre escrito como firma
ALTER TABLE consentimiento ADD COLUMN IF NOT EXISTS firmado_at TIMESTAMPTZ;
ALTER TABLE consentimiento ADD COLUMN IF NOT EXISTS ip         VARCHAR(64);

CREATE TABLE IF NOT EXISTS video_revision (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalador_id   UUID NOT NULL REFERENCES escalador(id) ON DELETE CASCADE,
  trimestre      VARCHAR(3)  NOT NULL,
  semana         VARCHAR(3)  NOT NULL,
  sesion_num     INT         NOT NULL,
  sesion_nombre  VARCHAR(160),
  url            TEXT        NOT NULL,
  plataforma     VARCHAR(10) NOT NULL,                     -- youtube · drive
  descripcion    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_revision_escalador ON video_revision (escalador_id, created_at DESC);

CREATE TABLE IF NOT EXISTS video_observacion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES video_revision(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuario(id),
  autor_rol   VARCHAR(12) NOT NULL,                        -- entrenador · admin
  texto       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_observacion_video ON video_observacion (video_id, created_at);

COMMIT;
