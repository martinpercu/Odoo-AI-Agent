# Multi-Tenancy & Subscriptions — Phase 10

## Tablas en DB

| Tabla | Propósito |
|---|---|
| `organizations` | El tenant raíz. Tipo `PARTNER` o `SOLITARY`. |
| `subscriptions` | Plan, límites de slots, Stripe IDs, `show_watermark`. |
| `odoo_configs` | Conexiones Odoo de la org. `api_key_encrypted` con Fernet. |
| `tenant_users` | Usuarios locales. `id` mapea 1:1 con `supabase.auth.users`. |
| `conversations` | Vincula `user_id` + `odoo_config_id` + `thread_id` de LangGraph. |
| `invitations` | Tokens de invitación (expiran en 7 días). Único por `(email, org_id)`. |

Todas se crean automáticamente en `lifespan` vía `setup_tenancy_tables`.

---

## Archivos nuevos / modificados

| Archivo | Qué hace |
|---|---|
| `src/api/tenancy.py` | Modelos + SQL + CRUD + Fernet encrypt/decrypt |
| `src/api/auth.py` | Middleware JWT Supabase + `build_thread_id` |
| `src/api/admin.py` | CRUD REST para orgs, configs, users, invitaciones, suscripciones |
| `src/api/stripe_webhook.py` | Webhook Stripe (sin SDK, HMAC manual) |
| `src/api/me.py` | `GET /me` y `GET /me/conversations` |
| `src/api/db.py` | Llama a `setup_tenancy_tables` en el lifespan |
| `src/api/main.py` | Registra middleware, `admin_router`, `stripe_router`, `me_router` |

---

## Variables de entorno

```bash
# Autenticación (activa el middleware; sin esto = dev mode, sin auth)
SUPABASE_JWT_SECRET=<jwt-secret-de-supabase>

# Cifrado de API keys de Odoo (sin esto = plain-text en dev)
# Generar: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=<fernet-key-base64>

# Stripe webhooks (sin esto = skip verificación de firma)
STRIPE_WEBHOOK_SECRET=<whsec_...>
```

---

## Middleware de auth (`src/api/auth.py`)

1. Salta rutas públicas (`/`, `/docs`, etc.) y OPTIONS.
2. Valida JWT Supabase (HS256) contra `SUPABASE_JWT_SECRET`.
3. Upsert del usuario en `tenant_users` en cada request.
4. Adjunta a `request.state`: `user_id`, `org_id`, `user_role`.
5. `POST /chat/*` → verifica slots disponibles → `402` si la org está llena.

---

## Aislamiento de LangGraph

Todos los endpoints `/chat/{chat_id}/*` usan `build_thread_id(request, chat_id)`:

- **Con auth + org:** `"{org_id}:{chat_id}"` — checkpoint nunca compartido entre orgs.
- **Sin auth (dev) o sin org:** `"{chat_id}"` — comportamiento idéntico al anterior.

Afecta: agent state, pins, notificaciones, audit logs, historial.

---

## Lógica del 5+5

```
Ejemplo org STARTER (paid_slots=5, free_slots=5):
  3 usuarios paid  → quedan 2 slots pagos libres  ✓
  5 usuarios free  → 0 slots free libres           ✗ → si pagos también llenos → 402
```

`check_slots_available(conn, org_id)` → `(True, "ok")` | `(False, reason)`.
Sin suscripción activa: default 5 free slots.

---

## Admin API (`/admin/*`)

Roles: `ADMIN` > `IMPLEMENTER` > `CLIENT_USER`

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| POST | `/admin/orgs` | ADMIN | Crear organización (+ suscripción FREE auto) |
| GET | `/admin/orgs/{org_id}` | IMPLEMENTER | Ver org + subscription + slots usados |
| PATCH | `/admin/orgs/{org_id}` | ADMIN | Editar nombre/slug/tipo |
| GET | `/admin/orgs/{org_id}/subscription` | IMPLEMENTER | Ver suscripción activa |
| PATCH | `/admin/orgs/{org_id}/subscription` | ADMIN | Editar slots/tier/watermark |
| POST | `/admin/orgs/{org_id}/configs` | IMPLEMENTER | Crear config Odoo (encripta api_key) |
| GET | `/admin/orgs/{org_id}/configs` | IMPLEMENTER | Listar configs activas |
| PATCH | `/admin/orgs/{org_id}/configs/{id}` | IMPLEMENTER | Editar config |
| DELETE | `/admin/orgs/{org_id}/configs/{id}` | ADMIN | Soft-delete config |
| GET | `/admin/orgs/{org_id}/users` | IMPLEMENTER | Listar usuarios de la org |
| PATCH | `/admin/orgs/{org_id}/users/{id}` | ADMIN | Cambiar rol / is_free_license |
| DELETE | `/admin/orgs/{org_id}/users/{id}` | ADMIN | Remover usuario de la org |
| POST | `/admin/orgs/{org_id}/invitations` | IMPLEMENTER | Crear invitación (token expira en 7 días) |
| GET | `/admin/orgs/{org_id}/invitations` | IMPLEMENTER | Listar invitaciones |
| POST | `/admin/invitations/accept` | (JWT válido) | Aceptar invitación → vincula user a org |

---

## Stripe Webhook (`POST /webhooks/stripe`)

Eventos manejados:

| Evento | Acción |
|---|---|
| `customer.subscription.updated` | Actualiza tier, slots, `current_period_end`, `is_active` |
| `customer.subscription.deleted` | `is_active = false` |
| `invoice.payment_succeeded` | Actualiza `current_period_end`, `is_active = true` |
| `invoice.payment_failed` | Log (Stripe maneja el dunning) |

**Configuración de slots desde Stripe:**
Setear en la suscripción de Stripe → metadata:
```
tier          = STARTER
paid_slots    = 5
free_slots    = 5
show_watermark = false
```

---

## Frontend Bootstrap API

### `GET /me`
Llamar apenas carga la app. Retorna todo lo necesario para inicializar la sesión:

```json
{
  "user":         { "id", "email", "role", "is_free_license" },
  "org":          { "id", "name", "slug", "type" },
  "subscription": { "tier", "show_watermark", "paid_slots_limit", "free_slots_limit", "is_active" },
  "slots_used":   { "paid": 2, "free": 3 }
}
```

### `GET /me/conversations?limit=50&offset=0`
Lista de chats del usuario autenticado, ordenados por `last_message_at DESC`.
Usarlo para el sidebar de historial.

### Evento SSE `watermark` en el stream
El primer evento que emite `/chat/{id}/stream` es:
```json
{ "type": "watermark", "show": true }
```
El frontend debe escucharlo y mostrar/ocultar el branding en consecuencia.
Las conversaciones también se registran automáticamente en `conversations` al primer mensaje.

---

## Fernet — Cifrado de API keys

```python
from api.tenancy import encrypt_api_key, decrypt_api_key

enc = encrypt_api_key("mi-api-key-de-odoo")   # se guarda en DB
raw = decrypt_api_key(enc)                      # se usa para autenticar
```

Sin `ENCRYPTION_KEY` en `.env` → pasa plain-text (dev mode, sin cambio de comportamiento).
