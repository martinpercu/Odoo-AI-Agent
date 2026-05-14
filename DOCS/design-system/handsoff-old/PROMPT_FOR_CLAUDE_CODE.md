# Prompt para Claude Code

Copiá este mensaje completo y pegalo en Claude Code. Asegurate de tener los archivos del `handoff/` en la raíz de tu proyecto frontend (o en `docs/design-system/`).

---

## 📋 Mensaje para pegar

```
Acabamos de actualizar el design system de TheOdooAgent a v2.0 (dual-audience).

Los archivos canónicos están en `docs/design-system/`:

- DESIGN_SYSTEM.md   → fuente de verdad. LEELO COMPLETO antes de hacer cambios.
- globals.css         → tokens CSS para Builder (.builder) y Client (.client). Reemplaza el actual.
- AgentMark.tsx       → componentes React del logo (MarkB, MarkI, Wordmark, Lockup).
- logo/mark-b.svg     → mark primario standalone.
- logo/mark-i.svg     → mark de processing standalone.

Cambio principal vs. v1: ahora hay DOS audiencias.

1) BUILDER (implementador Odoo, técnico):
   - Dark mode default · Slate · 14px base · Roboto Mono omnipresente
   - Botones 36px / radius 6 · verbos de ejecución
   - Status pills mono uppercase
   - Panel LangGraph siempre visible
   - Ve modelos, IDs, endpoints, stack traces

2) CLIENT (usuario final, no técnico):
   - Light mode default · Warm Stone (#FAFAF7) · 16px base
   - Roboto Mono SOLO en números de documento (#1847)
   - Botones 44px / radius 10 · verbos naturales (Descargar, Pagar)
   - Status pills sentence-case humano (Lista, En camino, Pendiente)
   - NUNCA ve modelos / endpoints / jerga Odoo
   - Marca del implementador prominente · "Powered by TheOdooAgent" en footer

Lo que NO cambia entre los dos:
- Indigo #6366F1 como único acento
- Inter como UI font
- Lucide outline stroke 1.5
- MarkB (logo) con el guiño violeta Odoo #714B67

Tareas concretas (hacelas en este orden):

[1] Reemplazá el globals.css actual por handoff/globals.css.
[2] Copiá AgentMark.tsx a src/components/ (o equivalente).
[3] Copiá logo/mark-b.svg y mark-i.svg a public/ (o assets).
[4] Asegurate que el root layout aplique la clase correcta:
    - Páginas del implementador → <html class="builder">
    - Páginas del cliente → <html class="client">
    (O usá un wrapper div con esa clase si conviven en la misma app.)
[5] Importá Inter y Roboto Mono — pesos 400, 500, 600, 700 (Inter) y 400, 500 (Mono).
[6] Reemplazá favicon.ico actual con un export de mark-b.svg en 16/32/48px.

Después, hacé un audit pasada por pasada (sin tocar nada todavía, solo reportame):

- Qué pantallas tienen mono cuando NO deberían (en lado cliente)
- Qué botones del lado cliente son < 44px
- Qué textos del agente al cliente usan jerga técnica (modelo, endpoint, etc.)
- Dónde aparece TheOdooAgent prominente en pantallas de cliente (debería ser solo "Powered by")
- Componentes que usan colores hardcodeados en vez de tokens CSS

Mostrame el audit y proponé un plan ordenado por impacto antes de tocar código.
```

---

## 📁 Estructura recomendada en tu repo frontend

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
│   │   └── globals.css           ← reemplazar con el del handoff
│   └── components/
│       └── AgentMark.tsx         ← copiar del handoff
└── public/
    ├── mark-b.svg                ← copiar del handoff
    └── mark-i.svg                ← copiar del handoff
```

---

## 🎯 Tips para que Claude Code lo absorba mejor

1. **No le pases todo el chat con vos.** Solo el contenido de `handoff/`. Es autosuficiente.
2. **Decile que lea DESIGN_SYSTEM.md primero** y que te confirme el entendimiento ANTES de tocar código.
3. **Pedile el audit antes del refactor.** Así te muestra qué piensa cambiar.
4. **Si tu app tiene dos rutas separadas** (ej. `/builder/*` y `/client/*`), pedile que ponga la clase `.builder` o `.client` en los layouts correspondientes, no en el `<html>` global.
5. **Si todavía no separaste las rutas**, este es buen momento para hacerlo. Pedile a Claude Code que te proponga la arquitectura de rutas primero.

---

## ✅ Checklist de handoff

- [ ] `DESIGN_SYSTEM.md` está en `docs/design-system/` (o donde prefieras)
- [ ] `globals.css` reemplazó al actual
- [ ] `AgentMark.tsx` está en `src/components/`
- [ ] SVGs en `public/`
- [ ] Inter y Roboto Mono importadas
- [ ] Layouts aplican `.builder` o `.client` según la ruta
- [ ] Favicon actualizado
- [ ] Audit completado antes de cambiar componentes
