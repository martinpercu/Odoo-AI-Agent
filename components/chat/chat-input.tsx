"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const t = useTranslations("ChatInput");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
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

  return (
    <div className="border-t border-border bg-background px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            rows={1}
            disabled={disabled}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {isStreaming ? (
            <motion.button
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              onClick={onStop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-white transition-colors hover:bg-destructive/90"
            >
              <Square size={16} fill="currentColor" />
            </motion.button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
