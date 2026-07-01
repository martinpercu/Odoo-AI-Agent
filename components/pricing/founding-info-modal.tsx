"use client";

/**
 * Shared "Founding Partners program" info modal. Its only CTA is a mailto to
 * Martin — no purchase flow, no data capture. Used by the pricing contrast
 * cards (Standard/Enterprise) and by the gated register CTA, so both surfaces
 * stay byte-for-byte identical.
 */

import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { A11yModal } from "@/components/intro/a11y-modal";

interface FoundingInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export function FoundingInfoModal({ open, onClose }: FoundingInfoModalProps) {
  const t = useTranslations("Pricing.founding");

  return (
    <A11yModal
      open={open}
      onClose={onClose}
      labelledBy="founding-modal-title"
      describedBy="founding-modal-body"
      className="w-full max-w-md px-4"
      containerClassName="items-end sm:items-center"
    >
      <div className="rounded-card border border-border bg-surface p-6 shadow-lg">
        <h2 id="founding-modal-title" className="mb-2 text-heading">
          {t("modal.title")}
        </h2>
        <p id="founding-modal-body" className="mb-6 text-body text-text-secondary">
          {t("modal.body")}
        </p>
        <a
          href={`mailto:${t("modal.email")}?subject=${encodeURIComponent(t("modal.title"))}`}
          className="flex h-btn-md w-full items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Mail size={18} strokeWidth={1.5} />
          {t("modal.cta")}
        </a>
      </div>
    </A11yModal>
  );
}
