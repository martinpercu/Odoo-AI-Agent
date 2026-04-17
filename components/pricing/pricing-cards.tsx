"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, Sparkles, Building2, X, ChevronDown } from "lucide-react";
import type { SubscriptionTier } from "@/lib/types";
import { createBillingCheckout, createBillingPortalSession } from "@/lib/api";

// ---- Static plan data ----

type ImplementorTier = "IMPLEMENTOR_S" | "IMPLEMENTOR_M" | "IMPLEMENTOR_L" | "IMPLEMENTOR_XL" | "IMPLEMENTOR_XXL";

interface ImplementorPlan {
  tier: ImplementorTier;
  label: string;
  paidSlots: number;
  freeSlots: number;
  price: number;
}

const IMPLEMENTOR_PLANS: ImplementorPlan[] = [
  { tier: "IMPLEMENTOR_S",   label: "S",   paidSlots: 5,   freeSlots: 5, price: 8  },
  { tier: "IMPLEMENTOR_M",   label: "M",   paidSlots: 10,  freeSlots: 5, price: 12 },
  { tier: "IMPLEMENTOR_L",   label: "L",   paidSlots: 25,  freeSlots: 5, price: 20 },
  { tier: "IMPLEMENTOR_XL",  label: "XL",  paidSlots: 50,  freeSlots: 5, price: 30 },
  { tier: "IMPLEMENTOR_XXL", label: "XXL", paidSlots: 100, freeSlots: 5, price: 50 },
];

const IMPLEMENTOR_TIERS = new Set<SubscriptionTier>([
  "IMPLEMENTOR_S", "IMPLEMENTOR_M", "IMPLEMENTOR_L", "IMPLEMENTOR_XL", "IMPLEMENTOR_XXL",
]);

function isImplementorTier(tier: SubscriptionTier | null | undefined): tier is ImplementorTier {
  return !!tier && IMPLEMENTOR_TIERS.has(tier);
}

// ---- Props ----

interface PricingCardsProps {
  currentTier?: SubscriptionTier | null;
}

// ---- Main component ----

