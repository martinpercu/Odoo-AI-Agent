"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Sparkles, Building2, Zap } from "lucide-react";

const PLAN_IDS = ["free", "pro", "enterprise"] as const;
const PLAN_PRICES: Record<string, number | null> = { free: 0, pro: 29, enterprise: null };
const PLAN_HIGHLIGHTED: Record<string, boolean> = { free: false, pro: true, enterprise: false };
const PLAN_FEATURE_KEYS: Record<string, string[]> = {
  free: ["agents", "queries", "instances", "history", "support"],
  pro: ["agents", "queries", "instances", "history", "support", "export", "markdown"],
  enterprise: ["includesPro", "instances", "agents", "api", "sso", "support", "sla", "onboarding"],
};

const icons = {
  free: Zap,
  pro: Sparkles,
  enterprise: Building2,
};

export function PricingCards() {
  const t = useTranslations("Pricing");

  const plans = PLAN_IDS.map((id) => ({
    id,
    name: t(`plans.${id}.name`),
    price: PLAN_PRICES[id],
    description: t(`plans.${id}.description`),
    cta: t(`plans.${id}.cta`),
    features: PLAN_FEATURE_KEYS[id].map((key) => t(`plans.${id}.features.${key}`)),
    highlighted: PLAN_HIGHLIGHTED[id],
  }));

  return (
    <div className="grid gap-6 md:grid-cols-3 md:items-start">
      {plans.map((plan, index) => {
        const Icon = icons[plan.id as keyof typeof icons];
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.15, ease: "easeOut" }}
            className={`relative flex flex-col rounded-lg border p-6 transition-shadow hover:shadow-lg ${
              plan.highlighted
                ? "border-accent bg-surface shadow-lg ring-2 ring-accent/20"
                : "border-border bg-surface"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-md bg-accent px-4 py-1 text-micro font-semibold text-white">
                  {t("mostPopular")}
                </span>
              </div>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-md ${
                  plan.highlighted
                    ? "bg-accent text-white"
                    : "bg-raised text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-subheading">{plan.name}</h3>
            </div>

            <div className="mb-2">
              {plan.price !== null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">
                    {plan.price === 0 ? t("free") : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-body text-text-secondary">{t("perMonth")}</span>
                  )}
                </div>
              ) : (
                <span className="text-4xl font-extrabold">{t("custom")}</span>
              )}
            </div>

            <p className="mb-6 text-body text-text-secondary">{plan.description}</p>

            <ul className="mb-8 flex flex-1 flex-col gap-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-body">
                  <Check
                    size={16}
                    strokeWidth={1.5}
                    className={`mt-0.5 shrink-0 ${
                      plan.highlighted ? "text-accent" : "text-success-solid"
                    }`}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`h-9 w-full rounded-md px-4 py-2 text-body font-semibold transition-colors ${
                plan.highlighted
                  ? "bg-accent text-white shadow-sm hover:bg-accent-hover"
                  : "border border-border bg-surface text-foreground hover:bg-raised"
              }`}
            >
              {plan.cta}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
