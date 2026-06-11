# Guía de Implementación — Landing / "Cara informativa" de TheOdooAgent

> Documento de trabajo compartido (Martin + Claude). Acompaña a
> [`TheOdooAgent_Spec_Landing.md`](./TheOdooAgent_Spec_Landing.md).
> Sirve para: (1) mapear el spec al código real, (2) registrar decisiones a medida
> que aparecen dudas, (3) seguir el avance por fases.
>
> **Cómo usarlo:** cuando aparezca una duda, se anota en la *Bitácora de decisiones*
> con estado `🟡 abierta` / `🟢 cerrada`. Nada se implementa sobre una decisión
> abierta sin antes acordar el default.

---

## 1. Lectura del spec (resumen ejecutivo)

El spec es claro y compatible con la arquitectura actual. Filosofía: **demo-first**,
sin paredes. Dos superficies que comparten un único objeto de contenido i18n:

- **A — Modal de bienvenida** (overlay sobre el demo ya cargado, dismissible, no reaparece).
- **B — Entrada persistente en el sidebar** ("¿Qué es TheOdooAgent?") que abre la info completa.

No es página de marketing aparte ni dominio nuevo: vive dentro de la app actual.

Veredicto: **implementable casi tal cual.** Riesgos concentrados en (a) analítica
—que hay que construir de cero— y (b) accesibilidad del modal —que el patrón actual
no cubre—.

---

## 2. Mapeo spec → código real

| Pieza del spec | Dónde vive / qué se toca | Estado actual |
|---|---|---|
| Demo carga sin frenarse | `useOdooConfig().isDemoMode`, `DemoBanner` | ✅ existe |
| Sembrar prompt en el chat | `useChatContext()` → `createChat`+`router.push`+`sendMessage` (igual que `SuggestionCarousel.onSelect` en `chat/page.tsx`) | ✅ reutilizable |
| Montaje global del modal | `components/app-shell.tsx` (envuelve solo el route group `(app)`) | ✅ punto de anclaje |
| Ítem sidebar (Superficie B) | `components/chat/sidebar.tsx` | ✅ hay lugar (collapsed + mobile ya resueltos) |
| Patrón visual de modal | `components/ui/limit-reached-modal.tsx` (referencia) | ⚠️ sin focus-trap / Esc / aria |
| Tokens de diseño | `app/globals.css` (`bg-surface`, `text-foreground`, `rounded-card`, `h-btn-md`…) | ✅ usar SIEMPRE estos |
| Brand mark | `components/AgentMark.tsx` (`MarkB`/`Wordmark`/`Lockup`) | ✅ usar, nunca `Bot` |
| i18n (11 locales) | `messages/*.json` (es base) | ✅ agregar namespace `Intro` |
| Analítica / eventos | — | ⛔ NO existe, construir |
| Captura UTM | — | ⛔ NO existe, construir |

---

## 3. Arquitectura propuesta (archivos nuevos)

```
lib/
  intro-content.ts        # (opcional) tipos/IDs de prompts de ejemplo; copy real va en i18n
  analytics.ts            # track(event, props) + captura/persistencia de UTM (pluggable)
hooks/
  use-intro.tsx           # estado abierto/cerrado del modal + flag de dismissal (localStorage)
components/intro/
  intro-modal.tsx         # Superficie A — modal de bienvenida (accesible)
  intro-panel.tsx         # Superficie B — drawer derecho con info completa
  intro-sidebar-item.tsx  # ítem "¿Qué es TheOdooAgent?" para el sidebar
  a11y-modal.tsx          # (opcional) wrapper reusable: focus-trap + Esc + aria-modal + retorno de foco
messages/
  es.json … mr.json       # namespace "Intro" en los 11 archivos
```

**Reutilización de contenido (spec §4):** modal y panel leen el **mismo** namespace
`Intro` de next-intl. No se duplica copy: cada superficie toma las claves que necesita
(`title`, `subtitle`, `chips.*`, `tryThis.*`, `what`, `how.*`, `trust.*`, `partner.*`,
`founder.*`, `faq.*`, `cta.*`).

**Montaje:** `IntroModal` e `IntroPanel` se montan una sola vez en `AppShell`
(`components/app-shell.tsx`), controlados por `use-intro`. Quedan disponibles en todo
el route group `(app)` y por encima del demo.

