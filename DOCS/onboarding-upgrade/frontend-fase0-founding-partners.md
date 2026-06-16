# Brief de actualización Frontend — Fase 0: Founding Partners (Beta)

**Producto:** TheOdooAgent
**Tipo de trabajo:** **incremental (delta)**. El front ya tiene implementado el flujo completo del lead frío (modal demo, header demo, nudge de reframe, conectar Odoo, onboarding de instancia, invites y panel de gestión). Este brief **agrega** la capa de Fase 0 (Founding Partners / beta) **encima** de eso. No rehace lo existente.
**Baseline de referencia:** `frontend-flow-completo-lead-frio.md`.

> No define estética. Reutilizar el design-system existente (componentes, iconos, tokens). Cuando digo "card", "badge", "modal", usar los primitivos que ya hay.

---

## 0. Qué es la Fase 0 (contexto para el dev)

Estamos en **beta, founder-led**. No hay cobro automatizado todavía. Todo el que se registra **ahora** entra como **founding partner**: usa gratis (su uso y el de los clientes que trae a testear), y se le bloqueará una tarifa de fundador cuando se gradúe a la fase de escala. El tono es **invitación, no venta**: primero en su mercado, su feedback define el roadmap, cupos contados.

Números de pricing (para el copy):
- **Ancla / precio de lista:** $7 / usuario.
- **Tarifa de fundador:** $1 / usuario, **para siempre** (86% off), se activa al salir de beta.
- **Durante la beta:** $0.

---

## 1. Badge "Founding Partner" (transversal, SOLO modo Builder)

- Agregar un **badge discreto** que diga **"Founding Partner"** (NO "Beta" — "beta" suena a inacabado; "Founding Partner" comunica estatus y pertenencia, que es lo que queremos para alguien que apuesta su relación con clientes).
- **Regla no-negociable de white-label:** el badge vive **únicamente en el modo Builder** (lo ve el implementador/admin en su panel). **Nunca** se renderiza en el modo Client. El cliente final solo ve la marca del partner; un "Founding Partner" del lado del cliente rompería el white-label y revelaría que hay otro producto detrás de la marca del partner. El implementador no tiene que "ocultarlo" manualmente: por arquitectura no aparece del lado del cliente. El sistema ya distingue Builder vs Client, así que el gating va por ahí.
- Ubicación dentro del Builder (junto al logo o en el menú): a criterio del design-system.
- Tono general de los copys nuevos: invitación + estatus + escasez + honestidad. No usar lenguaje de "comprá / suscribite".

---

## 2. Copy de registro (NUEVO — entregable puntual)

Se inserta en el momento de registro existente (Surface E, cuando el lead viene de "Conectá tu Odoo" / "Empezá gratis" / el header demo). **No es una pantalla nueva**: es el encabezado de bienvenida que enmarca el formulario de registro que ya existe.

**Copy (listo):**
- Título: **Sos de los primeros — bienvenido al programa Founding Partners**
- Línea 1: *Estás entrando como founding partner de TheOdooAgent. Durante la beta es todo gratis: tu uso y el de los clientes que traigas a probar.*
- Línea 2: *Tu feedback define el roadmap, y cuando salgamos de beta te queda una **tarifa de fundador bloqueada para siempre**: $1/usuario (86% off del precio de lista de $7).*
- Microcopy de cierre, opcional: *Cupos contados.*
- Debajo: el formulario existente (email + contraseña).

> Mantener el formulario limpio: el framing va arriba, breve; no inflar el form.

---

## 3. Pantalla de Pricing (NUEVO)

Accesible desde el menú / settings. Muestra **3 cards**:

### Card A — Founding Partner (activa, es el plan del usuario)
- Badge: **Tu plan** / "Founding Partner"
- Precio destacado: **$0 durante la beta**
- Debajo: **$1 / usuario — para siempre** · *86% off de fundador*
- Ancla tachada: ~~$7 / usuario (precio de lista)~~
- Bullets:
  - Acceso gratis en beta (tu uso + los clientes que traigas a testear)
  - Tarifa de fundador bloqueada de por vida
  - Tu feedback define el roadmap
  - Primero en tu mercado ofreciendo IA sobre Odoo
- Línea honesta al pie: *$1 apenas cubre lo que cuesta operarlo — pagás (casi) mi costo, no mi precio.*
- **Sin CTA de compra:** el usuario ya está adentro como founder. Estado visual de "activo / es tu plan".

### Card B — Estándar (griseada / deshabilitada)
- Título: **Estándar**
- Precio: **$7 / usuario / mes**
- Estado: **Próximamente** (se activa al salir de beta)
- Click en la card → abre el **modal informativo** (§3.1).

### Card C — Enterprise (griseada / deshabilitada)
- Título: **Enterprise**
- Texto: **Más de 20 asientos · precio a medida**
- Estado: **Próximamente**
- Click en la card → abre el **modal informativo** (§3.1).

### 3.1 Modal informativo (cards B y C)
Las cards B y C son **puramente informativas** (comunican a dónde va el producto y, con el ancla de $7, dan sensación de herramienta seria). **No capturan interés ni guardan nada.**
- Título: **Todavía no — estamos en beta**
- Texto: *Por ahora TheOdooAgent está abierto solo para founding partners. Los planes Estándar y Enterprise se activan cuando salgamos de beta. Ya estás adentro como founding partner, así que disfrutá la beta gratis.*
- CTA único: **Entendido** (cierra el modal).
- Sin ningún POST ni registro de datos.

