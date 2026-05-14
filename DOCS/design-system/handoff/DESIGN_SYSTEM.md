<!-- Canonical source of truth for Claude Code -->
# TheOdooAgent — Design System v2.1

**Versión:** 2.1.0 (unified warm) · **Fecha:** 2026-05  
**Audiencias:** Implementadores Odoo (técnicos) + Clientes finales (no técnicos)  
**Cambio vs v2.0:** Paleta unificada warm stone para ambas audiencias en light + dark. La distinción ahora es **densidad, voz y componentes**, no paleta.

---

## 0. Principio rector

> **"Una marca, dos audiencias. Mismo cerebro, dos caras."**

TheOdooAgent vive en dos manos:

- **Builder** — implementador Odoo. Configura, monitorea, depura.
- **Client** — usuario final del cliente del implementador. Le pregunta al agente cosas de su negocio. No sabe ni quiere saber qué es Odoo.

**Lo que comparten:**
- Indigo `#6366F1` como único acento
- Inter como UI font + Roboto Mono para datos técnicos
- Lucide outline stroke 1.5
- MarkB con guiño violeta Odoo `#714B67`
- **La misma paleta warm stone** (light + dark)

**Lo que los diferencia:**
- Densidad (Builder 14px base / Client 16px base)
- Uso de Roboto Mono (Builder omnipresente / Client sólo doc#)
- Voz del agente (técnica vs natural)
- Tamaño de botones (36px / 44px)
- Acceso al log panel LangGraph (Builder sí / Client nunca)
- Marca prominente (Builder TheOdooAgent / Client white-label parcial)

---

## 1. Personas

### Builder

```
mood       → Denso · técnico · control absoluto
voz        → Reporta XML-RPC, IDs, modelos, endpoints
UI         → 14px base · mono omnipresente · log panel siempre
gestos     → Tablas densas, logs en vivo, atajos de teclado
brand      → TheOdooAgent prominente
```

### Client

```
mood       → Amable · claro · respirado
voz        → Lenguaje natural · números de documento
UI         → 16px base · mono solo en doc# · sin logs técnicos
gestos     → Chat, tarjetas grandes, descargar / aprobar
brand      → Marca del implementador prominente · "Powered by" footer
```

---

## 2. Tokens compartidos (brand)

```css
--brand:        #6366F1;   /* Indigo 500 — único acento */
--brand-hover:  #4F46E5;   /* Indigo 600 */
--odoo-purple:  #714B67;   /* Guiño Odoo — solo en mark */
```

Indigo 500 es el accent ÚNICO. Sin mezcla con otros acentos.

---

## 3. Tokens — Light Mode (default warm stone)

```css
/* Surfaces */
--bg-base:        #FAFAF7;   /* warm off-white */
--bg-surface:     #FFFFFF;
--bg-raised:      #F5F4EE;

/* Borders */
--border-default: #E7E5DD;
--border-subtle:  #EFEDE6;

/* Text */
--text-primary:   #1C1917;
--text-secondary: #57534E;
--text-muted:     #A8A29E;

/* Semantic */
--state-success:        #16A34A;  --state-success-subtle: #F0FDF4;
--state-error:          #DC2626;  --state-error-subtle:   #FEF2F2;
--state-warning:        #D97706;  --state-warning-subtle: #FFFBEB;
--state-info:           #0EA5E9;  --state-info-subtle:    #F0F9FF;

--accent-subtle: #EEF2FF;
```

---

## 4. Tokens — Dark Mode (warm stone dark)

```css
/* Surfaces */
--bg-base:        #1A1816;   /* warm dark */
--bg-surface:     #25221F;
--bg-raised:      #35312D;

/* Borders */
--border-default: #3A3733;
--border-subtle:  #2A2520;

/* Text */
--text-primary:   #FAFAF7;
--text-secondary: #B8B3AC;
--text-muted:     #7A7670;

/* Semantic — tonos más vivos en dark cálido */
--state-success:        #34D399;  /* emerald 400 */
--state-error:          #FB7185;  /* rose 400 */
--state-warning:        #FBBF24;  /* amber 400 */
--state-info:           #60A5FA;  /* blue 400 */

/* subtles a 12% alpha sobre el dark base */
--state-success-subtle: rgba(52, 211, 153, 0.12);
--state-error-subtle:   rgba(251, 113, 133, 0.12);
--state-warning-subtle: rgba(251, 191, 36, 0.12);
--state-info-subtle:    rgba(96, 165, 250, 0.12);

--accent-subtle: rgba(99, 102, 241, 0.14);
```

---

## 5. Tokens — Deep Surface (Builder only)

```css
--bg-deep: #0A0908;   /* near-black, capa máxima profundidad */
```

Reservado para:
- Panel de logs LangGraph
- Code blocks / fragmentos XML-RPC
- Terminal output
- API request/response viewers

**Comportamiento:** siempre es `#0A0908` independiente del modo (light o dark). No cambia. Es la capa donde el implementador "lee código".

**Uso:** clase `.deep-surface` o `background: var(--bg-deep)`.

**Foreground recommended:**
- texto base: `#B8B3AC` (stone 400 invertido)
- success log: `#34D399`
- info log: `#60A5FA`
- error log: `#FB7185`
- warning log: `#FBBF24`
- timestamps: `#7A7670`

**Nunca exponer `--bg-deep` ni nada de su contenido al cliente final.**

---

## 6. Tipografía

### Fuentes (ambas audiencias)

- **Inter** — UI principal
- **Roboto Mono** — datos técnicos (uso difiere por audiencia)

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
IDs de registro      →  sale.order(47)
Modelos              →  account.move
Campos               →  partner_id
Logs LangGraph       →  [NODE: validate] → OK
Endpoints            →  /web/dataset/call_kw
Errores raw          →  ValidationError: Field 'name' required
```

**Client — sólo números de documento:**

```
Número de factura    →  #1847
Número de pedido     →  #SO-204
Total monetario      →  $12.450,00 ARS
```

Todo lo demás en Inter normal. NUNCA exponer al cliente nombres de modelos, endpoints o stack traces.

---

## 7. Logo

**Mark primario (MarkB · "Socket Eyes"):**
- viewBox 24×24, stroke 1.5
- silueta lucide-bot (antena + plate + side ears)
- ojos = prongs indigo `#6366F1` rellenos
- boca = ground hole violeta Odoo `#714B67`
- archivo: `logo/mark-b.svg`

**Mark procesando (MarkI · "Cursor"):**
- antena → cursor terminal
- boca → prompt bar
- usar para: loading states, "agente pensando"
- archivo: `logo/mark-i.svg`

**Wordmark:**
- "The" en Inter 400, opacity 0.5
- "OdooAgent" en Inter 600 (junto)
- letter-spacing -0.015em, gap 0.22em

**Componente React:** `AgentMark.tsx`.

---

## 8. Componentes

### Botones

| Audiencia | Altura | Radius | Padding | Font size |
|---|---|---|---|---|
| Builder | 36px (sm 32, lg 40) | 6px | px-4 | 13px |
| Client | 44px (sm 40, lg 48) | 10px | px-6 | 15px |

### Verbos

| Builder (ejecución) | Client (natural) |
|---|---|
| Sincronizar | Descargar factura |
| Ejecutar | Ver detalle |
| Validar | Pagar ahora |
| Configurar | Confirmar pedido |
| Diagnosticar | Tengo otra duda |

### Status pills

| Builder (mono uppercase) | Client (sentence-case humano) |
|---|---|
| `CONECTADO` | Lista |
| `EJECUTANDO · fetch_records` | En camino |
| `VALIDATIONERROR` | Pendiente de pago |
| `RATE_LIMIT` | Demora prevista |

### Cards

- Builder: `bg-surface`, radius 8, sin sombra (apariencia plana)
- Client: `bg-surface`, radius 12, `box-shadow: 0 1px 3px rgba(28,25,23,0.04)` sutil

### Log panel LangGraph — Builder only

```css
.langgraph-trace {
  background: var(--bg-deep);     /* #0A0908 — siempre, independiente del modo */
  color: #B8B3AC;
  font-family: var(--font-roboto-mono);
  font-size: 12px;
  line-height: 1.7;
  padding: 16px;
}
```

**Nunca exponer al cliente.**

---

## 9. Voz

### Builder — Senior Technical Consultant

Directo, técnico, sin disculpas. Reporta endpoint, modelo, ID, latencia. Roboto Mono para datos técnicos.

```
✓ "account.move(1847) creada. Estado: draft → posted. Importe: $12.450,00 ARS."
✓ "Error XML-RPC: authenticate() → ConnectionRefusedError. Endpoint: ..."
✗ "¡Listo! La factura fue creada exitosamente 🎉"
```

### Client — Concierge claro

Amable, directo, sin diminutivos ni emojis decorativos. Oculta toda la tecnología subyacente.

```
✓ "Listo. Tu factura #1847 está emitida por $12.450,00 ARS. La podés descargar cuando quieras."
✓ "No pude conectarme con tu sistema ahora. Ya avisé al equipo técnico, volvé a intentar en unos minutos."
✗ "Hubo un ValidationError en account.move.create()"
✗ "¡Hola! 😊 Con mucho gusto te ayudo..."
```

**Reglas para Client:**
- Cero jerga técnica (no "modelo", "endpoint", "registro", "instancia")
- Sí decir "factura", "pedido", "pago", "cliente", "documento"
- Números de documento OK en mono: `#1847`
- Sin frases de cierre tipo "¿algo más?"

---

## 10. Iconografía

- **Librería:** Lucide Icons (MIT)
- **Estilo:** outline, `stroke-width: 1.5`
- **Tamaños:**
  - Builder: 16px inline, 20px en botones, 24px headings
  - Client: 18px inline, 22px en botones, 28px headings

**Set Builder:** `workflow`, `database`, `plug`, `refresh-cw`, `shield-check`, `alert-triangle`, `terminal`, `cpu`, `git-branch`

**Set Client:** `file-text` (factura), `package` (pedido), `credit-card` (pago), `truck` (envío), `building-2` (cliente), `bell` (notificación), `download`, `check-circle`

---

## 11. Layout

### Builder

- Sidebar: 240px (expandida), 56px (colapsada)
- Panel chat: max-width 760px centrado
- Panel logs LangGraph: 320px fijo a la derecha (colapsable, `.deep-surface`)
- Padding página: `px-6 py-4`
- Gap entre cards: 16px

### Client

- Sin sidebar pesada — top nav simple o tab bar mobile
- Panel chat: max-width 720px centrado
- Sidebar de documentos: 360px
- Padding página: `px-8 py-8` desktop, `px-5 py-5` mobile
- Hit targets mínimo 44px (mobile-first)

---

## 12. Spacing

Base 4px, múltiplos: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

---

## 13. Motion

- Builder: 150ms ease-out (micro), 250ms (vistas). `animate-spin` en nodos.
- Client: 200ms ease-out (micro), 300ms (vistas).
- **Prohibido:** bounce, parallax, entradas decorativas, scroll-triggered.

---

## 14. Accesibilidad

- Contrast ratio mínimo: 4.5:1 (body), 3:1 (UI large)
- Focus visible: `outline: 2px solid var(--brand); outline-offset: 2px;`
- Aria-labels en botones icon-only
- Estado nunca solo por color — siempre con ícono o texto
- Roboto Mono nunca por debajo de 11px

---

## 15. Branding — qué ve cada audiencia

| Pantalla | Builder | Client |
|---|---|---|
| Sidebar / nav | TheOdooAgent prominente (logo + wordmark) | Marca del implementador prominente |
| Footer | TheOdooAgent | "Powered by TheOdooAgent" pequeño |
| Logo del agente en chat | MarkB | MarkB (mismo) |
| Modelo de IA visible | Sí (badge con `claude-sonnet-4.5`) | No |
| Endpoint / instancia visible | Sí (`acme.odoo.com`) | No |
| Log panel LangGraph | Sí (`.deep-surface`) | Nunca |

---

## 16. Implementación — patrón sugerido

```tsx
// app/(builder)/layout.tsx
<html className="builder dark">  {/* implementador en dark warm */}
  <body>{children}</body>
</html>

// app/(client)/layout.tsx
<html className="client">  {/* cliente en light por default */}
  <body>{children}</body>
</html>
```

Toggle de modo:

```tsx
// Aplicar/quitar .dark en <html> — funciona idéntico en builder y client
document.documentElement.classList.toggle('dark');
```

---

## 17. Checklist de implementación

- [ ] Layout aplica `.builder` o `.client` según ruta
- [ ] Toggle de `.dark` funciona en ambos lados (mismo código)
- [ ] Tokens CSS (`--bg-*`, `--text-*`, `--state-*`) — no valores hardcodeados
- [ ] Builder: log panel usa `.deep-surface` (#0A0908)
- [ ] Builder: datos técnicos en Roboto Mono
- [ ] Client: el único mono es `.docnum` (número de documento)
- [ ] Client: botones ≥ 44px
- [ ] Client: NO aparece ningún nombre de modelo / endpoint / stack trace
- [ ] Contraste cumple 4.5:1 en light y dark
- [ ] Marca aparece donde corresponde según §15

---

## 18. Cambios desde v2.0

| | v2.0 | v2.1 |
|---|---|---|
| Sets de tokens | 4 (Builder L/D + Client L/D) | 2 (light + dark warm) |
| Builder dark base | `#0F172A` (Slate cold) | `#1A1816` (Warm) |
| Coherencia visual | Builder y Client se sienten distintos | Builder y Client se sienten parientes |
| Deep surface | Builder dark logs: `#020617` | Builder logs: `--bg-deep` `#0A0908`, agnóstico al modo |
| Distinción audiencia | Paleta + densidad + voz | Densidad + voz + componentes (paleta compartida) |

---

*TheOdooAgent — Design System v2.1 · Confidencial · uso interno*
