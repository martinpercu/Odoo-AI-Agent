# Plan de implementación frontend — Onboarding & Tenant refactor

> Plan de acción para implementar [`frontend-implementation-admin-onboarding.md`](./frontend-implementation-admin-onboarding.md).
> Contrato de backend en [`backend-requirements.md`](./backend-requirements.md).
> Estética: manda `design-system/handoff/DESIGN_SYSTEM.md` (v2.1). Comportamiento: manda la spec.
>
> **Decisión de arquitectura (acordada):** rutas dedicadas. La gestión de instancias sale del tab de Settings
> a `/app/instances` (lista) + `/app/instances/[id]` (detalle). Credenciales propias en `/app/settings/odoo`.

---

## 1. Diagnóstico — qué hay vs qué pide la spec

### Lo que ya existe y se reaprovecha
- **Modelo separado instancia/credencial ya existe** conceptualmente: `OdooConfigSummary` (instancia) + `UserOdooCredential`/`OdooCredentialSummary` (connection), enriquecido en `OdooConfigSummaryWithCreds`.
- `useOdooConfig()` ya hace el switch de instancia con credenciales y el auto-switch.
- `lib/api.ts` ya tiene ~70% de la superficie: configs CRUD, credenciales propias y admin, invitaciones + pending-credentials, cancelar invitación, test-connection, inspect.
- Componentes reutilizables: `connection-form.tsx`, `user-credentials-section.tsx`, `admin-user-credentials-modal.tsx`, `admin-invitation-credentials-modal.tsx`, `password-input`, `DocNum`, `instance-inspector`.
- `/invite/[token]` ya hace preview + registro + accept.

### Lo que falta (el gap real)
1. **Máquina de estados de la Connection** (`unset|active|invalid`) no existe como tal — hoy es binario "tiene/no tiene creds". Es el corazón de la spec (§4).
2. **Metadata de instancia** (`company_name`, `odoo_version`) no se captura ni se muestra. El onboarding no confirma con datos reales de Odoo.
3. **Pantalla de detalle de instancia con sus usuarios** no existe — los usuarios se ven org-wide en un tab de Settings.
4. **InstanceHealthSummary** (contadores activos/sin-creds/pendientes/seats por instancia) no existe.
5. **Invitación con seat + modo (`invite_only`/`precreds`) + instancia destino** — hoy el modo es implícito y el seat/instancia no se eligen explícitamente en un solo modal.
6. **ClientUserHome** por estado de credencial (§6.6) y **ConnectionInvalidBanner** (§6.8) no existen.
7. **Validación real con company/version** y mapeo de `error_code` por campo (§7) no está.
8. **Helper "cómo generar tu API key en Odoo"** (`OdooApiKeyHelper`) no existe.
9. El **onboarding** es un único form plano de 4 campos, no los **dos bloques rotulados** de la spec (§6.1).

### Mapeo "de dónde sale → a dónde va"
| Hoy (en `/settings`) | Destino |
|---|---|
| Tab Instances → `OdooConfigsSection` (alta) + `SavedConfigsSection` | `/app/instances` (lista + alta) |
| Tab Users → `UsersSection` + `InviteFormSection` + `SentInvitationsSection` | `/app/instances/[id]` (usuarios de esa instancia + invitar) |
| Tab Org → `OrgSection` | queda en `/app/settings` (org edit) |
| Tab Org → `UserCredentialsSection` (client_user) | `/app/settings/odoo` (CredentialForm self-service) |
| Tab Feedback | queda en `/app/settings` |
| `onboarding/page.tsx` (form plano) | reescribir a 2 bloques + validación real |

---

## 2. Componentes a construir (spec §8) y su estado

