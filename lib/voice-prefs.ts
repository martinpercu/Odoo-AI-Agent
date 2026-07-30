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

/**
 * Per-language TTS voice preference. A single global "voice" pref breaks the
 * moment the UI language changes — the stored voice keeps getting sent for a
 * language it was never chosen for (e.g. an Italian voice reading English
 * text). Each locale remembers its own voice instead, so switching UI
 * language never silently mismatches voice vs. text language.
 *
 * TTS only ships templates for 6 languages (see `_supported_language` in the
 * backend's api/voice/script.py) — any other UI locale buckets into "en",
 * mirroring that same fallback so front and back never disagree.
 */
const TTS_SUPPORTED_LANGS = ["es", "en", "fr", "de", "pt", "it"] as const;
const VOICE_BY_LANG_KEY = "toa_voice_tts_voice_by_lang";

export function ttsLangBucket(locale: string): string {
  return (TTS_SUPPORTED_LANGS as readonly string[]).includes(locale) ? locale : "en";
}

function readVoiceMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VOICE_BY_LANG_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The voice saved for this locale's TTS bucket, or "" if none was ever picked. */
export function getVoiceForLang(locale: string): string {
  return readVoiceMap()[ttsLangBucket(locale)] ?? "";
}

export function setVoiceForLang(locale: string, voiceId: string): void {
  if (typeof window === "undefined") return;
  const map = readVoiceMap();
  map[ttsLangBucket(locale)] = voiceId;
  try {
    localStorage.setItem(VOICE_BY_LANG_KEY, JSON.stringify(map));
  } catch {
    /* localStorage unavailable (private mode, quota) — silently no-op */
  }
}