---

## 4. Bitácora de decisiones (DUDAS → DEFAULTS)

> Las que tienen recomendación se pueden implementar con ese default salvo que se diga
> lo contrario. ⛔ = bloqueante, no avanzar sin acordar.

| # | Decisión | Estado | Resolución |
|---|---|---|---|
| D1 | **Destino de los eventos de analítica.** | 🟢 cerrada | **POST a endpoint backend** (ver D1-bis). `lib/analytics.ts` envuelve el POST vía `authFetch`/fetch anónimo + captura/persiste UTM. **Dependencia:** el endpoint debe existir en backend antes de testear Fase 1. |
| D1-bis | **Contrato del endpoint de eventos.** | 🟢 cerrada (prompt enviado a backend) | Contrato definido en [`PROMPT_Backend_Eventos.md`](./PROMPT_Backend_Eventos.md): ingesta anónima `POST /events` (compat `sendBeacon`), + lectura SUPERADMIN `GET /admin/events` y `GET /admin/events/stats`. El front consume exactamente esas 3 rutas. Pendiente: que el backend lo implemente. |
| D9 | **Vista superadmin de eventos (FRONT).** | 🟡 pendiente backend | Nueva pestaña **Events** en `app/[locale]/superadmin/page.tsx` (espejo de `FeedbackTab`: stats/funnel → listado). Consume `GET /admin/events` + `/admin/events/stats`. Visible para SUPERADMIN en local y prod. **Bloqueada hasta que el backend exponga las rutas.** |
| D10 | **i18n del landing por locale.** | 🟢 cerrada | Traducción real solo para **en, es, fr, de, it, pt**. Los locales índicos **gu, hi, kn, mr, ta** reusan el bloque `Intro` **en inglés** (el resto de esos archivos sigue en su idioma). Motivo: esta etapa apunta a implementadores Odoo que manejan inglés. Si el browser detecta gu/hi/kn/mr/ta, el landing se ve en inglés; el resto de la app, en su idioma. |
| D2 | **Comportamiento de los prompts de ejemplo.** | 🟢 cerrada | **Auto-ejecuta**: cierra modal + manda el prompt (reusa el flujo de `SuggestionCarousel`/`useChatContext().sendMessage`). |
| D3 | **Trigger del dismissal.** ¿No reaparece tras el primer cierre, o solo si tilda "no mostrar de nuevo"? | 🟢 cerrada (per spec) | Spec recomienda: **no reaparece tras el primer cierre**; el checkbox solo refuerza. Persistir flag `toa_intro_dismissed` igual. |
| D4 | **Presentación de Superficie B.** ¿Drawer derecho o modal expandido? | 🟢 cerrada | **Drawer lateral derecho** (el demo sigue vivo detrás, no saca al usuario). Mobile: sheet full-height. |
| D5 | **Gating del modal.** ¿A quién se le auto-abre? | 🟢 cerrada | Solo a **visitante anónimo en demo** (`isDemoMode && !dismissed`). Usuario logueado con su Odoo NO lo ve. Superficie B (sidebar) sí está siempre para todos. |
| D6 | **Persistencia del dismissal logueado.** | 🟢 cerrada | `localStorage` para anónimo (spec). Server-side por usuario: **fuera de alcance** por ahora. |
| D7 | **Ubicación del ítem en el sidebar.** | 🟢 cerrada | Debajo del botón "New Chat", como ítem propio con ícono `Info`. Visible en collapsed (solo ícono) y mobile. |
| D8 | **Modal accesible.** El patrón actual no trae focus-trap/Esc/aria. | 🟢 cerrada | Construir wrapper a mano (`a11y-modal.tsx`), sin librerías nuevas (spec §4). |

---

## 5. Plan por fases (checklist de implementación)

### Fase 0 — Fundaciones (sin UI visible)
- [ ] `lib/analytics.ts`: `track(event, props?)`, captura `utm_*` de `window.location.search` → `localStorage` (`toa_utm`), helper `getUtm()`. Sink pluggable (D1).
- [ ] `hooks/use-intro.tsx`: `{ isModalOpen, openModal, closeModal, isPanelOpen, openPanel, closePanel, dismissed, dismiss }`. Flag `toa_intro_dismissed` en `localStorage`.
- [ ] Namespace `Intro` en `messages/es.json` (copy del spec §1 y §2). Luego replicar a los otros 10 locales.

