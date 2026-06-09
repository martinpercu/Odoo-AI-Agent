"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Sparkles, Store, Mail, ShieldCheck } from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import { useRouter } from "@/i18n/navigation";
import { useIntro } from "@/hooks/use-intro";
import { track } from "@/lib/analytics";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-subheading">{heading}</h3>
      {children}
    </section>
  );
}

export function IntroPanel() {
  const t = useTranslations("Intro.panel");
  const router = useRouter();
  const { isPanelOpen, closePanel } = useIntro();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isPanelOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const focusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (focusable ?? panel)?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isPanelOpen]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleConnect() {
    track("connect_own_odoo_clicked", { source: "panel" });
    closePanel();
    router.push("/login");
  }

  function handlePartner() {
    track("partner_cta_clicked");
    window.location.href = `mailto:${t("founder.email")}?subject=${encodeURIComponent(
      "Revender TheOdooAgent"
    )}`;
  }

  const trustItems = ["item1", "item2", "item3", "item4"] as const;
  const diffItems = ["item1", "item2"] as const;
  const faqItems = [
    { q: "q1", a: "a1" },
    { q: "q2", a: "a2" },
    { q: "q3", a: "a3" },
    { q: "q4", a: "a4" },
  ] as const;

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={closePanel}
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />
          {/* Drawer */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-lg outline-none"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-accent-subtle">
                <MarkB size={22} fg="currentColor" className="text-accent" />
              </div>
              <h2 id={titleId} className="flex-1 text-subheading">
                {t("title")}
              </h2>
              <button
                onClick={closePanel}
                className="rounded-btn p-1.5 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
                aria-label={t("close")}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5">
              <div className="py-4">
                {/* 1 · Qué es */}
                <Section heading={t("what.heading")}>
                  <p className="text-body text-text-secondary">{t("what.body")}</p>
                </Section>

                {/* 2 · Cómo funciona */}
                <Section heading={t("how.heading")}>
                  <p className="mb-3 text-body text-text-secondary">{t("how.intro")}</p>
                  <ul className="mb-3 space-y-2">
                    {["example1", "example2", "example3"].map((k) => (
                      <li
                        key={k}
                        className="rounded-btn border border-border bg-base px-3 py-2 text-small text-text-secondary"
                      >
                        “{t(`how.${k}`)}”
                      </li>
                    ))}
                  </ul>
                  <p className="text-body text-text-secondary">{t("how.operates")}</p>
                </Section>

                {/* 3 · Por qué confiar */}
                <Section heading={t("trust.heading")}>
                  <ul className="space-y-2.5">
                    {trustItems.map((k) => (
                      <li key={k} className="flex items-start gap-2.5 text-body">
                        <Check
                          size={18}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-success-solid"
                        />
                        <span className="text-text-secondary">{t(`trust.${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* 4 · Por qué es distinto */}
                <Section heading={t("different.heading")}>
                  <ul className="space-y-2.5">
                    {diffItems.map((k) => (
                      <li key={k} className="flex items-start gap-2.5 text-body">
                        <Sparkles
                          size={18}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-accent"
                        />
                        <span className="text-text-secondary">{t(`different.${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* 5 · Partner */}
                <Section heading={t("partner.heading")}>
                  <div className="rounded-card border border-accent/20 bg-accent-subtle p-4">
                    <div className="mb-2 flex items-center gap-2 text-accent">
                      <Store size={18} strokeWidth={1.5} />
                      <span className="text-small font-medium">{t("partner.heading")}</span>
                    </div>
                    <p className="mb-3 text-body text-text-secondary">{t("partner.body")}</p>
                    <button
                      onClick={handlePartner}
                      className="h-btn-sm rounded-btn bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      {t("partner.cta")}
                    </button>
                  </div>
                </Section>

                {/* 6 · Hecho por mí */}
                <Section heading={t("founder.heading")}>
                  <p className="mb-3 text-body text-text-secondary">{t("founder.body")}</p>
                  <a
                    href={`mailto:${t("founder.email")}`}
                    className="inline-flex items-center gap-2 text-small font-medium text-accent hover:underline"
                  >
                    <Mail size={16} strokeWidth={1.5} />
                    {t("founder.email")}
                  </a>
                </Section>

                {/* 7 · FAQ */}
                <Section heading={t("faq.heading")}>
                  <dl className="space-y-3">
                    {faqItems.map(({ q, a }) => (
                      <div key={q}>
                        <dt className="flex items-center gap-2 text-body font-medium text-foreground">
                          <ShieldCheck
                            size={16}
                            strokeWidth={1.5}
                            className="shrink-0 text-text-muted"
                          />
                          {t(`faq.${q}`)}
                        </dt>
                        <dd className="ml-6 mt-0.5 text-small text-text-secondary">
                          {t(`faq.${a}`)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              </div>
            </div>

            {/* Footer CTAs */}
            <div className="flex flex-col gap-2.5 border-t border-border p-4 sm:flex-row">
              <button
                onClick={closePanel}
                className="h-btn-md flex-1 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                {t("ctaDemo")}
              </button>
              <button
                onClick={handleConnect}
                className="h-btn-md flex-1 rounded-btn border border-border px-4 text-body font-medium text-foreground transition-colors hover:bg-raised"
              >
                {t("ctaConnect")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
