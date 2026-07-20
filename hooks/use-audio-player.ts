"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QueueItem {
  sequence: number;
  b64: string;
}

/**
 * Ordered playback queue for TTS audio chunks (base64 MP3, arriving via SSE
 * `audio` events). Plays gapless using the Web Audio API — NOT the <audio>
 * element — for precise back-to-back scheduling. Mirrors the reference
 * project's pattern (see PLAN_STT_TTS.md Etapa 7).
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const expectedSeqRef = useRef(1);
  const playingRef = useRef(false);
  const nextStartRef = useRef(0);
  const activeRef = useRef(true);
  // Self-reference indirection: tryPlayNext calls itself (to drain the queue
  // after each chunk finishes), which the compiler can't verify is safe from
  // inside its own useCallback body. Routing the recursive call through a ref
  // avoids the "accessed before declared" lint error without breaking memoization.
  const tryPlayNextRef = useRef<() => void>(() => {});

  /**
   * MUST be called SYNCHRONOUSLY inside the user gesture handler that
   * triggers the message send (before any `await`) — otherwise iOS Safari
   * and Chrome/Android block programmatic audio playback entirely. A silent
   * 1-frame buffer is what actually unlocks the context.
   */
  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      if (ctxRef.current.state === "suspended") {
        void ctxRef.current.resume();
      }
      const buf = ctxRef.current.createBuffer(1, 1, 22050);
      const src = ctxRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(ctxRef.current.destination);
      src.start(0);
    } catch {
      /* best-effort — playback will simply fail silently later if this didn't work */
    }
  }, []);

  const tryPlayNext = useCallback(async () => {
    if (!activeRef.current || playingRef.current) return;
    const idx = queueRef.current.findIndex((a) => a.sequence === expectedSeqRef.current);
    if (idx === -1) return; // expected chunk hasn't arrived yet — enqueue() will retry

    const item = queueRef.current.splice(idx, 1)[0];
    playingRef.current = true;
    setIsPlaying(true);

    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const binary = atob(item.b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      const startTime = Math.max(ctx.currentTime, nextStartRef.current);
      nextStartRef.current = startTime + audioBuffer.duration;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(startTime);

      const advanceMs = (startTime - ctx.currentTime + audioBuffer.duration) * 1000;
      setTimeout(() => {
        if (!activeRef.current) return;
        expectedSeqRef.current = item.sequence + 1;
        playingRef.current = false;
        if (queueRef.current.length === 0) setIsPlaying(false);
        tryPlayNextRef.current();
      }, Math.max(0, advanceMs));
    } catch {
      // Undecodable chunk — skip it and keep the queue moving.
      expectedSeqRef.current = item.sequence + 1;
      playingRef.current = false;
      tryPlayNextRef.current();
    }
  }, []);

  // Keep the ref pointing at the latest tryPlayNext AFTER render (not during —
  // mutating a ref synchronously in the render body is disallowed).
  useEffect(() => {
    tryPlayNextRef.current = () => void tryPlayNext();
  }, [tryPlayNext]);

  const enqueue = useCallback(
    (sequence: number, b64: string) => {
      activeRef.current = true;
      queueRef.current.push({ sequence, b64 });
      tryPlayNextRef.current();
    },
    []
  );

  /** Call at the start of a new stream and on Stop — clears the queue and
   * closes the AudioContext so a stale chunk from a cancelled turn never
   * plays over a new one. */
  const reset = useCallback(() => {
    activeRef.current = false;
    queueRef.current = [];
    expectedSeqRef.current = 1;
    playingRef.current = false;
    nextStartRef.current = 0;
    setIsPlaying(false);
    if (ctxRef.current) {
      void ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  return { enqueue, reset, unlock, isPlaying };
}
