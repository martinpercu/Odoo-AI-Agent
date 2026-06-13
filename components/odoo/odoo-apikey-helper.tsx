"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";

/**
 * Collapsible "how to generate your API key in Odoo" helper (spec §6.5).
 * Shown next to the apikey field in CredentialForm and onboarding — reduces support load.
 * Steps live under the `Odoo.apiKeyHelper` i18n namespace (`step1`..`step4`).
 */
export function OdooApiKeyHelper() {
  const t = useTranslations("Odoo.apiKeyHelper");
  const [open, setOpen] = useState(false);
  const steps = ["step1", "step2", "step3", "step4"] as const;

  return (
    <div className="rounded-btn border border-border bg-raised/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-small text-text-secondary transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <HelpCircle size={16} strokeWidth={1.5} className="text-accent" />
          {t("title")}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ol className="list-decimal space-y-1.5 border-t border-border px-3 py-3 pl-7 text-small text-text-secondary">
              {steps.map((s) => (
                <li key={s}>{t(s)}</li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
