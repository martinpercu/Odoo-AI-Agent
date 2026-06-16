"use client";

/**
 * Founding Partner badge (Fase 0, spec §1).
 *
 * White-label guarantee: this badge renders **only** in Builder mode
 * (ADMIN / SUPERADMIN). It must never appear in Client mode — a
 * "Founding Partner" mark on the client side would reveal the product behind
 * the partner's white-label brand. The gating is architectural (role check),
 * so the implementer never has to hide it manually.
 *
 * Copy says "Founding Partner" (never "Beta") — status & belonging, not
 * an unfinished-product signal.
 *
 * Shown only for a *real* founder: one who has created their account **and**
 * connected + validated their first Odoo instance. That promotion moment is
 * exactly when the backend stamps `founder_since` (and flips the org to
 * PARTNER + grants the free-beta seats), so we gate on `founder_since` being
 * set rather than on the mere `is_founding_partner` identity flag.
 */

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { useSession } from "@/hooks/use-session";

interface FoundingPartnerBadgeProps {
  className?: string;
}

export function FoundingPartnerBadge({ className = "" }: FoundingPartnerBadgeProps) {
  const t = useTranslations("FoundingPartner");
  const { meData } = useSession();
  const role = meData?.user?.role;
  const isBuilder = role === "ADMIN" || role === "SUPERADMIN";

  // White-label: never render outside Builder mode.
  if (!isBuilder) return null;

  // Founder identity (orthogonal to org.type). An explicit `false` (a
  // non-founder org created post-graduation) hides it.
  if (meData?.org?.is_founding_partner === false) return null;

  // Real founder only: the clock starts when they connect + validate their
  // first instance (promotion). Before that, `founder_since` is null and the
  // badge stays hidden — a freshly-registered account isn't a founder "yet".
  if (!meData?.org?.founder_since) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-btn bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent ${className}`}
    >
      <Star size={11} strokeWidth={1.5} className="shrink-0" />
      {t("badge")}
    </span>
  );
}
