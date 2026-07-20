"use client";

import { useCallback, useRef, useState } from "react";

export type MicPermission = "granted" | "denied" | "prompt" | "unsupported";

/**
 * Records audio from the mic and hands the resulting Blob to onAudioReady.
 * VAD / auto-stop-on-silence is explicitly out of scope for v1 (backlog —
 * see PLAN_STT_TTS.md); stop is manual (click again).
 */
export function useVoiceRecorder(onAudioReady: (blob: Blob) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");

      // Codec fallback: Chrome/Firefox/Android -> webm+opus; iOS Safari -> mp4.
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        // Discard near-empty recordings (accidental click, no speech captured).
        if (blob.size > 1000) onAudioReady(blob);
      };

      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      setMicPermission("denied");
    }
  }, [onAudioReady]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, micPermission, toggleRecording, stopRecording };
}
