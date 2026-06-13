import type { MeResponse } from "@/lib/types";

/** Persisted when the user chooses to keep using demo instead of setting up an instance now. */
export const ONBOARDING_SKIPPED_KEY = "toa_onboarding_skipped";

export function isOnboardingSkipped(): boolean {
  try { return localStorage.getItem(ONBOARDING_SKIPPED_KEY) === "1"; } catch { return false; }
}
export function setOnboardingSkipped() {
  try { localStorage.setItem(ONBOARDING_SKIPPED_KEY, "1"); } catch { /* ignore */ }
}
export function clearOnboardingSkipped() {
  try { localStorage.removeItem(ONBOARDING_SKIPPED_KEY); } catch { /* ignore */ }
}

/**
 * Where to send an authenticated user after the session bootstrap. Returns a path
 * segment (no locale prefix).
 *
 * The backend auto-provisions a SOLITARY org + ADMIN on the first request, so a fresh
 * signup already has an org but **no instance**. We show the first-instance gate
 * (`/onboarding`) whenever the user has zero instances (no-org legacy users included),
 * unless they opted to keep using demo.
 */
export function resolvePostAuthPath(meData: MeResponse): "superadmin" | "onboarding" | "chat" {
  const role = meData.user?.role;
  if (role === "SUPERADMIN") return "superadmin";

  const noOrg = !meData.org;
  const isAdmin = role === "ADMIN";
  const instanceCount = meData.odoo_configs?.length ?? 0;

  const needsFirstInstance = (noOrg || isAdmin) && instanceCount === 0;
  if (needsFirstInstance && !isOnboardingSkipped()) return "onboarding";

  return "chat";
}
