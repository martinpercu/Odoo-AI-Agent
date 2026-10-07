"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, Check, History } from "lucide-react";
import type { ScopeOfferSelectionMetadata } from "@/lib/types";

interface ScopeOfferCardProps {
  metadata: ScopeOfferSelectionMetadata;
  /** `value` se manda como mensaje; `label` es lo que muestra la burbuja (X-07). */
  onSelect: (value: string, label: string) => void;
  /** X-05 — la opción ya elegida al reabrir el chat. */
  initialSelected?: string;
}

/** Las lecturas más amplias (con vencidas, toda la historia) llevan el ícono de historia. */
const WIDER_KEYS = new Set(["with_overdue", "all_time"]);

/**
 * Ofertas de alcance — `deadline_scope` y `summary_period` (back `helpers/scope_offers.py`).
 *
 * Mismo patrón que `SalesMeasureCard`: el número ya llegó calculado con la lectura
 * `current`, que se marca como la vigente y no se vuelve a ofrecer. La otra se manda como
 * un mensaje normal con `sendChoice`, nunca a `/action`. Las etiquetas (con su conteo)
 * llegan ya escritas del backend.
 */
export function ScopeOfferCard({ metadata, onSelect, initialSelected }: ScopeOfferCardProps) {
  const [picked, setPicked] = useState<string | null>(initialSelected ?? null);

  function handlePick(value: string, label: string) {
    if (picked !== null) return;
    setPicked(value);
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
        // Marcada: la elegida en este chat o, si no se eligió nada, la lectura vigente.
        const isOn = picked !== null ? picked === option.value : option.selected;
        const isDisabled = picked !== null || option.selected;
        const Icon = WIDER_KEYS.has(option.key) ? History : CalendarRange;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => handlePick(option.value, option.label)}
            disabled={isDisabled}
            aria-pressed={isOn}
            className={`flex min-h-input items-center gap-2 rounded-btn border px-3 text-left text-small transition-colors ${
              isOn
                ? "cursor-default border-accent/30 bg-accent-subtle text-accent"
                : isDisabled
                  ? "border-border bg-surface text-text-secondary opacity-60"
                  : "border-border bg-surface text-foreground hover:bg-raised"
            }`}
          >
            {isOn ? (
              <Check size={14} strokeWidth={1.5} aria-hidden />
            ) : (
              <Icon size={14} strokeWidth={1.5} aria-hidden />
            )}
            {option.label}
          </button>
        );
      })}
    </motion.div>
  );
}
