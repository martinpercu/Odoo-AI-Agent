# Email de Invitación — Contrato para Frontend

> **Contexto:** las invitaciones son un sistema **propio** del backend (tabla `invitations`),
> NO usan el invite nativo de Supabase. **El backend NO envía el email** — solo devuelve el
> token. El front es responsable de construir y enviar el email de invitación.
> **Idiomas:** `es`, `en`, `fr`, `de`, `pt`, `it`. Default → `en`.

---

## Dónde encaja en el flujo

```
ADMIN                        FRONT (este doc)            INVITADO
  │                                                          │
  ├─ POST /admin/orgs/{org_id}/invitations ──▶ { token, ... }
  │                          │
  │              construye el accept_url + email localizado
  │              y lo ENVÍA (Resend / SES / SMTP propio) ───▶│
  │                                                1. signup Supabase
  │                                                2. POST /invitations/accept { token }
```

El backend ya cubre el resto (validación de token, slots, rol, migración de credenciales).
Ver el flujo completo en el código: [`admin.py` → `create_invitation`](../../src/api/admin.py#L875)
y [`accept_invitation`](../../src/api/admin.py#L990).

---

## Datos disponibles para armar el email

La respuesta de `POST /admin/orgs/{org_id}/invitations` (status 201):

```json
{
  "status": "ok",
  "invitation": {
    "id": "uuid",
    "email": "invitado@ejemplo.com",
    "role": "CLIENT_USER",          // o "ADMIN"
    "token": "abc123...",            // ⬅️ para construir el accept_url
    "expires_at": "2026-06-17T12:00:00+00:00",
    "accept_url": "/invitations/accept"
  }
}
```

Para el **nombre de la organización** (no viene en esa respuesta), usá el `org_name` que ya
tenés en el contexto del admin, o el endpoint público
[`GET /admin/invitations/{token}/preview`](../../src/api/admin.py#L909) que devuelve
`{ email, role, org_name, expires_at }`.

---

## Construcción del accept URL

```ts
const acceptUrl = `${APP_BASE_URL}/invitations/accept?token=${invitation.token}`
// ej: https://app.tudominio.com/invitations/accept?token=abc123...
```

La página `/invitations/accept` del front debe:
1. Leer el `token` del query param.
2. Llamar a `GET /admin/invitations/{token}/preview` para pre-llenar el email y mostrar la org.
3. Hacer el **signup en Supabase** (el invitado crea su contraseña).
4. Con el JWT ya logueado, llamar a `POST /invitations/accept` con `{ token }`.

> ⚠️ El orden importa: primero signup en Supabase, después `/invitations/accept`. Ver
> [frontend del reset, Paso 0](../password-recovery/frontend-instructions.md) para el patrón
> de guardar `user_metadata.lang` en ese signup.

---

## Cómo elegir el idioma del email

El invitado **todavía no existe**, así que no tiene `user_metadata.lang`. El idioma lo decide
el front al momento de invitar. Estrategia recomendada (en orden):

1. **Selector explícito en el form de invitación** — el admin elige el idioma del invitado.
   Es lo más correcto (el admin suele saber el idioma del cliente). **Recomendado.**
2. **Fallback al idioma de la UI del admin** que está invitando.
3. **Default `en`** si no hay ninguno.

```ts
const lang = invitedLang ?? adminUiLang ?? "en"   // "es"|"en"|"fr"|"de"|"pt"|"it"
```

---

## Copy del email por idioma

Placeholders: `{org_name}`, `{accept_url}`, `{role_label}`, `{expiry_date}` (formateá la fecha
en el locale correspondiente).

| lang | Subject | Heading | Body | CTA | Expiry | Ignore |
|------|---------|---------|------|-----|--------|--------|
| **es** | Te invitaron a {org_name} | Te invitaron a {org_name} | Te sumaron como **{role_label}**. Hacé clic para crear tu cuenta y empezar. | Aceptar invitación | La invitación vence el {expiry_date}. | Si no esperabas esto, ignorá este email. |
| **en** | You've been invited to {org_name} | You've been invited to {org_name} | You've been added as **{role_label}**. Click to create your account and get started. | Accept invitation | This invitation expires on {expiry_date}. | If you weren't expecting this, ignore this email. |
| **fr** | Vous avez été invité à {org_name} | Vous avez été invité à {org_name} | Vous avez été ajouté en tant que **{role_label}**. Cliquez pour créer votre compte et commencer. | Accepter l'invitation | Cette invitation expire le {expiry_date}. | Si vous ne vous y attendiez pas, ignorez cet email. |
| **de** | Du wurdest zu {org_name} eingeladen | Du wurdest zu {org_name} eingeladen | Du wurdest als **{role_label}** hinzugefügt. Klicke, um dein Konto zu erstellen und loszulegen. | Einladung annehmen | Diese Einladung läuft am {expiry_date} ab. | Falls du das nicht erwartet hast, ignoriere diese E-Mail. |
| **pt** | Você foi convidado para {org_name} | Você foi convidado para {org_name} | Você foi adicionado como **{role_label}**. Clique para criar sua conta e começar. | Aceitar convite | Este convite expira em {expiry_date}. | Se você não esperava isto, ignore este email. |
| **it** | Sei stato invitato in {org_name} | Sei stato invitato in {org_name} | Sei stato aggiunto come **{role_label}**. Clicca per creare il tuo account e iniziare. | Accetta l'invito | Questo invito scade il {expiry_date}. | Se non te lo aspettavi, ignora questa email. |

### Etiquetas de rol (`role_label`)

| role | es | en | fr | de | pt | it |
|------|----|----|----|----|----|----|
| `ADMIN` | Administrador | Administrator | Administrateur | Administrator | Administrador | Amministratore |
| `CLIENT_USER` | Usuario | User | Utilisateur | Benutzer | Usuário | Utente |

---

## Ejemplo de HTML (es)

```html
<h2>Te invitaron a {org_name}</h2>
<p>Te sumaron como <strong>Usuario</strong>. Hacé clic para crear tu cuenta y empezar:</p>
<p><a href="{accept_url}"
      style="display:inline-block;padding:12px 24px;background:#111;color:#fff;
             text-decoration:none;border-radius:6px">Aceptar invitación</a></p>
<p style="color:#666;font-size:13px">La invitación vence el {expiry_date}.</p>
<p style="color:#666;font-size:13px">Si no esperabas esto, ignorá este email.</p>
```

Replicá el mismo HTML cambiando los textos según la tabla de arriba.

---

## Checklist de implementación (front)

- [ ] Form de invitación con **selector de idioma** del invitado (es/en/fr/de/pt/it).
- [ ] Llamar a `POST /admin/orgs/{org_id}/invitations` y tomar el `token`.
- [ ] Construir `accept_url = {APP_BASE_URL}/invitations/accept?token={token}`.
- [ ] Enviar el email localizado vía el proveedor propio (Resend / SES / SMTP).
- [ ] Formatear `{expiry_date}` en el locale del idioma elegido.
- [ ] Página `/invitations/accept`: preview → signup Supabase (con `data.lang`) → `POST /invitations/accept`.
- [ ] Manejar errores del accept: `404` (token inválido), `409` (ya aceptada / sin slots), `410` (vencida).

---

## Errores del endpoint de aceptación

| Código | Significado | Qué mostrar |
|--------|-------------|-------------|
| `404` | Token inexistente / usuario no registrado en Supabase | "Invitación inválida. Pedí una nueva." |
| `409` | Ya aceptada **o** la org se quedó sin asientos | "Esta invitación ya fue usada o la organización está llena." |
| `410` | Invitación vencida | "La invitación venció. Pedí una nueva." |
| `401` | Sin JWT (no hizo signup primero) | Redirigir al signup antes de aceptar. |
