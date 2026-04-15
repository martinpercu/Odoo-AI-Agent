"use client";

import { useTranslations } from "next-intl";
import { X, AlertTriangle } from "lucide-react";
import { useLimitReachedModal } from "@/hooks/use-limit-reached-modal";

export function LimitReachedModal() {
  const { isOpen, hideLimitModal } = useLimitReachedModal();
  const t = useTranslations("LimitReachedModal");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <button
          onClick={hideLimitModal}
          className="absolute right-4 top-4 rounded-md p-1 text-text-secondary transition-colors hover:text-foreground"
          aria-label={t("close")}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-md bg-warning-subtle p-2">
            <AlertTriangle size={20} strokeWidth={1.5} className="text-warning-solid" />
          </div>
          <div className="flex-1">
            <h2 className="text-heading mb-1">
              {t("title")}
            </h2>
            <p className="text-body text-text-secondary">
              {t("description")}
            </p>
          </div>
        </div>

        <button
          onClick={hideLimitModal}
          className="mt-5 h-9 w-full rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}