| Componente | Acción | Notas de diseño (DS v2.1) |
|---|---|---|
| `CredentialForm` | **Nuevo** (extrae lo común de `user-credentials-section` + modales admin) | URL+DB read-only heredados; user+apikey editables; valida al guardar; reusado por admin (pre-carga) y self-service |
| `OdooApiKeyHelper` | **Nuevo** | Plegable "Ajustes → Seguridad de la cuenta → modo dev → nueva API key". `font-technical` sólo para nombres técnicos en vista Builder |
| `ConnectionValidator` | **Nuevo** (hook `useConnectionValidator`) | Llama validate; expone `{ ok, company_name, odoo_version }` o `field_errors` por `error_code` |
| `InstanceCreateForm` | **Nuevo** (sustituye `ConnectionForm`) | Dos bloques rotulados; creds obligatorias en la 1ª instancia, opcionales de la 2ª; dispara validate |
| `InstanceSwitcher` | **Refactor** del switch que hoy vive en `user-menu` | marca activa; marca "configurar para chatear" (no rota, no oculta); permite alta |
| `InstanceList` / `InstanceCard` | **Nuevo** | card por instancia con company, version, `InstanceHealthSummary` |
| `InstanceHeader` | **Nuevo** | nombre + version + estado conexión propia + acceso a chat |
| `InstanceHealthSummary` | **Nuevo** | contadores activos/sin-creds/pendientes + seats. Estado nunca sólo por color (DS §14): icono + texto |
| `UserList` / `UserRow` | **Refactor** de `UsersSection` | email + odoo_username + badge de estado + seat + acciones contextuales por estado |
| `InviteUserModal` | **Refactor** de `InviteFormSection` | email + seat + modo (`invite_only` default / `precreds`); valida seat |
| `AcceptInvitation` | **Refactor** de `/invite/[token]` | email read-only + set password; precreds→activo, invite_only→home |
| `ClientUserHome` | **Nuevo** | empresa asignada + estado de creds + CTA por estado (§6.6) |
| `ConnectionInvalidBanner` | **Nuevo** | aviso conexión caída + CTA re-cargar (§6.8) |
| `StatusBadge` (connection) | **Nuevo** | pill `unset|active|invalid` — Builder mono-uppercase / Client sentence-case (DS §8) |

---

## 3. Capa de tipos y API (Fase 0)

### `lib/types.ts`
- `ConnectionStatus2 = "unset" | "active" | "invalid"` (el `ConnectionStatus` actual es para el form UI; usar nombre distinto, p.ej. `OdooConnectionStatus`).
- Extender `OdooConfigSummary`: `company_name?`, `odoo_version?`, `my_connection_status?: OdooConnectionStatus | null`, `counts?: { active; unset; invalid; pending }`, `seats?: {...}`.
- `OdooCredentialSummary` / `OdooConfigSummaryWithCreds`: sumar `connection_status?: OdooConnectionStatus`, `last_validated_at?: string | null`.
- `InstanceDetail` (nuevo): instancia + `users: InstanceUser[]` + `invitations: InstanceInvitation[]`.
- `InstanceUser` (nuevo): `user_id, email, role, seat_type, connection_status, odoo_username|null, last_validated_at`.
- Extender `Invitation`: `instance_id`, `seat_type: "paid"|"free"`, `mode: "invite_only"|"precreds"`, `status: "pending"|"accepted"|"cancelled"`.
- `ValidateResult` (nuevo): `{ ok: true; company_name; odoo_version } | { ok: false; error_code: "unreachable"|"db_not_found"|"auth_failed"; field_errors? }`.

### `lib/api.ts`
- `validateConnection({ url, db_name, odoo_username?, odoo_apikey? })` → `ValidateResult` (extiende `testOdooConnection`).
- `fetchInstanceDetail(orgId, configId)` → `InstanceDetail` (nuevo endpoint §2.4 del back).
- `saveMyCredential` / `saveUserCredential`: tipar la respuesta con `status` + `last_validated_at`, y propagar `error_code` cuando la validación del back falla.
- `revalidateConnection(configId)` (self) / variante admin.
- `createOdooConfig`: aceptar `{ odoo_username?, odoo_apikey? }` opcionales.
- `createInvitation`: aceptar `{ instance_id, seat_type, mode, prefilled_username?, prefilled_apikey? }`.

