"use client";

/**
 * Founding Partners pricing (Fase 0, spec §3). A 3-card contrast ladder:
 *   A — Founding Partner: active, the viewer's plan. Free during the program,
 *       then $1/user for life. Visually dominant.
 *   B — Standard (public): the price a non-founder pays ($7/user). Lives as the
 *       anchor that makes the founder rate read as 7× cheaper — not "coming soon".
 *   C — Enterprise: 200+ seats / 30+ instances, custom pricing (no number).
 *
 * Tone: invitation + status + scarcity — the program is by invitation only.
 * All three cards are clickable and open one short modal whose only CTA is to
 * email Martin (martin@theodooagent.com). No purchase flow, no data capture.
 *
 * All prices come from `BillingState` (spec §6): founder_rate = $1,
 * price_anchor = $7 (public). Nothing hardcoded.
 *
 * Mobile: every card is a real <button>, so a tap opens the modal. The hover
 * elevation is a desktop-only nicety — the "by invitation" / "Talk to Martin"
 * affordance text is always visible so the tap target reads as actionable
 * without relying on hover.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Star, Users, Building2, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FoundingInfoModal } from "@/components/pricing/founding-info-modal";
import type { BillingState } from "@/lib/types";

interface FoundingPartnerPricingProps {
  billing: BillingState;
  /** True when org is a founding partner but hasn't connected their first instance yet. */
  awaitingFirstInstance?: boolean;
}

/** $7 → "$7", $1 → "$1", $1.4 → "$1.40" — keeps cents only when they exist. */
function formatPrice(value: number): string {
  const hasCents = value % 1 !== 0;
  return `$${value.toFixed(hasCents ? 2 : 0)}`;
}

export function FoundingPartnerPricing({ billing, awaitingFirstInstance }: FoundingPartnerPricingProps) {
  const t = useTranslations("Pricing.founding");
  const [infoOpen, setInfoOpen] = useState(false);
  const openInfo = () => setInfoOpen(true);

  const founderRate = formatPrice(billing.founder_rate); // $1
  const anchor = formatPrice(billing.price_anchor); // $7

  const features = [
    t("features.whiteLabel"),
    t("features.aiIncluded"),
    t("features.multiClient"),
    t("features.noInstall"),
    t("features.exactNumbers"),
    t("features.feedback"),
  ];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
        {/* ---- Card A: Founding Partner (active, dominant) — CTA goes to /register ---- */}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-accent text-white">
              <Star size={20} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h3 className="text-subheading">{t("name")}</h3>
              <span className="text-micro font-medium text-accent">{t("limitedSpots")}</span>
            </div>
          </div>

          <div className="mb-1">
            <span className="text-3xl font-extrabold">{t("freeNow")}</span>
          </div>
          <p className="mb-1 text-body font-semibold text-foreground">
            {t("afterProgram", { rate: founderRate })}
          </p>
          <p className="mb-6 text-small text-accent">{t("lockedForLife")}</p>

          <ul className="mb-6 flex flex-1 flex-col gap-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-body">
                <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href={awaitingFirstInstance ? "/instances" : "/register"}
            className="mt-auto flex h-btn-md w-full items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            {t("startCta")}
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </motion.div>

        {/* ---- Card B: Standard / public price (the anchor) ---- */}
        <ContrastCard
          icon={<Users size={20} strokeWidth={1.5} />}
          name={t("public.name")}
          price={t("public.price", { anchor })}
          tag={t("public.tag")}
          note={t("public.note")}
          cta={t("contactCta")}
          onOpen={openInfo}
          delay={0.1}
        />

        {/* ---- Card C: Enterprise (scale, no number) ---- */}
        <ContrastCard
          icon={<Building2 size={20} strokeWidth={1.5} />}
          name={t("enterprise.name")}
          price={t("enterprise.desc")}
          priceSmall
          tag={t("enterprise.tag")}
          note={t("enterprise.note")}
          cta={t("contactCta")}
          onOpen={openInfo}
          delay={0.2}
        />
      </div>

      {/* ---- Short modal — its only CTA is to email Martin ---- */}
      <FoundingInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}

// ---- Contrast card (cards B/C) — clickable, opens the same modal ----

interface ContrastCardProps {
  icon: React.ReactNode;
  name: string;
  price: string;
  /** Smaller price type for descriptive strings (Enterprise). */
  priceSmall?: boolean;
  tag: string;
  note: string;
  cta: string;
  onOpen: () => void;
  delay: number;
}

function ContrastCard({
  icon,
  name,
  price,
  priceSmall,
  tag,
  note,
  cta,
  onOpen,
  delay,
}: ContrastCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.15, ease: "easeOut" }}
      className="relative flex flex-col rounded-card border border-border bg-surface p-6 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="absolute right-4 top-4">
        <span className="rounded-btn border border-border bg-base px-2 py-0.5 text-micro font-medium text-text-secondary">
          {tag}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-raised text-text-secondary">
          {icon}
        </div>
        <h3 className="text-subheading">{name}</h3>
      </div>

      <div className="mb-2">
        <span
          className={
            priceSmall
              ? "text-xl font-bold text-foreground"
              : "text-3xl font-extrabold text-foreground"
          }
        >
          {price}
        </span>
      </div>
      <p className="mb-6 text-small text-text-secondary">{note}</p>

      <span className="mt-auto inline-flex items-center gap-1.5 text-small font-medium text-accent">
        {cta}
        <ArrowRight size={14} strokeWidth={1.5} />
      </span>
    </motion.button>
  );
}
