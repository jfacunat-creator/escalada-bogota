-- Fuentes bibliográficas para la AI y ajustes propuestos con aprobación del entrenador.
-- Aditivo: no modifica tablas existentes. Idempotente.
--
-- El texto de los libros y las guías se carga con `npm run fuentes:cargar` desde una carpeta
-- fuera del repo (derechos de autor): nunca se versiona en GitHub.

-- Secciones de los libros fuente, con marcas de página "[p.N]" para poder citar.
CREATE TABLE IF NOT EXISTS fuente_fragmento (
  clave      VARCHAR(40) PRIMARY KEY,          -- "horst:45-48"
  libro      VARCHAR(20) NOT NULL,             -- horst | obrado
  seccion    TEXT NOT NULL,
  pag_ini    INT NOT NULL,
  pag_fin    INT NOT NULL,
  texto      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guía completa de cada plan base (criterio propio, con su bibliografía).
CREATE TABLE IF NOT EXISTS fuente_guia (
  trimestre  VARCHAR(3) NOT NULL,
  nivel      VARCHAR(20) NOT NULL,
  texto      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trimestre, nivel)
);

-- Un ajuste = cambiar el valor de UN parámetro de UN bloque de una sesión del plan base.
-- La AI solo propone (estado 'pendiente'); el escalador lo ve cuando un entrenador o admin lo aprueba.
CREATE TABLE IF NOT EXISTS plan_ai_ajuste (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalador_id     UUID NOT NULL REFERENCES escalador(id) ON DELETE CASCADE,
  trimestre        VARCHAR(3) NOT NULL,
  semana           VARCHAR(3) NOT NULL,
  sesion_num       INT NOT NULL,
  bloque           TEXT NOT NULL,              -- nombre exacto del bloque ("n") en plan_contenido
  etiqueta         TEXT NOT NULL,              -- etiqueta exacta del parámetro
  valor_base       TEXT NOT NULL,
  valor_propuesto  TEXT NOT NULL,
  motivo           TEXT NOT NULL,              -- interpretación de los datos del escalador
  fuente           VARCHAR(40) NOT NULL,       -- clave de fuente_fragmento o "guia"
  pagina           INT,                        -- página del libro (null si es la guía)
  cita             TEXT NOT NULL,              -- extracto literal verificado contra la fuente
  origen           VARCHAR(20) NOT NULL,       -- test_entrada | reporte
  lote_id          UUID NOT NULL,              -- una ejecución de la AI
  estado           VARCHAR(12) NOT NULL DEFAULT 'pendiente', -- pendiente | aprobado | rechazado | reemplazado
  revisado_por     UUID REFERENCES usuario(id),
  revisado_at      TIMESTAMPTZ,
  nota_revisor     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'reemplazado'))
);
CREATE INDEX IF NOT EXISTS idx_plan_ai_ajuste_escalador ON plan_ai_ajuste (escalador_id, trimestre, estado);

-- Bitácora de cada consulta a la AI: qué propuso, qué se aceptó y qué se descartó (y por qué).
CREATE TABLE IF NOT EXISTS plan_ai_consulta (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id       UUID NOT NULL,
  escalador_id  UUID NOT NULL REFERENCES escalador(id) ON DELETE CASCADE,
  origen        VARCHAR(20) NOT NULL,
  sesiones      TEXT[] NOT NULL,
  aceptados     INT NOT NULL DEFAULT 0,
  descartados   JSONB NOT NULL DEFAULT '[]',
  sin_cambios   TEXT,
  error         TEXT,
  uso           JSONB,                       -- usage de la API (tokens, caché)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_ai_consulta_lote ON plan_ai_consulta (lote_id);
