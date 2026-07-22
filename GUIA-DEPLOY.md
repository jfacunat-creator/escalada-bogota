# Guía de Deploy — Escalada Bogotá

## Qué vamos a hacer

Vamos a poner tu app en internet usando 4 servicios gratuitos.
Todo se hace desde el navegador, sin instalar nada en tu computador.

**Tiempo estimado: 30-45 minutos.**

---

## PASO 1: Crear cuenta en GitHub (tu código en la nube)

GitHub es como un Google Drive pero para código. Ahí subes los archivos
y los otros servicios los leen de ahí.

1. Ve a **github.com**
2. Click en **Sign up**
3. Usa tu email, crea un usuario y contraseña
4. Confirma tu email

### Subir el código

1. Ya logueado, click en el botón verde **"New"** (arriba a la izquierda)
2. Nombre del repositorio: `escalada-bogota`
3. Déjalo en **Public**
4. Click en **Create repository**
5. Verás una página con instrucciones. Ignóralas por ahora.

**Para subir los archivos hay dos opciones:**

**Opción A — Desde el navegador (más fácil):**
1. En tu repositorio vacío, click en **"uploading an existing file"**
2. Arrastra TODA la carpeta `escalada-bogota` que descomprimiste
3. Click en **Commit changes**
4. Repite si no subió todas las subcarpetas

**Opción B — Desde terminal (más rápido si ya tienes Git):**
```
cd escalada-bogota
git init
git add .
git commit -m "MVP Escalada Bogota"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/escalada-bogota.git
git push -u origin main
```

---

## PASO 2: Crear la base de datos en Neon (gratis)

Neon es un PostgreSQL en la nube. Gratis hasta 500 MB (tu piloto usará ~5 MB).

1. Ve a **neon.tech**
2. Click en **Sign Up** → entra con tu cuenta de GitHub
3. Click en **Create a project**
4. Nombre: `escalada-bogota`
5. Región: **US East** (la más cercana con plan gratis)
6. Click en **Create project**

### Copiar la URL de conexión

1. Verás una pantalla con un cuadro que dice **Connection string**
2. Copia esa URL completa. Se ve así:
   ```
   postgresql://usuario:password@ep-xxx.us-east-2.aws.neon.tech/escalada_bogota?sslmode=require
   ```
3. **Guárdala en un bloc de notas. La necesitarás en el paso 3.**

### Crear las tablas

1. En Neon, en el menú izquierdo click en **SQL Editor**
2. Abre el archivo `escalada_bogota_schema.sql` que te entregué
3. Copia TODO el contenido y pégalo en el editor SQL de Neon
4. Click en **Run**
5. Deberías ver muchos mensajes de "CREATE TABLE", "CREATE INDEX", etc.
6. Ahora haz lo mismo con el archivo `escalada_bogota_v1_1_migracion.sql`

### Sembrar datos iniciales

En el mismo SQL Editor de Neon, pega y ejecuta esto:

```sql
-- Admin
INSERT INTO usuario (email, password_hash, rol) VALUES
('admin@escaladabogota.com', '$2a$12$LJ3mFGE8U5qXpYx7xVwjcOqB3qmXHQrKnPahPr0VkJFqGWBVaWSEu', 'admin');

-- Muros
INSERT INTO muro_aliado (nombre, direccion, zonas_disponibles) VALUES
('BetaClimb', 'Bogotá, D.C.', 2),
('Weya Centro de Escalada', 'Bogotá, D.C.', 2);

-- Programas
INSERT INTO programa (nombre, poblacion, rango_etario_menor, nivel, incluye_fisio, incluye_nutricion, descripcion) VALUES
('Iniciación Adulto','adulto',NULL,'iniciacion',false,false,'Cero trabajo de dedos el primer año.'),
('Intermedio Adulto','adulto',NULL,'intermedio',false,false,'Progresión por tamaño de presa.'),
('Avanzado Adulto','adulto',NULL,'avanzado',true,true,'Doble pico anual. Fisio+nutrición.'),
('Iniciación Menor 6-9','menor','menor_6_9','iniciacion',false,false,'Ratio 1:6.'),
('Intermedio Menor 6-9','menor','menor_6_9','intermedio',false,false,'Ratio 1:6.'),
('Iniciación Menor 10-12','menor','menor_10_12','iniciacion',false,false,'Ratio 1:8.'),
('Intermedio Menor 10-12','menor','menor_10_12','intermedio',false,false,'Ratio 1:8.'),
('Iniciación Menor 13-15','menor','menor_13_15','iniciacion',false,false,'Ratio 1:8.'),
('Intermedio Menor 13-15','menor','menor_13_15','intermedio',false,false,'Ratio 1:8.');

-- Ciclo piloto
INSERT INTO ciclo (codigo, anio, trimestre, fecha_inicio, fecha_fin, semana_empalme) VALUES
('2026-T4', 2026, 4, '2026-10-05', '2027-01-02', '2026-12-28');

-- Aliados de salud
INSERT INTO aliado_salud (nombre, tipo, direccion) VALUES
('Liyeri Fisioterapia', 'fisioterapia', 'Bogotá'),
('Daniela Forero - Nutrición', 'nutricion', 'Bogotá');
```

