"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { FoundingPartnerPricing } from "@/components/pricing/founding-partner-pricing";
import { getBillingState, BETA_BILLING_DEFAULTS } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import type { BillingState } from "@/lib/types";

/** $1.4 → "$1.40", $7 → "$7". */
function formatPrice(value: number): string {
  const hasCents = value % 1 !== 0;
  return `$${value.toFixed(hasCents ? 2 : 0)}`;
}

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const tf = useTranslations("Pricing.founding");
  const router = useRouter();
  const { meData } = useSession();
  const currentTier = meData?.subscription?.tier ?? null;
  const role = meData?.user?.role;
  // White-label (spec §1/§8): founder pricing & the "Founding Partner" mark must
  // never render in Client mode. Bounce Client users away from /pricing.
  const isClient = !!role && role !== "ADMIN" && role !== "SUPERADMIN";

  // Render-only billing state (Surface I, spec §5/§6). Falls back to beta defaults.
  const [billing, setBilling] = useState<BillingState>(BETA_BILLING_DEFAULTS);

  useEffect(() => {
    if (isClient) router.replace("/chat");
  }, [isClient, router]);

  useEffect(() => {
    let active = true;
    getBillingState().then((state) => {
      if (active) setBilling(state);
    });
    return () => {
      active = false;
    };
  }, []);

  if (isClient) return null;

  const isBeta = billing.phase === "beta_founder";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 lg:pb-20 lg:pt-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-accent-subtle">
            <Sparkles size={24} strokeWidth={1.5} className="text-accent" />
          </div>
          <h1 className="text-display">{t("heading")}</h1>
        </motion.div>

        {isBeta ? (
          <FoundingPartnerPricing billing={billing} />
        ) : (
          <PricingCards currentTier={currentTier} />
        )}

        {isBeta ? (
          /* Billing indicator (Surface I, spec §5) — render-only, no active billing language */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
            className="mx-auto mt-16 max-w-xl rounded-card border border-border bg-surface px-5 py-4 text-center"
          >
            <p className="text-body font-semibold text-foreground">{tf("indicator.status")}</p>
            <p className="mt-1 text-small text-text-secondary">
              {tf("indicator.note", { rate: formatPrice(billing.founder_rate) })}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
            className="mt-16 text-center"
          >
            <p className="text-body text-text-secondary">
              {t("footer")}
              <br />
              {t("needSpecial")}{" "}
              <button className="font-medium text-accent hover:underline">{t("contactUs")}</button>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
