"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import type { OdooConnectionStatus } from "@/lib/types";

/** Connection lifecycle (spec §4) + the "pending" invitation state, as a status pill. */
export type BadgeStatus = OdooConnectionStatus | "pending";

const STYLES: Record<BadgeStatus, { cls: string; Icon: typeof CheckCircle2 }> = {
  active: { cls: "bg-success-subtle text-success-solid", Icon: CheckCircle2 },
  unset: { cls: "bg-warning-subtle text-warning-solid", Icon: AlertTriangle },
  invalid: { cls: "bg-error-subtle text-error", Icon: ShieldAlert },
  pending: { cls: "bg-info-subtle text-info", Icon: Clock },
};

/**
 * Admin-facing (Builder) status pill for a user's Odoo Connection.
 * State is never conveyed by color alone (DS §14) — always icon + label.
 * Labels live under `Instances.status.*`.
 */
export function ConnectionStatusBadge({ status }: { status: BadgeStatus }) {
  const t = useTranslations("Instances.status");
  const { cls, Icon } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-btn px-2 py-0.5 text-micro font-medium ${cls}`}
    >
      <Icon size={13} strokeWidth={1.5} />
      {t(status)}
    </span>
  );
}
