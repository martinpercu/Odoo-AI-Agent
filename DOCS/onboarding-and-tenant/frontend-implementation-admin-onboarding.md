# Spec de implementación frontend — Onboarding y gestión del Admin/Tenant

**Producto:** TheOdooAgent
**Alcance:** experiencia del Admin/Tenant (alta, creación de instancias, gestión de usuarios) y los puntos de contacto del `client_user` con sus credenciales.
**Stack de referencia:** Next.js, Supabase (auth + JWT), Stripe (planes/seats), backend que habla con Odoo vía XML-RPC y cifra credenciales en reposo.

> Este documento define **comportamiento, estados, flujos y contratos de datos**. No define tratamiento visual: el sistema de diseño existente manda en todo lo estético (layout, colores, tipografía, componentes base).

---

## 1. Concepto que ordena todo el modelo

La palabra "instancia" agrupa dos cosas que el modelo de datos debe mantener **separadas**:

- **Instancia** = `URL + base de datos`. Es la empresa. Es **una** y se comparte entre todos sus usuarios.
- **Conexión** = `usuario de Odoo + API key`. Es **personal** de cada persona contra esa instancia. Hay **N por instancia**.

Cuando el admin hace su alta inicial de 4 campos, está creando **dos registros**: la instancia (URL+DB) y *su propia* conexión (user+apikey). Toda la UI cuelga de no mezclar estos dos objetos.

Consecuencia directa: el **estado del ciclo de vida del usuario vive en la Conexión**, no en el usuario ni en la instancia.

---

## 2. Modelo de datos (entidades y relaciones)

```
Organization 1 ──── N OdooInstance
Organization 1 ──── N Membership ──── 1 User
OdooInstance 1 ──── N Connection ──── 1 User
OdooInstance 1 ──── N Invitation
```

### Organization
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `slug` | string | único |
| `type` | enum | `partner` \| `solitary` |

- `partner`: puede tener **múltiples** instancias y gestión de equipo completa.
- `solitary`: una sola instancia; la pantalla de usuarios muestra banner de upgrade en lugar de herramientas de equipo.

### User
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | sincronizado con Supabase auth |
| `email` | string | |
| `is_superadmin` | bool | flag de plataforma |

### Membership (User ↔ Organization)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `user_id` | uuid | |
| `role` | enum | `admin` \| `client_user` |
| `seat_type` | enum | `paid` \| `free` |

### OdooInstance (la parte compartida: URL + DB)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `url` | string | |
| `db_name` | string | |
| `company_name` | string | devuelto por Odoo al validar |
| `odoo_version` | string | devuelto por Odoo al validar (14–17) |
| `created_by` | uuid | |

### Connection (la parte personal: user Odoo + apikey)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `instance_id` | uuid | |
| `user_id` | uuid | |
| `odoo_username` | string \| null | |
| `odoo_apikey` | encrypted \| null | **write-only**; nunca se devuelve al front |
| `status` | enum | `unset` \| `active` \| `invalid` |
| `last_validated_at` | timestamp \| null | |

- Existe un `Connection` por (instancia, usuario). Puede existir con `status = unset` (creado al asignar el usuario, sin credenciales todavía) → ese es el estado "registrado sin creds".
- Un `client_user` tiene **exactamente una** `Connection` (una sola instancia). Un `admin` puede tener varias (una por cada instancia donde chatea).

### Invitation
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `org_id` | uuid | |
| `instance_id` | uuid | a qué instancia queda asignado el invitado |
| `email` | string | |
| `seat_type` | enum | `paid` \| `free` |
| `mode` | enum | `invite_only` \| `precreds` |
| `prefilled_username` | string \| null | solo si `mode = precreds` |
| `prefilled_apikey` | encrypted \| null | solo si `mode = precreds`; write-only |
| `status` | enum | `pending` \| `accepted` \| `cancelled` |
| `token` | string | para el link |
| `expires_at` | timestamp | |

---

## 3. Roles y permisos

| Rol | Puede |
|---|---|
| **SuperAdmin** | Control global de plataforma (fuera del alcance principal de este doc). |
| **Admin** | Crear/editar instancias de su org, invitar/gestionar usuarios, asignar seats, pre-cargar credenciales, cargar sus propias credenciales por instancia, chatear con cualquier instancia donde tenga conexión activa. |
| **Client User** | Cargar/editar **sus** credenciales de Odoo para **su** instancia, chatear con esa instancia. No ve configuración de instancia ni herramientas de admin. |

Diferencia `partner` vs `solitary`: en `solitary`, la sección de usuarios/equipo se reemplaza por un banner de upgrade y no se permite crear instancias adicionales.

---

## 4. Máquina de estados del `client_user`

El estado vive en `Connection.status` (más la existencia o no de `User`/`Invitation`).

