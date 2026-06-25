"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Boxes,
  Tag,
  Calculator,
  Building2,
  Plug,
  Check,
  Lock,
  ShieldCheck,
  Store,
  Mail,
  CircleDollarSign,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import { useRouter } from "@/i18n/navigation";
import { useIntro } from "@/hooks/use-intro";
import { useChatContext } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { clearOnboardingSkipped } from "@/lib/post-auth";
import { track } from "@/lib/analytics";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Section wrapper with a top divider (first one has none). */
function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="mb-3 text-subheading">{heading}</h3>
      {children}
    </section>
  );
}

/** Icon + short label + short line — used in "distinto" and "implementás". */
function FeatureRow({
  icon: Icon,
  label,
  body,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-medium text-foreground">{label}</p>
        <p className="text-small text-text-secondary">{body}</p>
      </div>
    </li>
  );
}

/** A single collapsible row (FAQ / founder). Collapsed by default. */
function Collapsible({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-body font-medium text-foreground transition-colors hover:text-accent"
      >
        <span>{question}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className={`shrink-0 text-text-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-3 text-small text-text-secondary">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function IntroPanel() {
  const t = useTranslations("Intro.panel");
  const router = useRouter();
  const { isPanelOpen, closePanel } = useIntro();
  const { createChat, sendMessage } = useChatContext();
  const { user } = useAuth();
  const { meData } = useSession();
  const panelRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLDivElement>(null);
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
    // Anonymous → register. Logged in with no instance (ADMIN first-instance gate)
    // → onboarding. Logged in with an instance (e.g. CLIENT_USER loading their own
    // key, or ADMIN whose connection is unset) → self-service credentials.
    const loggedIn = !!user;
    const hasInstance = (meData?.odoo_configs?.length ?? 0) > 0;
    if (loggedIn && !hasInstance) clearOnboardingSkipped();
    router.push(!loggedIn ? "/register" : hasInstance ? "/settings/odoo" : "/onboarding");
  }

  function handlePartner() {
    track("partner_cta_clicked");
    window.location.href = `mailto:${t("founder.email")}?subject=${encodeURIComponent(
      "Revender TheOdooAgent"
    )}`;
  }

  function handleChip(promptId: string, text: string) {
    track("example_prompt_clicked", { prompt_id: promptId, source: "panel" });
    closePanel();
    const id = createChat(text);
    router.push(`/chat/${id}`);
    sendMessage(text, id);
  }

  function scrollToPartner() {
    partnerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 2 · Qué hace — interactive example chips.
  const chips = [
    { id: "overdue_invoices", text: t("what.chip1") },
    { id: "sales_by_rep", text: t("what.chip2") },
    { id: "create_contact", text: t("what.chip3") },
  ] as const;

  // 3 · Por qué es distinto.
  const diffRows = [
    { icon: Boxes, label: t("different.item1Label"), body: t("different.item1Body") },
    { icon: CircleDollarSign, label: t("different.item2Label"), body: t("different.item2Body") },
    { icon: Tag, label: t("different.item3Label"), body: t("different.item3Body") },
    { icon: Calculator, label: t("different.item4Label"), body: t("different.item4Body") },
  ] as const;

  // 4 · ¿Implementás Odoo?
  const partnerRows = [
    { icon: Tag, label: t("partner.item1Label"), body: t("partner.item1Body") },
    { icon: Building2, label: t("partner.item2Label"), body: t("partner.item2Body") },
    { icon: Plug, label: t("partner.item3Label"), body: t("partner.item3Body") },
  ] as const;

  // 5 · Seguro por diseño — compact, icon + short label only.
  const secureItems = [
    { icon: Check, label: t("secure.item1") },
    { icon: Lock, label: t("secure.item2") },
    { icon: Calculator, label: t("secure.item3") },
    { icon: ShieldCheck, label: t("secure.item4") },
  ] as const;

  // 6 · FAQ accordion.
  const faqItems = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
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
              <div className="pt-4">
                {/* 1 · Hook */}
                <Section heading={t("hook.title")}>
                  <p className="text-body text-text-secondary">{t("hook.line")}</p>
                  <button
                    type="button"
                    onClick={scrollToPartner}
                    className="mt-3 inline-flex items-center gap-1 text-small font-medium text-accent transition-colors hover:underline"
                  >
                    {t("hook.partnerTag")}
                    <ArrowRight size={14} strokeWidth={1.5} />
                  </button>
                </Section>

                {/* 2 · Qué hace */}
                <Section heading={t("what.heading")}>
                  <p className="mb-3 text-body text-text-secondary">{t("what.line")}</p>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleChip(chip.id, chip.text)}
                        className="rounded-btn border border-border bg-base px-3 py-1.5 text-small text-text-secondary transition-colors hover:border-accent/30 hover:bg-raised hover:text-foreground"
                      >
                        {chip.text}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* 3 · Por qué es distinto */}
                <Section heading={t("different.heading")}>
                  <ul className="space-y-3">
                    {diffRows.map((row) => (
                      <FeatureRow
                        key={row.label}
                        icon={row.icon}
                        label={row.label}
                        body={row.body}
                      />
                    ))}
                  </ul>
                </Section>

                {/* 4 · ¿Implementás Odoo? */}
                <div ref={partnerRef} className="scroll-mt-4">
                  <Section heading={t("partner.heading")}>
                    <div className="rounded-card border border-accent/20 bg-accent-subtle p-4">
                      <div className="mb-3 flex items-center gap-2 text-accent">
                        <Store size={18} strokeWidth={1.5} />
                        <span className="text-small font-medium">{t("partner.line")}</span>
                      </div>
                      <ul className="mb-4 space-y-3">
                        {partnerRows.map((row) => (
                          <FeatureRow
                            key={row.label}
                            icon={row.icon}
                            label={row.label}
                            body={row.body}
                          />
                        ))}
                      </ul>
                      <button
                        onClick={handlePartner}
                        className="h-btn-sm rounded-btn bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover"
                      >
                        {t("partner.cta")}
                      </button>
                    </div>
                  </Section>
                </div>

                {/* 5 · Seguro por diseño */}
                <Section heading={t("secure.heading")}>
                  <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-4">
                    {secureItems.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-2 text-small text-text-secondary"
                      >
                        <item.icon
                          size={16}
                          strokeWidth={1.5}
                          className="shrink-0 text-success-solid"
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* 6 · FAQ + Hecho por Martin (accordion, collapsed) */}
                <Section heading={t("faq.heading")}>
                  <div>
                    {faqItems.map((item) => (
                      <Collapsible key={item.q} question={item.q}>
                        {item.a}
                      </Collapsible>
                    ))}
                    <Collapsible question={t("founder.heading")}>
                      <p className="mb-3">{t("founder.body")}</p>
                      <a
                        href={`mailto:${t("founder.email")}`}
                        className="inline-flex items-center gap-2 font-medium text-accent hover:underline"
                      >
                        <Mail size={16} strokeWidth={1.5} />
                        {t("founder.email")}
                      </a>
                    </Collapsible>
                  </div>
                </Section>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="border-t border-border p-4">
              <button
                onClick={handleConnect}
                className="h-btn-md w-full rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
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
