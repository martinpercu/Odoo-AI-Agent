"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RoutinePctChange } from "@/lib/types";

/**
 * Un valor con su variación (PLAN_RUTINAS Fase 2, F3).
 *
 * Es lo que convierte un dato en una noticia: "₲1.500" no dice nada; "₲1.500, +400%
 * contra el mismo mes del año pasado" sí.
 *
 * ⚠️ **`direction: "nuevo"` NO es "+100%".** Cuando el período de comparación fue cero
 * no hay base contra la cual medir, y mostrar un porcentaje ahí sería inventarlo. Se
 * muestra una etiqueta distinta, con otro icono.
 *
 * ⚠️ **Nunca sólo color.** La flecha y el signo cargan el significado; el color
 * acompaña. Un daltónico y un PDF en blanco y negro tienen que leer lo mismo.
 */

const TONE = {
  up: "text-success-solid",
  down: "text-error",
  flat: "text-text-muted",
  nuevo: "text-info",
} as const;

function Icon({ direction, size }: { direction: RoutinePctChange["direction"]; size: number }) {
  const common = { size, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (direction === "up") return <ArrowUpRight {...common} />;
  if (direction === "down") return <ArrowDownRight {...common} />;
  if (direction === "nuevo") return <Sparkles {...common} />;
  return <Minus {...common} />;
}

export function RoutineDelta({
  change,
  size = "md",
}: {
  change: RoutinePctChange;
  size?: "sm" | "md";
}) {
  const t = useTranslations("Routines");
  const direction = change.direction;
  const iconSize = size === "sm" ? 14 : 16;

  // Sin base de comparación no hay porcentaje que mostrar — y el texto lo dice.
  const text =
    direction === "nuevo"
      ? t("delta.new")
      : direction === "flat"
        ? t("delta.flat")
        : `${direction === "up" ? "+" : "−"}${formatPct(change.pct)}`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-small font-medium ${TONE[direction]}`}
      title={t(`delta.title.${direction}`)}
    >
      <Icon direction={direction} size={iconSize} />
      {text}
    </span>
  );
}

function formatPct(pct: number | null): string {
  if (pct === null) return "";
  const abs = Math.abs(pct);
  // Sin decimales cuando son redondos: "400%" se lee mejor que "400,00%".
  return `${Number.isInteger(abs) ? abs : abs.toFixed(2)}%`;
}

/**
 * Una tarjeta de número: el valor grande, su delta al lado y la frase del backend
 * abajo. La frase (`narrative`) viene ya redactada por B7 — el front **no** la
 * reescribe: el agente habla 6 idiomas y esta UI 11, y duplicar las plantillas sería
 * garantizar que difieran.
 */
export function RoutineValueCard({
  label,
  value,
  change,
  narrative,
}: {
  label: string;
  value: string;
  change?: RoutinePctChange;
  narrative?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-base p-4">
      <p className="text-micro uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-heading tabular-nums">{value}</span>
        {change && <RoutineDelta change={change} />}
      </div>
      {narrative && <p className="mt-2 text-small text-text-secondary">{narrative}</p>}
    </div>
  );
}