**Nota:** La contraseña del admin en ese hash es `admin2026`. Cámbiala después.

---

## PASO 3: Subir el backend a Render (gratis)

Render es el servidor que corre tu API (el cerebro de la app).

1. Ve a **render.com**
2. Click en **Get Started** → entra con tu cuenta de GitHub
3. Click en **New** → **Web Service**
4. Conecta tu repositorio `escalada-bogota`
5. Configura así:

| Campo | Valor |
|-------|-------|
| Name | `escalada-bogota-api` |
| Region | Oregon (US West) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node src/index.js` |
| Instance Type | **Free** |

6. Antes de crear, click en **Environment** y agrega estas variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | La URL de Neon que copiaste en el paso 2 |
| `JWT_SECRET` | Invéntate una frase larga, ej: `mi-escalada-bogota-secreto-2026-super-seguro` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

7. Click en **Create Web Service**
8. Espera 2-3 minutos. Verás un log que dice "Escalada Bogotá API · Puerto 3001"
9. Arriba verás la URL de tu backend, algo como:
   ```
   https://escalada-bogota-api.onrender.com
   ```
10. **Copia esa URL. La necesitas en el paso 4.**

### Verificar que funciona

Abre en tu navegador:
```
https://escalada-bogota-api.onrender.com/api/health
```
Deberías ver: `{"status":"ok","service":"Escalada Bogotá API"}`

Si ves eso, tu backend está en internet.

---

## PASO 4: Subir el frontend a Vercel (gratis)

Vercel es donde vive la interfaz que ven tus escaladores.

1. Ve a **vercel.com**
2. Click en **Sign Up** → entra con tu cuenta de GitHub
3. Click en **Add New** → **Project**
4. Selecciona tu repositorio `escalada-bogota`
5. Configura así:

| Campo | Valor |
|-------|-------|
| Project Name | `escalada-bogota` |
| Framework | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

6. En **Environment Variables** agrega:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://escalada-bogota-api.onrender.com/api` |

**IMPORTANTE:** Usa la URL de TU backend del paso 3, con `/api` al final.

7. Click en **Deploy**
8. Espera 1-2 minutos
9. Vercel te da una URL como:
   ```
   https://escalada-bogota.vercel.app
   ```

### ¡Listo!

Abre esa URL en tu celular. Deberías ver el login de Escalada Bogotá.
Entra con: `admin@escaladabogota.com` / `admin2026`

---

## PASO 5: Verificación final

Abre tu app en el celular y verifica:

- [ ] El login funciona (admin, entrenador, escalador)
- [ ] El dashboard carga los programas y muros
- [ ] Puedes cerrar sesión y volver a entrar

Si algo falla, los errores más comunes son:

**"Error al iniciar sesión"**
→ La base de datos no tiene los datos sembrados. Vuelve al paso 2 y ejecuta el SQL.

**La página carga pero no conecta al backend**
→ La variable `VITE_API_URL` en Vercel no es correcta. Verifica que tenga `/api` al final.

**El backend tarda mucho en responder**
→ Normal en plan gratis de Render. La primera petición tarda ~30 segundos porque el servidor se "duerme" después de 15 minutos sin uso.

---

## Después del deploy

**Cambiar contraseñas:** Las contraseñas demo (`admin2026`, etc.) deben cambiarse antes de invitar clientes reales.

**Dominio propio (opcional, ~$10 USD/año):**
Tanto Vercel como Render permiten conectar un dominio propio. Compras `escaladabogota.com` en Namecheap o Google Domains y lo conectas desde la configuración de Vercel.

**Si necesitas ayuda:** Vuelve a este chat y pregúntame. Puedo diagnosticar errores de deploy sin problema.