| Estado | Condición | Quién lo dispara hacia adelante | Acción que habilita la UI |
|---|---|---|---|
| **Invitado (sin cuenta)** | `Invitation.status = pending`, sin `User` | el invitado acepta y pone contraseña | reenviar / cancelar invitación |
| **Registrado sin creds** | `User` existe + `Connection.status = unset` | admin pre-carga creds **o** usuario las carga | cargar creds (admin) / avisar al usuario |
| **Activo** | `Connection.status = active` | — | editar creds, cambiar seat |
| **Creds inválidas** | `Connection.status = invalid` | re-cargar / re-validar apikey | re-cargar creds |

Transiciones:

- `Invitado → Registrado`: el usuario abre el link, ve el email precargado, define contraseña. Si la invitación era `precreds`, al aceptar se aplican las credenciales y puede saltar directo a `Activo`.
- `Registrado → Activo`: se cargan `odoo_username + odoo_apikey` y validan contra Odoo. **Camino por defecto:** el propio usuario (la apikey la tiene él). **Atajo:** el admin las pre-carga.
- `Activo → Inválidas`: nadie lo dispara; la apikey se revoca o vence en Odoo. El sistema lo detecta cuando una consulta falla por auth y marca `status = invalid`.
- `Inválidas → Activo`: el usuario (o el admin) re-carga la apikey y revalida.

Los dos estados **bloqueantes** que la UI debe hacer evidentes son `Registrado sin creds` e `Inválidas`.

---

## 5. Mapa de pantallas / rutas

| Ruta (referencial) | Quién | Propósito |
|---|---|---|
| `/signup`, `/login` | todos | auth Supabase |
| `/onboarding` | admin nuevo | crear org (nombre, slug) + primera instancia (4 campos) |
| `/invite/[token]` | invitado | aceptar invitación → set password |
| `/app/chat` | admin, client_user | chat, con switcher de instancias |
| `/app/instances` | admin | listado de instancias |
| `/app/instances/[id]` | admin | gestión de la instancia + sus usuarios |
| `/app/settings/odoo` | admin (sus creds), client_user (sus creds) | cargar/editar las credenciales propias por instancia |

---

## 6. Flujos detallados

### 6.1 Onboarding del admin — primera instancia (forzada y completa)

1. Signup (email + password) → sesión.
2. Crear organización: `name`, `slug` (validar slug único y formato).
3. Crear primera instancia. **Formulario en dos bloques rotulados** (mismos 4 inputs, agrupados):
   - *Datos de la instancia*: `url`, `db_name` → **obligatorios**.
   - *Tus credenciales para esta instancia*: `odoo_username`, `odoo_apikey` → en la **primera** instancia, obligatorios (el admin tiene que poder probar el sistema).
4. Al enviar: llamar a **validación de conexión** (ver 7). Si OK, mostrar `company_name` + `odoo_version` como confirmación.
5. Persistir `OdooInstance` (URL+DB) + `Connection` del admin (user+apikey, `status = active`).
6. Redirigir **directo al chat** de esa instancia. El primer éxito debe ser una consulta real, no un mensaje de "cuenta creada".
7. Recién después de la primera interacción exitosa, surfacear el CTA "invitar a tu equipo".

### 6.2 Crear instancia N (credenciales propias opcionales)

Igual que 6.1 pero:
- El bloque *Tus credenciales* es **opcional**, con copy explícito: "Podés cargarlas ahora o después. Si no las cargás, no vas a poder chatear con esta instancia, pero sí podés invitarle usuarios."
- Si se omiten: persistir solo `OdooInstance`. El admin **no** tiene `Connection` activa ahí.
- Consecuencia en UI: en el switcher de chat, esa instancia aparece como **"configurar para chatear"** (no rota, no oculta). Al elegirla, se ofrece cargar sus credenciales (reusa el flujo 6.5).
- Solo disponible si `Organization.type = partner`. En `solitary`, ocultar/deshabilitar y mostrar upgrade.

### 6.3 Invitar usuario

1. El admin abre "Invitar usuario" en una instancia.
2. Inputs: `email`, `seat_type` (`paid` \| `free`), y la **bifurcación de modo**:
   - `invite_only` (**default**): el usuario cargará su propia apikey.
   - `precreds`: el admin ingresa `odoo_username + odoo_apikey` ahora (atajo).
3. Validar seat disponible para el `seat_type` elegido. Si no hay seats pagos libres y se eligió `paid` → bloquear con prompt de upgrade (no romper el flujo).
4. Crear `Invitation` (`status = pending`) + enviar email con link `/invite/[token]`.
5. El usuario aparece de inmediato en la lista de la instancia en estado **Invitado (pendiente)**, consumiendo su seat.

### 6.4 Aceptar invitación (signup precargado)

