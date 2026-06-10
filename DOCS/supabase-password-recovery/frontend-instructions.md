# Recuperación de contraseña — Instrucciones para Frontend

> **Método:** Código OTP de 6 dígitos por email (Supabase nativo)
> **SDK:** `@supabase/supabase-js`
> **Backend:** No interviene. Todo el flujo es contra Supabase Auth directamente.

---

## Resumen del flujo (3 pasos)

```
┌─────────────────┐   1. Pedir código    ┌──────────────────┐
│ Pantalla A      │ ───────────────────▶ │ Supabase manda   │
│ "Olvidé mi pass"│   (ingresa email)    │ email con 6 díg. │
└─────────────────┘                      └──────────────────┘
        │
        ▼
┌─────────────────┐   2. Verificar       ┌──────────────────┐
│ Pantalla B      │ ───────────────────▶ │ Supabase valida  │
│ "Ingresá código"│   (código + pass)    │ y crea sesión    │
│  + nueva pass   │                      └──────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐   3. Listo           ┌──────────────────┐
│ Sesión activa   │ ───────────────────▶ │ Redirigir a app  │
│ con nuevo pass  │                      │ o forzar re-login│
└─────────────────┘
```

> ⚠️ **No se usa ningún endpoint de nuestro backend.** No llames a `/auth/...` en el back —
> no existe. Todo es `supabase.auth.*`.

---

## Paso 0 — Prerrequisito: idioma del usuario (`user_metadata.lang`)

El email de recuperación es **multilingüe**. El template de Supabase elige el idioma
leyendo `user_metadata.lang` del usuario. Para que cada usuario reciba el email en su
idioma, el front debe **guardar `lang` en el metadata**.

**Idiomas soportados por el template:** `es`, `en`, `fr`, `de`, `pt`, `it`.
Si `lang` **no está seteado**, el email cae a un fallback bilingüe **inglés + español**
(no se rompe nada). Por eso esto es "best-effort": ideal setearlo, pero no bloquea el reset.

**Dónde setearlo (una sola vez basta, idealmente en ambos lugares):**

```ts
// 1) En el signup — guardar el idioma elegido al registrarse
await supabase.auth.signUp({
  email,
  password,
  options: { data: { lang: currentLang } },   // "es" | "en" | "fr" | "de" | "pt" | "it"
})

// 2) Cuando el usuario cambia de idioma en la app — sincronizar el metadata
async function setUserLang(lang: string) {
  await supabase.auth.updateUser({ data: { lang } })
}
```

> El valor de `lang` debe ser uno de los 6 códigos soportados. Cualquier otro valor (o vacío)
> cae al fallback EN/ES — seguro, pero no localizado.

> ℹ️ Esto **no es bloqueante** para implementar el flujo de reset: si no se setea `lang`,
> el reset funciona igual con el email bilingüe. Pero conviene incluirlo para una buena UX.

---

## Paso 1 — Solicitar el código

Pantalla con un único input: **email**.

```ts
async function requestResetCode(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  // ⚠️ NO pasar { redirectTo } — eso es para el flujo de magic link, no para OTP.

  // Importante (anti-enumeración): mostrá SIEMPRE el mismo mensaje de éxito,
  // exista o no el email. Supabase no revela si el email está registrado.
  if (error) {
    // Solo errores reales de red/rate-limit; un email inexistente NO da error.
    if (error.status === 429) {
      showToast("Demasiados intentos. Esperá unos minutos.")
      return
    }
    console.error(error)
  }
  // Avanzar SIEMPRE a la Pantalla B:
  showToast("Si el email está registrado, te enviamos un código de 6 dígitos.")
  goTo("verify-code", { email })
}
```

**Notas:**
- Guardá el `email` en estado/URL para usarlo en el paso 2 (lo necesita `verifyOtp`).
- Mostrá un botón "Reenviar código" deshabilitado por ~30-60s (cooldown) para evitar 429.

---

## Paso 2 — Verificar el código y setear la nueva contraseña

Pantalla con tres inputs: **código (6 dígitos)**, **nueva contraseña**, **repetir contraseña**.

