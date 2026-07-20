/**
 * Voice UI preferences — per-browser, per-user opt-in for STT/TTS. These are
 * NOT entitlements: they only decide whether an entitled user currently wants
 * the mic/audio on. The backend always re-validates entitlement server-side
 * (see PLAN_STT_TTS.md) — these prefs never grant access on their own.
 */

const KEYS = {
  stt: "toa_voice_stt_enabled",
  tts: "toa_voice_tts_enabled",
  voice: "toa_voice_tts_voice",
  speed: "toa_voice_tts_speed",
  autoSend: "toa_voice_stt_autosend",
} as const;

export type VoicePrefKey = keyof typeof KEYS;

export function getVoicePref(key: VoicePrefKey, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(KEYS[key]) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setVoicePref(key: VoicePrefKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS[key], value);
  } catch {
    /* localStorage unavailable (private mode, quota) — silently no-op */
  }
}

export function getVoiceBoolPref(key: VoicePrefKey, fallback: boolean): boolean {
  return getVoicePref(key, fallback ? "true" : "false") === "true";
}

export function setVoiceBoolPref(key: VoicePrefKey, value: boolean): void {
  setVoicePref(key, value ? "true" : "false");
}
