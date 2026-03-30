# Multi-Tenancy Frontend — Phase 10

## Archivos nuevos / modificados

| Archivo | Qué hace |
|---|---|
| `lib/supabase.ts` | Cliente Supabase singleton. Exporta `supabase`, `getAccessToken()`, `IS_AUTH_ENABLED` |
| `lib/api.ts` | `authFetch` centralizado + 14 nuevos endpoints admin/me. Reemplaza `fetch` en toda la app |
| `lib/types.ts` | Nuevos tipos: `MeResponse`, `ServerConversation`, `OdooConfigItem`, `OrgUser`, `Invitation`, `watermark` en `Message` |
| `hooks/use-auth.tsx` | Context + Provider Supabase auth (login/register/logout/session restore) |
| `hooks/use-session.tsx` | Context + Provider para datos de `GET /me` (user, org, subscription, slots) |
| `hooks/use-limit-reached-modal.tsx` | Context para modal 402 — escucha evento `auth:limit_reached` |
| `components/ui/limit-reached-modal.tsx` | Modal global para 402, no crashea la app |
| `components/auth/auth-guard.tsx` | HOC que redirige a `/login` si no hay usuario autenticado |
| `app/[locale]/layout.tsx` | Stack de providers actualizado (Auth → Session → LimitReachedModal) |
| `app/[locale]/page.tsx` | Nueva lógica de redirect: no user → /login, sin org → /onboarding, con org → /chat |
| `app/[locale]/login/page.tsx` | Página de login con email + password. Incluye bypass visible en DEV MODE |
| `app/[locale]/register/page.tsx` | Página de registro. Redirige a /onboarding al completar |
| `app/[locale]/onboarding/page.tsx` | Wizard 2 pasos: crear organización + agregar conexión Odoo |
| `app/[locale]/invite/page.tsx` | Aceptar invitación por token. Maneja 404 / 409 / 410 |
| `app/[locale]/settings/page.tsx` | Panel admin completo con secciones por rol (Org, Conexiones, Usuarios, Invitaciones) |
| `components/chat/sidebar.tsx` | Carga conversaciones desde `GET /me/conversations`, paginación, botón logout |
| `hooks/use-chat.ts` | Evento SSE `watermark`, manejo de 401/402 en el stream |
| `messages/*.json` | 5 idiomas: namespaces `Auth`, `Onboarding`, `LimitReachedModal`, `Invite` + claves `admin` en Settings |

---

## Variables de entorno

```bash
# Autenticación Supabase (si no están → DEV MODE, sin auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Backend (opcional, default: http://localhost:8000)
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Sin `NEXT_PUBLIC_SUPABASE_URL` → la app funciona exactamente igual que antes (DEV MODE):
- No se envía `Authorization` header en ningún request
- La página de login muestra un bypass "Continuar sin login"
- El sidebar no muestra logout
- El backend recibe requests sin token y aplica su propio DEV MODE

---

## DEV MODE — comportamiento sin Supabase

| Condición | Comportamiento |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` no seteado | `IS_AUTH_ENABLED = false` en `lib/supabase.ts` |
| `useAuth()` | Devuelve stub user `dev@localhost`, `isLoading = false` |
| `authFetch()` | No agrega `Authorization` header |
| Login page | Muestra bypass "Continuar sin login" en lugar del formulario |
| Register page | Muestra link al login |
| Logout | No aparece en el sidebar |
| `/me` endpoint | El backend devuelve stub de usuario dev si `SUPABASE_JWT_SECRET` no está seteado |

---

## Flujo de auth (cuando Supabase está configurado)

```
App carga
  → AuthProvider.getSession() → restaura sesión si existe
  → SessionProvider → llama GET /me
    → si org === null → redirect /onboarding
    → si org existe → redirect /chat (o página actual)

Login
  → supabase.auth.signInWithPassword()
  → session.reload() → GET /me
  → redirect según estado de org

Logout
  → supabase.auth.signOut()
  → limpiar estado
  → redirect /login

401 en cualquier request
  → authFetch dispara evento "auth:unauthorized"
  → AuthProvider escucha → signOut + redirect /login

402 en cualquier request
  → authFetch dispara evento "auth:limit_reached"
  → LimitReachedModalProvider escucha → abre modal
  → App NO crashea
```