export function PricingCards({ currentTier }: PricingCardsProps) {
  const t = useTranslations("Pricing");
  const [implementorOpen, setImplementorOpen] = useState(false);
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | "portal" | null>(null);

  const isImplementor = isImplementorTier(currentTier);

  async function handleCheckout(tier: Exclude<SubscriptionTier, "FREE">) {
    setLoadingTier(tier);
    try {
      const result = await createBillingCheckout(tier);
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  async function handlePortal() {
    setLoadingTier("portal");
    try {
      const result = await createBillingPortalSession();
      if (result.success && result.portal_url) {
        window.location.href = result.portal_url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  // ---- CTA helpers ----

  function FreeCtaButton() {
    if (currentTier === "FREE") {
      return (
        <button disabled className="h-9 w-full rounded-md border border-border bg-raised px-4 text-body text-text-secondary opacity-60 cursor-not-allowed">
          {t("currentPlan")}
        </button>
      );
    }
    return (
      <button
        onClick={() => window.location.href = "/register"}
        className="h-9 w-full rounded-md border border-border bg-surface px-4 text-body font-semibold text-foreground transition-colors hover:bg-raised"
      >
        {t("plans.free.cta")}
      </button>
    );
  }

  function StarterCtaButton() {
    if (currentTier === "STARTER") {
      return (
        <button
          onClick={handlePortal}
          disabled={loadingTier === "portal"}
          className="h-9 w-full rounded-md bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loadingTier === "portal" ? t("loading") : t("manageSubscription")}
        </button>
      );
    }
    if (!currentTier || currentTier === "FREE") {
      return (
        <button
          onClick={() => handleCheckout("STARTER")}
          disabled={loadingTier === "STARTER"}
          className="h-9 w-full rounded-md bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loadingTier === "STARTER" ? t("loading") : t("plans.starter.cta")}
        </button>
      );
    }
    // Implementor on Starter block — upsell
    return (
      <button
        onClick={handlePortal}
        disabled={loadingTier === "portal"}
        className="h-9 w-full rounded-md bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {loadingTier === "portal" ? t("loading") : t("manageSubscription")}
      </button>
    );
  }

  function EnterpriseCtaButton() {
    if (isImplementor) {
      return (
        <button
          onClick={() => setImplementorOpen(true)}
          className="h-9 w-full rounded-md border border-border bg-surface px-4 text-body font-semibold text-foreground transition-colors hover:bg-raised"
        >
          {t("viewRates")}
        </button>
      );
    }
    return (
      <button
        onClick={() => setImplementorOpen(true)}
        className="h-9 w-full rounded-md border border-border bg-surface px-4 text-body font-semibold text-foreground transition-colors hover:bg-raised"
      >
        {t("viewRates")}
      </button>
    );
  }

  // ---- Free features ----
  const freeFeatures = [
    t("plans.free.features.seat"),
    t("plans.free.features.dailyLimit"),
    t("plans.free.features.watermark"),
    t("plans.free.features.forever"),
  ];

  // ---- Starter features ----
  const starterFeatures = [
    t("plans.starter.features.seat"),
    t("plans.starter.features.noLimit"),
    t("plans.starter.features.noWatermark"),
  ];

  // ---- Enterprise features ----
  const enterpriseFeatures = [
    t("plans.enterprise.features.seatsFrom"),
    t("plans.enterprise.features.seatsTo"),
    t("plans.enterprise.features.freeSeats"),
    t("plans.enterprise.features.idealFor"),
  ];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 md:items-start">
        {/* ---- Block 1: Free ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0, duration: 0.15, ease: "easeOut" }}
          className={`relative flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg ${
            currentTier === "FREE"
              ? "border-accent bg-surface shadow-lg ring-2 ring-accent/20"
              : "border-border bg-surface"
          }`}
        >
          {currentTier === "FREE" && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-md bg-accent px-4 py-1 text-micro font-semibold text-white">
                {t("currentPlan")}
              </span>
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-raised text-foreground">
              <Zap size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-subheading">{t("plans.free.name")}</h3>
          </div>

          <div className="mb-2">
            <span className="text-4xl font-extrabold">{t("free")}</span>
          </div>

          <p className="mb-6 text-body text-text-secondary">{t("plans.free.description")}</p>

          <ul className="mb-8 flex flex-1 flex-col gap-3">
            {freeFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-body">
                <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-success-solid" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <FreeCtaButton />
        </motion.div>

        {/* ---- Block 2: Starter (most popular) ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.15, ease: "easeOut" }}
          className={`relative flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg ${
            currentTier === "STARTER"
              ? "border-accent bg-surface shadow-lg ring-2 ring-accent/20"
              : "border-accent bg-surface shadow-lg ring-2 ring-accent/20"
          }`}
        >
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="rounded-md bg-accent px-4 py-1 text-micro font-semibold text-white">
              {currentTier === "STARTER" ? t("currentPlan") : t("mostPopular")}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white">
              <Sparkles size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-subheading">{t("plans.starter.name")}</h3>
          </div>

          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">{t("plans.starter.price")}</span>
            <span className="text-body text-text-secondary">{t("perMonth")}</span>
          </div>

          <p className="mb-6 text-body text-text-secondary">{t("plans.starter.description")}</p>

          <ul className="mb-8 flex flex-1 flex-col gap-3">
            {starterFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-body">
                <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <StarterCtaButton />
        </motion.div>

        {/* ---- Block 3: Enterprise (implementor teaser) ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
          className={`relative flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg ${
            isImplementor
              ? "border-accent bg-surface shadow-lg ring-2 ring-accent/20"
              : "border-border bg-surface"
          }`}
        >
          {isImplementor && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-md bg-accent px-4 py-1 text-micro font-semibold text-white">
                {t("currentPlan")}
              </span>
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-md ${isImplementor ? "bg-accent text-white" : "bg-raised text-foreground"}`}>
              <Building2 size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-subheading">{t("plans.enterprise.name")}</h3>
          </div>

          <div className="mb-2">
            <span className="text-4xl font-extrabold">{t("plans.enterprise.fromPrice")}</span>
            <span className="text-body text-text-secondary">{t("perMonth")}</span>
          </div>

          <p className="mb-6 text-body text-text-secondary">{t("plans.enterprise.description")}</p>

          <ul className="mb-8 flex flex-1 flex-col gap-3">
            {enterpriseFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-body">
                <Check size={16} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${isImplementor ? "text-accent" : "text-success-solid"}`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <EnterpriseCtaButton />
        </motion.div>
      </div>

      {/* ---- Implementor detail modal ---- */}
      <AnimatePresence>
        {implementorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setImplementorOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-heading">{t("implementor.modalTitle")}</h2>
                  <p className="text-body text-text-secondary mt-1">{t("implementor.modalDesc")}</p>
                </div>
                <button
                  onClick={() => setImplementorOpen(false)}
                  aria-label={t("implementor.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-raised"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              {/* Starter upsell when on STARTER */}
              {currentTier === "STARTER" && (
                <div className="mb-4 rounded-md border border-accent/30 bg-accent-subtle px-4 py-3 text-body text-accent">
                  {t("implementor.starterUpsell")}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left text-text-secondary font-medium">{t("implementor.plan")}</th>
                      <th className="pb-3 text-center text-text-secondary font-medium">{t("implementor.paidSlots")}</th>
                      <th className="pb-3 text-center text-text-secondary font-medium">{t("implementor.freeSlots")}</th>
                      <th className="pb-3 text-center text-text-secondary font-medium">{t("implementor.price")}</th>
                      <th className="pb-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPLEMENTOR_PLANS.map((plan) => {
                      const isCurrent = currentTier === plan.tier;
                      return (
                        <tr
                          key={plan.tier}
                          className={`border-b border-border last:border-0 ${isCurrent ? "bg-accent-subtle" : ""}`}
                        >
                          <td className="py-3.5">
                            <span className={`font-semibold ${isCurrent ? "text-accent" : "text-foreground"}`}>
                              {plan.label}
                              {isCurrent && (
                                <span className="ml-2 rounded px-1.5 py-0.5 text-micro bg-accent text-white">
                                  {t("currentPlan")}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">{plan.paidSlots}</td>
                          <td className="py-3.5 text-center text-text-secondary">{plan.freeSlots}</td>
                          <td className="py-3.5 text-center font-semibold">${plan.price}{t("perMonth")}</td>
                          <td className="py-3.5 text-right">
                            {isCurrent ? (
                              <button
                                onClick={handlePortal}
                                disabled={loadingTier === "portal"}
                                className="rounded-md border border-border px-3 py-1.5 text-small font-semibold text-foreground transition-colors hover:bg-raised disabled:opacity-60"
                              >
                                {loadingTier === "portal" ? t("loading") : t("manageSubscription")}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckout(plan.tier)}
                                disabled={!!loadingTier}
                                className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                              >
                                {loadingTier === plan.tier ? t("loading") : t("subscribe")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-small text-text-muted">
                {t("implementor.freeSlotNote")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
