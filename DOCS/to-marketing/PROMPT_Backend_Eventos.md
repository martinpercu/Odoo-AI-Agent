# Prompt para Claude Code (BACKEND) — Analítica de eventos de la landing

> Pegá todo lo de abajo en el Claude Code del repo **backend**. Está escrito para ser
> autocontenido. Si algún nombre de archivo/convención difiere, adaptá siguiendo el
> patrón que ya usás para `/admin/feedback` y `/admin/feedback/stats`.

---

## Contexto

El frontend (TheOdooAgent) va a sumar una "cara informativa" sobre el demo: un modal de
bienvenida + un panel de info. Para medir el embudo necesito **emitir eventos propios**
desde el front (sin pixeles de terceros) y que **el SUPERADMIN pueda verlos en su panel**.

Necesito que el backend implemente: **(1)** un endpoint de **ingesta anónima** de eventos
y **(2)** endpoints de **lectura agregada/listado** protegidos para SUPERADMIN. El front ya
va a consumir el contrato de abajo.

**Importante:** esto tiene que funcionar en **local y en producción** por igual — es una
feature normal respaldada por DB, gateada por rol SUPERADMIN. Cada entorno muestra sus
propios eventos (su propia DB). Sin hardcodear nada por entorno.

---

## Parte 1 — Ingesta de eventos (PÚBLICA / anónima)

### `POST /events`

- **Auth: NINGUNA.** El demo es anónimo y los eventos se disparan sin sesión.
  - Si llega `Authorization: Bearer ...` válido, asociá `user_id`; si no, queda anónimo.
    Nunca rechaces por falta de auth.
- **Compatibilidad `navigator.sendBeacon`:** el front puede mandar eventos de cierre/unload
  vía `sendBeacon`, que **no permite headers custom** y manda `Content-Type: text/plain`.
  → El endpoint debe aceptar el body aunque venga como `text/plain` (parsear JSON igual) y
  **no** exigir `Authorization`.
- **Body (evento único o batch):**

```jsonc
// único
{
  "event": "demo_started",
  "props": { "prompt_id": "overdue_invoices" },   // opcional, objeto libre
  "utm": {                                          // opcional
    "source": "newsletter", "medium": "email",
    "campaign": "launch_jun", "term": null, "content": null
  },
  "session_id": "a1b2c3...",                        // id anónimo del visitante (localStorage)
  "ts": "2026-06-09T12:34:56.000Z"                  // timestamp cliente (ISO)
}

// batch (opcional, mismo shape dentro del array)
{ "events": [ { ...evento... }, { ...evento... } ] }
```

- **Respuesta:** `202 Accepted` con `{ "ok": true, "stored": <n> }`. Nunca 4xx por props
  desconocidas — la idea es no perder eventos.
- **Validación / anti-abuso:**
  - `event` debe estar en el **allowlist** (ver catálogo abajo). Evento fuera del allowlist:
    descartar silenciosamente (contar como `dropped`, responder 202 igual).
  - Limitar tamaño del body (ej. 8KB) y cantidad por batch (ej. 20).
  - Rate-limit por IP (ej. 60 req/min) — descartar excedente sin romper.
  - `props` y `utm` se guardan como JSON; no confiar en su contenido.

### Captura server-side adicional (no la manda el cliente)
Guardar junto al evento:
- `user_agent` (del header),
- `ip` o `ip_hash` (decidí vos por privacidad; preferible hash/anonimizada),
- `user_id` (si vino bearer válido),
- `received_at` (timestamp servidor, autoritativo para queries).

---

## Parte 2 — Persistencia

Nueva tabla/migración, ej. `analytics_events`:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid/pk | |
| `event` | text/index | nombre del evento (allowlist) |
| `props` | jsonb | objeto libre |
| `session_id` | text/index, nullable | id anónimo del visitante |
| `user_id` | fk users, nullable, index | si autenticado |
| `utm_source` | text, nullable, index | desnormalizado de `utm` para filtrar/agrupar rápido |
| `utm_medium` | text, nullable | |
| `utm_campaign` | text, nullable, index | |
| `utm_term` | text, nullable | |
| `utm_content` | text, nullable | |
| `user_agent` | text, nullable | |
| `ip_hash` | text, nullable | anonimizada |
| `client_ts` | timestamptz, nullable | `ts` del cliente |
| `received_at` | timestamptz, index | servidor, default now() |

Índices por `event`, `received_at`, `session_id`, `utm_source`, `utm_campaign`
(para los agregados del dashboard).

