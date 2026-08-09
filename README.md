# EscaladaBogotá — Paquete de actualización v2

## Observaciones_2.xlsx: 52/52 resueltas

### Instrucciones de integración

**1. Reemplazar archivos**

Copiar el contenido de este ZIP sobre el proyecto existente.
La estructura de carpetas coincide con el proyecto original:

```
backend/
  src/routes/
    auth.js           ← FIX: /auth/me con inscripciones completas
    dashboard.js      ← FIX: queries corregidas + 5 filtros demográficos
    cohortes.js       ← ADD: ingresos, asistencia%, sesiones por grupo
    escaladores.js    ← ADD: programa activo, pagos pendientes, entrenador
    pagos.js          ← ADD: filtros nivel/modalidad/entrenador
    contabilidad.js   ← NEW: módulo P&G completo
  prisma/
    seed.js           ← FIX: datos demo con cadena relacional completa

frontend/
  src/pages/
    LandingPage.jsx        ← Normatividad, WhatsApp, test gratuito eliminado
    LoginPage.jsx          ← Botón ← Volver al inicio
    EscaladorDashboard.jsx ← Aviso activo-sin-grupo, accesos rápidos
    InscripcionPage.jsx    ← "Grupo" en vez de "Cohorte"
    MiGrupoPage.jsx        ← Tabs: Sesiones + Pagos + Contenido
    MiProgresoPage.jsx     ← Métricas Hörst T2/T4/T5/T6/T8/T9
    AdminDashboard.jsx     ← 5 filtros, alertas, distribución demográfica
    GruposAdminPage.jsx    ← Stats inline por grupo
    EscaladoresAdminPage.jsx ← Drill-down con detalle individual
    EntrenadoresAdminPage.jsx ← Dashboard completo con carga
    ProgramasAdminPage.jsx ← Currículo + timeline
    PagosPage.jsx          ← Filtros nivel/modalidad
    RRHHPage.jsx           ← Simulador costos + normativa colombiana
    ContabilidadPage.jsx   ← P&G con degradación graceful
    EntrenadorDashboard.jsx ← Stats corregidos
    MisGruposPage.jsx      ← Dashboard grupos del entrenador
```

**2. Registrar ruta de contabilidad en index.js**

Añadir esta línea en `backend/src/index.js` junto a las demás rutas:

```javascript
app.use("/api/contabilidad", require("./routes/contabilidad"));
```

**3. Ejecutar seed**

```bash
cd backend
npx prisma db push    # sincronizar schema
node prisma/seed.js   # cargar datos demo
```

**4. Activar módulo de contabilidad (opcional)**

El módulo P&G se degrada sin error si las tablas no existen.
Para activarlo, ejecutar el SQL que aparece en la página de
Contabilidad del admin, o directamente en PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS pyg_categoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pyg_entrada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES pyg_categoria(id),
  concepto VARCHAR(200) NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_mes INT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pyg_categoria (nombre, tipo, descripcion) VALUES
  ('Mensualidades recibidas', 'ingreso', 'Pagos de ciclo de escaladores'),
  ('Nómina entrenadores',     'egreso',  'Salarios + prestaciones'),
  ('Arriendo muro',           'egreso',  'Canon mensual muros aliados'),
  ('Equipamiento',            'egreso',  'Cuerdas, arneses, presas'),
  ('Servicios aliados',       'egreso',  'Fisioterapia, nutrición'),
  ('Administrativos',         'egreso',  'Contabilidad, seguros, software'),
  ('Otros ingresos',          'ingreso', 'Eventos, workshops');
```

### Credenciales del seed

| Rol         | Email                          | Contraseña      |
|-------------|--------------------------------|-----------------|
| Admin       | admin@escaladabogota.com       | admin2026       |
| Entrenador  | jfg@escaladabogota.com         | jfg2026         |
| Entrenador  | jdg@escaladabogota.com         | jdg2026         |
| Escaladora  | sofia.torres@gmail.com         | sofia2026       |
| Escalador   | escalador@escaladabogota.com   | escalador2026   |

---
Generado: 2026-08-09
