# SUPERADMIN Panel — Frontend Implementation Instructions

> **Contexto:** Este panel es exclusivo para el dueño del SaaS (rol `SUPERADMIN`).
> Solo una persona lo usa. Priorizar funcionalidad sobre estética.

---

## 1. Detección del rol

El endpoint `GET /me` ya devuelve el campo `role` del usuario. Usarlo para condicionar toda la UI:

```js
const isSuperAdmin = user.role === 'SUPERADMIN'
```

Si `isSuperAdmin === false` y alguien navega a `/superadmin/*` → redirect a `/`.

---

## 2. Ruta y navegación

- Ruta nueva: `/superadmin`
- En la barra de navegación principal: mostrar el link **"Panel Admin"** o **"⚙ Admin"** **solo si** `role === 'SUPERADMIN'`
- El panel tiene **3 tabs** dentro de `/superadmin`:
  - `Organizaciones`
  - `Usuarios`
  - `Actividad`

---

## 3. Tab: Organizaciones

### Fetch
```
GET /admin/superadmin/orgs?limit=100&offset=0
```

### Respuesta
```json
{
  "orgs": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme",
      "type": "SOLITARY",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "subscription": {
        "tier": "STARTER",
        "paid_slots_limit": 5,
        "free_slots_limit": 5,
        "show_watermark": false,
        "is_active": true
      },
      "user_count": 3
    }
  ],
  "count": 12
}
```

### Tabla a mostrar

| Columna | Campo | Notas |
|---------|-------|-------|
| Estado | `is_active` | Badge verde "Activa" / rojo "Suspendida" |
| Nombre | `name` | Clickeable → abre detalle |
| Slug | `slug` | |
| Tipo | `type` | `SOLITARY` / `PARTNER` |
| Plan | `subscription.tier` | Badge: FREE / STARTER / GROWTH / etc. |
| Slots | `paid_slots_limit` / `free_slots_limit` | "5P / 5F" |
| Watermark | `show_watermark` | Checkbox read-only |
| Usuarios | `user_count` | |
| Creada | `created_at` | Fecha formateada |
| Acciones | — | Ver botones abajo |

### Acciones por fila

**1. Toggle activo/suspendido** (botón o switch)
- Si `is_active = true` → botón "Suspender" (rojo)
  - Llama: `PATCH /admin/superadmin/orgs/{org_id}/suspend`
- Si `is_active = false` → botón "Activar" (verde)
  - Llama: `PATCH /admin/superadmin/orgs/{org_id}/activate`
- Ambos devuelven `{ "status": "ok", "org": { "id", "name", "is_active" } }`
- Pedir confirmación antes de suspender: `"¿Suspender org Acme Corp? Todos sus usuarios perderán acceso."`

**2. Editar plan/slots** (botón "Editar" → modal o inline form)
- Llama: `PATCH /admin/orgs/{org_id}/subscription`
- Body (solo los campos que cambien):
  ```json
  {
    "tier": "GROWTH",
    "paid_slots_limit": 10,
    "free_slots_limit": 5,
    "show_watermark": false
  }
  ```
- Valores posibles para `tier`: `FREE` | `STARTER` | `GROWTH` | `BUSINESS` | `ENTERPRISE` | `CUSTOM`
- Respuesta: `{ "status": "ok", "subscription": { ... } }`
- **Nota:** Este endpoint es el mismo que usa el ADMIN de la org, pero el SUPERADMIN no tiene el check `_assert_same_org` porque es global.

**3. Ver detalle de org** (link o botón "Ver")
- Llama: `GET /admin/orgs/{org_id}` 
- Devuelve también `slots.paid_used` y `slots.free_used` (cuántos ya están en uso)
- Mostrar en un panel lateral o modal: nombre, slug, tipo, suscripción, slots usados vs límite, configs Odoo

### Stats en el header del tab
```
Total orgs: {count}   |   Activas: {orgs.filter(o => o.is_active).length}   |   Suspendidas: {orgs.filter(o => !o.is_active).length}
```

---

## 4. Tab: Usuarios

### Fetch
```
GET /admin/superadmin/users?limit=100&offset=0
```