1. El invitado abre `/invite/[token]`.
2. La pantalla muestra el `email` **precargado y no editable** y pide únicamente **contraseña**.
3. Al confirmar: crear `User` (Supabase), `Membership` (rol `client_user`, `seat_type` de la invitación), y `Connection` para la instancia de la invitación.
   - Si la invitación era `precreds`: aplicar credenciales, validar, dejar `Connection.status = active` → el usuario entra **Activo**.
   - Si era `invite_only`: `Connection.status = unset` → el usuario entra **Registrado sin creds** y se lo manda a su home (6.6).
4. Marcar `Invitation.status = accepted`.
5. Manejar token expirado/cancelado/ya usado con pantallas de error claras.

### 6.5 Carga de credenciales propias (admin o client_user — self-service)

Mismo componente para ambos (`CredentialForm`):
- `url` y `db_name` se **heredan** de la instancia y se muestran **solo lectura**.
- Inputs editables: `odoo_username`, `odoo_apikey`.
- Incluir un **helper plegable "cómo generar tu API key en Odoo"** (Ajustes → Seguridad de la cuenta → modo desarrollador → nueva API key). Reduce soporte de forma directa.
- Al guardar: validar contra Odoo (ver 7). Si OK → `status = active`. Si falla auth → no guardar como activo; mostrar error específico.
- La apikey nunca se re-muestra: una vez cargada, exhibir "configurada el {fecha}" + opción de reemplazar.

### 6.6 Home del client_user

- Encabezado: "Tu empresa: {company_name}".
- Si `Connection.status = unset`: una sola tarjeta — "No tenés credenciales para operar {company_name}" + CTA que abre `CredentialForm` (6.5).
- Si `active`: acceso directo al chat.
- Si `invalid`: banner — "Tu conexión a {company_name} dejó de funcionar. Recargá tu API key." + CTA a re-cargar.

### 6.7 Admin pre-carga credenciales de un usuario en limbo

Desde la fila del usuario en estado **Registrado sin creds**, acción "Cargar creds" → abre `CredentialForm` apuntando a la `Connection` de ese usuario. Mismo guardado/validación que 6.5. Al éxito, el usuario pasa a **Activo**.

### 6.8 Detección de credenciales inválidas y recuperación

- Cuando una consulta a Odoo falla por autenticación, el back marca esa `Connection.status = invalid`.
- El front debe reflejarlo: badge "Creds inválidas" en el panel del admin y banner en el home del usuario afectado.
- **Aislamiento:** una conexión inválida bloquea **solo a ese usuario**. Los demás usuarios de la misma instancia siguen operando (los permisos son por conexión).
- Recuperación: re-cargar apikey (6.5) → revalidar → `active`.

### 6.9 Editar / revalidar instancia

- Editar `url` / `db_name` exige re-validación. Advertir que cambiarlos afecta a **todos** los usuarios de la instancia.
- Acción "revalidar mi conexión" disponible on-demand; actualiza `last_validated_at`.

---

## 7. Contratos de datos esperados del backend

Describe el comportamiento que el front necesita (nombres referenciales).

- **`POST /instances/validate`** — body `{ url, db_name, odoo_username?, odoo_apikey? }` → `{ ok: true, company_name, odoo_version }` **o** `{ ok: false, error_code, field_errors }`. `error_code` debe distinguir al menos: `unreachable`, `db_not_found`, `auth_failed`. El front mapea cada uno a un mensaje accionable por campo.
- **`POST /instances`** — crea instancia (URL+DB) y, opcionalmente, la conexión propia del creador.
- **`GET /instances`** — listado. Cada item incluye: `company_name`, `odoo_version`, **estado de la conexión propia** (`active` / `unset` / `invalid`), y contadores por instancia: `active`, `unset`, `invalid`, `pending`, y uso de seats (`paid_used/paid_total`).
- **`GET /instances/:id`** — detalle + `users[]` con: `email`, `connection_status`, `odoo_username` (o null), `seat_type`, y para invitados `invitation_status`.
- **`POST /instances/:id/invitations`** — body `{ email, seat_type, mode, prefilled_username?, prefilled_apikey? }`.
- **`POST /invitations/:token/accept`** — body `{ password }`.
- **`PUT /connections/:id`** — body `{ odoo_username, odoo_apikey }`. Usado por self-service **y** por pre-carga del admin. Valida antes de marcar activo.
- **`POST /connections/:id/revalidate`** — revalida y actualiza estado.
- **`DELETE /invitations/:id`** — cancela invitación pendiente; **libera el seat de inmediato**.
- **`PATCH /memberships/:id`** — body `{ seat_type }`; alterna pago/gratis respetando límites del plan.

Regla transversal: **la apikey es write-only**. Ningún endpoint la devuelve. El front solo recibe estado + fecha de validación.

---

