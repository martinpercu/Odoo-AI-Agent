"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import type { ReportOfferSelectionMetadata, ActionContext } from "@/lib/types";

interface ReportOfferCardProps {
  metadata: ReportOfferSelectionMetadata;
  onAction: (ctx: ActionContext) => Promise<void>;
}

/**
 * Non-blocking "Generar PDF" button for the `report_offer` selection_prompt kind.
 * Clicking POSTs to /chat/{id}/action with the domain-based report context.
 * Must NOT send the option as a chat message — the user can ignore it and keep typing.
 */
export function ReportOfferCard({ metadata, onAction }: ReportOfferCardProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const option = metadata.options[0];

  if (!option) return null;

  async function handleClick() {
    if (state !== "idle") return;
    setState("loading");
    try {
      const ctx: ActionContext = {
        action: "report",
        model: option.model,
        vals: option.vals,
        domain: option.domain,
        total_count: option.total_count,
        target_ids: null,
        method: null,
        canonical_verb: null,
        status: "pending_confirmation",
      };
      await onAction(ctx);
      setState("done");
    } catch {
      setState("idle");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-card border border-border bg-surface p-3"
    >
      <button
        onClick={handleClick}
        disabled={state !== "idle"}
        className={`flex items-center gap-3 rounded-btn px-3 py-2 text-left text-body transition-colors w-full ${
          state === "done"
            ? "border border-accent/30 bg-accent-subtle text-accent cursor-default"
            : state === "loading"
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-raised"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border">
          {state === "loading" ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : state === "done" ? (
            <CheckCircle2 size={14} strokeWidth={1.5} />
          ) : (
            <FileText size={14} strokeWidth={1.5} />
          )}
        </span>
        <span className="flex-1">{option.label}</span>
      </button>
    </motion.div>
  );
}
