"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";

/**
 * Returns a translator scoped to either `Builder.<namespace>` or `Client.<namespace>`
 * depending on the current user's audience (role).
 *
 * Use for any string that should sound technical to admins/superadmins
 * and natural/non-technical to end users (CLIENT_USER + anonymous).
 *
 * Builder voice: ejecution-oriented, mono-friendly, exposes Odoo internals
 *   ("EJECUTANDO · fetch_records", "ValidationError")
 *
 * Client voice: concierge-style, no jargon, document numbers only
 *   ("Lista", "No pude conectarme con tu sistema")
 *
 * Keys must exist under BOTH `Builder.<ns>` and `Client.<ns>` in each
 * messages/*.json — keep them in lockstep.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAudienceT(namespace: string): any {
  const { meData } = useSession();
  const role = meData?.user?.role;
  const audience = role === "ADMIN" || role === "SUPERADMIN" ? "Builder" : "Client";
  return useTranslations(`${audience}.${namespace}`);
}
