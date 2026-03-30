"use client";

import { useState, FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";
import { createOrg, createOdooConfig, testOdooConnection } from "@/lib/api";
import type { OdooConfig } from "@/lib/types";
import { AuthGuard } from "@/components/auth/auth-guard";
import { CheckCircle, Loader2 } from "lucide-react";

/** Auto-generates a unique slug: lowercase-hyphenated + 4-char random suffix. */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function OnboardingContent() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const { meData, reload } = useSession();
  const locale = pathname?.split("/")[1] || "en";

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [orgName, setOrgName] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 state
  const [label, setLabel] = useState("Producción");
  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  async function handleCreateOrg(e: FormEvent) {
    e.preventDefault();
    setStep1Error(null);
    setStep1Loading(true);
    try {
      const slug = generateSlug(orgName);
      const result = await createOrg(orgName, slug, "SOLITARY");
      if (!result.success) {
        setStep1Error(result.error || t("orgCreateError"));
        return;
      }
      await reload();
      setStep(2);
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleTestConnection() {
    setTestStatus("testing");
    setTestError(null);
    const testConfig: OdooConfig = { url, db: dbName, login: "", apiKey };
    const result = await testOdooConnection(testConfig);
    if (result.success) {
      setTestStatus("ok");
    } else {
      setTestStatus("error");
      setTestError(result.error || t("connectionError"));
    }
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setStep2Error(null);
    const orgId = meData?.org?.id;
    if (!orgId) return;

    setStep2Loading(true);
    try {
      const result = await createOdooConfig(orgId, {
        label,
        url,
        db_name: dbName,
        api_key: apiKey,
      });
      if (!result.success) {
        setStep2Error(result.error || t("configSaveError"));
        return;
      }
      router.push(`/${locale}/chat`);
    } finally {
      setStep2Loading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {s < step ? <CheckCircle size={14} /> : s}
              </div>
              <span
                className={`text-sm ${
                  s === step
                    ? "font-medium text-[var(--color-text)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {s === 1 ? t("step1Label") : t("step2Label")}
              </span>
              {s < 2 && (
                <div className="ml-2 h-px w-8 bg-[var(--color-border)]" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Create Organization */}
        {step === 1 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg">
            <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">
              {t("step1Title")}
            </h1>
            <p className="mb-6 text-sm text-[var(--color-muted)]">
              {t("step1Desc")}
            </p>

            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t("orgName")}
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={t("orgNamePlaceholder")}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {step1Error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {step1Error}
                </p>
              )}

              <button
                type="submit"
                disabled={step1Loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {step1Loading && <Loader2 size={14} className="animate-spin" />}
                {t("step1Cta")}
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Add Odoo Connection */}
        {step === 2 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg">
            <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">
              {t("step2Title")}
            </h1>
            <p className="mb-6 text-sm text-[var(--color-muted)]">
              {t("step2Desc")}
            </p>

            <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t("configLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("configLabelPlaceholder")}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t("configUrl")}
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setTestStatus("idle"); }}
                  placeholder="https://mi-odoo.com"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t("configDb")}
                </label>
                <input
                  type="text"
                  required
                  value={dbName}
                  onChange={(e) => { setDbName(e.target.value); setTestStatus("idle"); }}
                  placeholder="mi_db"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t("configApiKey")}
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestStatus("idle"); }}
                  placeholder="••••••••"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Test connection */}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || !url || !dbName || !apiKey}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors disabled:opacity-50"
              >
                {testStatus === "testing" && <Loader2 size={14} className="animate-spin" />}
                {testStatus === "ok" && <CheckCircle size={14} className="text-green-500" />}
                {t("testConnection")}
              </button>

              {testStatus === "ok" && (
                <p className="text-sm text-green-600 dark:text-green-400">{t("connectionOk")}</p>
              )}
              {testStatus === "error" && (
                <p className="text-sm text-red-600 dark:text-red-400">{testError}</p>
              )}

              {step2Error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {step2Error}
                </p>
              )}

              <button
                type="submit"
                disabled={step2Loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {step2Loading && <Loader2 size={14} className="animate-spin" />}
                {t("step2Cta")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
