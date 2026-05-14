# Prompt para Claude Code — v2.1

Copiá el bloque de abajo y pegalo en Claude Code. Tené los archivos del `handoff/` en `docs/design-system/` de tu repo.

---

## 📋 Mensaje para pegar

```
Actualizamos el design system de TheOdooAgent a v2.1.

Cambio principal vs v2.0: la paleta se UNIFICA. Antes había 4 sets de tokens
(Builder light/dark + Client light/dark). Ahora hay 2 sets compartidos:
warm light + warm dark. La distinción Builder/Client pasa a ser densidad,
voz y componentes — NO paleta.

Los archivos canónicos están en `docs/design-system/`:

- DESIGN_SYSTEM.md     → fuente de verdad v2.1. Leelo COMPLETO antes de tocar.
- globals.css          → tokens unificados light/dark + .builder/.client modifiers.
- AgentMark.tsx        → componentes de logo (sin cambios desde v2.0).
- logo/mark-b.svg      → mark primario.
- logo/mark-i.svg      → mark de processing.

Tokens base (compartidos light + dark):
- LIGHT: bg-base #FAFAF7 · text #1C1917 · borders #E7E5DD (warm stone)
- DARK:  bg-base #1A1816 · text #FAFAF7 · borders #3A3733 (warm dark)
- BRAND: #6366F1 (indigo, único acento) · #714B67 (odoo, solo en mark)

Builder activa además:
- --bg-deep #0A0908 (near-black) — para log panel LangGraph, code blocks,
  terminal output. Esta capa es siempre #0A0908 independiente del modo
  light/dark. Es la zona donde se "lee código".
- Escala de fuente 14px base, botones 36px / radius 6
- Roboto Mono omnipresente

Client activa:
- Escala de fuente 16px base, botones 44px / radius 10
- Roboto Mono SOLO en .docnum (#1847, etc.)
- NUNCA expone --bg-deep, modelos, endpoints, stack traces

Tareas en este orden:

[1] Reemplazá el globals.css actual por handoff/globals.css.
[2] Asegurate que el root layout aplique las clases correctas:
    - Builder route: <html class="builder dark">    (o builder + light)
    - Client route:  <html class="client">          (o client + dark)
    El toggle dark/light es la MISMA clase .dark en ambas audiencias.
[3] Copiá AgentMark.tsx a src/components/ y SVGs a public/.
[4] Importá Inter (400/500/600/700) y Roboto Mono (400/500) desde Google Fonts.
[5] Migrá el panel de logs LangGraph del Builder: usar .deep-surface o
    background: var(--bg-deep) directamente. No #020617 hardcoded.
[6] Verificá que las clases .builder y .client cambian densidad y heights
    correctamente vía las CSS variables --base-font-size, --btn-h-md, etc.

Después del reemplazo, hacé un audit (reportame, NO toques aún):

A) Pantallas que todavía usan colores Slate hardcoded (#0F172A, #1E293B, #334155,
   #F1F5F9, #94A3B8, #64748B) en lugar de tokens.
B) Componentes con background hardcoded que deberían usar var(--bg-*).
C) Log panels / code blocks que usan background distinto de var(--bg-deep).
D) En lado Client: mono usage fuera de .docnum, jerga técnica visible al
   usuario, botones < 44px.
E) En lado Builder: lugares donde el mono es ruido (texto narrativo,
   labels de UI que no son datos).

Mostrame el audit y proponé un plan por prioridad antes de tocar componentes.
```

---

## 📁 Estructura recomendada

```
tu-proyecto-frontend/
├── docs/
│   └── design-system/
│       ├── DESIGN_SYSTEM.md
│       ├── globals.css
│       ├── AgentMark.tsx
│       └── logo/
│           ├── mark-b.svg
│           └── mark-i.svg
├── src/
│   ├── app/
│   │   ├── globals.css           ← reemplazar
│   │   ├── (builder)/
│   │   │   └── layout.tsx        ← <html className="builder">
│   │   └── (client)/
│   │       └── layout.tsx        ← <html className="client">
│   └── components/
│       └── AgentMark.tsx
└── public/
    ├── mark-b.svg
    └── mark-i.svg
```

---

## 🎯 Tips clave para v2.1

1. **El toggle dark/light es uno solo.** Misma clase `.dark` para Builder y Client.
2. **`.builder` y `.client` cambian densidad/heights**, no paleta.
3. **`--bg-deep` es Builder-only** y siempre #0A0908 (no cambia con dark/light).
4. **Audit antes de refactor.** Pedile a Claude Code que reporte y proponga, no que toque directo.
5. **Si tu app aún tiene una sola ruta** sin split Builder/Client, este es buen momento para hacerlo.

---

## ✅ Checklist de handoff

- [ ] `DESIGN_SYSTEM.md` v2.1 en `docs/design-system/`
- [ ] `globals.css` v2.1 reemplazó al anterior
- [ ] `AgentMark.tsx` en `src/components/`
- [ ] SVGs en `public/`
- [ ] Inter + Roboto Mono importadas
- [ ] Layouts aplican `.builder` o `.client`
- [ ] Toggle `.dark` funciona en ambos lados con el mismo código
- [ ] Log panel del Builder usa `.deep-surface` / `var(--bg-deep)`
- [ ] Favicon actualizado (export de `mark-b.svg`)
- [ ] Audit completado antes de cambiar componentes
