# Requerimientos de backend — Onboarding & Tenant refactor

> Documento de contrato. Lo necesita el frontend para implementar el refactor descrito en
> [`frontend-implementation-admin-onboarding.md`](./frontend-implementation-admin-onboarding.md) y planificado en
> [`frontend-implementation-PLAN.md`](./frontend-implementation-PLAN.md).
> El backend vive en el repo `odoo-agent-back` (rama propia, commit propio). **Nada de esto se toca desde el front.**

## 0. Decisión de mapeo (leer primero)

La spec habla de `OdooInstance` y `Connection`. **No creamos un API nuevo paralelo** (`/instances`, `/connections`).
En su lugar **reutilizamos las entidades que ya existen** y les agregamos lo que falta, para no duplicar superficie ni romper lo que anda:

| Concepto de la spec | Entidad real hoy | Endpoint base actual |
|---|---|---|
| `OdooInstance` (URL + DB, compartida) | tabla `odoo_configs` | `/admin/orgs/{orgId}/configs` |
| `Connection` (user Odoo + apikey, personal) | tabla `user_odoo_credentials` | `/me/odoo-credentials/{configId}` · `/admin/orgs/{orgId}/users/{userId}/odoo-credentials/{configId}` |
| `Invitation` | tabla `invitations` (+ `pending_credentials`) | `/admin/orgs/{orgId}/invitations` |
| `Membership.seat_type` | `tenant_users.is_free_license` (`free=is_free_license=true`, `paid=false`) | `PATCH /admin/orgs/{orgId}/users/{userId}` |

Donde la spec pide `/connections/:id`, el front usará la clave compuesta `(userId, configId)` que ya maneja la API.
**Regla transversal de la spec que ya se respeta y debe seguir respetándose: la apikey es write-only.** Ningún endpoint la devuelve nunca.

---

## 1. Cambios de modelo de datos (DDL)

Todos idempotentes (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), en `src/api/tenancy.py` junto al resto del schema.

### 1.1 `odoo_configs` → metadata de instancia
La instancia hoy es sólo `url + db_name`. La spec necesita guardar lo que Odoo devuelve al validar:

```sql
ALTER TABLE odoo_configs ADD COLUMN IF NOT EXISTS company_name  TEXT;
ALTER TABLE odoo_configs ADD COLUMN IF NOT EXISTS odoo_version  TEXT;
ALTER TABLE odoo_configs ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES tenant_users(id) ON DELETE SET NULL;
```

`company_name` / `odoo_version` se completan en la primera validación exitosa (onboarding o creación de instancia N).

### 1.2 `user_odoo_credentials` → ciclo de vida de la Connection
**Este es el cambio conceptual más importante.** Hoy una credencial sólo existe cuando hay apikey (`api_key_encrypted TEXT NOT NULL`). La spec necesita que la Connection pueda existir **sin credenciales todavía** (estado `unset` = "registrado sin creds"):

```sql
ALTER TABLE user_odoo_credentials ALTER COLUMN odoo_username     DROP NOT NULL;
ALTER TABLE user_odoo_credentials ALTER COLUMN api_key_encrypted DROP NOT NULL;
ALTER TABLE user_odoo_credentials ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unset';
ALTER TABLE user_odoo_credentials ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;
-- status ∈ ('unset','active','invalid')
```

Estados (spec §4):
- `unset`: la fila existe (usuario asignado a la instancia) pero sin apikey válida → **bloqueante**, UI muestra "cargar creds".
- `active`: apikey validada contra Odoo OK. `last_validated_at` seteado.
- `invalid`: una consulta a Odoo falló por auth → el back marca la fila. **Aislado por usuario** (no afecta a otros de la misma instancia).

> Migración de datos existentes: las filas actuales con apikey deben quedar `status='active'`.

### 1.3 `invitations` → instancia destino, seat y modo
Hoy la invitación sólo lleva `role`. La spec necesita a qué instancia queda asignado el invitado, el tipo de seat y el modo:

