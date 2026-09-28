"use client";

import { useState } from "react";
import { ChevronRight, Workflow, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export type TraceLevel = "ok" | "info" | "err" | "warn";

/**
 * B-24 — la consulta que DE VERDAD corrió `odoo_executor`. `domain` es el FINAL, con las
 * condiciones base que agrega el executor; con `cached: true` es el del turno.
 * Contrato: `odoo-agent-back/DOCS/front-contract-builder-trace.md` §9.
 */
export interface TraceDetail {
  model?: string;
  method?: string;
  domain?: unknown[];
  groupby?: string[];
  count?: number;
  cached?: boolean;
}

export interface TraceEntry {
  ts: string;
  level: TraceLevel;
  node: string;
  message: string;
  detail?: TraceDetail;
}

interface Props {
  entries: TraceEntry[];
}

/**
 * Las trazas del grafo (builder autenticado).
 *
 * ⚠️ F-08 — abierto es una COLUMNA del layout, no un panel `fixed` encima: flotando tapaba
 * el riel de pines y el borde derecho del input (el botón Enviar). Como columna, el chat
 * se angosta para hacerle lugar y nada queda debajo.
 */
export function LangGraphTracePanel({ entries }: Props) {
  const t = useTranslations("Builder.Trace");
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed z-50 hidden lg:flex rounded-md p-2 shadow-md bg-sidebar text-text-secondary transition-colors hover:bg-sidebar-active hover:text-foreground"
        style={{ bottom: "calc(var(--spacing) * 6)", right: "calc(var(--spacing) * 1.25)" }}
        aria-label={t("expand")}
        title={t("title")}
      >
        <Workflow size={20} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="deep-surface hidden h-screen shrink-0 flex-col overflow-hidden border-l border-border-subtle lg:flex"
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="font-technical-sm uppercase tracking-wider">{t("title")}</h2>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted hover:text-text-secondary"
          aria-label={t("collapse")}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </header>
      <ol className="w-[320px] flex-1 overflow-y-auto px-4 py-3 font-technical leading-[1.7]">
        {entries.length === 0 ? (
          <li className="deep-ts">{t("empty")}</li>
        ) : (
          entries.map((e, i) => <TraceRow key={i} entry={e} />)
        )}
      </ol>
    </motion.aside>
  );
}

/** Una línea; si trae `detail` (el executor), se expande con la consulta completa. */
function TraceRow({ entry: e }: { entry: TraceEntry }) {
  const t = useTranslations("Builder.Trace");
  const [open, setOpen] = useState(false);
  const line = (
    <>
      <span className="deep-ts">{e.ts}</span> <span className={`deep-${e.level}`}>[{e.node}]</span>{" "}
      <span>{e.message}</span>
    </>
  );
  if (!e.detail) return <li className="mb-1 break-words">{line}</li>;

  const d = e.detail;
  return (
    <li className="mb-1 break-words">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-1 text-left"
      >
        <ChevronRight
          size={12}
          strokeWidth={1.5}
          className={`mt-[5px] shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="min-w-0">{line}</span>
      </button>
      {open && (
        <dl className="mb-2 ml-4 mt-1 space-y-0.5 border-l border-border-subtle pl-2 text-micro">
          <DetailRow label={t("detail.model")} value={d.model} />
          <DetailRow label={t("detail.method")} value={d.method} />
          {d.groupby && d.groupby.length > 0 && (
            <DetailRow label={t("detail.groupby")} value={d.groupby.join(", ")} />
          )}
          {d.count != null && <DetailRow label={t("detail.count")} value={String(d.count)} />}
          {d.cached && <DetailRow label={t("detail.cached")} value="✓" />}
          <div>
            <dt className="deep-ts">{t("detail.domain")}</dt>
            <dd>
              {Array.isArray(d.domain) && d.domain.length > 0 ? (
                // Una condición por línea: un dominio en una sola línea no se puede leer.
                <ul>
                  {d.domain.map((cond, i) => (
                    <li key={i} className="break-all">
                      {JSON.stringify(cond)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="deep-ts">[]</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="deep-ts shrink-0">{label}</dt>
      <dd className="min-w-0 break-all">{value}</dd>
    </div>
  );
}
