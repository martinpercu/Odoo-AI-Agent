"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, /* Paperclip, */ X } from "lucide-react";
import { useIconSize } from "@/hooks/use-icon-size";

interface ChatInputProps {
  onSend: (message: string, image?: File) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const t = useTranslations("ChatInput");
  const [value, setValue] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconBtn = useIconSize("button");

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
        <div className="rounded-lg border border-border bg-surface shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-accent/30">
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
              className="max-h-50 min-h-input flex-1 resize-none bg-transparent px-2 py-2 text-body outline-none placeholder:text-text-muted disabled:opacity-50"
            />

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
        </div>
      </div>
    </div>
  );
}
