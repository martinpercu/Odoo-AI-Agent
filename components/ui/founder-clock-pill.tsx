"use client";

/**
 * Founder free-beta clock pill (Fase 0).
 *
 * A subtle, always-visible "X days left in the program" mini-pill, designed to
 * float at the top-left of the founder dashboard (Settings). It reads the
 * per-org clock from `/me → org` (`days_left`), so it mirrors `/billing/state`
 * without an extra request.
 *
 * Gating (same white-label guarantee as the FoundingPartner badge):
 * - Builder only (ADMIN / SUPERADMIN) — never shown to Client users.
 * - Real founder only — `is_founding_partner !== false` and the clock has
 *   started (`days_left != null`, set when the founder connects their first
 *   instance). Before that, nothing renders.
 *
 * Informative, not enforcement: hitting 0 days does NOT cut access — it's a
 * heads-up. Color shifts to warning ≤ 7 days and error at 0.
 */

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { useSession } from "@/hooks/use-session";

interface FounderClockPillProps {
  className?: string;
}

export function FounderClockPill({ className = "" }: FounderClockPillProps) {
  const t = useTranslations("FoundingPartner");
  const { meData } = useSession();

  const role = meData?.user?.role;
  const isBuilder = role === "ADMIN" || role === "SUPERADMIN";
  if (!isBuilder) return null;

  const org = meData?.org;
  if (org?.is_founding_partner === false) return null;

  const days = org?.days_left;
  if (days == null) return null;

  const tone =
    days <= 0
      ? "bg-error-subtle text-error border-error/20"
      : days <= 7
        ? "bg-warning-subtle text-warning-solid border-warning-solid/20"
        : "bg-accent-subtle text-accent border-accent/20";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-btn border px-2.5 py-1 text-micro font-medium shadow-sm backdrop-blur ${tone} ${className}`}
      title={t("clockTooltip")}
    >
      <Clock size={12} strokeWidth={1.5} className="shrink-0" />
      {days <= 0 ? t("clockExpired") : t("clockDaysLeft", { days })}
    </span>
  );
}