---

## Bootstrap de sesión — GET /me

`SessionProvider` llama `GET /me` al montar (cuando hay usuario autenticado).

```typescript
// Forma de la respuesta (lib/types.ts)
MeResponse {
  user:         MeUser         // id, email, role, is_free_license
  org:          MeOrg | null   // null → redirigir a /onboarding
  subscription: MeSubscription | null
  slots_used:   SlotsUsed      // { paid, free }
}
```

Acceso en cualquier componente:
```typescript
const { meData, isLoading, isError, reload } = useSession();
```

Si `GET /me` falla → `isError = true` → mostrar pantalla con botón "Reintentar" (pendiente en UI, ver abajo).

---

## Onboarding — usuario sin org

Si `meData.org === null`, `SessionProvider` redirige automáticamente a `/onboarding`.

**Paso 1 — Crear organización**
- `POST /admin/orgs` con `{ name, slug, type: "SOLITARY" }`
- Slug se auto-genera: `slugify(name) + "-" + randomSuffix(4)` para evitar conflictos 409
- Al completar → `session.reload()` → avanza al paso 2

**Paso 2 — Agregar conexión Odoo**
- `POST /admin/orgs/{org_id}/configs` con `{ label, url, db_name, api_key }`
- Incluye botón "Probar conexión" antes de guardar
- Al completar → redirect `/chat`

---

## Sidebar — conversaciones del servidor

Cuando auth está activo, el sidebar carga `GET /me/conversations?limit=50&offset=0` en vez de usar la lista local.

- Agrupa por fecha: hoy / ayer / últimos 7 días / anteriores
- Fallback a lista local si la request falla o en DEV MODE
- Paginación con botón "Cargar más" (offset += 50)
- `title === null` → muestra "Nueva conversación"

---

## SSE — evento watermark

El primer evento del stream `/chat/{id}/stream` es:
```json
{ "type": "watermark", "show": true | false }
```

Comportamiento en `hooks/use-chat.ts`:
- `show: true` → `message.watermark = true` → renderiza "Powered by The Odoo Agent" al pie de la respuesta
- `show: false` → `message.watermark = false` → no muestra nada
- Evento no llega (red lenta, timeout) → `message.watermark = undefined` → safe default = mostrar

Renderizado en `components/chat/chat-messages.tsx`:
```tsx
{message.watermark !== false && message.content && (
  <p className="mt-2 text-[10px] text-muted-foreground/50 select-none">
    Powered by The Odoo Agent
  </p>
)}
```

---

## Panel de Settings — secciones por rol

| Sección | Rol mínimo | Descripción |
|---|---|---|
| Mi Organización | IMPLEMENTER | Ver y editar nombre/slug, plan, slots usados |
| Conexiones Odoo | IMPLEMENTER | Listar, crear y eliminar configs. Incluye test de conexión |
| Usuarios | ADMIN | Cambiar rol, marcar free/paid, remover usuarios |
| Invitaciones | IMPLEMENTER | Crear invitación, ver link generado con botón copiar, listar pendientes |

Los usuarios `CLIENT_USER` solo ven el formulario de conexión estándar + inspector.

---

## Página /invite?token=xxx

1. Sin sesión → guarda token en `sessionStorage` → redirige a `/login?next=/invite?token=xxx`
2. Con sesión → `POST /admin/invitations/accept { token }`
3. Según respuesta:
   - `200` → `session.reload()` → redirect `/chat`
   - `404` → "Invitación no encontrada"
   - `409` → "Esta invitación ya fue usada"
   - `410` → "Esta invitación expiró"

---

## Manejo de errores implementado

| Error | Comportamiento |
|---|---|
| `401` en cualquier request | `authFetch` → evento → `AuthProvider` → signOut + redirect `/login` |
| `401` en SSE stream | Cierra stream → mismo evento → redirect `/login` |
| `402` en cualquier request | `authFetch` → evento → modal "Límite alcanzado" (no crashea) |
| `402` en SSE stream | Cierra stream → mismo modal |
| `org: null` en `/me` | `SessionProvider` → redirect `/onboarding` |
| SSE evento desconocido | `continue` (ya existía) |
| watermark event no llega | `message.watermark = undefined` → safe default = mostrar |
| `/me` falla | `isError = true` en SessionProvider (pantalla de error con retry: pendiente) |

