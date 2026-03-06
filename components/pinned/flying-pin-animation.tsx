"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pin } from "lucide-react";
import { onFlyingPin, type FlyingPinEvent } from "@/lib/pin-animation-events";

interface FlyingPin {
  id: number;
  sourceRect: DOMRect;
}

export function FlyingPinPortal() {
  const [flyingPins, setFlyingPins] = useState<FlyingPin[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFlyingPin = useCallback((event: FlyingPinEvent) => {
    const id = Date.now();
    setFlyingPins((prev) => [...prev, { id, sourceRect: event.sourceRect }]);
  }, []);

  useEffect(() => {
    return onFlyingPin(handleFlyingPin);
  }, [handleFlyingPin]);

  const removeFlyingPin = useCallback((id: number) => {
    setFlyingPins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  if (!mounted) return null;

  // Target: top-right area of viewport where the pinned sidebar header is
  const targetX = typeof window !== "undefined" ? window.innerWidth - 24 : 0;
  const targetY = 28;

  return createPortal(
    <AnimatePresence>
      {flyingPins.map((fp) => (
        <motion.div
          key={fp.id}
          initial={{
            x: fp.sourceRect.x + fp.sourceRect.width / 2 - 8,
            y: fp.sourceRect.y + fp.sourceRect.height / 2 - 8,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: targetX,
            y: targetY,
            scale: 0.5,
            opacity: 0.3,
          }}
          exit={{ opacity: 0 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 150,
            duration: 0.6,
          }}
          onAnimationComplete={() => removeFlyingPin(fp.id)}
          className="pointer-events-none fixed left-0 top-0 z-[9999]"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-odoo-purple/20">
            <Pin size={14} className="text-odoo-purple" />
          </div>
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body
  );
}
