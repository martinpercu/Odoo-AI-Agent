"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getVoiceBoolPref,
  getVoicePref,
  subscribeVoicePrefs,
  type VoicePrefKey,
} from "@/lib/voice-prefs";

/**
 * Reactive reads of the localStorage voice preferences.
 *
 * Use these instead of calling `getVoicePref`/`getVoiceBoolPref` directly in a
 * component body: a bare read has no way to notify the OTHER components that
 * depend on the same key, which is why toggling the mic in `VoiceSettings` used
 * to leave the mic button in `ChatInput` untouched until a refresh.
 *
 * `useSyncExternalStore` also fixes the SSR side: the server snapshot is the
 * fallback, so the markup React renders on the server and hydrates on the
 * client always agree, and the stored value is picked up right after hydration.
 * (Reading localStorage during render would mismatch whenever the user had
 * turned a pref off.)
 */
export function useVoicePref(key: VoicePrefKey, fallback: string): string {
  const getSnapshot = useCallback(() => getVoicePref(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribeVoicePrefs, getSnapshot, getServerSnapshot);
}

export function useVoiceBoolPref(key: VoicePrefKey, fallback: boolean): boolean {
  const getSnapshot = useCallback(() => getVoiceBoolPref(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribeVoicePrefs, getSnapshot, getServerSnapshot);
}