```sql
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES odoo_configs(id) ON DELETE CASCADE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS seat_type   TEXT NOT NULL DEFAULT 'paid';   -- 'paid' | 'free'
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS mode        TEXT NOT NULL DEFAULT 'invite_only'; -- 'invite_only' | 'precreds'
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending'; -- 'pending' | 'accepted' | 'cancelled'
```

`mode='precreds'` ya está soportado por la tabla `pending_credentials` existente; sólo falta el flag explícito y el `instance_id` para saber a qué Connection aplicar las creds al aceptar.

---

## 2. Endpoints — qué agregar / qué extender

Nomenclatura: mantengo las rutas reales actuales. La columna "Spec" referencia el endpoint teórico del doc.

### 2.1 Validación de conexión (CRÍTICO — bloquea casi todo)
**Extender** `POST /test-connection` y `POST /admin/orgs/{orgId}/configs/{configId}/test-connection`.

| Spec | `POST /instances/validate` |
|---|---|
| Body | `{ url, db_name, odoo_username?, odoo_apikey? }` |
| OK | `{ ok: true, company_name: string, odoo_version: string }` |
| Error | `{ ok: false, error_code: "unreachable" \| "db_not_found" \| "auth_failed", field_errors?: {...} }` |

El front mapea cada `error_code` a un mensaje accionable por campo. **Hoy `/test-connection` no distingue estos códigos ni devuelve `company_name`/`odoo_version`** → hay que agregarlo.

**Decisión de producto (validación sin credenciales):** cuando llega sin `odoo_username/odoo_apikey`, basta con **chequear que la instancia existe** (URL alcanzable + DB encontrada). No hace falta ir más allá. Devuelve `error_code: "unreachable"` o `"db_not_found"` si falla; `ok: true` (con `company_name`/`odoo_version` si Odoo los expone sin auth, opcional) si existe. La validación completa con `auth_failed` sólo aplica cuando vienen credenciales.

### 2.2 Crear instancia capturando metadata + Connection del creador
**Extender** `POST /admin/orgs/{orgId}/configs`.

- Body suma (opcional): `{ odoo_username?, odoo_apikey? }`.
- Antes de persistir, validar (2.1). Si OK, guardar `company_name` + `odoo_version` en `odoo_configs`.
- Si vienen credenciales: crear la `Connection` del creador con `status='active'` + `last_validated_at`.
- Si no vienen (instancia N opcional): persistir sólo la instancia; el admin queda **sin** Connection ahí (spec §6.2 — "configurar para chatear").
- `solitary`: rechazar crear instancia N (409 / mensaje upgrade). Hoy el front ya gatea esto por `org.type`, pero conviene defensa en el back.

### 2.3 Lista de instancias con contadores y estado de conexión propia
**Extender** la respuesta de `GET /admin/orgs/{orgId}/configs` (o el `/me.odoo_configs`) para incluir, por instancia:

```jsonc
{
  "id": "...", "label": "...", "url": "...", "db_name": "...",
  "company_name": "Acme SA", "odoo_version": "16.0",
  "my_connection_status": "active" | "unset" | "invalid" | null,  // null = no tengo Connection
  "counts": { "active": 3, "unset": 1, "invalid": 0, "pending": 2 },
  "seats": { "paid_used": 4, "paid_total": 5, "free_used": 1, "free_total": 2 }
}
```

Esto alimenta las cards de `/app/instances` (lista) y el `InstanceHealthSummary`. Los `seats` son por org (no por instancia) — se pueden repetir o devolver aparte; el front sólo necesita poder mostrar uso/límite.

### 2.4 Detalle de instancia + sus usuarios (NUEVO)
**Nuevo** `GET /admin/orgs/{orgId}/configs/{configId}` (detalle).

