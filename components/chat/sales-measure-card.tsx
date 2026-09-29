"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, FileText, ShoppingCart } from "lucide-react";
import type { SalesMeasureSelectionMetadata } from "@/lib/types";

interface SalesMeasureCardProps {
  metadata: SalesMeasureSelectionMetadata;
  /** `value` se manda como mensaje; `label` es lo que muestra la burbuja (X-07). */
  onSelect: (value: string, label: string) => void;
  /** X-05 — la opción ya elegida al reabrir el chat. */
  initialSelected?: string;
}

/**
 * X-03 — "ventas": ¿pedidos de venta o facturación? (A4, A19, AA-5).
 *
 * No es una pregunta que bloquee: el número ya llegó calculado con la fuente `current`,
 * que se marca como la vigente y no se vuelve a ofrecer (tocarla re-preguntaría lo mismo).
 * La otra se manda como un mensaje normal, igual que `stage_drilldown`.
 *
 * ⚠️ **No se guarda nada en el navegador.** La elección vale sólo para este chat y la
 * recuerda el backend en el estado del hilo (A19); un chat nuevo vuelve a preguntar.
 */
export function SalesMeasureCard({ metadata, onSelect, initialSelected }: SalesMeasureCardProps) {
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
        // Marcada: la elegida en este chat o, si no se eligió nada, la fuente vigente.
        const isOn = picked !== null ? picked === option.value : option.selected;
        const isDisabled = picked !== null || option.selected;
        const Icon = option.source === "invoices" ? FileText : ShoppingCart;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePick(option.value, option.label)}
            disabled={isDisabled}
            aria-pressed={isOn}
            className={`flex min-h-input items-center gap-2 rounded-btn border px-3 text-small transition-colors ${
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
