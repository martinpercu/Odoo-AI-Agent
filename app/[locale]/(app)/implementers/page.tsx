"use client";

/**
 * Technical manual for Odoo implementers (partners / freelancers evaluating the
 * agent for their own clients). Content brief + verified source of truth:
 * `DOCS/PLAN_IMPLEMENTER_MANUAL_PAGE.md` (backend snapshot verified 2026-07-29).
 *
 * This page is the canonical deep-link for the technical detail; the intro
 * drawers stay the short in-flow pitch. If copy ever conflicts, this page wins.
 *
 * Builder-audience by architecture: a CLIENT_USER must never see the reseller
 * pitch (white-label), so Client roles are bounced — same rule as /pricing and
 * the Founding Partner mark. Anonymous visitors are NOT bounced: an implementer
 * arriving cold from a landing link is the primary reader.
 *
 * Layout: a sticky header (eyebrow pill + title + tab selector, plus the
 * description block on ≥sm) over swappable tab panels — same pill selector and
 * panel transition as /settings.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart,
  Receipt,
  Boxes,
  Users,
  IdCard,
  FolderKanban,
  Lock,
  KeyRound,
  ShieldCheck,
  Building2,
  EyeOff,
  Network,
  Binary,
  Timer,
  ShieldAlert,
  History,
  Languages,
  FileSpreadsheet,
  Plug,
  Puzzle,
  Check,
  Mail,
  Rocket,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DomainCoverageCard } from "@/components/implementers/domain-coverage-card";
import { FactRow } from "@/components/ui/fact-row";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { clearOnboardingSkipped } from "@/lib/post-auth";
import { track } from "@/lib/analytics";

/** Contact for the roadmap CTA — same address the intro drawer already uses. */
const CONTACT_EMAIL = "martin@theodooagent.com";

type ManualTab = "coverage" | "security" | "roadmap";

const TABS: readonly { id: ManualTab; icon: LucideIcon }[] = [
  { id: "coverage", icon: Boxes },
  { id: "security", icon: ShieldCheck },
  { id: "roadmap", icon: Rocket },
];

/**
 * Odoo model names are proper nouns — never translated, so they live here
 * instead of in `messages/*.json` (keeps 11 locales from drifting on them).
 */
const DOMAINS: readonly {
  key: "sales" | "finance" | "inventory" | "contacts" | "hr" | "projects";
  icon: LucideIcon;
  models: readonly string[];
  /** How many confirmed write actions this domain has copy for. */
  writeCount: number;
  hasLimit: boolean;
}[] = [
  {
    key: "sales",
    icon: ShoppingCart,
    models: ["sale.order", "sale.order.line", "crm.lead", "res.users", "mail.activity"],
    writeCount: 4,
    hasLimit: true,
  },
  {
    key: "finance",
    icon: Receipt,
    models: ["account.move", "account.payment", "account.bank.statement"],
    writeCount: 2,
    hasLimit: false,
  },
  {
    key: "inventory",
    icon: Boxes,
    models: [
      "product.product",
      "product.template",
      "purchase.order",
      "purchase.order.line",
      "stock.picking",
    ],
    writeCount: 2,
    hasLimit: true,
  },
  {
    key: "contacts",
    icon: Users,
    models: ["res.partner"],
    writeCount: 2,
    hasLimit: false,
  },
  {
    key: "hr",
    icon: IdCard,
    models: ["hr.employee", "hr.payslip", "hr.payslip.line"],
    writeCount: 0,
    hasLimit: false,
  },
  {
    key: "projects",
    icon: FolderKanban,
    models: ["project.project", "project.task", "account.analytic.line"],
    writeCount: 1,
    hasLimit: true,
  },
];

const CROSS_ITEMS: readonly { key: string; icon: LucideIcon }[] = [
  { key: "memory", icon: History },
  { key: "languages", icon: Languages },
  { key: "reports", icon: FileSpreadsheet },
  { key: "adapts", icon: Plug },
];

