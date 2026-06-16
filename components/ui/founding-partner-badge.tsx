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

  // Founder identity (orthogonal to org.type). Default-true semantics: absent
  // on older payloads → shown during beta; only an explicit `false` (a
  // non-founder org created post-graduation) hides it.
  if (meData?.org?.is_founding_partner === false) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-btn bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent ${className}`}
    >
      <Star size={11} strokeWidth={1.5} className="shrink-0" />
      {t("badge")}
    </span>
  );
}
