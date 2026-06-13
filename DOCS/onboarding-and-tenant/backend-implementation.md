# Onboarding & Tenant refactor — Backend implementation

> Implementación del contrato definido en [`backend-requirements.md`](./backend-requirements.md).
> Branch: `landing-events` (repo `odoo-agent-back`). Todo el cambio es backend; el front no se toca.
> Estado: **completo** — los 17 ítems del checklist §4 del requirements están implementados y verificados.

## Resumen

Se reutilizan las entidades existentes (`odoo_configs`, `user_odoo_credentials`, `invitations`,
`pending_credentials`, `tenant_users`) tal como pedía la decisión de mapeo §0 — **no** se creó un API
paralelo de `/instances`/`/connections`. Se agregó: metadata de instancia, el ciclo de vida `status`
de la Connection (`unset`/`active`/`invalid`), validación discriminada de conexión, y los campos de
seat/modo/instancia en las invitaciones.

La apikey sigue siendo **write-only** — ningún endpoint nuevo la devuelve.

## 1. DDL (en `src/api/tenancy.py` → `setup_tenancy_tables`)

Todas idempotentes (`ADD COLUMN IF NOT EXISTS` / `ALTER COLUMN`), corren en cada startup. Verificado
que aplican dos veces sin error.

| Tabla | Cambios |
|---|---|
| `odoo_configs` | `company_name TEXT`, `odoo_version TEXT`, `created_by UUID REFERENCES tenant_users(id) ON DELETE SET NULL` |
| `user_odoo_credentials` | `status TEXT NOT NULL DEFAULT 'unset'`, `last_validated_at TIMESTAMPTZ`. Migración: filas con creds → `status='active'` |
| `invitations` | `instance_id UUID REFERENCES odoo_configs(id) ON DELETE CASCADE`, `seat_type TEXT DEFAULT 'paid'`, `mode TEXT DEFAULT 'invite_only'`, `status TEXT DEFAULT 'pending'`. Backfill: `accepted_at IS NOT NULL → status='accepted'` |

`odoo_username`/`api_key_encrypted` en `user_odoo_credentials` ya eran NULLABLE (estado `unset`).

## 2. Validación de conexión discriminada

**`agents/odoo_agent/tools/odoo_helpers.py`** — única fuente de verdad:

- `validate_odoo_instance(url, db, username=None, api_key=None) -> dict`
  - OK → `{"ok": True, "company_name", "odoo_version"}`
  - Error → `{"ok": False, "error_code": "unreachable"|"db_not_found"|"auth_failed", "field_errors": {...}}`
  - **Sin credenciales** (§2.1, decisión de producto): sólo chequea alcance de URL + existencia de DB
    (un host que responde `common.authenticate` prueba que la DB existe). Nunca devuelve `auth_failed`.
- `classify_odoo_error(exc) -> str` — mapea la excepción a uno de los 3 códigos. Maneja el
  `ValueError("Authentication failed…")` que levanta `authenticate()` cuando el uid es falsy.

## 3. Endpoints

### `/test-connection` (`main.py`) — §2.1
Reescrito sobre `validate_odoo_instance`. Devuelve `{ok, company_name, odoo_version, error_code, field_errors}`
(+ claves legacy `version`/`company` por compatibilidad). El body acepta **ambos esquemas de nombres**
vía `AliasChoices`: `db`/`db_name`, `username`/`odoo_username`, `api_key`/`odoo_apikey`. Credenciales
opcionales.

### Crear instancia (`POST /admin/orgs/{org}/configs`) — §2.2
`OdooConfigCreate` suma `odoo_username?`/`odoo_apikey?`. El handler:
1. **Rechaza instancia N en orgs SOLITARY** (409 con mensaje de upgrade — defensa en el back).
2. Valida (reachability siempre; auth si vienen creds) → 422 con `error_code` si falla.
3. Persiste `company_name`/`odoo_version`/`created_by`.
4. Si vienen creds del creador → crea su Connection `status='active'`.

### Lista de instancias (`GET /admin/orgs/{org}/configs`) — §2.3
Usa el nuevo `get_configs_with_status_for_org(conn, org, caller_user_id)`. Cada config trae:
`company_name`, `odoo_version`, `my_connection_status` (`active|unset|invalid|null`),
`counts {active, unset, invalid, pending}`, `seats {paid_used, paid_total, free_used, free_total}`.

### Detalle de instancia (`GET /admin/orgs/{org}/configs/{config}`) — §2.4 **(NUEVO)**
`get_config_detail` devuelve el cruce **usuarios ∩ esta instancia** (`seat_type`, `connection_status`,
`odoo_username`, `last_validated_at`) + `invitations[]` pendientes a esa instancia + `counts`.

