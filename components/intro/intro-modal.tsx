"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Languages, Calculator, Boxes, X, ArrowRight } from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import { useRouter } from "@/i18n/navigation";
import { useIntro } from "@/hooks/use-intro";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useChatContext } from "@/components/app-shell";
import { track } from "@/lib/analytics";
import { A11yModal } from "@/components/intro/a11y-modal";

/** Example prompts — id used for analytics, text resolved from i18n. */
const EXAMPLE_PROMPTS = ["overdue_invoices", "top_customers", "stock_check"] as const;

const CHIPS = [
  { key: "language", icon: Languages },
  { key: "noInvent", icon: Calculator },
  { key: "anyOdoo", icon: Boxes },
] as const;

export function IntroModal() {
  const t = useTranslations("Intro.modal");
  const router = useRouter();
  const { isModalOpen, openModal, closeModal, openPanel, dismissed, ready } = useIntro();
  const { isDemoMode } = useOdooConfig();
  const { createChat, sendMessage } = useChatContext();
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const autoOpened = useRef(false);
  const titleId = useId();
  const descId = useId();

  // Auto-open once on the first demo visit (anonymous), after storage is read.
  useEffect(() => {
    if (!ready || autoOpened.current) return;
    if (isDemoMode && !dismissed) {
      autoOpened.current = true;
      openModal();
      track("intro_modal_shown");
    }
  }, [ready, dismissed, isDemoMode, openModal]);

  function handleClose(reason: "x" | "backdrop" | "esc" | "cta" | "no_show_again") {
    track("intro_modal_dismissed", { reason });
    closeModal(dontShowAgain);
  }

  function handlePrompt(promptId: string, text: string) {
    track("example_prompt_clicked", { prompt_id: promptId });
    closeModal(dontShowAgain);
    const id = createChat(text);
    router.push(`/chat/${id}`);
    sendMessage(text, id);
  }

  function handleStart() {
    track("demo_started");
    closeModal(dontShowAgain);
  }

  function handleConnect() {
    track("connect_own_odoo_clicked", { source: "modal" });
    closeModal(dontShowAgain);
    router.push("/login");
  }

  function handleWhatIsThis() {
    track("info_opened_from_panel", { source: "modal" });
    closeModal(dontShowAgain);
    openPanel();
  }

  return (
    <A11yModal
      open={isModalOpen}
      onClose={() => handleClose("backdrop")}
      labelledBy={titleId}
      describedBy={descId}
      className="mx-0 w-full max-w-lg sm:mx-4"
    >
      <div className="max-h-[90vh] overflow-y-auto rounded-t-card bg-surface shadow-lg sm:rounded-card">
        {/* Close */}
        <button
          onClick={() => handleClose("x")}
          className="absolute right-4 top-4 rounded-btn p-1 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
          aria-label={t("close")}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-accent-subtle">
              <MarkB size={28} fg="currentColor" className="text-accent" />
            </div>
            <div className="flex-1 pr-6">
              <h2 id={titleId} className="text-heading">
                {t("title")}
              </h2>
              <p id={descId} className="mt-1.5 text-body text-text-secondary">
                {t("subtitle")}
              </p>
            </div>
          </div>

          {/* Chips */}
          <ul className="mb-6 space-y-2.5">
            {CHIPS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-3 text-body">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
                  <Icon size={18} strokeWidth={1.5} />
                </span>
                <span className="text-text-secondary">{t(`chips.${key}`)}</span>
              </li>
            ))}
          </ul>

          {/* Try this */}
          <p className="mb-2 text-small font-medium text-text-secondary">
            {t("tryThisLabel")}
          </p>
          <div className="mb-6 space-y-2">
            {EXAMPLE_PROMPTS.map((id) => {
              const text = t(`tryThis.${id}`);
              return (
                <button
                  key={id}
                  onClick={() => handlePrompt(id, text)}
                  className="group flex w-full items-center gap-3 rounded-btn border border-border bg-base px-4 py-3 text-left text-body transition-all hover:border-accent/30 hover:bg-raised"
                >
                  <span className="flex-1">{text}</span>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.5}
                    className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </button>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={handleStart}
              className="h-btn-md flex-1 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              {t("ctaPrimary")}
            </button>
            <button
              onClick={handleConnect}
              className="h-btn-md flex-1 rounded-btn border border-border px-4 text-body font-medium text-foreground transition-colors hover:bg-raised"
            >
              {t("ctaSecondary")}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-small text-text-muted">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded accent-accent"
              />
              {t("dontShowAgain")}
            </label>
            <button
              onClick={handleWhatIsThis}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("whatIsThis")}
            </button>
            <span className="ml-auto">{t("madeBy")}</span>
          </div>
        </div>
      </div>
    </A11yModal>
  );
}