### Fase 1 — Superficie A (modal)
- [ ] `components/intro/a11y-modal.tsx`: backdrop, focus-trap, `Esc`, `aria-modal`/`aria-labelledby`, retorno de foco.
- [ ] `components/intro/intro-modal.tsx`: título, subtítulo, 3 chips, "Probá esto" (prompts), CTA primario/secundario, footer (checkbox + "¿Qué es esto?" + "Hecho por Martin").
- [ ] Auto-open en primera visita (D5), montado en `AppShell`.
- [ ] Prompts clickeables → cierran modal + siembran prompt (D2).
- [ ] Eventos: `intro_modal_shown`, `intro_modal_dismissed` (con motivo), `demo_started`, `example_prompt_clicked`, `connect_own_odoo_clicked`.

### Fase 2 — Superficie B (panel + sidebar)
- [ ] `components/intro/intro-sidebar-item.tsx` integrado en `sidebar.tsx` (D7).
- [ ] `components/intro/intro-panel.tsx`: drawer derecho con secciones 1–7 del spec §2 (qué es, cómo funciona, por qué confiar, por qué distinto, bloque partner, "Hecho por mí", FAQ, CTAs).
- [ ] Reabrir modal desde el panel / "¿Qué es esto?".
- [ ] Eventos: `info_opened_from_panel`, `partner_cta_clicked`.

### Fase 2b — Vista superadmin de eventos (FRONT, depende del backend)
- [ ] Endpoints en `lib/api.ts`: `fetchAdminEvents(filters)`, `fetchEventsStats()`.
- [ ] Tipos en `lib/types.ts`: `AnalyticsEvent`, `EventsStats`.
- [ ] Pestaña **Events** en `app/[locale]/superadmin/page.tsx` (espejo de `FeedbackTab`: dashboard de stats/funnel → listado filtrable). Solo SUPERADMIN.
- [ ] Backend requerido: ver [`PROMPT_Backend_Eventos.md`](./PROMPT_Backend_Eventos.md).

### Fase 3 — i18n completo
- [ ] Traducir namespace `Intro` a en/fr/de/pt/it/hi/gu/ta/kn/mr.
- [ ] Verificar que no quedó ningún string hardcodeado.

### Fase 4 — Pulido
- [ ] **Correr `/design-refactor` sobre `components/intro/*`** para alinear con `DESIGN_GUIDELINES.md`.
- [ ] Validar voz Client ("Concierge claro") y densidad Client (ver §6b).
- [ ] Responsive (mobile sheet vs desktop centrado/drawer).
- [ ] Pasada de accesibilidad (teclado + lectores).
- [ ] Verificar que el demo no se bloquea ni se retrasa.
- [ ] `npm run lint` + `npm run build`.

---

## 6. Mapeo a criterios de aceptación (spec §5)

| Criterio | Fase | Cubierto por |
|---|---|---|
| Demo usable, modal encima sin frenar | F1 | montaje en `AppShell`, sin bloquear render |
| Cerrar (X/backdrop/Esc/CTA) deja en el demo | F1 | `a11y-modal` + `use-intro` |
| Dismissal persiste | F0 | `toa_intro_dismissed` |
| CTA "Empezá a probar" cierra modal | F1 | `intro-modal` |
| Prompts de ejemplo siembran en el chat | F1 | `useChatContext().sendMessage` |
| CTA "Conectá tu Odoo" → signup | F1 | link a `/login` o `/onboarding` |
| Ítem sidebar abre info completa | F2 | `intro-sidebar-item` + `intro-panel` |
| Bloque partner + "Hecho por mí" presentes | F2 | `intro-panel` |
| Responsive | F4 | — |
| Accesible teclado + lectores | F1/F4 | `a11y-modal` |
| Eventos + captura UTM | F0/F1/F2 | `lib/analytics.ts` |

---

## 6b. Sistema de diseño — fuentes de verdad visuales (UI/UX)

> No improvisar estilos: el proyecto tiene design system canónico. Para la landing,
> la **audiencia es Client** (anónimo en demo) → tono y densidad **Client**, no Builder.

