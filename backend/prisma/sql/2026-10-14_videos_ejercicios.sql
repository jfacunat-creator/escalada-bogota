-- Videos guía por ejercicio (2026-10-14). Aditivo e idempotente: no borra tablas ni datos.
--
-- El catálogo de ejercicios (clave, nombre, categoría y frases para reconocerlos en los bloques del plan)
-- vive en el código: backend/src/utils/ejercicios.js. Aquí solo se guarda el video de cada ejercicio.
-- Se carga desde la app (Admin → Ejercicios) o en lote con: node scripts/cargar-videos-ejercicios.js videos.csv

BEGIN;

CREATE TABLE IF NOT EXISTS ejercicio_video (
  clave        VARCHAR(40) PRIMARY KEY,               -- clave del catálogo (utils/ejercicios.js)
  url          TEXT        NOT NULL,                  -- enlace original (YouTube no listado recomendado)
  plataforma   VARCHAR(10) NOT NULL,                  -- youtube · vimeo · drive · archivo
  video_id     TEXT        NOT NULL,                  -- id para el reproductor (o URL del archivo)
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID        REFERENCES usuario(id) ON DELETE SET NULL
);

COMMIT;