---

## Parte 3 — Lectura para SUPERADMIN (protegida)

Mismo patrón de auth que ya usás para superadmin (lo que protege
`/admin/superadmin/...`). **Solo rol SUPERADMIN.**

### `GET /admin/events` — listado paginado
Query params:
- `event` (filtra por nombre), `session_id`, `utm_source`, `utm_campaign`,
- `date_from`, `date_to` (ISO),
- `has_user` (bool: solo autenticados / solo anónimos),
- `limit` (default 50, máx 200), `offset`.

Respuesta:
```jsonc
{
  "items": [ { "id", "event", "props", "session_id", "user_id",
               "utm_source", "utm_campaign", "user_agent",
               "client_ts", "received_at" } ],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```
Orden por `received_at` desc.

### `GET /admin/events/stats` — agregados para el dashboard
Query params opcionales: `date_from`, `date_to`, `utm_source`, `utm_campaign`.

Respuesta (espejo de `/admin/feedback/stats`, adaptado):
```jsonc
{
  "total": 5021,
  "last_24h": 210,
  "last_7d": 1340,
  "unique_sessions": 980,
  "by_event": { "intro_modal_shown": 1200, "demo_started": 540, ... },
  "funnel": {
    "intro_modal_shown": 1200,
    "demo_started": 540,
    "example_prompt_clicked": 320,
    "connect_own_odoo_clicked": 95
  },
  "by_utm_source": [ { "source": "newsletter", "count": 800 }, ... ],
  "by_utm_campaign": [ { "campaign": "launch_jun", "count": 600 }, ... ],
  "top_example_prompts": [ { "prompt_id": "overdue_invoices", "count": 120 }, ... ],
  "dismissals_by_reason": { "x": 200, "backdrop": 150, "no_show_again": 90, "cta": 60 }
}
```
- `top_example_prompts` se calcula de `props.prompt_id` en eventos `example_prompt_clicked`.
- `dismissals_by_reason` de `props.reason` en `intro_modal_dismissed`.

### (Opcional, lindo de tener) `DELETE /admin/events` — purga
Borrar por rango de fechas / por evento, solo SUPERADMIN. Útil para limpiar ruido de tests.

---

## Catálogo de eventos (allowlist) que el front va a emitir

| `event` | Cuándo | `props` |
|---|---|---|
| `intro_modal_shown` | El modal se auto-abre en primera visita | `{}` |
| `intro_modal_dismissed` | Se cierra el modal | `{ "reason": "x" \| "backdrop" \| "esc" \| "no_show_again" \| "cta" }` |
| `demo_started` | CTA "Empezá a probar" | `{}` |
| `example_prompt_clicked` | Click en un prompt de ejemplo | `{ "prompt_id": string, "prompt_text"?: string }` |
| `connect_own_odoo_clicked` | CTA "Conectá tu Odoo" | `{ "source": "modal" \| "panel" }` |
| `info_opened_from_panel` | Se abre la info completa desde el sidebar | `{}` |
| `partner_cta_clicked` | CTA del bloque partner | `{}` |

Tratá el allowlist como **extensible**: dejalo en una constante/enum fácil de ampliar.

---

## Criterios de aceptación

- [ ] `POST /events` acepta sin auth, evento único y batch, y `Content-Type: text/plain`
      (compat `sendBeacon`). Responde 202 y nunca pierde eventos por props desconocidas.
- [ ] Eventos persistidos con `received_at` servidor + `utm_*` desnormalizados + `user_id`
      si hay bearer.
- [ ] Anti-abuso: allowlist, límite de tamaño/batch, rate-limit por IP.
- [ ] `GET /admin/events` (listado, filtros, paginado) **solo SUPERADMIN**.
- [ ] `GET /admin/events/stats` (agregados/funnel) **solo SUPERADMIN**.
- [ ] Funciona idéntico en local y en producción (mismo código + migración; cada entorno
      ve su propia data; gateado por rol, no por entorno).
- [ ] Migración incluida y reversible.

---

## Notas

- Privacidad: preferí `ip_hash` sobre IP cruda. No guardes PII en `props`.
- Seguí las convenciones del repo (router/deps de auth, estilo de los handlers
  `/admin/feedback`). Si tu auth de superadmin tiene un dependency reutilizable, usalo.
- Avisá si cambiás algún nombre de ruta o el shape de respuesta, así ajusto el front:
  el front consume exactamente `POST /events`, `GET /admin/events`, `GET /admin/events/stats`.
