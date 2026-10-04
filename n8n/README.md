# Flujos n8n — plan personalizado con AI

| Archivo | Webhook | Se dispara desde |
|---|---|---|
| `flujo1-generar-plan.json` | `POST /webhook/generar-plan` | Backend, al registrar un test de **entrada** (S0): `POST /api/evaluaciones/mi-test` o `POST /api/evaluaciones/:id/resultados` |
| `flujo2-ajustar-sesion.json` | `POST /webhook/ajustar-sesion` | Backend, al guardar un registro de sesión con PSE (`PUT /api/registros/:semana/:sesionNum`) |

Ambos escriben en la tabla `plan_ai_sesion` de Neon. `GET /api/plan/my` superpone esas sesiones sobre `plan_contenido`.

## Puesta en marcha

1. En n8n: **Import from file** con cada JSON.
2. Crear 3 credenciales y asignarlas en los nodos marcados `CONFIGURAR`:
   - **Header Auth** `escalada-bogota webhook secret`: name `X-Webhook-Secret`, value = el mismo que `N8N_WEBHOOK_SECRET` en Render.
   - **Postgres** `Neon escalada-bogota`: host del dashboard de Neon, puerto 5432, SSL **require**.
   - **Anthropic** `Anthropic`: API key. Modelo configurado: `claude-opus-5-5` (cambiable en el nodo *Claude*).
3. Activar los flujos y copiar las **Production URLs** de cada webhook.
4. En Render → Environment:
   - `N8N_WEBHOOK_URL` = URL de producción de `generar-plan`
   - `N8N_WEBHOOK_AJUSTE_URL` = URL de producción de `ajustar-sesion` (déjala vacía para no activar el flujo 2)
   - `N8N_WEBHOOK_SECRET` = el secreto del paso 2

Con las variables vacías la integración queda apagada y la app usa el plan base.

## Prueba manual del flujo 1

```bash
curl -X POST "$N8N_WEBHOOK_URL" -H "Content-Type: application/json" -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \
  -d '{"escaladorId":"<uuid de un escalador>","nombre":"Prueba","pesoKg":59,"nivel":"avanzado","rangoEtario":"adulto",
       "resultados":[{"metrica":"barras_lastre_kg","codigo":"T2","valor":50,"unidad":"kg"},{"metrica":"suspensiones_20mm_kg","codigo":"T4","valor":65,"unidad":"kg"}]}'
```

Debe responder `{"ok":true,"sesiones":16}` y dejar 16 filas (S1–S4) en `plan_ai_sesion` para ese escalador.

## Reglas del flujo 2 (sin AI)

Ajusta la **sesión siguiente** a la reportada:

- **Dolor 4 o más:** no reescribe el plan, porque la app ya suspende esos ejercicios.
- **Dolor 3, PSE ≥ 9 o PSE ≥ objetivo + 2:** reduce un 15% los kg y las series.
- **Hay notas del escalador:** el AI ajusta los parámetros.
- **Ninguna de las anteriores:** no cambia nada.
