"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PricingCards } from "@/components/pricing/pricing-cards";

export default function PricingPage() {
  const t = useTranslations("Pricing");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-accent-subtle">
            <Sparkles size={24} strokeWidth={1.5} className="text-accent" />
          </div>
          <h1 className="mb-3 text-display">
            {t("heading")}
          </h1>
          <p className="mx-auto max-w-xl text-body text-text-secondary">
            {t("subheading")}
          </p>
        </motion.div>

        <PricingCards />

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
            <button className="font-medium text-accent hover:underline">
              {t("contactUs")}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
