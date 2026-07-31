"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, Play, Loader2, Settings2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useIconSize } from "@/hooks/use-icon-size";
import { fetchTtsPreview, fetchTtsVoices } from "@/lib/api";
import type { TtsVoice } from "@/lib/types";
import {
  getVoiceBoolPref,
  setVoiceBoolPref,
  getVoicePref,
  setVoicePref,
  getVoiceForLang,
  setVoiceForLang,
  ttsLangBucket,
} from "@/lib/voice-prefs";

const SPEED_OPTIONS = ["0.8", "1.0", "1.2"];

/** Preview trigger — sits next to the voice picker, or next to speed when the
 * language only has one voice and the picker is hidden. */
function PreviewButton({
  onClick,
  disabled,
  previewing,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  previewing: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-raised hover:text-foreground disabled:opacity-40"
    >
      {previewing ? (
        <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <Play size={14} strokeWidth={1.5} />
      )}
    </button>
  );
}

/**
 * Popover with the user's voice preferences (STT mic toggle + auto-send, TTS
 * toggle + voice/speed + preview). Only rendered when the user is entitled to
 * at least one of the two features — server-side entitlement always wins;
 * these controls only decide whether an entitled user currently wants it on.
 */
interface VoiceSettingsProps {
  /** Which edge the popover anchors to — "right" when the trigger sits at the
   * end of a row (e.g. the recorder bar's top-right slot). */
  align?: "left" | "right";
  /** "volume" reflects the TTS on/off state; "settings" is the neutral gear
   * used while recording, where a speaker icon would read as playback. */
  icon?: "volume" | "settings";
}

export function VoiceSettings({ align = "left", icon = "volume" }: VoiceSettingsProps = {}) {
  const t = useTranslations("VoiceSettings");
  const locale = useLocale();
  const { meData } = useSession();
  const iconBtn = useIconSize("button");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sttEntitled = meData?.voice_features?.stt ?? false;
  const ttsEntitled = meData?.voice_features?.tts ?? false;

  const [sttOn, setSttOn] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [ttsOn, setTtsOn] = useState(false);
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState("1.0");
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const bucket = ttsLangBucket(locale);
  const langVoices = voices.filter((v) => v.lang === bucket);
  // Fallback to the full catalog only if this bucket somehow has nothing
  // (shouldn't happen with full coverage, but avoids an empty dropdown).
  const optionVoices = langVoices.length > 0 ? langVoices : voices;
  // With a single voice available for this language there is nothing to
  // choose: drop the picker and let the speed selector take its row.
  const showVoicePicker = !voicesLoaded || optionVoices.length > 1;

  // Hydrate from localStorage once mounted (avoids SSR/client mismatch).
  useEffect(() => {
    setSttOn(getVoiceBoolPref("stt", true));
    setAutoSend(getVoiceBoolPref("autoSend", true));
    setTtsOn(getVoiceBoolPref("tts", false));
    setSpeed(getVoicePref("speed", "1.0"));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !ttsEntitled || voicesLoaded) return;
    void fetchTtsVoices().then((res) => {
      if (res.success && res.data) {
        setVoices(res.data.voices);
      }
      setVoicesLoaded(true);
    });
  }, [open, ttsEntitled, voicesLoaded]);

  // Resolve the voice for the CURRENT UI language on mount and every time the
  // locale changes — never keep a voice selected for a language the user
  // isn't in anymore. First time in a given language: auto-pick its first
  // catalog voice and persist it, same bootstrap the picker already did for
  // the very first load.
  useEffect(() => {
    if (!voicesLoaded) return;
    const saved = getVoiceForLang(locale);
    // A saved voice that is no longer offered for this language must be
    // re-picked: with a single-voice language the picker is hidden, so the
    // user would have no way to correct it.
    if (saved && optionVoices.some((v) => v.id === saved)) {
      setVoice(saved);
      return;
    }
    const fallback = voices.find((v) => v.lang === bucket)?.id || voices[0]?.id || "";
    if (fallback) {
      setVoice(fallback);
      setVoiceForLang(locale, fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, voicesLoaded, voices]);

  if (!sttEntitled && !ttsEntitled) return null;

  function toggleStt(value: boolean) {
    setSttOn(value);
    setVoiceBoolPref("stt", value);
  }
  function toggleAutoSend(value: boolean) {
    setAutoSend(value);
    setVoiceBoolPref("autoSend", value);
  }
  function toggleTts(value: boolean) {
    setTtsOn(value);
    setVoiceBoolPref("tts", value);
  }
  function changeVoice(value: string) {
    setVoice(value);
    setVoiceForLang(locale, value);
  }
  function changeSpeed(value: string) {
    setSpeed(value);
    setVoicePref("speed", value);
  }

  async function handlePreview() {
    if (!voice || previewing) return;
    setPreviewing(true);
    try {
      const blob = await fetchTtsPreview(t("previewText"), voice, parseFloat(speed) || 1.0);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
      >
        {icon === "settings" ? (
          <Settings2 size={iconBtn - 4} strokeWidth={1.5} />
        ) : ttsOn && ttsEntitled ? (
          <Volume2 size={iconBtn - 4} strokeWidth={1.5} />
        ) : (
          <VolumeX size={iconBtn - 4} strokeWidth={1.5} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute bottom-full ${align === "right" ? "right-0" : "left-0"} mb-1 z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-lg overflow-hidden`}
            role="dialog"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-micro uppercase tracking-wide text-text-muted">{t("title")}</p>
            </div>

            <div className="flex flex-col gap-3 p-3">
              {sttEntitled && (
                <>
                  <label className="flex items-center justify-between gap-2 text-small text-foreground">
                    {t("micToggle")}
                    <input
                      type="checkbox"
                      checked={sttOn}
                      onChange={(e) => toggleStt(e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>
                  {sttOn && (
                    <label className="flex items-center justify-between gap-2 pl-3 text-small text-text-secondary">
                      {t("autoSend")}
                      <input
                        type="checkbox"
                        checked={autoSend}
                        onChange={(e) => toggleAutoSend(e.target.checked)}
                        className="h-4 w-4 accent-accent"
                      />
                    </label>
                  )}
                </>
              )}

              {sttEntitled && ttsEntitled && <div className="border-t border-border" />}

              {ttsEntitled && (
                <>
                  <label className="flex items-center justify-between gap-2 text-small text-foreground">
                    {t("ttsToggle")}
                    <input
                      type="checkbox"
                      checked={ttsOn}
                      onChange={(e) => toggleTts(e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>

                  {ttsOn && (
                    <div className="flex flex-col gap-2 pl-3">
                      {showVoicePicker && (
                        <div className="flex items-center gap-2">
                          <select
                            value={voice}
                            onChange={(e) => changeVoice(e.target.value)}
                            className="flex-1 rounded-md border border-border bg-base px-2 py-1.5 text-small text-foreground"
                            aria-label={t("voice")}
                          >
                            {optionVoices.length === 0 && <option value="">{t("voice")}</option>}
                            {optionVoices.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <PreviewButton
                            onClick={handlePreview}
                            disabled={!voice || previewing}
                            previewing={previewing}
                            label={t("preview")}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <select
                          value={speed}
                          onChange={(e) => changeSpeed(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-base px-2 py-1.5 text-small text-foreground"
                          aria-label={t("speed")}
                        >
                          {SPEED_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}x
                            </option>
                          ))}
                        </select>
                        {!showVoicePicker && (
                          <PreviewButton
                            onClick={handlePreview}
                            disabled={!voice || previewing}
                            previewing={previewing}
                            label={t("preview")}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
