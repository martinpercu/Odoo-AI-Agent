"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { emitFlyingPin } from "@/lib/pin-animation-events";

interface PinToggleButtonProps {
  pinned: boolean;
  onToggle: () => string | null; // returns pinId if pinned, null if unpinned
}

export function PinToggleButton({ pinned, onToggle }: PinToggleButtonProps) {
  const t = useTranslations("PinnedInsights");
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const result = onToggle();
    // If result is a string (pinId), it means we just pinned — trigger flying animation
    if (result && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      emitFlyingPin({ sourceRect: rect });
    }
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      className={`rounded-md p-1.5 transition-colors ${
        pinned
          ? "text-odoo-purple hover:bg-odoo-purple/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      title={pinned ? t("unpinTooltip") : t("pinTooltip")}
    >
      {pinned ? <PinOff size={14} /> : <Pin size={14} />}
    </motion.button>
  );
}