```ts
async function verifyCodeAndUpdatePassword(
  email: string,
  code: string,
  newPassword: string,
) {
  // 2.1 — Verificar el OTP. Si es válido, Supabase devuelve una sesión.
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,        // los 6 dígitos que ingresó el usuario
    type: "recovery",   // ⚠️ debe ser 'recovery'
  })

  if (verifyError) {
    // Código inválido o vencido.
    showError("El código es incorrecto o expiró. Pedí uno nuevo.")
    return
  }

  // En este punto hay una sesión activa (data.session). Ya se puede cambiar el password.

  // 2.2 — Actualizar la contraseña del usuario autenticado por el OTP.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    // Ej: contraseña demasiado corta / no cumple la política de Supabase.
    showError(updateError.message)
    return
  }

  showToast("¡Contraseña actualizada!")
  goTo("login-or-app")  // ver Paso 3
}
```

**Validaciones de UX antes de llamar a Supabase:**
- Código: exactamente 6 dígitos numéricos.
- Contraseña: longitud mínima que coincida con la política de Supabase (confirmar con backend).
- "Repetir contraseña" igual a "nueva contraseña".

---

## Paso 3 — Después del éxito

Tras `updateUser`, el usuario **ya queda logueado** (la sesión del OTP sigue activa). Dos opciones:

**Opción A (recomendada) — Forzar re-login:**
```ts
await supabase.auth.signOut()
goTo("/login")
showToast("Contraseña actualizada. Iniciá sesión con tu nueva contraseña.")
```
Más explícito y seguro: el usuario confirma que la nueva contraseña funciona.

**Opción B — Entrar directo a la app:**
```ts
goTo("/dashboard")  // la sesión ya es válida; el access_token funciona contra el back
```

> En ambos casos, el `access_token` resultante es un JWT normal de Supabase que nuestro
> backend valida automáticamente. No hay paso extra del lado del back.

---

## Manejo de errores

| Situación | Cómo detectarla | Qué mostrar |
|-----------|-----------------|-------------|
| Email inexistente | `resetPasswordForEmail` **no** da error | Mensaje genérico de "si existe, te enviamos un código" |
| Rate limit | `error.status === 429` | "Demasiados intentos, esperá unos minutos" + cooldown |
| Código incorrecto/vencido | `verifyOtp` devuelve `error` | "Código incorrecto o expirado, pedí uno nuevo" |
| Contraseña inválida | `updateUser` devuelve `error` | `error.message` (longitud/política) |
| Sin conexión | excepción de red | "Error de conexión, reintentá" |

---

## Checklist de implementación

- [ ] **Paso 0:** guardar `user_metadata.lang` en signup (`signUp({ options: { data: { lang }}})`).
- [ ] **Paso 0:** sincronizar `lang` al cambiar de idioma (`updateUser({ data: { lang }})`).
- [ ] Pantalla A: input de email + llamada a `resetPasswordForEmail` (sin `redirectTo`).
- [ ] Mensaje anti-enumeración (mismo texto exista o no el email).
- [ ] Pantalla B: input de código (6 dígitos) + nueva contraseña + repetir.
- [ ] `verifyOtp({ email, token, type: 'recovery' })`.
- [ ] `updateUser({ password })` tras verificación exitosa.
- [ ] Botón "Reenviar código" con cooldown (~30-60s).
- [ ] Manejo de 429 y de código inválido/vencido.
- [ ] Paso 3: `signOut()` + redirect a login (Opción A) o entrar directo (Opción B).
- [ ] Smoke test: reset completo → login con nueva pass → `GET /me` responde 200.

---

## Preguntas frecuentes

**¿Necesito `redirectTo`?** No. Eso es del flujo magic link. Para OTP se omite.

**¿El código se reenvía solo?** No. Si el usuario lo pide de nuevo, volvés a llamar a
`resetPasswordForEmail` (genera un código nuevo, el anterior queda inválido).

**¿Cuánto dura el código?** 10 minutos (configurado en Supabase). Mostralo en el texto.

**¿El backend necesita algo de mi parte?** No. Una vez que `updateUser` responde OK, el
`access_token` de la sesión ya funciona contra todos los endpoints autenticados.

**¿En qué idioma llega el email?** En el idioma de `user_metadata.lang` (ver Paso 0).
Idiomas soportados: `es`, `en`, `fr`, `de`, `pt`, `it`. Si no está seteado, llega bilingüe
EN/ES. El reset funciona igual sin `lang`, pero la UX mejora seteándolo.

**¿`lang` afecta solo el reset?** El mismo `user_metadata.lang` sirve para cualquier otro
email transaccional de Supabase (confirmación de signup, invitaciones, magic link) si más
adelante se localizan esos templates con el mismo patrón condicional.
