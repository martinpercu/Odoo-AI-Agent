"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Store, Minus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useIntro } from "@/hooks/use-intro";
import { usePartnerNudge } from "@/hooks/use-partner-nudge";
import { track } from "@/lib/analytics";

/**
 * Surface C — Partner reframe nudge (spec §6).
 *
 * Sits in-flow right below the demo header (B), gently pushing the chat down as it
 * expands (slow height animation so the shove never feels abrupt). Never modal,
 * never blocks the chat. Auto-expands once after the 2nd successful demo response
 * (driven by `usePartnerNudge`), and can be minimized to a persistent pill.
 */
export function PartnerNudge() {
  const t = useTranslations("Intro.nudge");
  const router = useRouter();
  const { user } = useAuth();
  const { view, minimize, expand } = usePartnerNudge();
  const { openPanel } = useIntro();
  const reduceMotion = useReducedMotion();

  function handleStartFree() {
    track("partner_cta_clicked", { source: "nudge" });
    // Logged-in implementers go straight to their instances; anonymous demo
    // visitors first need an account (/instances is ADMIN-only).
    router.push(user ? "/instances" : "/register");
  }

  function handleHowItWorks() {
    track("info_opened_from_panel", { source: "nudge" });
    openPanel();
  }

  return (
    <AnimatePresence initial={false}>
      {view === "expanded" && (
        <motion.div
          key="expanded"
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.7, ease: "easeInOut" },
            opacity: { duration: 0.5, ease: "easeOut", delay: 0.15 },
          }}
          className="shrink-0 overflow-hidden border-b border-border bg-accent-subtle"
        >
          <div className="mx-auto flex max-w-3xl flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-accent/15 text-accent">
              <Store size={20} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-micro font-medium uppercase tracking-wide text-accent">
                {t("eyebrow")}
              </p>
              <p className="mt-0.5 text-body font-medium text-foreground">{t("title")}</p>
              <p className="mt-1 text-small text-text-secondary">{t("body")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  onClick={handleStartFree}
                  className="group inline-flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-4 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
                >
                  {t("ctaPrimary")}
                  <ArrowRight
                    size={16}
                    strokeWidth={1.5}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
                <button
                  onClick={handleHowItWorks}
                  className="text-small font-medium text-accent underline-offset-2 hover:underline"
                >
                  {t("ctaSecondary")}
                </button>
              </div>
            </div>
            <button
              onClick={minimize}
              aria-label={t("minimize")}
              className="shrink-0 rounded-btn border border-border bg-surface p-1.5 text-foreground/70 shadow-sm transition-colors hover:bg-raised hover:text-foreground"
            >
              <Minus size={16} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}

      {view === "pill" && (
        <motion.div
          key="pill"
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex shrink-0 justify-center overflow-hidden border-b border-border bg-base px-4 py-1.5"
        >
          <button
            onClick={expand}
            aria-expanded={false}
            className="group inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-micro font-medium text-accent transition-colors hover:bg-accent-subtle"
          >
            <Store size={14} strokeWidth={1.5} />
            {t("pill")}
            <ArrowRight
              size={14}
              strokeWidth={1.5}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
