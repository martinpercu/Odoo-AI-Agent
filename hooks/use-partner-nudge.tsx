"use client";

/**
 * Surface C — Partner reframe nudge (spec §6).
 *
 * Turns "what a nice tool" into "I can resell this". It is event-driven, not
 * timer-driven: it auto-expands once, after the SECOND successful agent response
 * in demo mode (two queries that returned data) — it must arrive *after* the aha,
 * not before.
 *
 * State machine (per browser session for the counter; dismissal persisted like modal A):
 *   hidden  → (2nd demo success, not dismissed) → expanded
 *   expanded → minimize() → pill   (persists dismissed, never auto-animates again)
 *   pill     → expand()   → expanded (manual re-open; one tap away)
 *
 * Once the lead minimizes or acts, we don't re-animate it in the same session.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useChatContext } from "@/components/app-shell";

const DISMISSED_KEY = "toa_partner_nudge_dismissed";
const SUCCESS_THRESHOLD = 2;

export type PartnerNudgeView = "hidden" | "expanded" | "pill";

interface PartnerNudgeContextType {
  view: PartnerNudgeView;
  /** Collapse the expanded nudge to the persistent pill; remembered across sessions. */
  minimize: () => void;
  /** Re-open from the pill (no entrance animation gating — always one tap away). */
  expand: () => void;
}

const PartnerNudgeContext = createContext<PartnerNudgeContextType | null>(null);

export function usePartnerNudge() {
  const ctx = useContext(PartnerNudgeContext);
  if (!ctx) throw new Error("usePartnerNudge must be used within PartnerNudgeProvider");
  return ctx;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function PartnerNudgeProvider({ children }: { children: React.ReactNode }) {
  const { isDemoMode } = useOdooConfig();
  const { isStreaming, currentChat } = useChatContext();

  const [view, setView] = useState<PartnerNudgeView>("hidden");
  // Counter is intentionally in-memory: it tracks a single demo play. Client-side
  // navigation keeps AppShell mounted, so it survives moving between /chat pages.
  const successCount = useRef(0);
  const prevStreaming = useRef(isStreaming);
  const dismissed = useRef(false);

  // On mount: if the lead already dismissed the nudge in a previous session,
  // surface the persistent pill (in demo) instead of nothing — partner angle stays a tap away.
  useEffect(() => {
    dismissed.current = readDismissed();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from localStorage (browser-only)
    if (dismissed.current) setView("pill");
  }, []);

  // Count successful demo responses on each stream completion.
  useEffect(() => {
    const wasStreaming = prevStreaming.current;
    prevStreaming.current = isStreaming;
    if (wasStreaming === isStreaming) return;
    // Transition streaming → done.
    if (wasStreaming && !isStreaming && isDemoMode) {
      const last = currentChat?.messages.at(-1);
      const succeeded = last?.role === "assistant" && last.content.trim().length > 0;
      if (!succeeded) return;
      successCount.current += 1;
      if (
        successCount.current >= SUCCESS_THRESHOLD &&
        !dismissed.current &&
        view === "hidden"
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- event-driven: reacts to a stream-completion transition
        setView("expanded");
      }
    }
  }, [isStreaming, isDemoMode, currentChat, view]);

  const minimize = useCallback(() => {
    setView("pill");
    dismissed.current = true;
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const expand = useCallback(() => setView("expanded"), []);

  return (
    <PartnerNudgeContext.Provider value={{ view, minimize, expand }}>
      {children}
    </PartnerNudgeContext.Provider>
  );
}
