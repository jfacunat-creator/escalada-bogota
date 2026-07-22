# Escalada Bogotá — Plataforma de Entrenamiento por Cohortes

## Estructura del proyecto

```
escalada-bogota/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    ← Modelo de datos completo (20 tablas)
│   │   └── seed.js          ← Datos iniciales (muros, programas, usuarios demo)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js  ← Cliente Prisma
│   │   ├── middleware/
│   │   │   └── auth.js      ← JWT + control de roles
│   │   ├── routes/
│   │   │   ├── auth.js      ← Login, registro, refresh, /me
│   │   │   ├── escaladores.js
│   │   │   ├── entrenadores.js
│   │   │   ├── cohortes.js
│   │   │   └── catalogos.js ← Programas, ciclos, muros (público)
│   │   ├── utils/
│   │   │   └── jwt.js
│   │   └── index.js         ← Servidor Express
│   ├── .env.example
│   └── package.json
└── README.md
```

## Requisitos previos

- **Node.js** 18+ (recomendado 20 LTS)
- **PostgreSQL** 14+ (local o servicio como Railway/Supabase)
- **npm** o **yarn**

## Instalación local

### 1. Clonar e instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tu conexión a PostgreSQL y un JWT_SECRET seguro
```

### 3. Crear la base de datos y ejecutar migraciones

```bash
npx prisma migrate dev --name init
```

### 4. Sembrar datos iniciales

```bash
npm run db:seed
```

### 5. Ejecutar el servidor

```bash
npm run dev
```

El API estará disponible en `http://localhost:3001`.

## Credenciales de prueba

| Rol         | Email                              | Contraseña       |
|-------------|-------------------------------------|------------------|
| Admin       | admin@escaladabogota.com            | admin2026        |
| Entrenador  | entrenador@escaladabogota.com       | entrenador2026   |
| Escalador   | escalador@escaladabogota.com        | escalador2026    |

> **Cambiar estas contraseñas antes de ir a producción.**

## Endpoints principales

### Públicos (sin token)
- `GET  /api/health` — Health check
- `POST /api/auth/register` — Registro de escalador
- `POST /api/auth/login` — Login (retorna JWT)
- `POST /api/auth/refresh` — Renovar token
- `GET  /api/catalogos/programas` — Listar programas
- `GET  /api/catalogos/ciclos` — Listar ciclos
- `GET  /api/catalogos/muros` — Listar muros aliados

### Autenticados (Bearer token)
- `GET  /api/auth/me` — Perfil completo del usuario logueado
- `GET  /api/escaladores` — Listar escaladores (admin/entrenador)
- `GET  /api/escaladores/:id` — Detalle de escalador
- `PUT  /api/escaladores/:id` — Actualizar perfil
- `GET  /api/entrenadores` — Listar entrenadores (admin)
- `GET  /api/entrenadores/:id` — Detalle de entrenador
- `GET  /api/entrenadores/:id/escaladores` — Escaladores del entrenador
- `GET  /api/cohortes` — Listar cohortes (filtrado por rol)
- `POST /api/cohortes` — Crear cohorte (admin)
- `GET  /api/cohortes/:id` — Detalle de cohorte

## Validaciones de negocio implementadas

- **Ratio menores**: máximo 6 alumnos por grupo (Ley 1098/2006)
- **Tope de grupos**: entrenador no puede exceder `max_grupos` (default 6)
- **Unicidad**: un escalador no puede inscribirse 2 veces en la misma cohorte
- **Horario**: un entrenador no puede tener 2 cohortes en el mismo horario del mismo ciclo
- **Visibilidad**: el entrenador solo ve escaladores de sus cohortes
- **Privacidad**: el escalador solo ve su propio perfil

## Deploy recomendado

| Componente | Servicio         | Costo aprox.     |
|------------|------------------|------------------|
| Backend    | Railway          | $5 USD/mes       |
| BD         | Railway Postgres | Incluido         |
| Frontend   | Vercel           | Gratis (hobby)   |
| Archivos   | Cloudflare R2    | ~$0.015/GB/mes   |

## Marco legal referenciado

- **Ley 1098/2006**: Protección de menores → tabla `responsable`, `consentimiento`
- **Ley 181/1995**: Habilitación del entrenador → campo `licencia_ley181`
- **Ley 1581/2012**: Datos personales → consentimiento tipo `datos_personales`
- **DNDA**: PI registrada → contenido solo con suscripción activa, sin descarga
