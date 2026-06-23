"use client";

/**
 * Founding Partners pricing (Fase 0, spec §3). Three cards:
 *   A — Founding Partner: active, the user's current plan (no purchase CTA).
 *   B — Standard: greyed/disabled, opens the informative modal (§3.1).
 *   C — Enterprise: greyed/disabled, opens the informative modal (§3.1).
 *
 * Tone: invitation + status + scarcity + honesty — never "buy / subscribe".
 * All prices are read from `BillingState` (spec §6) — nothing hardcoded.
 * Cards B/C are purely informative: no POST, no interest capture.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Sparkles, Building2, Star } from "lucide-react";
import { A11yModal } from "@/components/intro/a11y-modal";
import type { BillingState } from "@/lib/types";

interface FoundingPartnerPricingProps {
  billing: BillingState;
}

/** $7 → "$7", $1.4 → "$1.40" — keeps cents only when they exist. */
function formatPrice(value: number): string {
  const hasCents = value % 1 !== 0;
  return `$${value.toFixed(hasCents ? 2 : 0)}`;
}

export function FoundingPartnerPricing({ billing }: FoundingPartnerPricingProps) {
  const t = useTranslations("Pricing.founding");
  const [infoOpen, setInfoOpen] = useState(false);

  const founderRate = formatPrice(billing.founder_rate);
  const anchor = formatPrice(billing.price_anchor);

  const founderFeatures = [
    t("features.freeBeta"),
    t("features.lockedRate"),
    t("features.feedback"),
    t("features.firstInMarket"),
  ];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
        {/* ---- Card A: Founding Partner (active) ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative flex flex-col rounded-card border border-accent bg-surface p-6 shadow-lg ring-2 ring-accent/20"
        >
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="rounded-btn bg-accent px-4 py-1 text-micro font-semibold text-white">
              {t("yourPlan")}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent text-white">
              <Star size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-subheading">{t("name")}</h3>
          </div>

          {billing.beta_free && (
            <div className="mb-1">
              <span className="text-4xl font-extrabold">{t("betaFree")}</span>
            </div>
          )}
          <p className="mb-1 text-body font-semibold text-foreground">
            {t("founderRate", { rate: founderRate })}
          </p>
          <p className="mb-2 text-small text-accent">{t("founderRateNote")}</p>
          <p className="mb-6 text-small text-text-muted">
            <span className="line-through">{t("anchor", { anchor })}</span>
          </p>

          <ul className="mb-6 flex flex-1 flex-col gap-3">
            {founderFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-body">
                <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <p className="rounded-btn bg-accent-subtle px-3 py-2 text-small text-text-secondary">
            {t("honestNote", { rate: founderRate })}
          </p>
        </motion.div>

        {/* ---- Card B: Standard (disabled → info modal) ---- */}
        <DisabledCard
          icon={<Sparkles size={20} strokeWidth={1.5} />}
          name={t("standard.name")}
          price={t("standard.price", { anchor })}
          soonLabel={t("standard.soon")}
          ariaLabel={t("modal.title")}
          onOpen={() => setInfoOpen(true)}
          delay={0.1}
        />

        {/* ---- Card C: Enterprise (disabled → info modal) ---- */}
        <DisabledCard
          icon={<Building2 size={20} strokeWidth={1.5} />}
          name={t("enterprise.name")}
          price={t("enterprise.desc")}
          soonLabel={t("enterprise.soon")}
          ariaLabel={t("modal.title")}
          onOpen={() => setInfoOpen(true)}
          delay={0.2}
        />
      </div>

      {/* ---- Informative modal (§3.1) — no data capture ---- */}
      <A11yModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
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
          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            className="h-btn-md w-full rounded-btn bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            {t("modal.cta")}
          </button>
        </div>
      </A11yModal>
    </>
  );
}

// ---- Disabled-but-clickable card (cards B/C) ----

interface DisabledCardProps {
  icon: React.ReactNode;
  name: string;
  price: string;
  soonLabel: string;
  ariaLabel: string;
  onOpen: () => void;
  delay: number;
}

function DisabledCard({ icon, name, price, soonLabel, ariaLabel, onOpen, delay }: DisabledCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-disabled="true"
      aria-label={ariaLabel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.15, ease: "easeOut" }}
      className="relative flex flex-col rounded-card border border-border bg-raised/40 p-6 text-left opacity-70 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="absolute right-4 top-4">
        <span className="rounded-btn border border-border bg-surface px-2 py-0.5 text-micro font-medium text-text-secondary">
          {soonLabel}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-raised text-text-secondary">
          {icon}
        </div>
        <h3 className="text-subheading text-text-secondary">{name}</h3>
      </div>

      <div className="mb-2">
        <span className="text-2xl font-bold text-text-secondary">{price}</span>
      </div>
    </motion.button>
  );
}