---

## 4. Solitary → Partner al conectar la instancia (CAMBIO sobre Surface G)

**El gate para invitar clientes NO es el registro: es haber conectado y validado la instancia propia de Odoo.** Secuencia definida:

1. El partner se registra → la org nace como **`solitary`**. Todavía no puede invitar; primero tiene que probar lo suyo.
2. Conecta y valida su propia instancia de Odoo con su usuario (URL + DB + su user + apikey). Ya probó que su conexión anda.
3. **En ese momento la org pasa a `partner`** (founding). Recién ahí aparecen los **seats disponibles** y la capacidad de **invitar clientes** + el **panel de gestión**.

- Mientras es `solitary`: comportamiento de org única (la sección de equipo muestra lo que ya define el baseline; sin invites). No mostrar "invitar clientes".
- Al transicionar a `partner`: se habilitan invites y gestión de inmediato, sin gestos extra. La transición la decide/marca el **backend** al validar la instancia; el front lee el tipo de org (`solitary` / `partner`) y muestra en consecuencia.
- La **cantidad de seats** la define el backend (Martin la setea ahí); el front solo la lee y la respeta. En beta puede venir alta.

> Razón de diseño: no le habilitás traer clientes a alguien que todavía no probó que su propia conexión funciona. Y encaja con el programa founding ("traé uno o dos clientes a testear") sin esconder la acción detrás de un gesto: apenas conectó lo suyo, invitar clientes está a la vista.

El mecanismo de invitación, los estados del ciclo de vida (invitado → registrado sin creds → activo → inválidas) y la lectura del límite de asientos del backend **no cambian**.

---

## 5. Indicador de estado de cobro en beta (CAMBIO sobre Surface I)

El indicador render-only debe reflejar la beta:
- Estado: *Founding Partner · gratis en beta*
- Nota: *Cuando salgamos de beta, tu tarifa de fundador queda bloqueada: $1/usuario para siempre.*
- No mostrar conteos de cobro como si se estuviera facturando. El "vas a empezar a pagar cuando un cliente se active" del baseline **no aplica en beta** (en beta es $0); se reactiva al graduar.
- La fuente de verdad sigue siendo el backend (`GET /billing/state`).

---

## 6. Contratos de datos (nuevos / cambios)

- `GET /billing/state` — extender para devolver el contexto de beta/fundador, ej: `{ phase: 'beta_founder', price_anchor: 7, founder_rate: 1, beta_free: true, founder_rate_locked: bool, ... }`. El front renderiza; no calcula.
- Tipo de org (`solitary` / `partner`) disponible en el contexto de la org para gatear invites y panel de gestión (la transición la marca el backend al validar la instancia).
- **No se agrega** ningún endpoint de captura de interés (cards B/C son informativas).
- El resto de los contratos del baseline no cambian.

---

## 7. Restricciones

- No tocar tokens, paleta, tipografía ni iconos del design-system. Reutilizar componentes existentes.
- No agregar dependencias.
- Copy: **"Odoo 14 a 19"** donde aplique (no "20").
- Accesibilidad: cards griseadas con estado `disabled`/`aria-disabled` pero clickeables para abrir el modal; foco y Escape en el modal; contraste del estado deshabilitado legible.
- Responsive: las 3 cards envuelven/apilan bien en mobile.
- No duplicar el framing en exceso: el badge "Founding Partner" (solo Builder) + el encabezado de registro + la card de pricing alcanzan. No sembrar "Founding Partner" ni "beta" en cada pantalla, y nunca en modo Client.

---

## 8. Criterios de aceptación

- [ ] Badge dice **"Founding Partner"** (no "Beta"), visible solo en modo Builder y **nunca** en modo Client (white-label intacto).
- [ ] El registro muestra el encabezado de founding partner (copy §2) sobre el formulario existente.
- [ ] Pantalla de pricing con 3 cards: A activa (con $0 beta / $1 fundador / ancla $7 tachada), B y C griseadas.
- [ ] Click en B o C abre el **modal informativo** (§3.1); CTA único "Entendido"; sin captura de datos.
- [ ] Org nace `solitary`; al conectar y validar la instancia propia pasa a `partner` y recién ahí aparecen seats + invitar clientes + panel de gestión.
- [ ] Indicador de cobro refleja "founding partner · gratis en beta" y la promesa de tarifa bloqueada; sin lenguaje de facturación activa.
- [ ] `GET /billing/state` y el tipo de org consumidos para todo el estado de fase/precio/gating (nada hardcodeado).
- [ ] Copy en "14 a 19".
- [ ] Accesibilidad de cards deshabilitadas-clickeables y del modal cubierta.

---

## 9. Decisiones (resueltas)

1. **Cards B/C:** puramente informativas, sin captura de interés.
2. **Tipo de org:** nace `solitary`; pasa a `partner` (founding) al conectar y validar la instancia propia. Ese es el gate de invites. Cantidad de seats la define el backend.
3. **Badge:** dice "Founding Partner" (no "Beta"), solo en modo Builder, blindado del modo Client por la capa de white-label existente.

---

## 10. Fuera de alcance

- Mecánica de cobro / Stripe (en investigación aparte).
- Estética / design tokens.
- Pricing automatizado y campañas (se encienden al graduar, no ahora).