## 8. Componentes (responsabilidad, sin diseño)

| Componente | Responsabilidad |
|---|---|
| `InstanceSwitcher` | listar instancias; marcar la activa; marcar las que requieren "configurar para chatear"; permitir alta |
| `InstanceCreateForm` | dos bloques (instancia / credenciales); credenciales obligatorias en la 1ª instancia, opcionales de la 2ª en adelante; dispara validación |
| `ConnectionValidator` | llama a `/instances/validate`; expone OK (company+version) o errores por campo |
| `InstanceHeader` | nombre, versión, estado de la conexión propia, acceso a chat |
| `InstanceHealthSummary` | contadores (activos / sin creds / pendientes / seats) |
| `UserList` / `UserRow` | email + usuario de Odoo, badge de estado, seat, acciones contextuales por estado |
| `InviteUserModal` | email + seat + modo (`invite_only` default / `precreds`); valida seat disponible |
| `CredentialForm` | URL+DB heredados read-only; user+apikey editables; helper de apikey de Odoo; valida al guardar; reutilizado por admin (pre-carga) y usuario (self-service) |
| `OdooApiKeyHelper` | instructivo plegable de generación de apikey en Odoo |
| `AcceptInvitation` | email precargado read-only + set password |
| `ClientUserHome` | empresa asignada + estado de credenciales + CTA según estado |
| `ConnectionInvalidBanner` | aviso de conexión caída + CTA a re-cargar |

---

## 9. Validaciones y reglas de negocio

- `slug` de org: único, formato URL-safe.
- `url`: formato válido; no asumir alcanzabilidad hasta validar contra el back.
- Validación de conexión obligatoria antes de marcar cualquier `Connection` como `active`.
- 1ª instancia del admin: credenciales propias obligatorias. 2ª+: opcionales.
- `client_user`: pertenece a **una sola** instancia (no permitir asignarlo a más).
- Seats: no exceder el límite del plan por tipo; cancelar invitación pendiente libera el seat al instante; togglear pago↔gratis respeta límites.
- apikey: write-only; al reemplazar, revalidar.
- Editar URL/DB de una instancia: advertir impacto multi-usuario y forzar revalidación.

---

## 10. Estados de UI (comportamiento, no estética)

Para cada vista, contemplar:
- **Loading:** validación de conexión (puede tardar; mostrar progreso, no congelar el form).
- **Empty:** org sin instancias (admin) → CTA crear primera; instancia sin usuarios → CTA invitar.
- **Error:** errores de validación de Odoo mapeados por `error_code` (unreachable / db_not_found / auth_failed) con mensaje accionable; token de invitación expirado/usado/cancelado.
- **Bloqueado:** estados `unset` e `invalid` siempre con su acción de salida visible.

---

## 11. Edge cases a resolver

- Admin crea instancia y nunca carga sus creds, solo la usan client_users → instancia válida; admin ve "configurar para chatear", no error.
- apikey revocada en mitad de una sesión → primera consulta falla por auth → `invalid` + banner; el resto de los usuarios de la instancia no se ven afectados.
- Invitar un email que ya tiene cuenta → **decisión de producto a confirmar**: ¿se bloquea, se reutiliza la cuenta, o se crea membership en otra org? Definir antes de implementar.
- Reenvío de invitación a un `pending` → no duplicar invitación ni seat.
- `solitary` que intenta agregar segunda instancia → bloquear + upgrade.

---

## 12. Criterios de aceptación (checklist)

- [ ] El admin completa alta + primera instancia con validación real y aterriza en el chat con una consulta funcionando.
- [ ] El admin agrega una 2ª instancia **sin** cargar sus credenciales y puede invitarle usuarios.
- [ ] Esa instancia aparece como "configurar para chatear" en el switcher.
- [ ] Invitar permite elegir seat y modo (default `invite_only`), respetando límites de seats.
- [ ] El invitado acepta con email precargado y solo define contraseña.
- [ ] Un `invite_only` aterriza en su home en estado "registrado sin creds" y puede cargar su apikey con el helper de Odoo a la vista.
- [ ] Un `precreds` entra directo a "activo".
- [ ] El admin puede pre-cargar credenciales de un usuario en limbo.
- [ ] Una apikey vencida marca solo a ese usuario como "inválida" y ofrece re-cargar, sin afectar a los demás.
- [ ] La apikey nunca se devuelve al front; se muestra estado + fecha.
- [ ] El panel de instancia muestra contadores y los estados bloqueantes de un vistazo.

---

## 13. Fuera de alcance (por ahora)

- Usuario "general API Bot" compartido por instancia (atajo futuro; hoy las credenciales son por persona).
- Internals del chat / pipeline del agente.
- UI profunda de billing / Stripe (solo se referencia para límites de seats).
- Panel cross-org del SuperAdmin.
