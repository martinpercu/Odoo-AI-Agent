"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SelectionPromptMetadata } from "@/lib/types";

interface SelectionCardProps {
  metadata: SelectionPromptMetadata;
  onSelect: (value: string) => void;
}

export function SelectionCard({ metadata, onSelect }: SelectionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const t = useTranslations("ChatMessages");

  function handleSelect(index: number) {
    if (selected !== null) return;
    setSelected(index);
    onSelect(String(index));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex flex-col gap-1.5">
        {metadata.options.map((option) => {
          const isSelected = selected === option.index;
          const isDisabled = selected !== null && !isSelected;

          return (
            <button
              key={option.index}
              onClick={() => handleSelect(option.index)}
              disabled={selected !== null}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isSelected
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : isDisabled
                    ? "opacity-40"
                    : "hover:bg-muted"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                {isSelected ? <Check size={14} /> : option.index}
              </span>
              <span className="flex-1">{option.name}</span>
              <span className="text-xs text-muted-foreground">ID: {option.id}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("selection.selected", { name: metadata.options.find((o) => o.index === selected)?.name ?? "" })}
        </p>
      )}
    </motion.div>
  );
}
