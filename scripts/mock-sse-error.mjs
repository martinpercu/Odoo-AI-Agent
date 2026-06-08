// Harness that replicates the SSE parsing state-machine from hooks/use-chat.ts
// (lines ~382-476) verbatim, then feeds it a mocked stream containing partial
// `text` chunks followed by the new `{type:"error", detail}` event.
//
// Asserts: (a) streaming flag goes false, (b) final message content keeps the
// partial text and appends the localized `detail` with a ⚠️ prefix, (c) the
// reader is cancelled (terminal — no waiting for more events).

// --- mock SSE stream (exactly what the browser's reader would receive) ---
function makeStream(events) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.close();
    },
  });
}

// fallback translator stub (mirrors t("connectionError"))
const t = (k) => (k === "connectionError" ? "No se pudo conectar. Revisá las credenciales." : k);

async function run(events, label) {
  // --- mocked React-ish state ---
  let message = { id: "assistant-1", content: "", charts: undefined, watermark: undefined };
  let isStreaming = true;
  let readerCancelled = false;

  const updateChat = (_id, updater) => {
    const next = updater({ messages: [message] });
    message = next.messages.find((m) => m.id === "assistant-1");
  };

  const res = { ok: true, status: 200, body: makeStream(events) };
  const baseReader = res.body.getReader();
  const reader = {
    read: () => baseReader.read(),
    cancel: () => { readerCancelled = true; return baseReader.cancel(); },
  };

  // ===== begin verbatim-mirrored parsing loop from use-chat.ts =====
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  let charts = [];
  let showWatermark = undefined;
  const targetId = "chat-1";
  const assistantId = "assistant-1";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          let text = "";
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              if ("step" in parsed) continue;
              if ("type" in parsed) {
                if (parsed.type === "text") {
                  text = parsed.content || "";
                } else if (parsed.type === "chart") {
                  charts = [...charts, parsed];
                  text = "";
                } else if (parsed.type === "watermark") {
                  showWatermark = typeof parsed.show === "boolean" ? parsed.show : true;
                  continue;
                } else if (parsed.type === "error") {
                  const detail =
                    typeof parsed.detail === "string" && parsed.detail
                      ? parsed.detail
                      : t("connectionError");
                  const finalContent = accumulated
                    ? `${accumulated}\n\n⚠️ ${detail}`
                    : `⚠️ ${detail}`;
                  updateChat(targetId, (c) => ({
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: finalContent,
                            ...(charts.length > 0 && { charts }),
                            watermark: showWatermark,
                          }
                        : m
                    ),
                  }));
                  reader.cancel();
                  // mirror of finally{}: streaming stops on return
                  isStreaming = false;
                  return { message, isStreaming, readerCancelled, label };
                } else {
                  continue;
                }
              } else if ("content" in parsed) {
                text = parsed.content;
              } else {
                continue;
              }
            }
          } catch {
            text = raw;
          }

          accumulated += text;
          updateChat(targetId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, ...(charts.length > 0 && { charts }), watermark: showWatermark }
                : m
            ),
          }));
        }
      }
    }
  } finally {
    isStreaming = false;
  }
  return { message, isStreaming, readerCancelled, label };
}

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
  else console.log(`  ✅ ${msg}`);
}

const cases = [
  {
    label: "partial text + error",
    events: [
      { type: "watermark", show: true },
      { type: "text", content: "Las ventas de " },
      { type: "text", content: "este mes son" },
      { type: "error", detail: "Ocurrió un error procesando tu consulta. Por favor, intentá de nuevo." },
      { type: "text", content: " ESTO NO DEBERÍA APARECER" },
    ],
    check: (r) => {
      assert(r.isStreaming === false, "(a) sale del estado loading/streaming");
      assert(
        r.message.content ===
          "Las ventas de este mes son\n\n⚠️ Ocurrió un error procesando tu consulta. Por favor, intentá de nuevo.",
        "(b) conserva texto parcial + muestra el detail tal cual con ⚠️"
      );
      assert(!r.message.content.includes("NO DEBERÍA"), "(c) ignora eventos posteriores (terminal)");
      assert(r.readerCancelled === true, "(c) reader.cancel() llamado");
    },
  },
  {
    label: "error sin texto previo",
    events: [
      { type: "watermark", show: true },
      { type: "error", detail: "An error occurred. Please try again." },
    ],
    check: (r) => {
      assert(r.isStreaming === false, "sale del loading");
      assert(r.message.content === "⚠️ An error occurred. Please try again.", "muestra solo el error con ⚠️");
    },
  },
  {
    label: "error con detail vacío → fallback i18n",
    events: [{ type: "error", detail: "" }],
    check: (r) => {
      assert(
        r.message.content === "⚠️ No se pudo conectar. Revisá las credenciales.",
        "usa fallback t('connectionError') cuando detail viene vacío"
      );
    },
  },
];

for (const c of cases) {
  console.log(`\n▶ ${c.label}`);
  const r = await run(c.events, c.label);
  c.check(r);
}

console.log(process.exitCode ? "\n💥 Falló alguna aserción" : "\n🎉 Todo OK");
