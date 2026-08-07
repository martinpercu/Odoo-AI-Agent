"use client";

import { useTranslations } from "next-intl";

import type { RoutineAttribution, RoutineContribution } from "@/lib/types";

/**
 * La atribución: quién explica la variación (PLAN_RUTINAS Fase 2, F4).
 *
 * Es la operación que produce el salto de "reporta" a "explica". No que las ventas
 * bajaron 18%: QUIÉN las bajó.
 *
 * Tres cosas que este render **no** puede perder, porque son la información:
 *
 * 1. **Las altas y las bajas se marcan.** Un cliente que existe en un período y no en
 *    el otro no es un cero: es "empezó a comprar" o "dejó de comprar", y esa es
 *    justamente la información que el dueño quiere.
 * 2. **La cola se muestra agregada.** "el resto se reparte entre 40" es información;
 *    omitirla hace parecer que los primeros son todo.
 * 3. **El signo y la etiqueta cargan el significado**, no el color. Nunca sólo color.
 */

const KIND_TONE = {
  alta: "bg-success-subtle text-success-solid",
  baja: "bg-error-subtle text-error",
  cambio: "bg-raised text-text-muted",
} as const;

export function RoutineAttributionTable({
  attribution,
  narrative,
  formatAmount,
}: {
  attribution: RoutineAttribution;
  narrative?: string;
  formatAmount: (value: number) => string;
}) {
  const t = useTranslations("Routines");
  const { top, rest } = attribution;

  if (top.length === 0) {
    return <p className="text-small text-text-muted">{t("attribution.empty")}</p>;
  }

  return (
    <div>
      {/* La frase primero: es la lectura. La tabla son los números que la sostienen. */}
      {narrative && <p className="mb-3 text-body text-text-secondary">{narrative}</p>}

      <ul className="space-y-2">
        {top.map((c) => (
          <ContributionRow key={c.label} contribution={c} formatAmount={formatAmount} />
        ))}
        {rest.count > 0 && (
          <li className="flex items-center justify-between gap-3 rounded-btn border border-dashed border-border px-3 py-2">
            <span className="min-w-0 truncate text-small text-text-muted">
              {t("attribution.rest", { count: rest.count })}
            </span>
            <span className="shrink-0 text-small tabular-nums text-text-muted">
              {signed(rest.delta, formatAmount)}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

function ContributionRow({
  contribution,
  formatAmount,
}: {
  contribution: RoutineContribution;
  formatAmount: (value: number) => string;
}) {
  const t = useTranslations("Routines");
  const { label, delta, kind } = contribution;

  return (
    <li className="flex items-center justify-between gap-3 rounded-btn border border-border bg-base px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-small text-foreground">{label}</span>
        {/* Una alta o una baja se DICEN. Sin esto, "0" se lee como "no vendió nada"
            en vez de "dejó de ser cliente", que es lo accionable. */}
        {kind !== "cambio" && (
          <span
            className={`shrink-0 rounded-btn px-1.5 py-0.5 text-micro font-medium ${KIND_TONE[kind]}`}
          >
            {t(`attribution.kind.${kind}`)}
          </span>
        )}
      </div>
      <span
        className={`shrink-0 text-small font-medium tabular-nums ${
          delta > 0 ? "text-success-solid" : delta < 0 ? "text-error" : "text-text-muted"
        }`}
      >
        {signed(delta, formatAmount)}
      </span>
    </li>
  );
}

/** El signo va SIEMPRE, no sólo el color: es lo que se lee en blanco y negro. */
function signed(value: number, formatAmount: (v: number) => string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatAmount(Math.abs(value))}`;
}
