"use client";

import { useTranslations } from "next-intl";
import { X, AlertCircle } from "lucide-react";
import { useLimitReachedModal } from "@/hooks/use-limit-reached-modal";

export function LimitReachedModal() {
  const { isOpen, hideLimitModal } = useLimitReachedModal();
  const t = useTranslations("LimitReachedModal");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl mx-4">
        <button
          onClick={hideLimitModal}
          className="absolute right-4 top-4 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          aria-label={t("close")}
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
            <AlertCircle size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">
              {t("title")}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {t("description")}
            </p>
          </div>
        </div>

        <button
          onClick={hideLimitModal}
          className="mt-5 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}
