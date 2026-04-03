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
  "rounded-md border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30";

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
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-md text-micro font-semibold ${
                  s < step
                    ? "bg-success-solid text-white"
                    : s === step
                    ? "bg-accent text-white"
                    : "bg-raised text-text-muted"
                }`}
              >
                {s < step ? <CheckCircle size={14} strokeWidth={1.5} /> : s}
              </div>
              <span
                className={`text-body ${
                  s === step ? "font-medium text-foreground" : "text-text-muted"
                }`}
              >
                {s === 1 ? t("step1Label") : t("step2Label")}
              </span>
              {s < 2 && <div className="ml-2 h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Organization */}
        {step === 1 && (
          <div className="rounded-lg border border-border bg-surface p-8 shadow-lg">
            <h1 className="mb-1 text-heading">{t("step1Title")}</h1>
            <p className="mb-6 text-body text-text-secondary">{t("step1Desc")}</p>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("orgName")}</label>
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
                <label className="text-small font-medium text-text-secondary">Slug</label>
                <input
                  type="text"
                  required
                  value={orgSlug}
                  onChange={(e) => { setOrgSlug(e.target.value); setSlugEdited(true); }}
                  placeholder="mi-empresa"
                  className={`${inputCls} font-technical`}
                />
                <p className="text-small text-text-muted">
                  Identificador único, solo letras minúsculas, números y guiones.
                </p>
              </div>

              <button
                type="submit"
                disabled={!orgName || !orgSlug}
                className="mt-1 h-9 w-full rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {t("step1Cta")}
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Odoo Connection */}
        {step === 2 && (
          <div className="rounded-lg border border-border bg-surface p-8 shadow-lg">
            <h1 className="mb-1 text-heading">{t("step2Title")}</h1>
            <p className="mb-6 text-body text-text-secondary">{t("step2Desc")}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("configLabel")}</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("configLabelPlaceholder")}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("configUrl")}</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setTestStatus("idle"); }}
                  placeholder="https://mi-odoo.com"
                  className={`${inputCls} font-technical`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("configDb")}</label>
                <input
                  type="text"
                  required
                  value={dbName}
                  onChange={(e) => { setDbName(e.target.value); setTestStatus("idle"); }}
                  placeholder="mi_base"
                  className={`${inputCls} font-technical`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("configLogin")}</label>
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
                <label className="text-small font-medium text-text-secondary">{t("configApiKey")}</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestStatus("idle"); }}
                  placeholder="••••••••"
                  className={`${inputCls} font-technical`}
                />
              </div>

              {/* Test connection */}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || !url || !dbName || !login || !apiKey}
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-body font-medium text-foreground hover:bg-raised transition-colors disabled:opacity-50"
              >
                {testStatus === "testing" && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
                {testStatus === "ok" && <CheckCircle size={16} strokeWidth={1.5} className="text-success-solid" />}
                {t("testConnection")}
              </button>

              {testStatus === "ok" && (
                <p className="text-body text-success-solid">{t("connectionOk")}</p>
              )}
              {testStatus === "error" && (
                <p className="text-body text-error">{testError}</p>
              )}

              {submitError && (
                <p className="rounded-md bg-error-subtle px-3 py-2 text-body text-error">
                  {submitError}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-9 rounded-md border border-border px-4 py-2 text-body font-medium text-foreground hover:bg-raised transition-colors"
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
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
