"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FeedbackCategory } from "@/lib/types";
import { submitFeedback } from "@/lib/api";

interface FeedbackModalProps {
  chatId: string;
  messageId: string | undefined;
  configId: string;
  onClose: () => void;
}

const CATEGORIES: { value: FeedbackCategory; labelKey: string }[] = [
  { value: "wrong_answer", labelKey: "wrongAnswer" },
  { value: "crash", labelKey: "crash" },
  { value: "misunderstood", labelKey: "misunderstood" },
  { value: "other", labelKey: "other" },
];

export function FeedbackModal({ chatId, messageId, configId, onClose }: FeedbackModalProps) {
  const t = useTranslations("Feedback");

  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");
  const [expectedResponse, setExpectedResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitFeedback(chatId, {
        config_id: configId,
        message_id: messageId,
        user_comment: comment || undefined,
        category: category ?? undefined,
        expected_response: expectedResponse || undefined,
      });
      setSubmitted(true);
      setTimeout(onClose, 2400);
    } catch {
      // fail silently per spec
      console.error("Feedback submission failed");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-md rounded-lg border border-border bg-surface shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Flag size={16} strokeWidth={1.5} className="text-accent" />
              <h2 className="text-subheading">{t("title")}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-muted hover:bg-raised hover:text-foreground transition-colors"
              aria-label={t("cancel")}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Body */}
          {submitted ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <CheckCircle2 size={32} strokeWidth={1.5} className="text-success-solid" />
              <p className="text-body font-medium text-foreground">{t("successToast")}</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-5 space-y-5">
                {/* Category */}
                <div className="space-y-2">
                  <p className="text-small font-medium text-text-secondary">{t("categoryLabel")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(({ value, labelKey }) => (
                      <button
                        key={value}
                        onClick={() => setCategory(category === value ? null : value)}
                        className={`rounded-md border px-3 py-2 text-small text-left transition-colors ${
                          category === value
                            ? "border-accent bg-accent-subtle text-accent"
                            : "border-border bg-raised text-text-secondary hover:border-accent/50 hover:text-foreground"
                        }`}
                      >
                        {t(`categories.${labelKey}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <p className="text-small font-medium text-text-secondary">{t("commentLabel")}</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("commentPlaceholder")}
                    rows={3}
                    className="w-full rounded-md border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                {/* Expected response */}
                <div className="space-y-2">
                  <p className="text-small font-medium text-text-secondary">{t("expectedResponseLabel")}</p>
                  <textarea
                    value={expectedResponse}
                    onChange={(e) => setExpectedResponse(e.target.value)}
                    placeholder={t("expectedResponsePlaceholder")}
                    rows={3}
                    className="w-full rounded-md border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
                <button
                  onClick={onClose}
                  className="h-btn-md rounded-btn px-4 text-small text-text-secondary hover:bg-raised hover:text-foreground transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-small font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                  {t("submit")}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
