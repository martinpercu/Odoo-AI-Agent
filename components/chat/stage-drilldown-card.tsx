"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StageDrilldownSelectionMetadata } from "@/lib/types";

interface StageDrilldownCardProps {
  metadata: StageDrilldownSelectionMetadata;
  /** X-07 — `value` es lo que se manda; `label`, lo que la burbuja muestra. */
  onSelect: (value: string, label: string) => void;
  /** X-05 — el valor ya elegido al reabrir el chat (sale de `/history`). */
  initialSelected?: string;
}

/**
 * Non-blocking chip row for the `stage_drilldown` selection_prompt kind.
 * Each chip is a CRM stage with its prospect count baked into `label`.
 * Clicking sends `option.value` as a normal chat message — verbatim, no
 * transformation — via the same path as typing it in the input. The backend
 * matches it exactly against the options it just sent, so `stageId`/`count`
 * are informational only and must never be sent.
 */
export function StageDrilldownCard({ metadata, onSelect, initialSelected }: StageDrilldownCardProps) {
  const [selected, setSelected] = useState<string | null>(initialSelected ?? null);
  const t = useTranslations("ChatMessages");

  function handleSelect(value: string, label: string) {
    if (selected !== null) return;
    setSelected(value);
    onSelect(value, label);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 flex flex-wrap gap-2"
    >
      {metadata.options.map((option) => {
        const isSelected = selected === option.value;
        const isDisabled = selected !== null && !isSelected;

        return (
          <button
            key={option.stageId}
            onClick={() => handleSelect(option.value, option.label)}
            disabled={selected !== null}
            className={`flex items-center gap-2 rounded-btn border px-3 py-2 text-small transition-colors ${
              isSelected
                ? "border-accent/30 bg-accent-subtle text-accent cursor-default"
                : isDisabled
                  ? "border-border bg-surface opacity-40"
                  : "border-border bg-surface hover:bg-raised text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {isSelected ? (
                <Check size={14} strokeWidth={1.5} />
              ) : (
                <LayoutGrid size={14} strokeWidth={1.5} />
              )}
            </span>
            {option.label}
          </button>
        );
      })}
      {selected !== null && (
        <p className="w-full text-small text-text-secondary">
          {t("selection.selected", {
            name: metadata.options.find((o) => o.value === selected)?.label ?? "",
          })}
        </p>
      )}
    </motion.div>
  );
}
