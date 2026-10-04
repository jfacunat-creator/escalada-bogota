# n8n — actualización semanal de planes con AI

El plan **no se ajusta automáticamente** con cada test o registro. Una vez por semana (o cuando el admin quiera) se ejecuta en n8n el flujo `flujo-ajustes-ai.json`, que **le pide al backend** el trabajo pendiente, consulta a Claude y devuelve las respuestas. Así n8n puede vivir en el computador del admin: es n8n quien llama al backend de producción, no al revés, y que Render se duerma no importa.

## Qué procesa cada corrida

El backend (`seleccionarSemanal` en `backend/src/utils/ajustesAI.js`) revisa a los escaladores activos:

| Caso | Consultas |
|---|---|
| Test S0 de entrada aún no procesado | Una por cada semana de entrenamiento que le falta (S1–S11 si no ha empezado) |
| Registros nuevos desde su última corrida **con algo que interpretar** (notas, dolor ≥ 1 o PSE a 2+ puntos del objetivo) | Una, sobre todas las sesiones de su semana siguiente, con lo registrado en la semana |
| Registros sin novedades, o sin registros | Ninguna (no gasta créditos) |

Lo incluido queda marcado en `plan_ai_corrida`: ejecutar dos veces seguidas no repite ni gasta doble. La **vista previa con el costo estimado** está en la app: **Ajustes AI → Actualización semanal** (solo admin).

## Cómo decide la AI (y qué no puede hacer)

1. El backend arma cada consulta: guía del programa (`fuente_guia`), secciones de Hörst y Obradó de los ejercicios de esa semana (`backend/src/fuentes/mapa-temas.json` → `fuente_fragmento`), datos del escalador y su plan **vigente**. n8n solo la envía a Claude (`claude-opus-5-5`), una a la vez.
2. Cada ajuste cambia el valor de UN parámetro existente, con `motivo` y una **cita literal** de la guía o del libro (con página), verificada contra el texto.
3. Límites en código: solo cambian números, ±15 % por ajuste y ±30 % acumulado frente al plan base; con dolor ≥ 3, PSE ≥ 9 o sobrecarga en la semana, solo se puede reducir.
4. Nada llega al escalador sin aprobación de un entrenador (sus grupos) o admin en **Ajustes AI**. `GET /api/plan/my` solo aplica lo aprobado.
5. Las reglas automáticas de seguridad siguen en la app (`frontend/src/plan/adaptacion.js`).
6. Cada consulta queda en `plan_ai_consulta` (aceptados, descartados con motivo, tokens).

## Puesta en marcha

1. **Tablas** (una vez, en Neon): `backend/prisma/sql/2026-10-04_fuentes_y_ajustes_ai.sql` y `2026-10-05_corrida_semanal.sql`.
2. **Fuentes** (una vez, y cuando cambie una guía o el mapa de temas). El texto de los libros no se versiona:
   ```bash
   cd backend && FUENTES_DIR="/ruta/a/Fuentes_AI" npm run fuentes:cargar
   ```
3. **Backend** (Render → Environment): `N8N_WEBHOOK_SECRET` = un secreto largo. Es lo único que necesita.
4. **n8n**: *Import from file* → `flujo-ajustes-ai.json`. Credenciales en los nodos marcados `CONFIGURAR`:
   - **Header Auth** `escalada-bogota webhook secret` (name `X-Webhook-Secret`, value = el mismo `N8N_WEBHOOK_SECRET`): en *Pedir lote semanal* y *Devolver al backend*.
   - **Anthropic** (API key): en *Claude*.
   - En *Configuración*, `apiBase` = URL del backend (producción `https://escalada-bogota.onrender.com`; local `http://host.docker.internal:3001`).
5. **Ejecutar**: revisar la vista previa en Ajustes AI → en n8n, *Execute workflow*. Opcional: activar el nodo *Cada lunes 6 a. m.* y publicar el flujo (solo corre si el computador con n8n está encendido).