| Recurso | Para qué lo usamos en la landing |
|---|---|
| `DESIGN_GUIDELINES.md` (raíz) | Guidelines canónicas. Reglas de tokens, motion, a11y, tipografía. |
| **Skill `/design-refactor`** | Correrlo sobre cada componente nuevo de `components/intro/` antes de cerrar (Fase 4). |
| `design-system/handoff/DESIGN_SYSTEM.md` | Fuente de verdad v2.1. **§9 Voz → "Client: Concierge claro"** (tono del copy). **§6 Tipografía → escala Client 16px "respirado"**. §8 Componentes (cards, botones, status pills). |
| `design-system/Brand Manual/` (`02-color`, `03-typography`, `04-voice`, `05-components`) | Referencia de marca para color/tipo/voz del modal y panel. |
| `design-system/Storytelling/Odoo Agent Story.html` | Tono narrativo para "Qué es" y "Hecho por mí" (panel §2). |
| `design-system/handoff/tokens.json` + `globals.css` | Tokens ya mapeados a Tailwind — usar utilidades, no hex. |

**Implicancias concretas para el copy/diseño:**
- Voz **Client = Concierge claro**: cercano, sin jerga técnica, sin "nosotros" corporativo
  (refuerza el "Hecho por mí" del spec). Nada de voz Builder (Senior Technical Consultant).
- Densidad **Client** (espaciado, 16px base) — no la densidad Builder de dashboards.
- Layout del modal/panel sigue §11 (Client) y motion §13 (`0.15 easeOut`).

---

## 7. Notas técnicas específicas del repo (no romper convenciones)

- **Tokens, no hex ni Tailwind crudo.** `bg-surface`/`bg-base`/`bg-raised`, `text-foreground`/`text-text-secondary`, `bg-accent`/`text-accent`, `rounded-card`/`rounded-btn`, `h-btn-md`/`min-h-input`. Ver `CLAUDE.md`.
- **`'use client'`** en todo componente con hooks/framer-motion/browser APIs.
- **Animaciones:** `duration: 0.15, ease: "easeOut"` (no spring).
- **Iconos:** `lucide-react`, `strokeWidth={1.5}`. Para superficies de usuario, `useIconSize("inline"|"button"|"heading")`.
- **Brand:** `MarkB`/`Wordmark`/`Lockup` de `AgentMark.tsx`. Nunca `Bot`.
- **i18n:** `useTranslations("Intro")`. Nada hardcodeado. Copy ES base, los 11 locales en lockstep.
- **Audiencia:** el copy es para anónimo/CLIENT_USER → **no** usar el split `Builder/Client`; namespace plano `Intro`.
- **Email del fundador:** `martin@theodooagent.com` (mostrar, no es secreto).

---

## 8. Fuera de alcance (confirmar con spec §6)

- Página de marketing pública separada / dominio aparte.
- SEO / ruta `/` de marketing (a futuro reusa el mismo objeto i18n).
- Persistencia server-side del dismissal por usuario.

---

## 9. Estado de implementación

**Front implementado (Fases 0–4):** ✅ build limpio, tipos OK, 11 locales cargando.
- `lib/analytics.ts`, `hooks/use-intro.tsx`.
- `components/intro/`: `a11y-modal.tsx`, `intro-modal.tsx`, `intro-panel.tsx`, `intro-sidebar-item.tsx`.
- Montaje en `components/app-shell.tsx` (IntroProvider + modal + panel) + captura UTM.
- Ítem en `components/chat/sidebar.tsx`.
- Namespace `Intro` en los 11 `messages/*.json` (en/es/fr/de/it/pt reales; gu/hi/kn/mr/ta en inglés — ver D10).

**Pendiente (depende del backend):**
- Endpoint de eventos `POST /events` + `GET /admin/events` + `/admin/events/stats`
  (ver [`PROMPT_Backend_Eventos.md`](./PROMPT_Backend_Eventos.md)). Hasta entonces, `track()`
  hace POST a una ruta que aún no existe — los eventos se intentan enviar y fallan en silencio
  (no rompen UX).
- **Fase 2b**: pestaña **Events** en el panel superadmin (D9) — se construye cuando las rutas existan.

**Opcional / pulido:**
- Pasada de `/design-refactor` sobre `components/intro/*` (los componentes ya siguen tokens/voz Client).
- Verificación en navegador (`npm run dev`): primera visita auto-abre modal en demo, seeding de prompts, drawer desde sidebar, persistencia del dismissal, responsive.