---

## Endpoints de API implementados

### GET /me
```typescript
fetchMe(): Promise<FetchMeResult>
```

### GET /me/conversations
```typescript
fetchMyConversations(limit: number, offset: number): Promise<FetchConversationsResult>
```

### Admin — Orgs
```typescript
createOrg(name, slug, type)
updateOrg(orgId, payload)
```

### Admin — Odoo Configs
```typescript
listOdooConfigs(orgId)
createOdooConfig(orgId, payload)
updateOdooConfig(orgId, configId, payload)
deleteOdooConfig(orgId, configId)
```

### Admin — Usuarios
```typescript
listOrgUsers(orgId)
updateOrgUser(orgId, userId, payload)  // role, is_free_license
removeOrgUser(orgId, userId)
```

### Admin — Invitaciones
```typescript
createInvitation(orgId, email, role)
listInvitations(orgId)
acceptInvitation(token)
```

---

## Lo que falta hacer cuando llegue Supabase

### 1. Crear el proyecto en Supabase
- Ir a [supabase.com](https://supabase.com) → New project
- Copiar: `Project URL` y `anon public key`
- Crear `.env.local` con:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
  ```

### 2. Configurar Auth en Supabase dashboard
- **Authentication → Providers:** habilitar Email/Password
- **Authentication → URL Configuration:**
  - Site URL: `https://tu-dominio.com` (o `http://localhost:3000` en dev)
  - Redirect URLs: agregar `https://tu-dominio.com/**`
- **Authentication → Email Templates:** personalizar si se quiere (opcional)

### 3. Copiar el JWT Secret al backend
El backend necesita `SUPABASE_JWT_SECRET` para validar los tokens:
- Supabase dashboard → **Settings → API → JWT Secret**
- Agregar al `.env` del backend:
  ```bash
  SUPABASE_JWT_SECRET=<jwt-secret-de-supabase>
  ```
- Sin esto el backend sigue en DEV MODE (acepta todo sin validar)

### 4. Verificar el primer login completo
Flujo a testear:
1. Ir a `/login` → registrar usuario nuevo
2. Verificar que `GET /me` se llama con `Authorization: Bearer <token>`
3. Backend debe crear el usuario en `tenant_users` (upsert automático)
4. Como `org === null` → redirige a `/onboarding`
5. Crear org → agregar conexión Odoo → llegar al chat

### 5. (Opcional) Magic Link en lugar de password
Si se prefiere magic link (sin contraseña):
- Habilitar en Supabase: **Auth → Providers → Email → Magic Link**
- Actualizar `hooks/use-auth.tsx`:
  ```typescript
  // Reemplazar signInWithPassword por:
  await supabase.auth.signInWithOtp({ email })
  ```
- Agregar una página de "revisá tu email" después del submit

### 6. (Opcional) OAuth providers (Google, GitHub, etc.)
- Habilitar en Supabase dashboard → **Auth → Providers**
- Agregar botón en login page:
  ```typescript
  await supabase.auth.signInWithOAuth({ provider: 'google' })
  ```

### 7. Cuando llegue Stripe
- Los webhooks de Stripe ya están implementados en el backend
- El frontend no necesita cambios para Stripe básico
- Lo único que puede necesitar frontend: botón "Upgrade" que redirige al Stripe Checkout
  - Crear endpoint en backend: `POST /billing/checkout` → devuelve `checkout_url`
  - Frontend: `window.location.href = checkout_url`
- Los cambios de plan llegan al backend por webhook y se reflejan en `GET /me`

---

## Notas de arquitectura

**chat_id no cambia:** el frontend sigue generando los IDs de chat igual que antes. El backend internamente los prefija con `{org_id}:` para aislamiento, pero eso es transparente para el front.

**OdooConfig local vs backend:** el `OdooConfigProvider` (localStorage) sigue funcionando para compatibilidad. Las conexiones guardadas en el panel admin (`/admin/orgs/{id}/configs`) son independientes y son las que usa el backend para multi-tenant. En el onboarding, se guarda en el backend (no en localStorage).

**Roles en frontend:** el frontend oculta opciones según `meData.user.role`, pero el backend rechaza con `403` de todas formas. La visibilidad en UI es solo UX, no seguridad.
