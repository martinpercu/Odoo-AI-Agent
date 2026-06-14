# Spec de implementación frontend — Flujo completo del lead frío

**Producto:** TheOdooAgent
**Alcance:** todo el recorrido del front, desde que un implementador prospectado en frío entra a la demo hasta que opera como partner gestionando instancias de cliente y usuarios.
**Stack de referencia:** Next.js, Supabase (auth + JWT), backend que habla con Odoo vía XML-RPC y cifra credenciales en reposo, Stripe (la mecánica de cobro está fuera del alcance de este doc — ver más abajo).

> Este documento consolida y **reemplaza** el brief anterior de onboarding del admin para el front. Define **comportamiento, estados, flujos y contratos de datos**. NO define estética: el design-system existente manda en layout, colores, tipografía, iconos y componentes base. Cuando digo "cartel", "fila con icono", "chip", etc., usar los primitivos del design-system.

---

## 0. Concepto que ordena todo el modelo de datos

"Instancia" son dos cosas que el modelo debe mantener **separadas**:

- **Instancia** = `URL + base de datos`. Es la empresa. Es **una**, compartida entre todos sus usuarios.
- **Conexión** = `usuario de Odoo + API key`. Es **personal** de cada persona contra esa instancia. **N por instancia**.

El estado del ciclo de vida de un usuario vive en la **Conexión**, no en el usuario ni en la instancia.

---

## 1. El recorrido (mapa de superficies)

| Etapa | Estado del lead | Superficie | Objetivo único |
|---|---|---|---|
| Llegada | anónimo, escéptico | Modal demo forzado (A) | que **toque** una consulta |
| Juego | anónimo, enganchándose | Chat demo + header demo (B) | convicción por repetición |
| Reframe | convencido del producto | Nudge partner (C) | instalar el caso de reventa |
| Referencia | curioso | Panel "¿Qué es?" (D) | explicar a fondo, a demanda |
| Conversión | dispuesto | Registro + conectar Odoo (E) | verlo sobre SUS datos |
| Setup propio | registrado | Onboarding 1ª instancia (F) | 1 instancia + su credencial |
| Activación partner | comprometido | Invites + panel de gestión (G/H) | 1ª instancia de cliente + 1er client_user |

Principio rector: **desbloqueo progresivo de capacidad**. Nada de multi-instancia/invites hasta que el lead estira la mano hacia eso. Mantener simple lo temprano.

---

## 2. Estados globales del lead (máquina de estados de alto nivel)

```
anónimo_demo → registrado → con_instancia_propia → partner_con_clientes
```

- **anónimo_demo:** sin cuenta, chateando contra la instancia Odoo de demostración.
- **registrado:** creó cuenta (vía "conectar tu Odoo" o el link del header demo). Habilita configurar **1** instancia + su credencial.
- **con_instancia_propia:** conectó y validó su propio Odoo (sandbox o real). Puede chatear sobre sus datos.
- **partner_con_clientes:** activó el sistema de invitaciones; gestiona instancias de cliente y client_users.

El front lee este estado del backend; no lo infiere solo.

---

## 3. Ciclo de vida del client_user (vive en `Connection.status`)

| Estado | Condición | Avanza cuando | Acción que habilita la UI |
|---|---|---|---|
| **Invitado (sin cuenta)** | `Invitation.status = pending`, sin User | el invitado acepta + pone contraseña | reenviar / cancelar |
| **Registrado sin creds** | User existe + `Connection.status = unset` | se cargan user+apikey (admin o usuario) | cargar creds / avisar |
| **Activo** | `Connection.status = active` | — | editar creds, cambiar seat |
| **Inválidas** | `Connection.status = invalid` | re-cargar apikey | re-cargar creds |

`Registrado sin creds` e `Inválidas` son los **bloqueantes**: la UI debe hacerlos evidentes.

> Relevante para el cobro futuro: la unidad facturable será el client_user en estado **`active`** (excluye al implementador y a los invitados sin creds). El front debe poder mostrar ese conteo. La mecánica de cobro es del backend/Stripe (fuera de alcance acá).

---

## 4. Surface A — Modal demo forzado (primera vez)

