"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Mic, MicOff, Loader2, /* Paperclip, */ X } from "lucide-react";
import { useIconSize } from "@/hooks/use-icon-size";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { VoiceSettings } from "@/components/chat/voice-settings";
import { VoiceRecorderBar } from "@/components/chat/voice-recorder-bar";

interface ChatInputProps {
  onSend: (message: string, image?: File) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  /** Effective STT entitlement (voice_features.stt) AND the user's local pref. */
  sttAvailable?: boolean;
  /** Transcribes the recorded blob. Returns the text, or null on failure
   * (the caller is expected to have already shown an error toast). */
  onTranscribe?: (blob: Blob) => Promise<string | null>;
  /** When true, a successful transcription is sent immediately instead of
   * just filling the input. Mirrors the "auto-send" voice preference. */
  autoSendVoice?: boolean;
  /** Called synchronously inside the mic click handler, before any await —
   * lets the caller unlock the TTS AudioContext within the user gesture
   * (iOS/Chrome autoplay policy). No-op if omitted. */
  onBeforeRecord?: () => void;
  /** TTS audio is currently playing for the last response. */
  isPlayingAudio?: boolean;
  /** Stops the current TTS playback (does not cancel the text stream). */
  onStopAudio?: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  sttAvailable,
  onTranscribe,
  autoSendVoice,
  onBeforeRecord,
  isPlayingAudio,
  onStopAudio,
}: ChatInputProps) {
  const t = useTranslations("ChatInput");
  const tVoice = useTranslations("VoiceSettings");
  const [value, setValue] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconBtn = useIconSize("button");

  const handleAudioReady = useCallback(
    async (blob: Blob) => {
      if (!onTranscribe) return;
      setIsTranscribing(true);
      try {
        const text = await onTranscribe(blob);
        if (!text) return;
        if (autoSendVoice) {
          onSend(text);
        } else {
          setValue(text);
          textareaRef.current?.focus();
        }
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscribe, autoSendVoice, onSend]
  );

  const {
    state: recorderState,
    micPermission,
    elapsedMs,
    levels,
    previewUrl,
    start: startRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    cancel: cancelRecording,
    finish: finishRecording,
  } = useVoiceRecorder(handleAudioReady);

  const isRecordingUI = recorderState !== "idle";

  // The voice-settings popover is reachable FROM the recorder bar, so the mic
  // pref can be switched off mid-recording. Leaving the bar mounted for a
  // feature the user just disabled is incoherent — drop the take.
  useEffect(() => {
    if (isRecordingUI && !sttAvailable) cancelRecording();
  }, [isRecordingUI, sttAvailable, cancelRecording]);

  function handleMicClick() {
    // Must stay synchronous — it unlocks the TTS AudioContext inside the gesture.
    onBeforeRecord?.();
    void startRecording();
  }

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, []);

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && !imageFile) || isStreaming || disabled) return;
    onSend(trimmed, imageFile ?? undefined);
    setValue("");
    clearImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const hasContent = value.trim() || imageFile;

  return (
    <div className="border-t border-border bg-base px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <motion.div
          layout
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="rounded-lg border border-border bg-surface shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-accent/30"
        >
          {/* Image preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="px-3 pt-3"
              >
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-md border border-border object-cover"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white shadow-sm transition-colors hover:opacity-90"
                    title={t("removeImage")}
                    aria-label={t("removeImage")}
                  >
                    <X size={10} strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isPlayingAudio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex items-center gap-2 px-3 pt-3"
              >
                <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
                <span className="text-small text-text-secondary">{tVoice("ttsToggle")}</span>
                {onStopAudio && (
                  <button
                    onClick={onStopAudio}
                    className="text-small text-accent underline underline-offset-2 hover:no-underline"
                    aria-label={tVoice("stopAudio")}
                  >
                    {tVoice("stopAudio")}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isRecordingUI ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <VoiceRecorderBar
                paused={recorderState === "paused"}
                elapsedMs={elapsedMs}
                levels={levels}
                previewUrl={previewUrl}
                onCancel={cancelRecording}
                onPause={pauseRecording}
                onResume={resumeRecording}
                onSend={finishRecording}
              />
            </motion.div>
          ) : (
            <div className="flex items-end gap-2 p-2">
              {/* Clip button — temporalmente oculto, dejar a tiro para futuro */}
              {/*
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || disabled}
                className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn text-text-secondary transition-colors hover:bg-raised hover:text-foreground disabled:opacity-40"
                title={t("attachImage")}
                aria-label={t("attachImage")}
              >
                <Paperclip size={iconBtn} strokeWidth={1.5} />
              </button>
              */}

              <VoiceSettings />

              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={isTranscribing ? t("transcribing") : t("placeholder")}
                rows={1}
                disabled={disabled}
                className="max-h-50 min-h-input flex-1 resize-none bg-transparent px-2 py-2 text-body outline-none placeholder:text-text-muted disabled:opacity-50"
              />

              {sttAvailable && micPermission !== "unsupported" && (
                <button
                  onClick={handleMicClick}
                  disabled={isStreaming || disabled || isTranscribing}
                  aria-label={t("micStart")}
                  title={micPermission === "denied" ? t("micDenied") : undefined}
                  className={`flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn transition-colors disabled:opacity-40 ${
                    micPermission === "denied"
                      ? "text-error hover:bg-raised"
                      : "text-text-secondary hover:bg-raised hover:text-foreground"
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 size={iconBtn - 4} strokeWidth={1.5} className="animate-spin" />
                  ) : micPermission === "denied" ? (
                    <MicOff size={iconBtn - 4} strokeWidth={1.5} />
                  ) : (
                    <Mic size={iconBtn - 4} strokeWidth={1.5} />
                  )}
                </button>
              )}

              {isStreaming ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onClick={onStop}
                  aria-label={t("stop")}
                  className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn bg-error text-white transition-colors hover:opacity-90"
                >
                  <Square size={iconBtn - 4} strokeWidth={1.5} fill="currentColor" />
                </motion.button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!hasContent || disabled}
                  aria-label={t("send")}
                  className="flex h-btn-md w-btn-md shrink-0 items-center justify-center rounded-btn bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
                >
                  <Send size={iconBtn - 4} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
