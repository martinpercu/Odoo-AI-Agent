"use client";

import { CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useInstanceUsage } from "@/hooks/use-instance-usage";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { formatDataUntil, shouldShowDataUntil } from "@/lib/data-until";

/**
 * X-04 — "Datos hasta julio de 2026" para la instancia ACTIVA.
 *
 * Lee el mismo `instance-usage` que el resumen y el carrusel (una sola respuesta por
 * instancia, F-01), así que no suma pedidos. No dibuja nada mientras no llegó el dato o
 * cuando no vale la pena decirlo (`shouldShowDataUntil`).
 */
export function DataUntilBadge({ className = "" }: { className?: string }) {
  const t = useTranslations("DataUntil");
  const locale = useLocale();
  const { activeConfigId, isDemoMode } = useOdooConfig();
  const dataUntil = useInstanceUsage(activeConfigId)?.dataUntil ?? null;

  if (!dataUntil || !shouldShowDataUntil(dataUntil, isDemoMode)) return null;
  const date = formatDataUntil(dataUntil, locale);
  if (!date) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${className}`}
      title={isDemoMode ? t("hintDemo") : t("hint")}
    >
      <CalendarClock size={14} strokeWidth={1.5} className="shrink-0" aria-hidden />
      {t("label", { date })}
    </span>
  );
}