> Fase 0 es plumbing puro; puede landear detrás de los nuevos campos del back (si el back aún no los manda, los campos llegan `undefined` y la UI degrada con `?.`).

---

## 4. Fases de implementación (orden sugerido)

Cada fase es un PR chico y testeable. Respetar: tokens de diseño (no hex), `useAudienceT` para copy Builder/Client, `useIconSize`, `rounded-card`/`rounded-btn`, `h-btn-*`, motion `0.15 ease-out`. **Nunca exponer al Client nombres de modelo/endpoint/instancia** (DS regla de oro #2).

### Fase 0 — Tipos + API + primitivos compartidos
- `lib/types.ts` + `lib/api.ts` (sección 3).
- `CredentialForm` + `OdooApiKeyHelper` + `useConnectionValidator` + `StatusBadge`.
- Sin cambio visual de rutas todavía. Es la base de todo lo demás.

### Fase 1 — Onboarding (§6.1)
- Reescribir `onboarding/page.tsx` con **dos bloques rotulados**: *Datos de la instancia* (url, db — obligatorios) y *Tus credenciales* (user, apikey — obligatorios en la 1ª).
- **Org `name`/`slug`: se auto-generan del email** (decidido) — no se piden en el form. Mantener el comportamiento actual de `POST /me/onboarding`.
- Validación real (`validateConnection`) que muestra `company_name` + `odoo_version` como confirmación antes de persistir.
- Al éxito → **redirigir directo al chat** de esa instancia (no a una pantalla de "cuenta creada"). CTA "invitá a tu equipo" recién **después** de la primera interacción.
- Mapear `error_code` → mensaje accionable por campo.

### Fase 2 — Rutas de instancias (lista + detalle) ⭐ núcleo del refactor
- `app/[locale]/(app)/instances/page.tsx` → `InstanceList`: cards con company/version + `InstanceHealthSummary`. `InstanceCreateForm` (alta) sólo si `org.type==='partner'`; `solitary` ve banner upgrade.
- `app/[locale]/(app)/instances/[id]/page.tsx` → `InstanceHeader` + `InstanceHealthSummary` + `UserList`/`UserRow` + botón que abre `InviteUserModal`.
- Nav: agregar entrada "Instancias" al sidebar (sólo ADMIN). Sacar `OdooConfigsSection`/`SavedConfigsSection` del tab Instances de Settings (dejar redirect o link).
- Estados de UI (spec §10): loading de validación sin congelar; empty (org sin instancias → CTA crear; instancia sin usuarios → CTA invitar); error mapeado.

### Fase 3 — Máquina de estados visible (§4, §6.7, §6.8)
- `StatusBadge` en cada `UserRow`: `Invitado` / `Registrado sin creds` / `Activo` / `Creds inválidas`. Los dos **bloqueantes** (`unset`, `invalid`) siempre con su acción de salida visible.
- Acción "Cargar creds" en fila `unset` → abre `CredentialForm` apuntando a la Connection de ese usuario (admin pre-carga §6.7).
- `ConnectionInvalidBanner` reutilizable.

### Fase 4 — Home del client_user + self-service (§6.5, §6.6)
- `app/[locale]/(app)/settings/odoo/page.tsx` (o sección) → `CredentialForm` self-service con `OdooApiKeyHelper`. URL+DB read-only.
- `ClientUserHome`: encabezado "Tu empresa: {company_name}"; tarjeta por estado:
  - `unset` → "No tenés credenciales para operar {company}" + CTA cargar.
  - `active` → acceso directo al chat.
  - `invalid` → `ConnectionInvalidBanner`.
- apikey nunca se re-muestra: "configurada el {fecha}" + reemplazar.

### Fase 5 — Invitación con seat + modo (§6.3, §6.4)
- `InviteUserModal`: `email` + `seat_type` (paid/free, valida disponibilidad) + bifurcación de modo (`invite_only` default / `precreds` con user+apikey). Instancia destino = la de la ruta detalle.
- **Email que ya tiene cuenta → bloquear (decidido):** al recibir `409 email_has_account` de `createInvitation`, mostrar un mensaje claro al admin ("Ese email ya tiene una cuenta") y no crear la invitación. Sumar la clave i18n correspondiente.
- `AcceptInvitation` (`/invite/[token]`): email read-only + sólo password. precreds→activo directo; invite_only→home `unset`. Manejar token expirado/usado/cancelado.

### Fase 6 — Switcher en chat + instancia N + editar/revalidar (§6.2, §6.9)
- `InstanceSwitcher`: instancia sin Connection activa aparece como **"configurar para chatear"** (no rota, no oculta); al elegirla, ofrece `CredentialForm` (reusa §6.5).
- Crear instancia N con creds opcionales (copy explícito de la spec §6.2).
- Editar `url`/`db_name`: advertir impacto multi-usuario + forzar revalidación. Botón "revalidar mi conexión" (`revalidateConnection`).

### Fase 7 — i18n + design pass + decomisionar Settings viejo
- Agregar claves nuevas a los **11 locales** (`es/en/fr/de/pt/it/hi/gu/ta/kn/mr`). Copy audience-aware en **ambos** `Builder.<ns>` y `Client.<ns>` para es/en/fr/de/pt/it/hi/gu/ta/kn/mr.
- Correr la skill `design-refactor` sobre las pantallas nuevas (tokens, mono sólo en doc#, botones Client ≥44px, contraste).
- Quitar de `settings/page.tsx` las secciones migradas (Instances/Users) dejando sólo Org + Feedback + link a las rutas nuevas.

---

## 5. Riesgos / dependencias

- **Bloqueo por backend:** Fases 1–6 dependen de los cambios de `backend-requirements.md` (sobre todo el ciclo `status` de Connection, metadata de instancia, y el detalle `/configs/{id}`). Sin esos campos la UI degrada pero no cumple la spec. Coordinar back-first por fase.
- **i18n de 11 locales + audience-aware:** cada string nuevo se multiplica ×11 y, si es audience-aware, ×2 roots. Centralizar claves antes de empezar a traducir.
- **Decomisionar el Settings actual** sin romper deep-links existentes: dejar redirects de `/settings?tab=instances` → `/instances`.
- **Decisiones de producto cerradas:** org name/slug auto-generados; invitar email existente → bloquear (`409 email_has_account`); validación sin creds → sólo chequear que la instancia existe. (Ver `backend-requirements.md` §5.) **Sigue abierta:** reenvío de invitación a un `pending` (idempotencia) — resolver al implementar Fase 5.
- **`useOdooConfig`** ya tiene lógica de auto-switch y filtrado por credenciales — al introducir `connection_status` hay que asegurar que el auto-switch contemple `unset`/`invalid` (no auto-seleccionar una instancia sin Connection activa).

---

## 6. Criterios de aceptación (de la spec §12 — qué validar al final)

- [ ] Admin completa alta + 1ª instancia con validación real y aterriza en el chat con una consulta funcionando.
- [ ] Admin agrega 2ª instancia **sin** sus credenciales y puede invitarle usuarios.
- [ ] Esa instancia aparece como "configurar para chatear" en el switcher.
- [ ] Invitar permite elegir seat y modo (default `invite_only`), respetando límites.
- [ ] Invitado acepta con email precargado y sólo define contraseña.
- [ ] `invite_only` aterriza en home "registrado sin creds" con el helper de apikey a la vista.
- [ ] `precreds` entra directo a "activo".
- [ ] Admin puede pre-cargar credenciales de un usuario en limbo.
- [ ] apikey vencida marca **sólo** a ese usuario como "inválida" sin afectar a los demás.
- [ ] La apikey nunca se devuelve al front; se muestra estado + fecha.
- [ ] El detalle de instancia muestra contadores y los estados bloqueantes de un vistazo.
</content>



