"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, Play, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useIconSize } from "@/hooks/use-icon-size";
import { fetchTtsPreview, fetchTtsVoices } from "@/lib/api";
import type { TtsVoice } from "@/lib/types";
import {
  getVoiceBoolPref,
  setVoiceBoolPref,
  getVoicePref,
  setVoicePref,
} from "@/lib/voice-prefs";

const SPEED_OPTIONS = ["0.8", "1.0", "1.2"];

/**
 * Popover with the user's voice preferences (STT mic toggle + auto-send, TTS
 * toggle + voice/speed + preview). Only rendered when the user is entitled to
 * at least one of the two features — server-side entitlement always wins;
 * these controls only decide whether an entitled user currently wants it on.
 */
export function VoiceSettings() {
  const t = useTranslations("VoiceSettings");
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

  // Hydrate from localStorage once mounted (avoids SSR/client mismatch).
  useEffect(() => {
    setSttOn(getVoiceBoolPref("stt", true));
    setAutoSend(getVoiceBoolPref("autoSend", true));
    setTtsOn(getVoiceBoolPref("tts", false));
    setVoice(getVoicePref("voice", ""));
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
        if (!voice) {
          setVoice(res.data.default_voice);
          setVoicePref("voice", res.data.default_voice);
        }
      }
      setVoicesLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ttsEntitled, voicesLoaded]);

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
    setVoicePref("voice", value);
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
        {ttsOn && ttsEntitled ? (
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
            className="absolute bottom-full left-0 mb-1 z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
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
                      <div className="flex items-center gap-2">
                        <select
                          value={voice}
                          onChange={(e) => changeVoice(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-base px-2 py-1.5 text-small text-foreground"
                          aria-label={t("voice")}
                        >
                          {voices.length === 0 && <option value="">{t("voice")}</option>}
                          {voices.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handlePreview}
                          disabled={!voice || previewing}
                          aria-label={t("preview")}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-raised hover:text-foreground disabled:opacity-40"
                        >
                          {previewing ? (
                            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                          ) : (
                            <Play size={14} strokeWidth={1.5} />
                          )}
                        </button>
                      </div>

                      <select
                        value={speed}
                        onChange={(e) => changeSpeed(e.target.value)}
                        className="rounded-md border border-border bg-base px-2 py-1.5 text-small text-foreground"
                        aria-label={t("speed")}
                      >
                        {SPEED_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}x
                          </option>
                        ))}
                      </select>
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
