"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";
import { submitOnboarding, testOdooConnection } from "@/lib/api";
import type { OdooConfig } from "@/lib/types";
import { AuthGuard } from "@/components/auth/auth-guard";
import { CheckCircle, Loader2 } from "lucide-react";

const inputCls =
  "rounded-md border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30";

function OnboardingContent() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const { reload } = useSession();
  const locale = pathname?.split("/")[1] || "en";

  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [login, setLogin] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    try {
      const result = await submitOnboarding({
        org_name: "",
        org_slug: "",
        odoo_url: url,
        odoo_db: dbName,
        odoo_username: login,
        odoo_api_key: apiKey,
      });

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

  const canSubmit = !!url && !!dbName && !!login && !!apiKey;

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-surface p-8 shadow-lg">
          <h1 className="mb-1 text-heading">{t("step1Title")}</h1>
          <p className="mb-6 text-body text-text-secondary">{t("step1Desc")}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            {/* Test connection — optional but available */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === "testing" || !canSubmit}
              className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-body font-medium text-foreground hover:bg-raised transition-colors disabled:opacity-50"
            >
              {testStatus === "testing" && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
              {testStatus === "ok" && <CheckCircle size={16} strokeWidth={1.5} className="text-success-solid" />}
              {t("testConnection")}
            </button>

            {testStatus === "ok" && (
              <p className="text-small text-success-solid">{t("connectionOk")}</p>
            )}
            {testStatus === "error" && (
              <p className="text-small text-error font-technical">{testError}</p>
            )}

            {submitError && (
              <p className="rounded-md bg-error-subtle px-3 py-2 text-small text-error font-technical">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
              {t("step2Cta")}
            </button>
          </form>
        </div>
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
