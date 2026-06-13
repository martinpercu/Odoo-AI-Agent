"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle, ShieldAlert, Clock, Users } from "lucide-react";
import type { InstanceCounts, InstanceSeats } from "@/lib/types";

interface StatProps {
  Icon: typeof CheckCircle2;
  value: number;
  label: string;
  tone: string;
}

function Stat({ Icon, value, label, tone }: StatProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} strokeWidth={1.5} className={tone} />
      <span className="font-technical text-body font-medium text-foreground">{value}</span>
      <span className="text-small text-text-muted">{label}</span>
    </div>
  );
}

/**
 * Contadores de una instancia de un vistazo (spec §6 InstanceHealthSummary):
 * activos / sin-creds / inválidas / pendientes + uso de seats.
 */
export function InstanceHealthSummary({
  counts,
  seats,
}: {
  counts: InstanceCounts;
  seats?: InstanceSeats;
}) {
  const t = useTranslations("Instances.health");
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Stat Icon={CheckCircle2} value={counts.active} label={t("active")} tone="text-success-solid" />
      <Stat Icon={AlertTriangle} value={counts.unset} label={t("unset")} tone="text-warning-solid" />
      {counts.invalid > 0 && (
        <Stat Icon={ShieldAlert} value={counts.invalid} label={t("invalid")} tone="text-error" />
      )}
      <Stat Icon={Clock} value={counts.pending} label={t("pending")} tone="text-info" />
      {seats && (
        <Stat
          Icon={Users}
          value={seats.paid_used + seats.free_used}
          label={t("seats", { total: seats.paid_total + seats.free_total })}
          tone="text-text-secondary"
        />
      )}
    </div>
  );
}
