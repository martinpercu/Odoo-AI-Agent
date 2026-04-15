"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Database,
  User,
  Key,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plug,
} from "lucide-react";
import type { OdooConfig, ConnectionStatus } from "@/lib/types";
import { testOdooConnection, createOdooConfig, NETWORK_ERROR } from "@/lib/api";
import { useSession } from "@/hooks/use-session";

export function ConnectionForm() {
  const t = useTranslations("Settings.form");
  const router = useRouter();
  const pathname = usePathname();
  const { meData, reload } = useSession();

  const [config, setConfig] = useState<OdooConfig>({
    url: "",
    db: "",
    login: "",
    apiKey: "",
  });
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleTest(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setSaved(false);
    setErrorMessage(null);
    setCompanyName(null);

    const result = await testOdooConnection(config);

    if (result.success) {
      setStatus("success");
      setCompanyName(result.company ?? null);
    } else {
      setStatus("error");
      setErrorMessage(
        result.error === NETWORK_ERROR
          ? t("networkError")
          : result.error ?? t("statusError")
      );
    }
  }

  async function handleSave() {
    const orgId = meData?.org?.id;
    if (!orgId) return;
    setSaveError(null);
    const result = await createOdooConfig(orgId, {
      label: companyName || "Producción",
      url: config.url,
      db_name: config.db,
      api_key: config.apiKey,
    });
    if (!result.success) {
      setSaveError(result.error || "No se pudo guardar la conexión");
      return;
    }
    await reload();
    setSaved(true);
    const locale = pathname.split("/")[1] || "en";
    setTimeout(() => router.push(`/${locale}/chat`), 500);
  }

  const fields = [
    { key: "url" as const, label: t("urlLabel"), placeholder: t("urlPlaceholder"), icon: Globe, type: "url", technical: true },
    { key: "db" as const, label: t("databaseLabel"), placeholder: t("databasePlaceholder"), icon: Database, type: "text", technical: true },
    { key: "login" as const, label: t("loginLabel"), placeholder: t("loginPlaceholder"), icon: User, type: "text", technical: false },
    { key: "apiKey" as const, label: t("apiKeyLabel"), placeholder: t("apiKeyPlaceholder"), icon: Key, type: "password", technical: true },
  ];

  return (
    <form onSubmit={handleTest} className="space-y-6">
      {fields.map((field) => {
        const Icon = field.icon;
        return (
          <div key={field.key}>
            <label className="mb-2 flex items-center gap-2 text-small font-medium text-text-secondary">
              <Icon size={16} strokeWidth={1.5} className="text-text-secondary" />
              {field.label}
            </label>
            <input
              type={field.type}
              value={config[field.key]}
              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className={`w-full rounded-md border border-border bg-surface px-4 py-2 text-body outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-1${field.technical ? " font-technical" : ""}`}
            />
          </div>
        );
      })}

      {/* Status feedback */}
      <AnimatePresence mode="wait">
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-body ${
                status === "loading"
                  ? "bg-raised text-text-secondary"
                  : status === "success"
                    ? "bg-success-subtle text-success-solid"
                    : "bg-error-subtle text-error"
              }`}
            >
              {status === "loading" && (
                <>
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  <span>{t("statusTesting")}</span>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.5} />
                  <span>
                    {companyName
                      ? t("statusSuccessCompany", { company: companyName })
                      : t("statusSuccess")}
                  </span>
                </>
              )}
              {status === "error" && (
                <>
                  <AlertTriangle size={16} strokeWidth={1.5} />
                  <span className="font-technical">{errorMessage ?? t("statusError")}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {saveError && (
        <p className="rounded-md bg-error-subtle px-3 py-2 text-small text-error font-technical">{saveError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-body font-medium text-foreground transition-colors hover:bg-raised disabled:opacity-50"
        >
          <Plug size={16} strokeWidth={1.5} />
          {t("testConnection")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={status !== "success"}
          className="flex h-9 items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {saved ? (
            <>
              <CheckCircle2 size={16} strokeWidth={1.5} />
              {t("saved")}
            </>
          ) : (
            t("saveConfig")
          )}
        </button>
      </div>
    </form>
  );
}
