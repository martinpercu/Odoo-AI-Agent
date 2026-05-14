<!-- This file is the canonical source of truth for Claude Code -->
# TheOdooAgent — Design System v2.0

**Versión:** 2.0.0 (dual-audience) · **Fecha:** 2026-05  
**Audiencias:** Implementadores Odoo (técnicos) + Clientes finales (no técnicos)

---

## 0. Principio rector

> **"Una marca, dos audiencias. Mismo cerebro, dos caras."**

TheOdooAgent vive en dos manos:

- **Builder** — implementador Odoo. Configura, monitorea, depura. Quiere ver el endpoint, el modelo, el log.
- **Client** — usuario final del cliente del implementador. Le pregunta al agente sobre su negocio. No sabe ni quiere saber qué es Odoo.

**Mismo cerebro:** Indigo `#6366F1`, Inter, Lucide outline stroke 1.5, marca con guiño violeta Odoo.  
**Distintas caras:** densidad, mono usage, voz, tamaño de hit targets, modo default.

---

## 1. Personas

### Builder (implementador)

```
mood       → Denso · técnico · control absoluto
voz        → Reporta XML-RPC, IDs, modelos, endpoints, latencias
UI         → Slate dark default · mono everywhere · 14px base
gestos     → Tablas densas, logs en vivo, atajos de teclado
defaults   → Dark mode SIEMPRE por default
```

### Client (usuario final)

```
mood       → Amable · claro · respirado
voz        → Lenguaje natural · números de documento (no modelos)
UI         → Warm stone light default · mono solo en doc#  · 16px base
gestos     → Chat, tarjetas grandes, descargar / aprobar / pagar
defaults   → Light mode SIEMPRE por default
```

---

## 2. Tokens (compartidos)

```css
--brand: #6366F1;          /* Indigo 500 — único acento, ambas audiencias */
--brand-hover: #4F46E5;    /* Indigo 600 */
--odoo-purple: #714B67;    /* Guiño Odoo — solo en el mark y detalles */
```

Indigo 500 es el accent ÚNICO. No mezclar con otros acentos. El violeta Odoo aparece **sólo** en el mark (boca del socket) y opcionalmente en detalles de marca del implementador.

---

## 3. Tokens — Builder (Slate Dark)

```css
/* Surfaces */
--b-bg-base:        #0F172A;  /* Slate 900 — app background */
--b-bg-surface:     #1E293B;  /* Slate 800 — cards, panels */
--b-bg-raised:      #334155;  /* Slate 700 — dropdowns, hover */
--b-bg-logs:        #020617;  /* Para panel de logs LangGraph */

/* Borders */
--b-border:         #334155;
--b-border-subtle:  #1E293B;

/* Text */
--b-text:           #F1F5F9;  /* Slate 100 */
--b-text-secondary: #94A3B8;  /* Slate 400 */
--b-text-muted:     #64748B;  /* Slate 500 */

/* Semantic */
--b-success:        #10B981;  --b-success-bg: #064E3B;
--b-error:          #F43F5E;  --b-error-bg:   #4C0519;
--b-warning:        #F59E0B;  --b-warning-bg: #451A03;
--b-info:           #38BDF8;  --b-info-bg:    #0C4A6E;

/* Accent subtle */
--b-accent-subtle:  #1E1B4B;  /* Indigo 950 — chips, badges */
```

---

## 4. Tokens — Client (Warm Stone Light)

```css
/* Surfaces */
--c-bg-base:        #FAFAF7;  /* warm off-white */
--c-bg-surface:     #FFFFFF;
--c-bg-raised:      #F5F4EE;  /* warm stone 100 */

/* Borders */
--c-border:         #E7E5DD;  /* warm stone 200 */
--c-border-subtle:  #EFEDE6;

/* Text */
--c-text:           #1C1917;  /* stone-900, warm */
--c-text-secondary: #57534E;  /* stone-600 */
--c-text-muted:     #A8A29E;  /* stone-400 */

/* Semantic (más cálidos que Builder) */
--c-success:        #16A34A;  --c-success-bg: #F0FDF4;
--c-error:          #DC2626;  --c-error-bg:   #FEF2F2;
--c-warning:        #D97706;  --c-warning-bg: #FFFBEB;
--c-info:           #0EA5E9;  --c-info-bg:    #F0F9FF;

/* Accent subtle */
--c-accent-subtle:  #EEF2FF;  /* Indigo 50 */
```

---

## 5. Tipografía

### Fuentes (ambas audiencias)

- **Inter** — UI principal
- **Roboto Mono** — datos técnicos (uso difiere por audiencia, ver abajo)

### Escala Builder (denso, 14px base)