const SECURITY_ITEMS: readonly { key: string; icon: LucideIcon }[] = [
  { key: "encryption", icon: Lock },
  { key: "perUser", icon: KeyRound },
  { key: "jwt", icon: ShieldCheck },
  { key: "tenancy", icon: Building2 },
  { key: "readOnlyMode", icon: EyeOff },
  { key: "ssrf", icon: Network },
  { key: "deterministic", icon: Binary },
  { key: "timeouts", icon: Timer },
  { key: "errors", icon: ShieldAlert },
];

const ROADMAP_KEYS = ["queries", "custom", "typos", "tracing", "progress", "hardening"] as const;

export default function ImplementersPage() {
  const t = useTranslations("ImplementerManual");
  const router = useRouter();
  const { user } = useAuth();
  const { meData } = useSession();
  const role = meData?.user?.role;
  const isClient = !!role && role !== "ADMIN" && role !== "SUPERADMIN";

  const [activeTab, setActiveTab] = useState<ManualTab>("coverage");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isClient) router.replace("/chat");
  }, [isClient, router]);

  if (isClient) return null;

  /** Swap the panel and glide back to the top — panels are long. */
  function selectTab(id: ManualTab) {
    setActiveTab(id);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRoadmapContact() {
    track("partner_cta_clicked", { source: "implementer_manual_roadmap" });
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      t("roadmap.emailSubject")
    )}`;
  }

  function handleConnect() {
    track("connect_own_odoo_clicked", { source: "implementer_manual" });
    const loggedIn = !!user;
    const hasInstance = (meData?.odoo_configs?.length ?? 0) > 0;
    if (loggedIn && !hasInstance) clearOnboardingSkipped();
    router.push(!loggedIn ? "/register" : hasInstance ? "/settings/odoo" : "/onboarding");
  }

  return (
    <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
      {/* Eyebrow — floating top-left pill, same treatment as FounderClockPill on /settings.
          Sits above the sticky header (z-30 > z-20) inside its top padding. */}
      <div className="pointer-events-none sticky top-0 z-30 h-0">
        <div className="pointer-events-auto absolute left-4 top-4 sm:left-6">
          <span className="inline-flex items-center gap-1.5 rounded-btn border border-accent/20 bg-accent-subtle px-2.5 py-1 text-micro font-medium text-accent shadow-sm backdrop-blur">
            <BookOpen size={12} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
            {t("hero.eyebrow")}
          </span>
        </div>
      </div>

      {/* Sticky header — stays put while the panel scrolls underneath */}
      <div className="sticky top-0 z-20 border-b border-border bg-base">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-12 sm:px-6 sm:pt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-display">{t("hero.title")}</h1>

            {/* Tab selector — mirrors the /settings pill */}
            <div
              role="tablist"
              aria-label={t("nav.label")}
              className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
            >
              <div className="inline-flex items-center gap-1 rounded-lg bg-raised p-1">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      onClick={() => selectTab(tab.id)}
                      className={`relative flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-small font-medium transition-colors duration-150 ${
                        isActive ? "text-foreground" : "text-text-secondary hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="implementers-tab-pill"
                          className="absolute inset-0 rounded-md border border-border bg-surface shadow-sm"
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                      )}
                      <span className="relative flex items-center gap-2 whitespace-nowrap">
                        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                        {t(`nav.${tab.id}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description — dropped on mobile so the sticky header stays compact */}
          <div className="hidden sm:block">
            <p className="mt-3 max-w-3xl text-body text-text-secondary">{t("hero.subtitle")}</p>
            <p className="mt-2 text-small text-text-muted">{t("hero.updated")}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* ---- TAB: Cobertura por dominio ---- */}
            {activeTab === "coverage" && (
              <section>
                <h2 className="text-heading">{t("coverage.heading")}</h2>
                <p className="mt-3 max-w-3xl text-body text-text-secondary">{t("coverage.lead")}</p>
                <p className="mt-3 flex max-w-3xl items-start gap-2 text-small text-text-secondary">
                  <Check
                    size={16}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-success-solid"
                    aria-hidden="true"
                  />
                  <span>{t("coverage.writeNote")}</span>
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {DOMAINS.map((domain) => (
                    <DomainCoverageCard
                      key={domain.key}
                      icon={domain.icon}
                      name={t(`coverage.${domain.key}.name`)}
                      models={domain.models}
                      read={t(`coverage.${domain.key}.read`)}
                      writes={Array.from({ length: domain.writeCount }, (_, i) =>
                        t(`coverage.${domain.key}.w${i + 1}`)
                      )}
                      limit={domain.hasLimit ? t(`coverage.${domain.key}.limit`) : undefined}
                    />
                  ))}
                </div>

                {/* Cross-cutting capabilities */}
                <h3 className="mt-12 text-subheading">{t("coverage.cross.heading")}</h3>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {CROSS_ITEMS.map((item) => (
                    <FactRow
                      key={item.key}
                      icon={item.icon}
                      label={t(`coverage.cross.${item.key}.label`)}
                      body={t(`coverage.cross.${item.key}.body`)}
                    />
                  ))}
                </ul>

                {/* Highlighted differentiator — custom modules / Studio fields */}
                <div className="mt-6 rounded-card border border-accent/20 bg-accent-subtle p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-surface text-accent">
                      <Puzzle size={20} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-subheading text-foreground">
                        {t("coverage.cross.customModules.label")}
                      </p>
                      <p className="mt-1.5 text-body text-text-secondary">
                        {t("coverage.cross.customModules.body")}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ---- TAB: Seguridad y arquitectura ---- */}
            {activeTab === "security" && (
              <section>
                <h2 className="text-heading">{t("security.heading")}</h2>
                <p className="mt-3 max-w-3xl text-body text-text-secondary">{t("security.lead")}</p>

                {/* Strongest claim first, highlighted: nothing writes without confirmation */}
                <div className="mt-6 rounded-card border border-accent/20 bg-accent-subtle p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-surface text-accent">
                      <ShieldCheck size={20} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-subheading text-foreground">
                        {t("security.confirm.label")}
                      </p>
                      <p className="mt-1.5 text-body text-text-secondary">
                        {t("security.confirm.body")}
                      </p>
                      <p className="mt-2 text-small text-text-secondary">
                        {t("security.confirm.note")}
                      </p>
                    </div>
                  </div>
                </div>

                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {SECURITY_ITEMS.map((item) => (
                    <FactRow
                      key={item.key}
                      icon={item.icon}
                      label={t(`security.${item.key}.label`)}
                      body={t(`security.${item.key}.body`)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* ---- TAB: Roadmap abierto ---- */}
            {activeTab === "roadmap" && (
              <section>
                <h2 className="text-heading">{t("roadmap.heading")}</h2>
                <p className="mt-3 max-w-3xl text-body text-text-secondary">{t("roadmap.lead")}</p>

                <ul className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
                  {ROADMAP_KEYS.map((key) => (
                    <li key={key} className="px-5 py-4">
                      <p className="text-body font-medium text-foreground">
                        {t(`roadmap.${key}.label`)}
                      </p>
                      <p className="mt-1 text-small text-text-secondary">
                        {t(`roadmap.${key}.body`)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleRoadmapContact}
                    className="inline-flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
                  >
                    <Mail size={18} strokeWidth={1.5} aria-hidden="true" />
                    {t("roadmap.cta")}
                  </button>
                  <p className="text-small text-text-muted">{t("roadmap.ctaNote")}</p>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Closing CTA — persistent across tabs, each panel is now a standalone view */}
        <section className="mt-16 rounded-card border border-border bg-surface px-5 py-6 sm:px-8 sm:py-8">
          <h2 className="text-heading">{t("closing.heading")}</h2>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">{t("closing.body")}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleConnect}
              className="inline-flex h-btn-md items-center justify-center rounded-btn bg-accent px-5 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              {t("closing.primary")}
            </button>
            <Link
              href="/pricing"
              className="inline-flex h-btn-md items-center justify-center rounded-btn border border-border bg-base px-5 text-body font-medium text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
            >
              {t("closing.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
