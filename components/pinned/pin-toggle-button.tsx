"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Pin, PinOff, Bookmark, BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { emitFlyingPin } from "@/lib/pin-animation-events";
import type { PinVolatility } from "@/lib/types";

interface PinToggleButtonProps {
  pinned: boolean;
  onToggle: () => string | null;
  volatility?: PinVolatility;
}

export function PinToggleButton({ pinned, onToggle, volatility }: PinToggleButtonProps) {
  const t = useTranslations("PinnedInsights");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isStatic = volatility === "static";

  function handleClick() {
    const result = onToggle();
    if (result && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      emitFlyingPin({ sourceRect: rect });
    }
  }

  const label = isStatic
    ? (pinned ? t("savedTooltip") : t("saveTooltip"))
    : (pinned ? t("unpinTooltip") : t("pinTooltip"));

  const Icon = isStatic
    ? (pinned ? BookmarkCheck : Bookmark)
    : (pinned ? PinOff : Pin);

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      className={`rounded-md p-1.5 transition-colors ${
        pinned
          ? "text-accent hover:bg-accent-subtle"
          : "text-text-secondary hover:bg-raised hover:text-foreground"
      }`}
      title={label}
      aria-label={label}
    >
      <Icon size={14} strokeWidth={1.5} />
    </motion.button>
  );
}
