"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { useIconSize } from "@/hooks/use-icon-size";
import { VoiceSettings } from "@/components/chat/voice-settings";

const BAR_W = 2;
const BAR_GAP = 1;
/** Horizontal space one bar owns. Bar count is derived from the measured track
 * width, so a wide screen simply shows more bars — never wider ones. */
const BAR_PITCH = BAR_W + BAR_GAP;
const TRACK_H = 30;
const BAR_MIN_H = 2;

function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Compresses `src` into exactly `n` bars, keeping the PEAK of each bucket.
 * Averaging would flatten transients into a flat sausage once a bar covers
 * dozens of samples; the peak preserves the shape of speech.
 *
 * Only ever called to shrink (src.length > n) — the waveform is never
 * upscaled, see `bars` below.
 */
function bucketPeaks(src: number[], n: number): number[] {
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * src.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * src.length) / n));
    let peak = 0;
    for (let j = from; j < to && j < src.length; j++) {
      if (src[j] > peak) peak = src[j];
    }
    out[i] = peak;
  }
  return out;
}

interface VoiceRecorderBarProps {
  paused: boolean;
  elapsedMs: number;
  /** FULL amplitude history, 0..1, oldest first — not a windowed view. */
  levels: number[];
  /** Playable partial recording — only set while paused. */
  previewUrl: string | null;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onSend: () => void;
}

/**
 * Two-row recording surface that replaces the text input while the mic is
 * live. Three states drive it (see use-voice-recorder):
 *
 *   recording → row A: timer · live waveform · voice settings
 *               row B: discard · pause · send
 *   paused    → row A: play (replaces the timer) · frozen waveform · settings
 *               row B: discard · resume (mic) · send
 */
export function VoiceRecorderBar({
  paused,
  elapsedMs,
  levels,
  previewUrl,
  onCancel,
  onPause,
  onResume,
  onSend,
}: VoiceRecorderBarProps) {
  const t = useTranslations("ChatInput");
  const iconBtn = useIconSize("button");
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // Partial recordings are unfinalized containers; Safari's mp4 in particular
  // may refuse to play one. Fall back to the frozen timer when that happens.
  const [previewBroken, setPreviewBroken] = useState(false);
  const [trackedUrl, setTrackedUrl] = useState<string | null>(previewUrl);

  // A new (or cleared) preview resets playback. Adjusting state during render
  // instead of in an effect — the <audio> element reloads on src change, so
  // nothing needs to be stopped imperatively.
  if (trackedUrl !== previewUrl) {
    setTrackedUrl(previewUrl);
    setPlaying(false);
    setProgress(0);
    setPreviewBroken(false);
  }

  const canPlayBack = paused && !!previewUrl && !previewBroken;
  const recordedSec = Math.max(elapsedMs / 1000, 0.001);

  function togglePlayback() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(
        () => setPlaying(true),
        () => setPreviewBroken(true)
      );
    }
  }

  // Bar count follows the real track width instead of a magic constant, so the
  // bars stay 2px wide on every screen and a wider one just fits more of them.
  const slots = trackW > 0 ? Math.max(8, Math.floor(trackW / BAR_PITCH)) : 0;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setTrackW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * The waveform is NEVER upscaled. Two regimes, continuous at the crossover
   * (when the history is exactly `slots` long both produce the same drawing):
   *
   *   history <= slots → draw it at natural density, one bar per sample. The
   *                      track stays partly empty and the playhead dies where
   *                      the recording actually ends.
   *   history >  slots → live: window to the last `slots` (scrolls).
   *                      paused: bucket the WHOLE history into `slots`.
   *
   * Either way bars map to time linearly, so `progress * bars.length` is the
   * playhead — the mismatch that made playback drift is gone by construction.
   */
  const bars = useMemo(() => {
    if (slots === 0) return [];
    if (levels.length <= slots) return levels;
    return paused ? bucketPeaks(levels, slots) : levels.slice(-slots);
  }, [levels, slots, paused]);

  const playedCount = paused ? Math.round(progress * bars.length) : bars.length;

  return (
    <div className="flex flex-col gap-1 p-2">
      {/* Row A — timer/playback · waveform · settings */}
      <div className="flex items-center gap-2">
        <div className="flex h-btn-md min-w-16 shrink-0 items-center gap-2 pl-1">
          {canPlayBack ? (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? t("micPlaybackPause") : t("micPlayback")}
              className="flex h-btn-sm w-btn-sm items-center justify-center rounded-full text-accent transition-colors hover:bg-accent-subtle"
            >
              {playing ? (
                <Pause size={iconBtn - 2} strokeWidth={1.5} fill="currentColor" />
              ) : (
                <Play size={iconBtn - 2} strokeWidth={1.5} fill="currentColor" />
              )}
            </button>
          ) : (
            <>
              {!paused && (
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-2 w-2 shrink-0 rounded-full bg-error"
                />
              )}
              <span className="font-technical tabular-nums text-text-secondary">
                {formatClock(elapsedMs)}
              </span>
            </>
          )}
        </div>

        <div
          ref={trackRef}
          className="flex flex-1 items-center overflow-hidden"
          style={{ height: TRACK_H, gap: BAR_GAP }}
          role="img"
          aria-label={paused ? t("micPaused") : t("micRecording")}
        >
          {Array.from({ length: slots }, (_, i) => {
            const level = bars[i] ?? 0;
            const recorded = i < bars.length;
            // Empty slots stay visible as a flat track so a short recording
            // reads as "partly filled" rather than as a rendering glitch.
            const tone = !recorded
              ? "bg-border"
              : paused && i >= playedCount
                ? "bg-text-muted"
                : "bg-accent";
            return (
              <span
                key={i}
                className={`shrink-0 rounded-full ${tone}`}
                style={{
                  width: BAR_W,
                  height: BAR_MIN_H + level * (TRACK_H - BAR_MIN_H),
                }}
              />
            );
          })}
        </div>

        <VoiceSettings align="right" icon="settings" />
      </div>

      {/* Row B — discard · pause/resume · send */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("micCancel")}
          className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
        >
          <Trash2 size={iconBtn - 4} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={paused ? onResume : onPause}
          aria-label={paused ? t("micResume") : t("micPause")}
          className="relative flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-full bg-error text-white transition-colors hover:opacity-90"
        >
          {!paused && (
            <motion.span
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-error"
            />
          )}
          <span className="relative flex items-center justify-center">
            {paused ? (
              <Mic size={iconBtn - 4} strokeWidth={1.5} />
            ) : (
              <Pause size={iconBtn - 4} strokeWidth={1.5} fill="currentColor" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onSend}
          aria-label={t("micSendVoice")}
          className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Send size={iconBtn - 4} strokeWidth={1.5} />
        </button>
      </div>

      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          className="hidden"
          onTimeUpdate={(e) =>
            setProgress(Math.min(1, e.currentTarget.currentTime / recordedSec))
          }
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onError={() => setPreviewBroken(true)}
        />
      )}
    </div>
  );
}
