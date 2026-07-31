"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermission = "granted" | "denied" | "prompt" | "unsupported";
/** Three-state machine mirroring the WhatsApp recorder bar. */
export type RecorderState = "idle" | "recording" | "paused";

/**
 * One amplitude sample every N ms. This governs how fast the waveform track
 * fills up: at 50ms a ~630px desktop track (≈210 bars) takes ~10s to fill, so
 * a typical 3-8s voice query lands mid-track — which is what the no-upscale
 * rule in VoiceRecorderBar is meant to show.
 */
const SAMPLE_MS = 50;

/**
 * Records audio from the mic and hands the resulting Blob to onAudioReady.
 *
 * Pause/resume uses MediaRecorder's NATIVE pause() so the final blob is always
 * a single continuous, valid file — never a concatenation of segments.
 *
 * VAD / auto-stop-on-silence is explicitly out of scope for v1 (backlog —
 * see PLAN_STT_TTS.md); the user drives the state machine from the bar.
 */
export function useVoiceRecorder(onAudioReady: (blob: Blob) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  /** Playable URL of what has been recorded so far — only while paused. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Inferred (not annotated) so it types as Uint8Array<ArrayBuffer>, which is
  // what getByteTimeDomainData expects.
  const dataRef = useRef(new Uint8Array(0));
  const rafRef = useRef<number | null>(null);
  const segmentStartRef = useRef(0);
  const accumulatedRef = useRef(0);
  const lastSampleRef = useRef(0);
  const cancelledRef = useRef(false);
  const wantPreviewRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const onReadyRef = useRef(onAudioReady);

  useEffect(() => {
    onReadyRef.current = onAudioReady;
  }, [onAudioReady]);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  /**
   * Best-effort playback of the partial recording. The blob is a webm/mp4 that
   * was never finalized (no duration in the header), so Chrome/Firefox play it
   * fine but Safari's mp4 output may not — the bar falls back to showing the
   * frozen timer when the <audio> element rejects it.
   */
  const buildPreview = useCallback((mime: string) => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    stopLoop();
    analyserRef.current = null;
    dataRef.current = new Uint8Array(0);
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
  }, [stopLoop]);

  /** Drives the clock every frame and the waveform every SAMPLE_MS. */
  const startLoop = useCallback(() => {
    // Function declaration (not a const arrow) so the self-reference on the
    // last line is hoisted rather than read before initialization.
    function step() {
      const analyser = analyserRef.current;
      const buf = dataRef.current;
      const now = performance.now();
      setElapsedMs(accumulatedRef.current + (now - segmentStartRef.current));

      if (analyser && buf.length > 0 && now - lastSampleRef.current >= SAMPLE_MS) {
        lastSampleRef.current = now;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        // Speech RMS sits low; a sqrt curve keeps the bars visibly alive.
        const level = Math.min(1, Math.sqrt(rms) * 1.7);
        // Append-only FULL history — never drop the oldest sample here. The
        // view decides what to draw (last N while live, the whole thing
        // bucketed while paused); dropping samples at the source is what
        // decoupled the waveform from the playhead in the first place.
        setLevels((prev) => [...prev, level]);
      }
      rafRef.current = requestAnimationFrame(step);
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return;
    }
    if (recRef.current) return;
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
      cancelledRef.current = false;
      wantPreviewRef.current = false;

      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
        // requestData() flush landed — the paused state can offer playback now.
        if (wantPreviewRef.current) {
          wantPreviewRef.current = false;
          buildPreview(rec.mimeType);
        }
      };

      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const cancelled = cancelledRef.current;
        teardown();
        releasePreview();
        setState("idle");
        setElapsedMs(0);
        setLevels([]);
        accumulatedRef.current = 0;
        // Discard near-empty recordings (accidental click, no speech captured).
        if (!cancelled && blob.size > 1000) onReadyRef.current(blob);
      };

      // Analyser feeds the waveform. Never connected to destination — routing
      // the mic to the speakers would echo.
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        ctx.createMediaStreamSource(stream).connect(analyser);
        ctxRef.current = ctx;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.fftSize);
      }

      recRef.current = rec;
      rec.start();
      accumulatedRef.current = 0;
      segmentStartRef.current = performance.now();
      lastSampleRef.current = 0;
      setElapsedMs(0);
      setLevels([]);
      setState("recording");
      startLoop();
    } catch {
      teardown();
      setMicPermission("denied");
      setState("idle");
    }
  }, [buildPreview, releasePreview, startLoop, teardown]);

  const pause = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "recording") return;
    stopLoop();
    accumulatedRef.current += performance.now() - segmentStartRef.current;
    setElapsedMs(accumulatedRef.current);
    // Flush the buffered chunk first, so ondataavailable can build the preview.
    wantPreviewRef.current = true;
    try {
      rec.requestData();
    } catch {
      wantPreviewRef.current = false;
    }
    rec.pause();
    setState("paused");
  }, [stopLoop]);

  const resume = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "paused") return;
    releasePreview();
    rec.resume();
    segmentStartRef.current = performance.now();
    lastSampleRef.current = 0;
    setState("recording");
    startLoop();
  }, [releasePreview, startLoop]);

  /** Stop and hand the blob to onAudioReady. */
  const finish = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") return;
    cancelledRef.current = false;
    rec.stop();
  }, []);

  /** Stop and throw the recording away — onAudioReady never fires. */
  const cancel = useCallback(() => {
    const rec = recRef.current;
    cancelledRef.current = true;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      return;
    }
    teardown();
    releasePreview();
    setState("idle");
    setElapsedMs(0);
    setLevels([]);
    accumulatedRef.current = 0;
  }, [releasePreview, teardown]);

  useEffect(() => {
    return () => {
      // A late onstop must not fire the callback after unmount.
      cancelledRef.current = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    state,
    isRecording: state !== "idle",
    micPermission,
    elapsedMs,
    levels,
    previewUrl,
    start,
    pause,
    resume,
    cancel,
    finish,
  };
}