| Clase | Size / Weight / LH |
|---|---|
| `text-display`    | 28 / 700 / 1.2 |
| `text-heading`    | 20 / 600 / 1.3 |
| `text-subheading` | 16 / 600 / 1.4 |
| `text-body`       | 14 / 400 / 1.5 |
| `text-small`      | 12 / 400 / 1.4 |
| `text-micro`      | 11 / 500 / 1.3 |

### Escala Client (respirado, 16px base)

| Clase | Size / Weight / LH |
|---|---|
| `text-display`    | 32 / 600 / 1.15 |
| `text-heading`    | 24 / 600 / 1.25 |
| `text-subheading` | 18 / 600 / 1.4 |
| `text-body`       | 16 / 400 / 1.6 |
| `text-small`      | 14 / 400 / 1.5 |
| `text-micro`      | 12 / 500 / 1.4 |

### Roboto Mono — uso por audiencia

**Builder — omnipresente:**

```
- IDs de registros        →  sale.order(47)
- Modelos                 →  account.move
- Campos                  →  partner_id
- Logs LangGraph          →  [NODE: validate] → OK
- Endpoints               →  /web/dataset/call_kw
- Errores raw             →  ValidationError: Field 'name' required
- API keys (parcial)      →  sk-od-••••••••XJ8F
- Versiones               →  Odoo 17.0 CE
```

**Client — sólo en números de documento:**

```
- Número de factura       →  #1847
- Número de pedido        →  #SO-204
- Total monetario         →  $12.450,00 ARS
```

Todo lo demás en Inter normal. NUNCA mostrar al cliente nombres de modelos, endpoints, stack traces, ni jerga Odoo.

---

## 6. Logo

**Mark primario (MarkB · "Socket Eyes"):**
- viewBox 24×24, stroke 1.5
- silueta lucide-bot (antena + plate + side ears)
- ojos = prongs indigo `#6366F1` rellenos
- boca = ground hole violeta Odoo `#714B67`
- archivo: `logo/mark-b.svg`

**Mark procesando (MarkI · "Cursor"):**
- misma base, pero antena → cursor terminal (rectángulo indigo)
- boca → prompt bar (línea horizontal Odoo)
- usar para: loading states, "agente pensando"
- archivo: `logo/mark-i.svg`

**Wordmark:**
- "The" en Inter 400, opacity 0.5
- "OdooAgent" en Inter 600 (junto, sin espacio)
- letter-spacing -0.015em, gap 0.22em

**Componente React:** `AgentMark.tsx` (exporta `<MarkB>`, `<MarkI>`, `<Wordmark>`, `<Lockup>`).

---

## 7. Componentes

### Botones

| Audiencia | Altura | Radius | Padding | Font size |
|---|---|---|---|---|
| Builder | 36px (sm 32, lg 40) | 6px | px-4 | 13px |
| Client | 44px (sm 40, lg 48) | 10px | px-6 | 15px |

### Verbos de botón

| Builder (ejecución) | Client (natural) |
|---|---|
| Sincronizar | Descargar factura |
| Ejecutar | Ver detalle |
| Validar | Pagar ahora |
| Configurar | Confirmar pedido |
| Diagnosticar | Tengo otra duda |
| Revocar | Cancelar |
| Reintentar | Volver a intentar |

### Status pills

| Builder (mono uppercase) | Client (sentence-case humano) |
|---|---|
| `CONECTADO` | Lista |
| `EJECUTANDO · fetch_records` | En camino |
| `VALIDATIONERROR` | Pendiente de pago |
| `RATE_LIMIT` | Demora prevista |

### Cards

- Builder: `bg-surface`, `border-default`, `rounded-lg` 8px, sin sombra
- Client: `bg-surface`, `border-default`, `rounded-xl` 12px, `shadow-sm` sutil

### Inputs

- Builder: 36px alto, radius 6, mono cuando es dato técnico
- Client: 44px alto, radius 10, Inter normal

### Log panel LangGraph (Builder ONLY)

- Background `#020617` (más oscuro que base)
- Roboto Mono 12px
- Timestamps en `--b-text-muted`
- Nodo activo en `--b-info` con spinner
- Nodo OK en `--b-success` con `✓`
- Nodo error en `--b-error` con `!`
- **NUNCA exponer al cliente final.**

---

## 8. Voz y tono

### Builder — Senior Technical Consultant

Directo, técnico, sin disculpas. Reporta endpoint, modelo, ID, latencia, código de error. Usa Roboto Mono para datos técnicos.