```jsonc
{
  "id": "...", "label": "...", "url": "...", "db_name": "...",
  "company_name": "...", "odoo_version": "...",
  "counts": { "active": 3, "unset": 1, "invalid": 0, "pending": 2 },
  "users": [
    {
      "user_id": "...", "email": "...", "role": "CLIENT_USER",
      "seat_type": "paid" | "free",
      "connection_status": "active" | "unset" | "invalid",
      "odoo_username": "juan" | null,
      "last_validated_at": "2026-06-01T..." | null
    }
  ],
  "invitations": [
    { "id": "...", "email": "...", "seat_type": "paid", "mode": "invite_only",
      "status": "pending", "expires_at": "..." }
  ]
}
```

Hoy los usuarios se listan org-wide (`GET /admin/orgs/{orgId}/users`) y las credenciales por separado. La pantalla de detalle de instancia necesita el cruce **usuarios ∩ esta instancia** con su `connection_status`. Sin este endpoint el front tendría que hacer N llamadas y cruzar a mano.

### 2.5 Guardar credenciales validando antes de marcar `active`
**Extender** `PUT /me/odoo-credentials/{configId}` y `PUT /admin/orgs/{orgId}/users/{userId}/odoo-credentials/{configId}`.

- Hoy guardan sin validar contra Odoo. La spec (§6.5, §9) exige **validar antes de marcar `active`**.
- Nuevo comportamiento: validar (2.1) con las creds recibidas.
  - OK → guardar, `status='active'`, `last_validated_at=now()`. Respuesta incluye `{ status: 'active', last_validated_at }`.
  - Auth falla → **no** marcar active; responder `{ ok:false, error_code:'auth_failed' }` (HTTP 422 o body de error que el front pueda mapear). No pisar una credencial válida previa con una inválida sin avisar.
- "Asignar instancia sin credenciales" (admin pre-registra al usuario) = PUT con strings vacíos → crea la fila `status='unset'`. Ya existe parcialmente; alinear con el nuevo campo `status`.

### 2.6 Revalidar conexión on-demand (NUEVO)
**Nuevo** `POST /me/odoo-credentials/{configId}/revalidate` (y variante admin si hace falta).

- Revalida la apikey guardada contra Odoo, actualiza `status` + `last_validated_at`.
- Lo usa el botón "revalidar mi conexión" (§6.9) y la recuperación desde `invalid` (§6.8).

### 2.7 Detección de `invalid` en runtime (lado agente)
Cuando una consulta a Odoo durante el chat falla por autenticación, el back debe marcar **esa** `Connection.status='invalid'` (spec §6.8). El front ya tiene el sentinel `NO_CREDENTIALS:` para "sin creds"; conviene un señal análoga o que el `/me` refleje el `status` para pintar el `ConnectionInvalidBanner`. **Aislamiento por usuario**: sólo la Connection que falló, nunca la instancia entera.

### 2.8 Invitación con seat + modo + instancia
**Extender** `POST /admin/orgs/{orgId}/invitations`.

- Body suma: `{ instance_id, seat_type: 'paid'|'free', mode: 'invite_only'|'precreds', prefilled_username?, prefilled_apikey? }`.
- **Bloquear email que ya tiene cuenta (decisión de producto):** antes de crear, verificar si el `email` ya existe como `tenant_user` (en cualquier org). Si existe → **409 con `error_code: "email_has_account"`**. El front muestra ese mensaje al admin (tenant) y no crea la invitación. No se reutiliza la cuenta ni se crea membership cruzada.
- Validar seat disponible para el `seat_type` elegido **antes** de crear; si no hay → 409 con flag para el prompt de upgrade (el front ya maneja `seatLimitReached`).
- `mode='precreds'` → guardar en `pending_credentials` (ya existe) ligado a `instance_id`.
- La invitación pendiente **consume el seat de inmediato** (ya se cuenta en `slots_used`). Cancelar (`DELETE`) lo libera (ya implementado).

