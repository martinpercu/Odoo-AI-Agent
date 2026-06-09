"use client";

/**
 * Lightweight first-party analytics for the landing surfaces (intro modal + info panel).
 *
 * - Emits funnel events to the backend `POST /events` endpoint (see
 *   DOCS/to-marketing/PROMPT_Backend_Eventos.md for the contract).
 * - Captures and persists `utm_*` params so they can be associated with a later signup.
 * - Generates a stable anonymous `session_id` to stitch a visitor's events together.
 *
 * Fire-and-forget: this module must NEVER throw into the UI. All failures are swallowed.
 */

import { API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

const SESSION_KEY = "toa_session_id";
const UTM_KEY = "toa_utm";

const UTM_PARAMS = ["source", "medium", "campaign", "term", "content"] as const;
type UtmKey = (typeof UTM_PARAMS)[number];
type Utm = Partial<Record<UtmKey, string>>;

/** Allowlist — keep in sync with the backend allowlist. */
export type AnalyticsEventName =
  | "intro_modal_shown"
  | "intro_modal_dismissed"
  | "demo_started"
  | "example_prompt_clicked"
  | "connect_own_odoo_clicked"
  | "info_opened_from_panel"
  | "partner_cta_clicked";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Stable anonymous id for the visitor, persisted in localStorage. */
export function getSessionId(): string | null {
  if (!isBrowser()) return null;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Reads `utm_*` from the current URL and persists them (only when present, so we
 * never overwrite a real campaign attribution with an empty later visit).
 * Call once on app mount.
 */
export function captureUtm(): void {
  if (!isBrowser()) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    let found = false;
    for (const p of UTM_PARAMS) {
      const v = params.get(`utm_${p}`);
      if (v) {
        utm[p] = v;
        found = true;
      }
    }
    if (found) localStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* ignore */
  }
}

export function getUtm(): Utm | undefined {
  if (!isBrowser()) return undefined;
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as Utm) : undefined;
  } catch {
    return undefined;
  }
}

interface TrackOptions {
  /** Use navigator.sendBeacon — for events fired during page unload/dismissal. */
  beacon?: boolean;
}

/**
 * Emit a funnel event. Fire-and-forget; resolves even on network failure.
 */
export async function track(
  event: AnalyticsEventName,
  props?: Record<string, unknown>,
  options?: TrackOptions
): Promise<void> {
  if (!isBrowser()) return;

  const payload = {
    event,
    props: props ?? {},
    utm: getUtm(),
    session_id: getSessionId(),
    ts: new Date().toISOString(),
  };

  const url = `${API_BASE}/events`;
  const body = JSON.stringify(payload);

  try {
    if (options?.beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      // sendBeacon can't set headers; the backend accepts text/plain for this case.
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      return;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    await fetch(url, { method: "POST", headers, body, keepalive: true });
  } catch {
    // Analytics must never break the UX.
  }
}