```
✓ "account.move(1847) creada. Estado: draft → posted. Importe: $12.450,00 ARS."
✓ "Error XML-RPC: authenticate() → ConnectionRefusedError. Endpoint: ..."
✗ "¡Listo! La factura fue creada exitosamente 🎉"
```

### Client — Concierge claro

Amable, directo, sin diminutivos ni emojis decorativos. Confirma resultado en lenguaje natural. Oculta toda la tecnología subyacente.

```
✓ "Listo. Tu factura #1847 está emitida por $12.450,00 ARS. La podés descargar cuando quieras."
✓ "No pude conectarme con tu sistema ahora. Ya avisé al equipo técnico, volvé a intentar en unos minutos."
✓ "No encontré clientes con apellido 'García'. ¿Querés que busque distinto?"
✗ "Hubo un ValidationError en account.move.create()"
✗ "¡Hola! 😊 Con mucho gusto te ayudo..."
```

**Reglas para client:**
- Cero jerga técnica (no "modelo", "endpoint", "registro", "instancia")
- Sí decir "factura", "pedido", "pago", "cliente", "documento"
- Números de documento OK en mono: `#1847`
- Sin frases de cierre tipo "¿algo más?"
- Sin disculpas excesivas

---

## 9. Iconografía

- **Librería:** Lucide Icons (MIT)
- **Estilo:** outline, `stroke-width: 1.5`
- **Tamaños:**
  - Builder: 16px inline, 20px en botones, 24px headings
  - Client: 18px inline, 22px en botones, 28px headings

**Set Builder:** `workflow`, `database`, `plug`, `refresh-cw`, `shield-check`, `alert-triangle`, `terminal`, `cpu`, `git-branch`

**Set Client:** `file-text` (factura), `package` (pedido), `credit-card` (pago), `truck` (envío), `building-2` (cliente), `bell` (notificación), `download`, `check-circle`

---

## 10. Layout

### Builder

- Sidebar: 240px (expandida), 56px (colapsada)
- Panel chat: max-width 760px centrado
- Panel logs LangGraph: 320px fijo a la derecha (colapsable)
- Padding página: `px-6 py-4`
- Gap entre cards: 16px

### Client

- Sin sidebar pesada — top nav simple o tab bar mobile
- Panel chat: max-width 720px centrado
- Sidebar de documentos: 360px
- Padding página: `px-8 py-8` desktop, `px-5 py-5` mobile
- Gap entre cards: 16-20px
- Hit targets mínimo 44px (mobile-first)

---

## 11. Spacing

Base 4px, múltiplos: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

---

## 12. Motion

- Builder: 150ms ease-out (micro), 250ms (vistas). `animate-spin` en nodos, `animate-pulse` en reconectando.
- Client: 200ms ease-out (micro), 300ms (vistas). Transiciones suaves. Sin bounce, sin parallax.
- **Prohibido en ambos:** bounce, parallax, entradas decorativas, scroll-triggered animations.

---

## 13. Accesibilidad

- Contrast ratio mínimo: 4.5:1 (body), 3:1 (UI large)
- Focus visible en todos los interactivos: `outline: 2px solid var(--brand); outline-offset: 2px;`
- Aria-labels en botones icon-only
- Estado nunca solo por color — siempre con ícono o texto
- Roboto Mono nunca por debajo de 11px

---

## 14. Branding · qué ve cada uno

| Pantalla | Builder | Client |
|---|---|---|
| Sidebar / nav | TheOdooAgent prominente (logo + wordmark) | Marca del implementador prominente |
| Footer | TheOdooAgent | "Powered by TheOdooAgent" pequeño |
| Logo del agente en chat | MarkB (indigo + odoo) | MarkB (mismo) |
| Modelo de IA visible | Sí (badge con `claude-sonnet-4.5`) | No |
| Endpoint / instancia visible | Sí (`acme.odoo.com`) | No |

---

## 15. Checklist de implementación

Antes de hacer merge:

- [ ] ¿Usa tokens CSS (`--b-*` o `--c-*`) y no valores hardcodeados?
- [ ] ¿Está claro de qué lado es el componente (Builder o Client)?
- [ ] Builder: ¿los datos técnicos usan Roboto Mono?
- [ ] Client: ¿el único mono es número de documento?
- [ ] Builder: ¿los botones usan verbos de ejecución?
- [ ] Client: ¿los botones usan verbos naturales y son ≥ 44px?
- [ ] ¿El contraste cumple 4.5:1?
- [ ] Client: ¿no aparece NINGÚN nombre de modelo / endpoint / stack trace?
- [ ] Builder: ¿el panel de logs LangGraph está disponible?
- [ ] ¿La marca aparece donde corresponde según §14?

---

*TheOdooAgent — Design System v2.0 · Confidencial · uso interno*
