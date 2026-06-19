# Spec de Landing — TheOdooAgent (para Claude Code · frontend)

*Objetivo de este doc: implementar la "cara informativa" del producto sin frenar el demo. Listo para handear a Claude Code.*

---

## 0. Contexto y filosofía (leer primero)

- La app **ya arranca en el agente apuntando a la DB demo**. El demo en vivo es el mejor pitch. **No se pone ninguna pared delante del demo.**
- Premisa: quien llega ya sabe algo. Tiene que **entender qué es en ~5 segundos y caer directo a probar.** El que quiera más, que tenga dónde leerlo — sin que se le imponga.
- **Dos superficies complementarias** (no es either/or):
  - **A. Modal de bienvenida** — primer toque, skimmeable, dismissible. Overlay por encima del demo ya cargado.
  - **B. Entrada persistente en el left panel** — el "contame más", siempre disponible.
- **No** hacemos una página de marketing separada ni un dominio aparte. Esto vive dentro de la app actual (`theodooagent.com`).

---

## 1. Superficie A — Modal de bienvenida

### Comportamiento
- **Primera visita:** el demo carga normal; el modal aparece **encima** (overlay con backdrop semitransparente). El demo NO se bloquea ni se retrasa — monta detrás/al mismo tiempo.
- **Cierre:** botón `X`, click en backdrop, tecla `Esc`, o el CTA primario. Cualquiera deja al usuario en el demo.
- **"No mostrar de nuevo":** checkbox en el footer del modal. Si se marca (o si simplemente lo cierra una vez — ver criterio abajo), se persiste y no reaparece en futuras visitas.
- **Reapertura:** desde la entrada del left panel (Superficie B) se puede volver a abrir cuando quiera.

> Decisión a tomar: ¿el modal no vuelve a aparecer tras **cerrarlo una vez**, o solo si **tilda "no mostrar de nuevo"**? Recomendado: que no reaparezca tras el primer cierre (menos fricción), y el checkbox solo refuerza. Persistir un flag igual.

### Contenido (copy final, ES — base i18n)
**Título:** Estás probando TheOdooAgent

**Subtítulo:** IA que consulta y opera tu Odoo en lenguaje natural. Esto es una demo en vivo sobre datos de ejemplo — preguntá lo que quieras.

**3 chips/bullets (íconos cortos):**
- Preguntá en tu idioma: ventas, facturas, stock
- No inventa cifras: las calcula el sistema, no el modelo
- Anda en cualquier Odoo: 14 a 20 y Community

**"Probá esto" (prompts clickeables — recomendado):** al hacer click, **cierra el modal y siembra el prompt en el chat del demo** (lo ejecuta o lo deja escrito listo para enviar). Convierte "leer" en "hacer" al instante.
- "¿Cuántas facturas vencidas hay este mes?"
- "Top 5 clientes por ingresos"
- "¿Hay stock del producto X?"

**CTA primario:** `Empezá a probar` → cierra el modal (usuario queda en el demo).
**CTA secundario:** `Conectá tu propio Odoo (gratis)` → flujo de signup/conexión.

**Footer del modal:** `☐ No mostrar de nuevo`  ·  `¿Qué es esto?` (abre Superficie B)  ·  `Hecho por Martin`

### Estados
1. **Primera visita:** auto-open.
2. **Visitas siguientes (ya cerrado):** no auto-open.
3. **Reabierto desde el panel:** se abre en modo "info completa" (Superficie B) o el mismo modal con link a ella — ver §2.

### Requisitos
- Responsive (mobile: full-width sheet desde abajo o modal centrado; desktop: modal centrado, máx ~520px de ancho).
- Accesibilidad: focus trap, `Esc` cierra, `aria-modal`, `aria-labelledby`, retorno de foco al cerrar.
- No requiere auth (el demo es anónimo).

---

## 2. Superficie B — Entrada en el left side panel

### Comportamiento
- Un **ítem en el sidebar izquierdo** (junto a los chats y settings): **"¿Qué es TheOdooAgent?"** con ícono de info.
- Al click: abre el **contenido informativo completo**. Recomendado: **drawer lateral derecho o modal expandido** (NO una ruta que saque al usuario del demo). El demo sigue vivo detrás.
- Siempre disponible, nunca forzado.

### Contenido (copy final, ES — base i18n)

**1 · Qué es**
TheOdooAgent es un agente de IA que se conecta a tu Odoo y te deja consultar y operar en lenguaje natural — sin saber usar Odoo, sin navegar menús. Preguntás como le hablarías a un colega y recibís datos reales, gráficos y exports.

**2 · Cómo funciona** (con ejemplos)
Preguntás y responde con tus datos reales. Ejemplos:
- "Mostrá las facturas vencidas de más de $10.000"
- "Ventas por vendedor del mes pasado"
- "Creá un contacto: María López, maria@acme.com"

También **opera**: crear contactos, confirmar pedidos, actualizar registros — **siempre con tu confirmación**. Nunca actúa solo.