- Aparece **una sola vez** por defecto; check "No mostrar de nuevo" (si lo desmarca, vuelve a salir).
- **No bloquear con copy largo.** El héroe son los botones de consulta de ejemplo.
- Contenido (copy listo):
  - Título: **Estás probando TheOdooAgent**
  - Línea: *IA que consulta y opera tu Odoo en lenguaje natural. Esto es una demo en vivo sobre datos de ejemplo — preguntá lo que quieras.*
  - Filas (icono + etiqueta corta):
    - *Preguntá en tu idioma: ventas, facturas, stock*
    - *No inventa cifras: las calcula el sistema, no el modelo*
    - *Anda en cualquier Odoo: **14 a 19** y Community*  ← **CORRECCIÓN: NO "20". Odoo 20 no existe aún.**
  - Bloque "Probá esto" (botones que disparan la consulta al agente apuntando a la instancia demo):
    - `¿Cuántas facturas vencidas hay este mes?`
    - `Top 5 clientes por ingresos`
    - `¿Hay stock del producto X?`
  - CTAs:
    - **Empezá a probar** → cierra el modal, queda en la pantalla demo (sin cuenta).
    - **Conectá tu propio Odoo (gratis)** → abre el flujo de registro + credenciales (Surface E).
  - Links al pie: **¿Qué es esto?** → abre panel lateral (D). **Hecho por Martin**.
- Comportamiento de los botones de ejemplo: al tocarlos, envían esa consulta al agente (instancia demo) y cierran el modal para mostrar la respuesta en el chat.

---

## 5. Surface B — Header de modo demo (persistente en demo)

- Barra fina, siempre visible mientras el lead está en modo demo.
- Copy: *🟡 Modo Demo — estás chateando con datos ficticios de una empresa distribuidora · **Registrate para conectar tu Odoo***
- La parte "Registrate para conectar tu Odoo" es **clickeable** y dispara el registro (crea la cuenta) → luego Surface E.
- Es el puente permanente de conversión: no interrumpe, siempre a un clic.

---

## 6. Surface C — Nudge de reframe a partner (aha #2)

La pieza nueva. Convierte "qué herramienta linda" en "esto lo puedo revender".

**Disparador:** por **evento, no por tiempo**. Aparece tras la **segunda respuesta exitosa** del agente en modo demo (dos consultas que devolvieron datos). No usar timer desde la primera consulta — debe llegar *después* del aha, no antes.

**Comportamiento:**
- Baja con una animación suave desde el header y se acomoda **justo debajo** del header demo (B).
- **No es permanente.** Tras mostrarse, el lead puede **minimizarlo** → colapsa a una pastilla ("Para implementadores →") que vive en/junto al header y se reexpande con un clic. Objetivo: una sola barra de chrome, chat que respira, ángulo partner siempre a un toque.
- **No es modal.** No debe bloquear el chat.

**Copy (listo):**
- Eyebrow: *PARA IMPLEMENTADORES DE ODOO*
- Título: **Esto que estás probando, lo revendés con tu marca.**
- Línea: *Conectalo al Odoo de tus clientes, con tu identidad. **Gratis hasta que un cliente tuyo lo use.***
- CTA primario: **Empezá gratis →** (lleva a registro / Surface E)
- CTA secundario (link): **Cómo funciona para partners** (abre panel D en su sección de implementador)

**Estado a recordar:** una vez que el lead lo minimiza o actúa, no volver a animarlo en la misma sesión (no ser denso). Persistir esa preferencia como con el modal A.

---

## 7. Surface D — Panel lateral "¿Qué es TheOdooAgent?"

- Panel lateral derecho, abierto desde el botón persistente "¿Qué es TheOdooAgent?" y desde los links de A y C.
- **Contenido y copy:** reutilizar el brief `claude-code-brief-modal-explicativo.md` (estructura compactada, orden implementador-first, FAQ con divulgación progresiva, "14 a 19", FAQ de privacidad como TODO de Martin, FAQ de white-label).
- Rol en el flujo: superficie de **referencia** ("entendé todo"), complementaria al modal A (acción) y al header B (puente). Mantener claims consistentes entre las tres superficies, todos a **14–19**.

---

## 8. Surface E — Registro + conectar Odoo propio

1. Disparado por: "Conectá tu propio Odoo" (A), "Registrate…" (B), "Empezá gratis" (C).
2. Si no hay cuenta: registro (email + contraseña) → crea cuenta → estado `registrado`.
3. Abre el formulario de instancia + credencial, en **dos bloques rotulados**:
   - *Datos de la instancia*: `url`, `db_name` (obligatorios). Define la empresa.
   - *Tus credenciales para esta instancia*: `odoo_username`, `odoo_apikey` (obligatorios en esta, su 1ª instancia).
