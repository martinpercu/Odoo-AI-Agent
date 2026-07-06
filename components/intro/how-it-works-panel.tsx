"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Check,
  ShieldCheck,
  Tag,
  ChevronDown,
} from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import { useRouter } from "@/i18n/navigation";
import { useIntro } from "@/hooks/use-intro";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useChatContext } from "@/components/app-shell";
import { track } from "@/lib/analytics";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="mb-3 text-subheading">{heading}</h3>
      {children}
    </section>
  );
}

function Collapsible({ question, children }: { question: string; children: React.ReactNode }) {
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
          className={`shrink-0 text-text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
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

export function HowItWorksPanel() {
  const t = useTranslations("HowItWorks.panel");
  const router = useRouter();
  const { isHowItWorksPanelOpen, closeHowItWorksPanel } = useIntro();
  const { createChat, sendMessage } = useChatContext();
  const { user } = useAuth();
  const { meData } = useSession();

  function handleConnection() {
    closeHowItWorksPanel();
    if (!user) {
      router.push("/register");
      return;
    }
    const hasInstance = (meData?.odoo_configs?.length ?? 0) > 0;
    router.push(hasInstance ? "/settings/odoo" : "/onboarding");
  }
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isHowItWorksPanelOpen) return;
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
  }, [isHowItWorksPanelOpen]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      closeHowItWorksPanel();
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

  function handleChip(promptId: string, text: string) {
    track("example_prompt_clicked", { prompt_id: promptId, source: "how_it_works_panel" });
    closeHowItWorksPanel();
    const id = createChat(text);
    router.push(`/chat/${id}`);
    sendMessage(text, id);
  }

  const chips = [
    { id: "how_top_customers", text: t("what.chip3") },
    { id: "how_out_of_stock", text: t("what.chip4") },
  ] as const;

  const secureItems = [
    { icon: Check, label: t("secure.item1") },
    { icon: Tag, label: t("secure.item3") },
    { icon: ShieldCheck, label: t("secure.item4") },
  ] as const;

  const faqItems = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
  ] as const;

  return (
    <AnimatePresence>
      {isHowItWorksPanelOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={closeHowItWorksPanel}
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
                onClick={closeHowItWorksPanel}
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
                </Section>

                {/* 2 · Ejemplos interactivos */}
                <Section heading={t("what.heading")}>
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

                {/* 3 · Seguro por diseño — card style */}
                <Section heading={t("secure.heading")}>
                  <div className="rounded-card border border-accent/20 bg-accent-subtle p-4">
                    <ul className="space-y-2.5">
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
                  </div>
                </Section>

                {/* 4 · Preguntas frecuentes */}
                {/* <Section heading={t("faq.heading")}>
                  <div>
                    {faqItems.map((item) => (
                      <Collapsible key={item.q} question={item.q}>
                        {item.a}
                      </Collapsible>
                    ))}
                  </div>
                </Section> */}

              </div>
            </div>

            {/* Footer CTA — connection setup */}
            <div className="border-t border-border p-4">
              <button
                onClick={handleConnection}
                className="h-btn-md w-full rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                {t("ctaConnection")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