**3 · Por qué confiar**
- Confirmación humana en toda escritura: el agente propone, vos aprobás.
- No alucina cifras: el sistema las calcula, el modelo solo redacta.
- Respeta tus permisos de Odoo: ve lo mismo que verías vos.
- Credenciales cifradas.

**4 · Por qué es distinto**
- Anda en **todas las versiones de Odoo (14–20) y Community** — la IA nativa de Odoo pide Enterprise 18/19+.
- Arquitectura determinista (Python-first): por eso el costo es bajísimo.

**5 · ¿Sos implementador de Odoo?** (bloque para partners)
Podés ofrecerlo a tus clientes **con tu marca** y revenderlo: white-label, multi-cliente, desde ~$1/usuario. → CTA `Cómo revenderlo` (link a contacto / sección partner).

**6 · Hecho por mí** (nota de fundador — voz personal)
Soy Martin. Construí TheOdooAgent solo, con una idea simple: que cualquiera en una empresa pueda hablarle a su Odoo sin pelearse con menús. No hay una empresa con un equipo de ventas atrás — somos la idea, el código y yo. Si lo probás y algo no anda, escribime: tu feedback literalmente lo mejora.
*(Mostrar `martin@theodooagent.com`.)*

**7 · FAQ (teaser)**
- **¿Es seguro?** Sí: confirmación humana, respeta permisos, credenciales cifradas.
- **¿Qué versiones soporta?** Odoo 14 a 20 y Community.
- **¿Instala algo en mi Odoo?** No. Se conecta por API key estándar (XML-RPC).
- **¿Cuánto cuesta?** Gratis sobre tu propio Odoo. Al desplegarlo a tus clientes, desde ~$1/usuario.

**CTA final del panel:** `Probá la demo`  ·  `Conectá tu Odoo (gratis)`

> El bloque "Hecho por mí" es el corazón del "informativo, no empresa". No usar lenguaje corporativo, ni "nosotros", ni equipo de mentira.

---

## 3. Tracking / analítica (atado al embudo, sin tools pagas)

Vos sos el dueño del destino → emití eventos propios (no píxeles de email). Disparar:
- `intro_modal_shown`
- `intro_modal_dismissed` (con flag: por X / backdrop / "no mostrar")
- `demo_started` (CTA "Empezá a probar")
- `example_prompt_clicked` (con cuál)
- `connect_own_odoo_clicked`
- `info_opened_from_panel`
- `partner_cta_clicked`

**UTM:** si la URL trae `utm_*` (vienen del outreach), capturarlos y **persistirlos** para asociarlos al signup posterior. Es lo que te conecta la campaña con la conversión.

---

## 4. Notas técnicas

- **Stack:** Next.js (el actual). Sin librerías nuevas si se puede; usar el design system / tokens y componentes existentes (los de tu sistema de diseño).
- **Persistencia del dismissal:** `localStorage` para el visitante anónimo (ej. key `toa_intro_dismissed`). Si hay sesión iniciada, opcional guardarlo server-side por usuario.
- **i18n:** modal e info respetan el idioma activo del usuario (la app ya maneja 11 idiomas). Copy en ES como base, todo vía claves i18n — no hardcodear.
- **Performance:** el modal **no debe bloquear ni retrasar** la carga/interactividad del demo. El demo carga; el modal monta encima.
- **Accesibilidad:** focus trap, `Esc`, roles ARIA, foco de retorno, contraste suficiente.
- **Reutilización:** el contenido del panel (§2) y del modal (§1) comparten fuente — un solo objeto de contenido i18n que ambos consumen, para no duplicar copy.

---

## 5. Criterios de aceptación (checklist para Claude Code)

- [ ] Primera visita: el demo carga y queda usable; el modal aparece encima **sin** frenarlo.
- [ ] Cerrar el modal (X / backdrop / Esc / CTA) deja al usuario en el demo.
- [ ] El dismissal persiste: no reaparece en visitas siguientes.
- [ ] CTA "Empezá a probar" cierra el modal.
- [ ] Prompts de ejemplo: al click, cierran el modal y siembran el prompt en el chat.
- [ ] CTA "Conectá tu Odoo" lleva al flujo de signup/conexión.
- [ ] Ítem "¿Qué es TheOdooAgent?" en el sidebar abre la info completa (drawer/modal, sin sacar del demo).
- [ ] Bloque partner y nota "Hecho por mí" presentes en la info completa.
- [ ] Responsive en mobile y desktop.
- [ ] Accesible por teclado y lectores de pantalla.
- [ ] Eventos de analítica y captura de UTM funcionando.

---

## 6. Fuera de alcance (por ahora)
- Página de marketing pública separada / dominio aparte (no se hace; el demo-first es la estrategia).
- A futuro, si hiciera falta SEO/landing pública, el mismo objeto de contenido i18n se puede reusar en una ruta `/` de marketing. No ahora.
