# n8n — ajustes del plan con AI, respaldo bibliográfico y aprobación

Un solo flujo, `flujo-ajustes-ai.json` (`POST /webhook/ajustes-ai`), atiende dos disparadores del backend:

| Origen | Se dispara desde | Consultas |
|---|---|---|
| `test_entrada` | Test de **entrada** S0 (`POST /api/evaluaciones/mi-test` o `/:id/resultados`) | Una por semana de entrenamiento (S1–S11) |
| `reporte` | Registro de sesión con PSE (`PUT /api/registros/:semana/:sesionNum`) **si** hay notas, dolor 1–3 o PSE a 2+ puntos del objetivo | Una, sobre la sesión siguiente |

## Cómo decide la AI (y qué no puede hacer)

1. **El backend arma la consulta completa** (`backend/src/utils/ajustesAI.js`): la guía del programa del escalador (`fuente_guia`), las secciones de Hörst y Obradó que corresponden a los ejercicios de esa semana (`backend/src/fuentes/mapa-temas.json` → `fuente_fragmento`), sus datos (test S0, perfil, reportes) y el plan **vigente**. n8n solo la envía a Claude (`claude-opus-5-5`) y devuelve la respuesta.
2. **Cada ajuste cambia el valor de UN parámetro existente** y debe traer `motivo` y una **cita literal** de la guía o del libro (con página). El backend la verifica contra el texto; si no aparece, se descarta.
3. **Límites duros en código:** solo cambian números (el texto queda idéntico), máximo ±15 % por ajuste y ±30 % acumulado frente al plan base; con dolor o sobrecarga, solo se permite reducir.
4. **Nada llega al escalador sin aprobación**: los ajustes válidos quedan `pendiente` en `plan_ai_ajuste` y un entrenador (de sus grupos) o admin los aprueba en **Ajustes AI** (`/app/ajustes-ai`). `GET /api/plan/my` solo aplica los aprobados.
5. Las reglas automáticas de seguridad siguen en la app (`frontend/src/plan/adaptacion.js`): sobrecarga de PSE → −20 % series, semáforo de dolor → sustitución o suspensión.
6. Cada consulta queda en `plan_ai_consulta`: aceptados, descartados con su motivo y tokens usados.

## Puesta en marcha

1. **Tablas** (una vez): ejecutar `backend/prisma/sql/2026-10-04_fuentes_y_ajustes_ai.sql` en Neon.
2. **Fuentes** (una vez, y cada vez que cambie una guía o el mapa de temas). El texto de los libros no se versiona:
   ```bash
   cd backend && FUENTES_DIR="/ruta/a/Fuentes_AI" npm run fuentes:cargar
   ```
   `Fuentes_AI/` contiene `libros/{horst,obrado}_paginas.json` (páginas extraídas de los PDF) y `guias/T*_*_Guia_Completa.md`.
3. **n8n:** *Import from file* → `flujo-ajustes-ai.json`. Asignar credenciales en los nodos marcados `CONFIGURAR`:
   - **Header Auth** `escalada-bogota webhook secret` (name `X-Webhook-Secret`, value = `N8N_WEBHOOK_SECRET`): en *Webhook ajustes-ai* y en *Devolver al backend*.
   - **Anthropic** `Anthropic` (API key): en el nodo *Claude*.
4. Publicar el flujo y copiar la **Production URL** del webhook.
5. **Variables del backend** (Render → Environment, o `backend/.env` en local):
   - `N8N_WEBHOOK_URL` = Production URL del webhook
   - `N8N_WEBHOOK_SECRET` = el secreto del paso 3
   - `BACKEND_PUBLIC_URL` = URL del backend vista desde n8n (en local con Docker: `http://host.docker.internal:3001`)

Con cualquiera de las tres vacía la integración queda apagada y la app usa el plan base.
