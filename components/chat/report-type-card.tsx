"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KindedSelectionMetadata } from "@/lib/types";

interface ReportTypeCardProps {
  metadata: KindedSelectionMetadata;
  onSelect: (value: string) => void;
}

/**
 * Disambiguation buttons for `selection_prompt` variants that carry a `kind` field:
 * `report_type`, `partner_filter`, `salesperson_type`.
 * Labels arrive already localized from the backend. Clicking a button sends its
 * `value` as a normal chat message to /chat/{id}/stream.
 */
export function ReportTypeCard({ metadata, onSelect }: ReportTypeCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const t = useTranslations("ChatMessages");

  function handleSelect(value: string) {
    if (selected !== null) return;
    setSelected(value);
    onSelect(value);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-card border border-border bg-surface p-3"
    >
      <div className="flex flex-col gap-1.5">
        {metadata.options.map((option) => {
          const isSelected = selected === option.value;
          const isDisabled = selected !== null && !isSelected;
          const isSecondary = option.value === "todos";

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={selected !== null}
              className={`flex items-center gap-3 rounded-btn px-3 py-2 text-left text-body transition-colors ${
                isSelected
                  ? "border border-accent/30 bg-accent-subtle text-accent"
                  : isDisabled
                    ? "opacity-40"
                    : isSecondary
                      ? "text-text-secondary hover:bg-raised"
                      : "hover:bg-raised"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border ${isSecondary && !isSelected ? "opacity-60" : ""}`}>
                {isSelected ? (
                  <Check size={14} strokeWidth={1.5} />
                ) : (
                  <FileText size={14} strokeWidth={1.5} />
                )}
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-2 text-small text-text-secondary">
          {t("selection.selected", {
            name: metadata.options.find((o) => o.value === selected)?.label ?? "",
          })}
        </p>
      )}
    </motion.div>
  );
}