### Guardar credenciales — §2.5
- `PUT /me/odoo-credentials/{config}` y `PUT /admin/orgs/{org}/users/{user}/odoo-credentials/{config}`:
  - vacío (`username`+`apikey` ambos vacíos) → fila `status='unset'` (`assign_user_config_unset`, no pisa una activa).
  - con creds → **valida antes** de marcar `active`; auth falla → **422** (`{ok:false, error_code:'auth_failed', field_errors}`), no pisa una credencial válida previa.
  - en éxito guarda metadata de instancia + `status='active'` + `last_validated_at`.

### Revalidar — §2.6 **(NUEVO)**
- `POST /me/odoo-credentials/{config}/revalidate`
- `POST /admin/orgs/{org}/users/{user}/odoo-credentials/{config}/revalidate`
Re-valida la apikey guardada → `active`/`invalid` + `last_validated_at`.

### Detección de `invalid` en runtime — §2.7
- `state.py`: nuevo campo `odoo_connection_error_code`.
- El nodo `validate_odoo_connection` clasifica la falla (`classify_odoo_error`) y la expone en el estado.
- `main.py` → `_mark_connection_invalid_if_auth_failed(...)` se llama tras correr el grafo en
  `/chat/{id}/stream` **y** `POST /chat/{id}` (sync). Marca **sólo** la Connection de ese usuario como
  `invalid`, y **sólo** cuando el error fue `auth_failed` (no en cortes transitorios `unreachable`).
  No-op para `demo`/dev. **Aislamiento por usuario garantizado** — nunca toca la instancia ni a otros.

### Invitaciones con seat + modo + instancia — §2.8
`POST /admin/orgs/{org}/invitations` — `InvitationCreate` suma `instance_id?`, `seat_type`, `mode`,
`prefilled_username?`, `prefilled_apikey?`. El handler:
- **Bloquea email que ya tiene cuenta** → 409 `{error_code:"email_has_account"}` (case-insensitive, cualquier org).
- Valida `seat_type` disponible contando pendientes del **mismo tipo** como reservados → 409 `{error_code:"seatLimitReached"}`.
- Valida que `instance_id` pertenezca a la org.
- `mode='precreds'` + creds → guarda en `pending_credentials` ligado a `instance_id`.
`list_invitations` ahora expone `instance_id`/`seat_type`/`mode`/`status`.

### Aceptar invitación — §2.9
`POST /admin/invitations/accept`:
- `seat_type` se toma de la invitación (no se recalcula) → `is_free_license`.
- `status='accepted'` (+ `accepted_at`).
- Materializa la Connection para `invitation.instance_id`:
  - `precreds` con creds completas → valida (best-effort, no bloquea el accept) → `active`/`invalid`.
  - `invite_only` (o precreds sin creds completas) → `unset`.
- Devuelve `instance_id` + `connection_status`.

### Seat toggle — §2.10
`PATCH /admin/orgs/{org}/users/{user}` ya respeta límites vía `check_license_type_change` (sin cambios).

## 4. Reflejo en `GET /me` — §3
- `CLIENT_USER`: cada config en `odoo_configs` suma `connection_status` (`active|unset|invalid`) y
  `company_name` (ya venían `has_credentials`/`odoo_username`).
- `ADMIN`/`SUPERADMIN`: cada config suma `connection_status` del propio caller + `company_name`/`odoo_version`.

## 5. Helpers nuevos en `tenancy.py`
`assign_user_config_unset`, `mark_connection_status`, `set_config_metadata`, `_instance_status_counts`,
`get_configs_with_status_for_org`, `get_config_detail`. `upsert_user_odoo_credential` ahora setea
`status='active'` + `last_validated_at` por defecto (los callers sólo persisten tras validar);
`get_user_odoo_credential` y `get_active_odoo_configs_for_org` devuelven los campos nuevos.

## 6. Verificación realizada
- `py_compile` + smoke de imports (incluido `api.main`) — OK.
- `classify_odoo_error` y parsing de aliases del `TestConnectionRequest` — OK.
- DDL aplicado contra Postgres local (idempotente 2×) — todas las columnas presentes.
- Test de integración del ciclo de vida (admin `active`, client `unset`→`invalid`, `assign_unset` no pisa
  una activa, metadata) + `get_configs_with_status_for_org` y `get_config_detail` devolviendo la forma exacta
  del spec (`counts`, `seats`, `my_connection_status`, users/invitations) — OK.
- Suite de caracterización del stream (`tests/stream_offload/`, 34 tests) — **passed** (el nuevo campo de
  estado no alteró orden/forma de eventos SSE).

## 7. Pendiente / fuera de alcance
- **Reenvío de invitación** a un `pending` idempotente (§5 "Sigue abierta") — el `ON CONFLICT (email, org_id)`
  ya hace upsert sin duplicar fila ni seat; la idempotencia explícita de "reenvío" se define en Fase 5.
- El endpoint `POST /chat/{id}/action` no marca `invalid` en runtime: el turno de chat previo que propone la
  acción ya valida la conexión con la misma credencial, así que el marcado se cubre ahí.