### 2.9 Aceptar invitación
**Revisar** `POST /admin/invitations/accept` (o `/invitations/{token}/accept`).

- Al aceptar, crear la `Connection` para `invitation.instance_id`:
  - `mode='precreds'` → aplicar `pending_credentials`, validar, `status='active'`.
  - `mode='invite_only'` → `status='unset'` (el usuario carga su apikey después).
- Setear `Membership.seat_type` desde `invitation.seat_type` (`is_free_license`).
- Marcar `invitation.status='accepted'`.
- El signup en Supabase lo hace el front (flujo actual). Confirmar que el back acepta el `accessToken` recién creado.

### 2.10 Seat toggle (ya existe — confirmar límites)
`PATCH /admin/orgs/{orgId}/users/{userId}` con `is_free_license` ya alterna seat. Confirmar que respeta límites del plan en ambos sentidos (paid→free overflow, free→paid sin seats) devolviendo 409 — el front ya muestra el banner.

---

## 3. Reflejo en `GET /me` (para client_user home y banners)

`/me.odoo_configs` para un `CLIENT_USER` ya devuelve sólo sus configs con `has_credentials` + `odoo_username`. **Sumar `connection_status`** (`active|unset|invalid`) y `company_name` por config, para que `ClientUserHome` (§6.6) pinte el estado correcto sin llamadas extra:

```jsonc
"odoo_configs": [
  { "id":"...", "label":"...", "company_name":"Acme SA",
    "has_credentials": true, "odoo_username":"juan",
    "connection_status": "active" | "unset" | "invalid" }
]
```

---

## 4. Resumen — checklist para el repo back

- [ ] DDL: `odoo_configs.company_name/odoo_version/created_by`.
- [ ] DDL: `user_odoo_credentials.status/last_validated_at` + drop NOT NULL en username/apikey + migrar filas actuales a `active`.
- [ ] DDL: `invitations.instance_id/seat_type/mode/status`.
- [ ] `/test-connection`: devolver `company_name`+`odoo_version` y `error_code` discriminado (`unreachable|db_not_found|auth_failed`).
- [ ] `POST .../configs`: validar + guardar metadata + crear Connection del creador (creds opcionales desde la 2ª).
- [ ] `GET .../configs`: sumar `company_name`, `odoo_version`, `my_connection_status`, `counts`, `seats`.
- [ ] `GET .../configs/{id}`: **nuevo** detalle con `users[]` (connection_status, odoo_username, seat_type) + `invitations[]`.
- [ ] `PUT` creds (me + admin): validar antes de marcar `active`; PUT vacío → `unset`.
- [ ] `POST .../revalidate`: **nuevo**.
- [ ] Runtime: marcar `invalid` cuando una query falla por auth (aislado por usuario).
- [ ] `POST .../invitations`: sumar `instance_id/seat_type/mode`; validar seat; 409 si no hay.
- [ ] `accept`: crear Connection (`unset` o `active` según mode), set seat, `status='accepted'`.
- [ ] `GET /me`: sumar `connection_status` + `company_name` por config (client_user).

## 5. Decisiones de producto (resueltas)

1. **Org `name`/`slug` en onboarding:** se **auto-generan del email** (comportamiento actual de `POST /me/onboarding`). No se exponen en el form. Sin cambios en el back.
2. **Invitar un email que ya tiene cuenta:** **bloquear** + informar al tenant. `POST .../invitations` devuelve **409 `email_has_account`** si el email ya es un `tenant_user`. No se reutiliza ni se cruza org (ver §2.8).
3. **Validación sin credenciales:** basta con **chequear que la instancia existe** (URL + DB). Ver §2.1.

### Sigue abierta
- **Reenvío de invitación** a un `pending`: garantizar que no duplique invitación ni seat (idempotente por `(org, email, pending)`). Definir al implementar Fase 5.
</content>
</invoke>
