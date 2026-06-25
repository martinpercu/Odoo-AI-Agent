# Bug: "Generar PDF" no hace nada cuando el usuario está logueado

> Escrito por el Claude Code del **backend** para el Claude Code del **front**.
> Fecha: 2026-06-24. Branch back relevante: `deterministic-page-aware`.

## Síntoma reportado por el usuario

En el chat, una consulta tipo *"¿Cuántas facturas vencidas hay este mes?"* devuelve la respuesta
y ofrece un botón **"Generar PDF"** (`selection_prompt` con `kind: "report_offer"`).

- **Anónimo / demo** (`config_id="demo"`, audiencia `client`): al hacer click **se genera el PDF** (aparece el file card / se baja el archivo). ✅
- **Logueado** (config real UUID, audiencia `builder`): al hacer click **no pasa nada**. ❌

## El backend NO es el problema (verificado)

El handler de `POST /chat/{id}/action` con `action: "report"` **no tiene ninguna rama por audiencia**:
devuelve exactamente lo mismo para `builder` (logueado) y `client` (demo).

Dos pruebas:

1. **El log del propio usuario (logueado)** muestra que el handler corre **completo**. Estas líneas
   solo se imprimen dentro del handler `report` de `/action` (no en el stream del chat):
   ```
   📌 [sticky_context] Saved account.move → ID 83933
   📋 [completed_actions] Total: 1 actions logged
   📝 [audit] Logged report on account.move
   ```
   `get_odoo_report(...)` corre **antes** de esas líneas, así que para cuando aparece
   "Logged report" el PDF ya está armado. El paste del log se cortó ahí; el `POST 200` final
   simplemente no quedó pegado.

2. **Reproducción por curl** contra el server local (config `demo`, mismo dominio de facturas vencidas):
   ```
   HTTP_STATUS=200
   status: ok | result.action: report | has pdf_base64: True | pdf len: 7224
   ```

Además, el middleware de auth **no** hace check de cuota/402 en `/action`, así que un usuario
logueado pasa igual que el anónimo.

**Conclusión: el server arma el PDF y responde `200` con `pdf_base64` esté logueado o no.**
La respuesta es idéntica en forma:
```json
{
  "status": "ok",
  "message": "PDF generado para Factura (IDs: [...])",
  "result": {
    "action": "report",
    "model": "account.move",
    "ids": [83933, ...],
    "pdf_base64": "JVBERi0xLjQK...",
    "filename": "reporte_....pdf",
    "mimetype": "application/pdf"
  }
}
```

## Entonces el bug está en el front, *después* del `200`

El flujo actual:

1. Click "Generar PDF" → `ReportOfferCard.handleClick` arma el `ActionContext`
   (`components/chat/report-offer-card.tsx:24-44`) y llama `onAction(ctx)` = `executeAction`.
2. `executeAction` (`hooks/use-chat.ts:538`) hace el POST vía `executeActionAPI` y, con el `200`,
   construye un mensaje con `metadata.type = "file_attachment"`
   (`hooks/use-chat.ts:572-583`) y lo agrega al chat.
3. Se renderiza `OdooFileCard` (`components/chat/odoo-file-card.tsx`), que muestra un botón
   **"Descargar PDF"**. ⚠️ **No descarga solo**: hace falta un segundo click manual
   (`downloadActionReport`, `odoo-file-card.tsx:14-26`).

El código del front es **idéntico** para logueado y demo (no hay un chat/demo separado;
ambos usan `chat-messages.tsx` + `use-chat.ts` + `odoo-file-card.tsx`). Por lo tanto la
asimetría es de **runtime/estado**, no de código por audiencia.

### Sospecha principal: el mensaje se agrega a un chat que no es el visible

En `hooks/use-chat.ts` el `executeAction` agrega el file card así:

```js
setChats((prev) =>
  prev.map((c) =>
    c.id === currentChatId           // <-- depende de currentChatId del closure
      ? { ...c, messages: [...c.messages, responseMessage] }
      : c
  )
);
```

Y arriba hay un guard que sale **en silencio** (sin throw, sin error visible):

```js
const executeAction = useCallback(async (actionContext) => {
  if (!currentChatId || !activeConfigId) return;   // <-- early return mudo
  ...
}, [currentChatId, activeConfigId, locale, sendMessage]);
```

Si en el caso logueado `currentChatId` (valor del closure) **no coincide** con el id del chat
que se está viendo —típico en un chat recién creado client-side, o si el id de la URL difiere del
generado internamente—, el `responseMessage` se agrega a "otro" chat (o a ninguno) y en pantalla
**no pasa nada**, aunque el `200` con el PDF llegó perfecto.

> Nota: si el guard hiciera el `return` mudo, el backend **no** habría recibido el POST. Pero el
> log del usuario prueba que el POST sí llegó (corrió el audit). Entonces el caso más probable es
> que el POST se mandó OK, volvió `200`, y el file card se agregó a un chat distinto del visible
> (mismatch de `currentChatId`), o hubo un re-render que lo pisó.

## Cómo confirmarlo en 30 segundos (browser)

Logueado, DevTools → Network → click "Generar PDF":
- ¿El `POST /chat/{id}/action` responde **200** con `result.pdf_base64`? (debería).
- En Console, ¿hay algún error?
- En React DevTools, comparar el `currentChatId` del hook con el `id` del chat visible / el `[id]`
  de la URL (`app/[locale]/(app)/chat/[id]/page.tsx`).

Si el `200` trae el PDF (lo esperado) → el bug es 100% el render/append del file card.

## Fix recomendado

Hacer que el report **dispare la descarga automática apenas llega el `200`**, en vez de depender
del segundo click sobre `OdooFileCard` y de que el mensaje caiga en el chat correcto.

En `hooks/use-chat.ts`, dentro de `executeAction`, cuando
`result.result?.action === "report" || "report_combined"`:

1. Reutilizar la lógica de `downloadActionReport` (hoy vive en `odoo-file-card.tsx:14-26` —
   conviene extraerla a un util compartido, p. ej. `lib/download.ts`) y llamarla **inmediatamente**
   con `result.result.pdf_base64 / filename / mimetype`.
2. Opcional: seguir mostrando el `OdooFileCard` como registro/“volver a descargar”, pero la
   descarga ya no depende de él.

Así "Generar PDF" baja el archivo directo y se elimina la dependencia del estado de `currentChatId`.

Aplica igual al equivalente Excel/`report_grouped` (`agg-report-card.tsx` / `executeAggReportAction`),
que ya hace descarga directa por Blob — conviene que todos los reports usen el mismo util.

## Contrato backend (para referencia, no cambia)

- Endpoint: `POST /chat/{id}/action`, body `{ config_id, action: "confirm_action", context, language }`.
- `context` para report_offer (lo manda `ReportOfferCard`):
  `{ action: "report", model, vals: {}, domain, total_count, target_ids: null, method: null, canonical_verb: null, status: "pending_confirmation" }`.
- Respuesta `200`: `{ status: "ok", message, result: { action: "report", model, ids, pdf_base64, filename, mimetype } }`.
- El back resuelve `target_ids` desde `domain` (cap 1000) cuando no vienen ids — no hay que mandarlos.