4. Nudge de copy: sugerir *"empezá con tu propio Odoo o un sandbox"* — bajar el riesgo de la primera conexión real.
5. Incluir el **helper plegable "cómo generar tu API key en Odoo"** (Ajustes → Seguridad de la cuenta → modo desarrollador → nueva API key). Punto típico de traba.
6. Al enviar: validar conexión (ver §12). Si OK, mostrar `company_name` + `odoo_version` como confirmación; persistir `OdooInstance` + `Connection` del usuario (`status = active`).
7. Redirigir al chat sobre su instancia. El éxito es **una consulta real sobre sus datos**, no "cuenta creada".

---

## 9. Surface F — Onboarding de instancia propia

- Tras E, el usuario es admin de su org con **1 instancia** y su credencial. Editable siempre (puede cambiar de sandbox a real, etc.).
- La credencial propia es obligatoria en la 1ª instancia (tiene que poder probar). De la 2ª en adelante (si llega a tener más) es opcional — instancia que arma solo para clientes puede no tener su credencial; en el switcher de chat aparece como **"configurar para chatear"**, nunca rota ni oculta.
- `Organization.type = solitary` mientras no active reventa; pasa a `partner` cuando habilita invites (ver G).

---

## 10. Surface G — Activación partner: invitaciones e instancias de cliente

Se **desbloquea cuando el implementador quiere invitar a un cliente** (no antes). Acá la visual se complejiza; mantenerla contenida con desbloqueo progresivo.

### Eje primario = la instancia
Navegación por instancia; los usuarios cuelgan adentro. Panel de gestión por instancia:
- Header: `company_name`, `odoo_version`, estado de la conexión propia, acceso a chat.
- Resumen de salud: contadores `activos / sin creds / pendientes / asientos usados`.
- Lista de usuarios (filas): email + usuario de Odoo, badge de estado (ciclo de vida §3), seat (pago/gratis), acciones contextuales por estado.
- Acción "Invitar usuario".

### Flujo de invitación
1. Inputs: `email`, `seat_type` (`paid`/`free`), y **modo**:
   - `invite_only` (**default**): el cliente cargará su propia apikey.
   - `precreds`: el admin pre-carga `odoo_username + odoo_apikey` (atajo).
2. Validar seat disponible (límite viene del backend — hoy seteado a mano por superadmin; mañana, posiblemente desde Stripe). Si no hay seat pago libre y se eligió `paid` → bloquear con prompt, no romper el flujo.
3. Crear `Invitation (pending)` + email con link `/invite/[token]`. El usuario aparece como **Invitado (pendiente)** consumiendo seat.

### Editar/revalidar instancia
- Editar `url`/`db_name` exige revalidación y advierte impacto multi-usuario.
- Acción "revalidar mi conexión" on-demand.

---

## 11. Surface H — Lado del client_user

- **Aceptar invitación** (`/invite/[token]`): email **precargado read-only**, solo define contraseña. Crea User + Membership (`client_user`) + Connection para la instancia de la invitación.
  - Si la invitación era `precreds`: aplica creds, valida → entra **Activo**.
  - Si `invite_only`: entra **Registrado sin creds** → a su home.
- **Home del client_user:**
  - "Tu empresa: {company_name}".
  - `unset`: tarjeta "No tenés credenciales para operar {company_name}" + CTA al `CredentialForm`.
  - `active`: acceso directo al chat.
  - `invalid`: banner "Tu conexión a {company_name} dejó de funcionar. Recargá tu API key." + CTA.
- **CredentialForm** (mismo componente para self-service y pre-carga del admin): `url`/`db_name` heredados read-only; `odoo_username`/`odoo_apikey` editables; helper de apikey de Odoo; valida al guardar; la apikey es **write-only** (nunca se re-muestra; mostrar "configurada el {fecha}").
- Modo de interfaz "Client": lenguaje amigable, números como pastillas ("Factura #42"), sin jerga ni herramientas de admin.

---

## 12. Surface I — Indicador de estado de cobro (render-only)

El front **renderiza** el estado de cobro que le da el backend; no maneja Stripe.

- Mostrar de forma tranquila y visible en el panel del partner: plan actual (`gratis` / `trial` / `pagando`), conteo de **client_users activos**, y la condición de cobro: *"estás en gratis · vas a empezar a pagar cuando un cliente tuyo se active"*.
- Cuando el backend indique que el cobro está por iniciar (primer cliente activo / fin de trial), mostrar aviso anticipado. **Nunca** un primer cargo por sorpresa.
- Si el backend reporta pago fallido, gatear acceso según lo que indique (banner + CTA al portal de Stripe).
- La fuente de verdad del estado de cobro y del límite de asientos es el backend.

