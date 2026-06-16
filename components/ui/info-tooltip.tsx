"use client";

/**
 * InfoTooltip — inline, audience-neutral help tooltip that works on both
 * desktop and mobile.
 *
 * - Desktop: opens on hover/focus of the trigger word.
 * - Mobile: opens on tap (toggle); closes on tap outside or Escape.
 *
 * The trigger is rendered as an inline <button> with a dotted underline so it
 * reads as "there's more info here" without relying on color alone. The popover
 * is positioned above the trigger and resets any inherited uppercase/tracking
 * styling so the help text always reads naturally.
 */

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface InfoTooltipProps {
  /** The help text shown inside the popover. */
  text: string;
  /** The inline trigger content (usually a word inside a sentence). */
  children: ReactNode;
  /** Extra classes for the trigger (e.g. to match surrounding weight/color). */
  className?: string;
}

export function InfoTooltip({ text, children, className = "" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline cursor-help underline decoration-dotted underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${className}`}
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-64 max-w-[min(16rem,80vw)] -translate-x-1/2 rounded-card border border-border bg-surface px-3 py-2 text-left text-small font-normal normal-case tracking-normal text-text-secondary shadow-lg"
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
