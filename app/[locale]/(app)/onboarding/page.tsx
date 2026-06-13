"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/hooks/use-session";
import { useConnectionValidator } from "@/hooks/use-connection-validator";
import { submitOnboarding, createOdooConfig } from "@/lib/api";
import { setOnboardingSkipped, clearOnboardingSkipped } from "@/lib/post-auth";
import { OdooApiKeyHelper } from "@/components/odoo/odoo-apikey-helper";
import {
  CredentialBlocksCard,
  CredentialBlock,
  CredentialBlockLegend,
} from "@/components/odoo/credential-blocks";
import {
  CheckCircle2,
  Loader2,
  Globe,
  Database,
  User,
  KeyRound,
  AlertTriangle,
  Building2,
  Plug,
  Sparkles,
} from "lucide-react";
import type { ValidateErrorCode } from "@/lib/types";

const inputCls =
  "w-full rounded-btn border border-border bg-base px-3 py-2 text-body text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

const ERROR_FIELD: Record<ValidateErrorCode, "url" | "db" | "creds"> = {
  unreachable: "url",
  db_not_found: "db",
  auth_failed: "creds",
};

export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const { reload, meData } = useSession();
  const locale = pathname?.split("/")[1] || "en";

  const [view, setView] = useState<"gate" | "form">("gate");
  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [login, setLogin] = useState("");
  const [apiKey, setApiKey] = useState("");

  const validator = useConnectionValidator();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = !!url && !!dbName && !!login && !!apiKey;
  const errorField = validator.errorCode ? ERROR_FIELD[validator.errorCode] : null;
  const validated = validator.status === "ok";

  function errorMessageFor(code: ValidateErrorCode): string {
    if (code === "unreachable") return t("errorUnreachable");
    if (code === "db_not_found") return t("errorDbNotFound");
    return t("errorAuthFailed");
  }

  function continueInDemo() {
    setOnboardingSkipped();
    try { localStorage.setItem("odoo_active_config_id", "demo"); } catch { /* ignore */ }
    router.push(`/${locale}/chat`);
  }

  function startConfigure() {
    clearOnboardingSkipped();
    setView("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);

    const result = await validator.validate({
      url,
      db_name: dbName,
      odoo_username: login,
      odoo_apikey: apiKey,
    });
    if (result.status !== "ok") return;

    setIsSubmitting(true);
    try {
      // The backend auto-provisions a SOLITARY org on signup, so usually the org already
      // exists → add the first instance to it (createOdooConfig, which creates the active
      // connection). Only a true no-org user goes through submitOnboarding (creates org + instance).
      const orgId = meData?.org?.id;
      let ok: boolean;
      let err: string | undefined;
      if (orgId) {
        const created = await createOdooConfig(orgId, {
          url,
          db_name: dbName,
          odoo_username: login,
          odoo_apikey: apiKey,
        });
        ok = created.success;
        err = created.error;
      } else {
        const saved = await submitOnboarding({
          org_name: "",
          org_slug: "",
          odoo_url: url,
          odoo_db: dbName,
          odoo_username: login,
          odoo_api_key: apiKey,
        });
        ok = saved.success;
        err = saved.error;
      }
      if (!ok) {
        setSubmitError(err || t("configSaveError"));
        return;
      }
      clearOnboardingSkipped();
      await reload();
      router.push(`/${locale}/chat`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onField(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (validator.status !== "idle") validator.reset();
    };
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center justify-center px-4 py-8">
        <div className="w-full">
          {view === "gate" ? (
            /* ---- Gate: configure now or keep demo ---- */
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-card bg-accent-subtle">
                <Plug size={24} strokeWidth={1.5} className="text-accent" />
              </div>
              <h1 className="mb-2 text-heading">{t("gateTitle")}</h1>
              <p className="mb-6 text-body text-text-secondary">{t("gateDesc")}</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={startConfigure}
                  className="flex h-btn-md w-full items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
                >
                  <Plug size={16} strokeWidth={1.5} />
                  {t("gateConfigure")}
                </button>
                <button
                  type="button"
                  onClick={continueInDemo}
                  className="flex h-btn-md w-full items-center justify-center gap-2 rounded-btn border border-border px-4 text-body font-medium text-foreground transition-colors hover:bg-raised"
                >
                  <Sparkles size={16} strokeWidth={1.5} />
                  {t("gateDemo")}
                </button>
              </div>
            </div>
          ) : (
            /* ---- Configure first instance (two labeled blocks) ---- */
            <div>
              <h1 className="mb-1 text-heading">{t("step1Title")}</h1>
              <p className="mb-6 text-body text-text-secondary">{t("step1Desc")}</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <CredentialBlocksCard>
                  {/* Block 1 — instance data (shared) */}
                  <CredentialBlock>
                    <CredentialBlockLegend
                      tone="shared"
                      tag={t("tagShared")}
                      label={t("blockInstanceTitle")}
                      sub={t("blockInstanceSub")}
                    />
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-small text-text-secondary">
                          <Globe size={14} strokeWidth={1.5} />
                          {t("configUrl")}
                        </label>
                        <input
                          type="url"
                          required
                          value={url}
                          onChange={onField(setUrl)}
                          placeholder="https://mi-odoo.com"
                          className={`${inputCls} font-technical ${errorField === "url" ? "border-error" : ""}`}
                        />
                        {errorField === "url" && (
                          <p className="text-small text-error">{errorMessageFor(validator.errorCode!)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-small text-text-secondary">
                          <Database size={14} strokeWidth={1.5} />
                          {t("configDb")}
                        </label>
                        <input
                          type="text"
                          required
                          value={dbName}
                          onChange={onField(setDbName)}
                          placeholder="mi_base"
                          className={`${inputCls} font-technical ${errorField === "db" ? "border-error" : ""}`}
                        />
                        {errorField === "db" && (
                          <p className="text-small text-error">{errorMessageFor(validator.errorCode!)}</p>
                        )}
                      </div>
                    </div>
                  </CredentialBlock>

                  {/* Block 2 — your credentials (personal) */}
                  <CredentialBlock divider>
                    <CredentialBlockLegend
                      tone="personal"
                      tag={t("tagPersonal")}
                      label={t("blockCredsTitle")}
                      sub={t("blockCredsSub")}
                    />
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-small text-text-secondary">
                          <User size={14} strokeWidth={1.5} />
                          {t("configLogin")}
                        </label>
                        <input
                          type="text"
                          required
                          value={login}
                          onChange={onField(setLogin)}
                          placeholder="admin"
                          className={`${inputCls} font-technical ${errorField === "creds" ? "border-error" : ""}`}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-small text-text-secondary">
                          <KeyRound size={14} strokeWidth={1.5} />
                          {t("configApiKey")}
                        </label>
                        <input
                          type="password"
                          required
                          value={apiKey}
                          onChange={onField(setApiKey)}
                          placeholder="••••••••"
                          className={`${inputCls} font-technical ${errorField === "creds" ? "border-error" : ""}`}
                        />
                        {errorField === "creds" && (
                          <p className="text-small text-error">{errorMessageFor(validator.errorCode!)}</p>
                        )}
                      </div>
                      <OdooApiKeyHelper />
                    </div>
                  </CredentialBlock>
                </CredentialBlocksCard>

                {/* Validation confirmation — company + version */}
                <AnimatePresence>
                  {validated && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-btn bg-success-subtle px-4 py-3">
                        <p className="flex items-center gap-2 text-small font-medium text-success-solid">
                          <CheckCircle2 size={16} strokeWidth={1.5} />
                          {t("validated")}
                        </p>
                        {(validator.companyName || validator.odooVersion) && (
                          <div className="mt-2 flex flex-col gap-1 pl-6 text-small text-text-secondary">
                            {validator.companyName && (
                              <span className="flex items-center gap-1.5">
                                <Building2 size={14} strokeWidth={1.5} />
                                {validator.companyName}
                              </span>
                            )}
                            {validator.odooVersion && (
                              <span className="font-technical text-text-muted">Odoo {validator.odooVersion}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {submitError && (
                  <p className="flex items-center gap-1.5 rounded-btn bg-error-subtle px-3 py-2 text-small text-error">
                    <AlertTriangle size={14} strokeWidth={1.5} />
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || validator.status === "validating" || isSubmitting}
                  className="flex h-btn-md w-full items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {(validator.status === "validating" || isSubmitting) && (
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  )}
                  {validator.status === "validating" ? t("validating") : t("step2Cta")}
                </button>

                <button
                  type="button"
                  onClick={continueInDemo}
                  className="text-small text-text-muted transition-colors hover:text-foreground"
                >
                  {t("gateDemo")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