---

## 13. Contratos de datos esperados del backend (consolidado)

Comportamiento que el front necesita (nombres referenciales):

- `POST /instances/validate` → `{ ok, company_name, odoo_version }` o `{ ok:false, error_code, field_errors }`. `error_code` distingue al menos: `unreachable`, `db_not_found`, `auth_failed`.
- `POST /instances` — crea instancia (URL+DB) + opcionalmente conexión propia.
- `GET /instances` — listado con: `company_name`, `odoo_version`, estado de conexión propia (`active`/`unset`/`invalid`), contadores (`active/unset/invalid/pending`), uso de seats.
- `GET /instances/:id` — detalle + `users[]` (`email`, `connection_status`, `odoo_username|null`, `seat_type`, `invitation_status`).
- `POST /instances/:id/invitations` — `{ email, seat_type, mode, prefilled_username?, prefilled_apikey? }`.
- `POST /invitations/:token/accept` — `{ password }`.
- `PUT /connections/:id` — `{ odoo_username, odoo_apikey }` (self-service y pre-carga). Valida antes de marcar activo.
- `POST /connections/:id/revalidate`.
- `DELETE /invitations/:id` — cancela; **libera seat**.
- `PATCH /memberships/:id` — `{ seat_type }`.
- `GET /billing/state` — `{ plan, active_seats, seat_limit, billing_starts_condition, trial_ends_at?, payment_status }` (render-only).
- Demo: endpoint para disparar consultas del agente contra la instancia demo sin cuenta.

Regla transversal: **la apikey es write-only**; ningún endpoint la devuelve.

---

## 14. Restricciones

- No tocar tokens, paleta, tipografía ni espaciados del design-system. Reutilizar componentes e iconos existentes.
- No agregar dependencias nuevas.
- Animaciones (nudge): suaves; respetar `prefers-reduced-motion`.
- Accesibilidad: foco atrapado en modales, cierre con Escape, `aria-expanded` en collapsibles, roles correctos, contraste.
- Responsive: filas con icono, chips, header y nudge funcionan en mobile (envuelven, no desbordan).
- Copy: **"Odoo 14 a 19"** en todas las superficies. "20" no aparece en ninguna parte.
- No duplicar claims entre superficies; consistencia A/B/C/D.
- Persistir preferencias de "no volver a mostrar" del modal A y del nudge C.

---

## 15. Criterios de aceptación

- [ ] Modal demo aparece una vez; check "no mostrar de nuevo" funciona; los botones de ejemplo disparan consultas reales contra la demo.
- [ ] Header demo persistente; "Registrate…" crea cuenta y lleva a conectar Odoo.
- [ ] Nudge partner aparece tras la **2ª** respuesta exitosa (no por timer), baja animado, se minimiza a pastilla y se reexpande; no reaparece en la sesión tras minimizar.
- [ ] Panel "¿Qué es?" usa el contenido del brief del modal explicativo.
- [ ] Conectar Odoo propio: registro + 2 bloques + validación real + helper de apikey + aterriza en una consulta sobre datos propios.
- [ ] Instancia propia editable; 2ª+ instancia con credencial propia opcional ("configurar para chatear").
- [ ] Invites se **desbloquean** al querer invitar; seat limit respetado (leído del backend); cancelar libera seat.
- [ ] Aceptar invitación: email precargado + solo contraseña; `invite_only` → "registrado sin creds"; `precreds` → "activo".
- [ ] Home client_user refleja `unset`/`active`/`invalid` con la acción de salida visible.
- [ ] apikey nunca se devuelve; se muestra estado + fecha.
- [ ] Indicador de cobro render-only desde backend; aviso anticipado del primer cargo; nada por sorpresa.
- [ ] Copy en "14 a 19" en todos lados.
- [ ] Accesibilidad y `prefers-reduced-motion` cubiertos.

---

## 16. Fuera de alcance

- Mecánica de cobro / integración Stripe (en investigación; ver brief separado para el backend).
- Estética y design tokens (design-system existente).
- Internals del pipeline del agente.
- Panel cross-org del SuperAdmin (el control manual de asientos de hoy queda como está hasta resolver Stripe).
- Usuario "general API Bot" compartido (futuro).