### Respuesta
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@acme.com",
      "role": "ADMIN",
      "is_free_license": false,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "org": {
        "id": "uuid",
        "name": "Acme Corp",
        "slug": "acme"
      }
    }
  ],
  "count": 47
}
```

### Tabla a mostrar

| Columna | Campo | Notas |
|---------|-------|-------|
| Estado | `is_active` | Badge verde/rojo |
| Email | `email` | |
| Rol | `role` | Badge: SUPERADMIN / ADMIN / CLIENT_USER |
| Org | `org.name` | Si `org = null` → "Sin org" (usuario sin onboarding) |
| Free | `is_free_license` | Ícono ✓ o — |
| Registrado | `created_at` | Fecha |
| Acciones | — | Ver botones abajo |

### Acciones por fila

**1. Toggle activo/suspendido**
- Si `is_active = true` → botón "Suspender" (rojo)
  - Llama: `PATCH /admin/superadmin/users/{user_id}/suspend`
- Si `is_active = false` → botón "Activar" (verde)
  - Llama: `PATCH /admin/superadmin/users/{user_id}/activate`
- Ambos devuelven `{ "status": "ok", "user": { "id", "email", "is_active" } }`
- Confirmar antes de suspender: `"¿Suspender usuario user@acme.com?"`

**2. Cambiar rol** (dropdown inline o modal)
- Llama: `PATCH /admin/superadmin/users/{user_id}`
- Body: `{ "role": "ADMIN" }`
- Roles disponibles: `CLIENT_USER` | `ADMIN` | `SUPERADMIN`
- Respuesta: `{ "status": "ok", "user": { "id", "email", "role" } }`
- **Advertencia visual** si se intenta asignar `SUPERADMIN` a alguien más.

**3. Toggle is_free_license**
- Llama: `PATCH /admin/superadmin/users/{user_id}`
- Body: `{ "is_free_license": true }`

> **Nota importante:** El endpoint `PATCH /admin/superadmin/users/{user_id}` acepta `role` y/o `is_free_license` en el mismo body.

### Stats en el header del tab
```
Total usuarios: {count}   |   Activos: {users.filter(u => u.is_active).length}   |   Sin org: {users.filter(u => !u.org).length}
```

---

## 5. Tab: Actividad

### Fetch
```
GET /me/conversations?limit=50&offset=0
```
> Este endpoint devuelve las conversaciones del usuario autenticado. Como SUPERADMIN no tiene conversaciones propias, este tab es más informativo — se puede omitir o mostrar un mensaje "Actividad por org próximamente".

**Alternativa funcional sin endpoint nuevo:** Mostrar en este tab la lista de orgs ordenadas por `user_count` descendente, indicando cuáles tienen más usuarios. Es suficiente para la v1.

---

## 6. Endpoints de referencia completa

### SUPERADMIN exclusivos (requieren rol `SUPERADMIN`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/superadmin/orgs` | Listar todas las orgs |
| GET | `/admin/superadmin/users` | Listar todos los usuarios |
| PATCH | `/admin/superadmin/orgs/{org_id}/suspend` | Suspender org |
| PATCH | `/admin/superadmin/orgs/{org_id}/activate` | Activar org |
| PATCH | `/admin/superadmin/users/{user_id}/suspend` | Suspender usuario |
| PATCH | `/admin/superadmin/users/{user_id}/activate` | Activar usuario |
| PATCH | `/admin/superadmin/users/{user_id}` | Cambiar rol / is_free_license |

### Reusar endpoints de ADMIN (el SUPERADMIN pasa el check de manager)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/orgs/{org_id}` | Detalle de org (con slots usados) |
| GET | `/admin/orgs/{org_id}/configs` | Configs Odoo de una org |
| GET | `/admin/orgs/{org_id}/users` | Usuarios de una org |
| PATCH | `/admin/orgs/{org_id}/subscription` | Editar plan/slots |

---

## 7. Comportamiento de kill switches

Cuando un org o usuario es suspendido, el backend devuelve `403` en todos sus requests. El frontend NO necesita hacer nada especial — el badge de estado en las tablas es suficiente indicación visual.

---

## 8. Manejo de errores

| Status | Causa | Mensaje sugerido |
|--------|-------|-----------------|
| 403 | No es SUPERADMIN | Redirect a `/` |
| 404 | Org/user no encontrado | "No encontrado" |
| 400 | Body vacío en PATCH | "Nada que actualizar" |

---

## 9. Activar el primer SUPERADMIN

Esto lo hace el dueño del sistema directamente en la DB, una sola vez:

```sql
UPDATE tenant_users
SET role = 'SUPERADMIN'
WHERE email = 'tu@email.com';
```

Después de esto, hacer logout + login para que el JWT se renueve con el nuevo rol.

---

## 10. Resumen de lo que NO hay que implementar

- No hay paginación server-side obligatoria para v1 (los límites por defecto `limit=100` son suficientes)
- No hay búsqueda full-text (filtrar en el cliente es suficiente para v1)
- No hay tab de "Actividad" complejo — la lista de orgs con `user_count` es suficiente
- No hay gráficos ni dashboards de métricas
- No hay exportación a CSV
