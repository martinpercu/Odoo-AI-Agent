"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";
import { submitOnboarding, testOdooConnection } from "@/lib/api";
import type { OdooConfig } from "@/lib/types";
import { AuthGuard } from "@/components/auth/auth-guard";
import { CheckCircle, Loader2 } from "lucide-react";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

const inputCls =
  "rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) placeholder-(--color-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)";

function OnboardingContent() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const { reload } = useSession();
  const locale = pathname?.split("/")[1] || "en";

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Step 2 state
  const [label, setLabel] = useState("Producción");
  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [login, setLogin] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    if (!slugEdited) {
      setOrgSlug(generateSlug(value));
    }
  }

  async function handleTestConnection() {
    setTestStatus("testing");
    setTestError(null);
    const testConfig: OdooConfig = { url, db: dbName, login, apiKey };
    const result = await testOdooConnection(testConfig);
    if (result.success) {
      setTestStatus("ok");
    } else {
      setTestStatus("error");
      setTestError(result.error || t("connectionError"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const slug = orgSlug || generateSlug(orgName);

    try {
      let result = await submitOnboarding({
        org_name: orgName,
        org_slug: slug,
        odoo_url: url,
        odoo_db: dbName,
        odoo_api_key: apiKey,
        odoo_label: label || "Producción",
      });

      // Slug conflict → retry with random suffix
      if (!result.success && result.slugConflict) {
        result = await submitOnboarding({
          org_name: orgName,
          org_slug: `${slug}-${randomSuffix()}`,
          odoo_url: url,
          odoo_db: dbName,
          odoo_api_key: apiKey,
          odoo_label: label || "Producción",
        });
      }

      if (!result.success) {
        setSubmitError(result.error || t("configSaveError"));
        return;
      }

      await reload();
      router.push(`/${locale}/chat`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg) px-4">
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
                    ? "bg-(--color-primary) text-white"
                    : "bg-(--color-border) text-(--color-muted)"
                }`}
              >
                {s < step ? <CheckCircle size={14} /> : s}
              </div>
              <span
                className={`text-sm ${
                  s === step ? "font-medium text-(--color-text)" : "text-(--color-muted)"
                }`}
              >
                {s === 1 ? t("step1Label") : t("step2Label")}
              </span>
              {s < 2 && <div className="ml-2 h-px w-8 bg-(--color-border)" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Organization */}
        {step === 1 && (
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-8 shadow-lg">
            <h1 className="mb-1 text-xl font-semibold text-(--color-text)">{t("step1Title")}</h1>
            <p className="mb-6 text-sm text-(--color-muted)">{t("step1Desc")}</p>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("orgName")}</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder={t("orgNamePlaceholder")}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">Slug</label>
                <input
                  type="text"
                  required
                  value={orgSlug}
                  onChange={(e) => { setOrgSlug(e.target.value); setSlugEdited(true); }}
                  placeholder="mi-empresa"
                  className={`${inputCls} font-mono`}
                />
                <p className="text-xs text-(--color-muted)">
                  Identificador único, solo letras minúsculas, números y guiones.
                </p>
              </div>

              <button
                type="submit"
                disabled={!orgName || !orgSlug}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-(--color-primary) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t("step1Cta")}
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Odoo Connection */}
        {step === 2 && (
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-8 shadow-lg">
            <h1 className="mb-1 text-xl font-semibold text-(--color-text)">{t("step2Title")}</h1>
            <p className="mb-6 text-sm text-(--color-muted)">{t("step2Desc")}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("configLabel")}</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("configLabelPlaceholder")}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("configUrl")}</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setTestStatus("idle"); }}
                  placeholder="https://mi-odoo.com"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("configDb")}</label>
                <input
                  type="text"
                  required
                  value={dbName}
                  onChange={(e) => { setDbName(e.target.value); setTestStatus("idle"); }}
                  placeholder="mi_base"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("configLogin")}</label>
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(e) => { setLogin(e.target.value); setTestStatus("idle"); }}
                  placeholder="admin"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-(--color-text)">{t("configApiKey")}</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestStatus("idle"); }}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              {/* Test connection */}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || !url || !dbName || !login || !apiKey}
                className="flex items-center justify-center gap-2 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-hover) transition-colors disabled:opacity-50"
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

              {submitError && (
                <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {submitError}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-(--color-border) px-4 py-2.5 text-sm font-medium text-(--color-text) hover:bg-(--color-hover) transition-colors"
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-(--color-primary) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {t("step2Cta")}
                </button>
              </div>
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
