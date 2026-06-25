"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import type { AggReportSelectionMetadata, AggReportOption } from "@/lib/types";

interface AggReportCardProps {
  metadata: AggReportSelectionMetadata;
  onPick: (opt: AggReportOption) => Promise<void>;
}

/**
 * Non-blocking two-button chip for the `agg_report` selection_prompt kind.
 * Renders a "Reporte PDF" and an "Excel" button; each POSTs to /chat/{id}/action
 * with `action: "report_grouped"` and triggers a direct Blob download.
 * The user can ignore the chip and keep typing.
 */
export function AggReportCard({ metadata, onPick }: AggReportCardProps) {
  const [loadingValue, setLoadingValue] = useState<string | null>(null);
  const [doneValues, setDoneValues] = useState<Set<string>>(new Set());

  async function handleClick(opt: AggReportOption) {
    if (loadingValue !== null || doneValues.has(opt.value)) return;
    setLoadingValue(opt.value);
    try {
      await onPick(opt);
      setDoneValues((prev) => new Set(prev).add(opt.value));
    } catch {
      // leave idle so the user can retry
    } finally {
      setLoadingValue(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 flex flex-wrap gap-2"
    >
      {metadata.options.map((opt) => {
        const isLoading = loadingValue === opt.value;
        const isDone = doneValues.has(opt.value);
        const isDisabled = loadingValue !== null || isDone;
        const Icon = opt.format === "excel" ? FileSpreadsheet : FileText;

        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt)}
            disabled={isDisabled}
            aria-label={opt.label}
            className={`flex items-center gap-2 rounded-btn border px-3 py-2 text-small transition-colors ${
              isDone
                ? "border-accent/30 bg-accent-subtle text-accent cursor-default"
                : isLoading
                  ? "border-border bg-surface opacity-60 cursor-not-allowed text-foreground"
                  : "border-border bg-surface hover:bg-raised text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {isLoading ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : isDone ? (
                <CheckCircle2 size={14} strokeWidth={1.5} />
              ) : (
                <Icon size={14} strokeWidth={1.5} />
              )}
            </span>
            {opt.label}
          </button>
        );
      })}
    </motion.div>
  );
}
