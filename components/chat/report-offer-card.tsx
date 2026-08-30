"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import type { ActionContext, ReportOfferOption, ReportOfferSelectionMetadata } from "@/lib/types";

interface ReportOfferCardProps {
  metadata: ReportOfferSelectionMetadata;
  onAction: (ctx: ActionContext) => Promise<void>;
  /**
   * Excel de un listado crudo (quick-wins §6). Descarga directa, no pasa por el
   * flujo de tarjeta de éxito: el usuario pidió un archivo, no una confirmación.
   */
  onExcel?: (option: ReportOfferOption) => Promise<void>;
}

/**
 * La oferta de reporte de un listado — **no bloqueante**.
 *
 * Clickear postea a `/chat/{id}/action`; **nunca** manda la opción como mensaje de
 * chat, porque el usuario puede ignorarla y seguir escribiendo.
 *
 * ⭐ **Dos botones desde quick-wins §6, no uno.** El PDF sirve para presentar; el
 * Excel, para trabajar: *"exportame estas 300 facturas con todas sus columnas"* es
 * lo que más pide un administrativo, y un PDF no se filtra, no se ordena y no se
 * pega en otra planilla.
 */
export function ReportOfferCard({ metadata, onAction, onExcel }: ReportOfferCardProps) {
  // Estado POR OPCIÓN: con un solo `state` compartido, clickear el PDF dejaba el
  // botón de Excel también en "listo".
  const [states, setStates] = useState<Record<string, "idle" | "loading" | "done">>({});

  const options = metadata.options ?? [];
  if (options.length === 0) return null;

  async function handleClick(option: ReportOfferOption) {
    if ((states[option.value] ?? "idle") !== "idle") return;
    setStates((prev) => ({ ...prev, [option.value]: "loading" }));
    try {
      if (option.action === "report_listing_excel") {
        // El backend devuelve el .xlsx en base64; la descarga la dispara el caller,
        // que es quien sabe crear un Blob (mismo camino que `agg_report`).
        if (!onExcel) throw new Error("no excel handler");
        await onExcel(option);
      } else {
        await onAction({
          action: "report",
          model: option.model,
          vals: option.vals,
          domain: option.domain,
          total_count: option.total_count,
          target_ids: null,
          method: null,
          canonical_verb: null,
          status: "pending_confirmation",
        });
      }
      setStates((prev) => ({ ...prev, [option.value]: "done" }));
    } catch {
      setStates((prev) => ({ ...prev, [option.value]: "idle" }));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 flex flex-wrap gap-2 rounded-card border border-border bg-surface p-3"
    >
      {options.map((option) => {
        const state = states[option.value] ?? "idle";
        const isExcel = option.action === "report_listing_excel";
        // El Excel se oculta si el caller no sabe descargarlo, en vez de ofrecer un
        // botón que no hace nada.
        if (isExcel && !onExcel) return null;

        return (
          <button
            key={option.value}
            onClick={() => handleClick(option)}
            disabled={state !== "idle"}
            className={`flex flex-1 items-center gap-3 rounded-btn px-3 py-2 text-left text-body transition-colors ${
              state === "done"
                ? "cursor-default border border-accent/30 bg-accent-subtle text-accent"
                : state === "loading"
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-raised"
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border">
              {state === "loading" ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : state === "done" ? (
                <CheckCircle2 size={14} strokeWidth={1.5} />
              ) : isExcel ? (
                <FileSpreadsheet size={14} strokeWidth={1.5} />
              ) : (
                <FileText size={14} strokeWidth={1.5} />
              )}
            </span>
            <span className="flex-1">{option.label}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
