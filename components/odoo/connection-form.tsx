"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Database,
  User,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  Plug,
} from "lucide-react";
import type { OdooConfig, ConnectionStatus } from "@/lib/types";
import { testOdooConnection } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";

export function ConnectionForm() {
  const t = useTranslations("Settings.form");
  const { config: savedConfig, saveConfig } = useOdooConfig();

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

  // Pre-fill form with saved config on mount
  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

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
      setErrorMessage(result.error ?? t("statusError"));
    }
  }

  function handleSave() {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const fields = [
    { key: "url" as const, label: t("urlLabel"), placeholder: t("urlPlaceholder"), icon: Globe, type: "url" },
    { key: "db" as const, label: t("databaseLabel"), placeholder: t("databasePlaceholder"), icon: Database, type: "text" },
    { key: "login" as const, label: t("loginLabel"), placeholder: t("loginPlaceholder"), icon: User, type: "text" },
    { key: "apiKey" as const, label: t("apiKeyLabel"), placeholder: t("apiKeyPlaceholder"), icon: Key, type: "password" },
  ];

  return (
    <form onSubmit={handleTest} className="space-y-6">
      {fields.map((field) => {
        const Icon = field.icon;
        return (
          <div key={field.key}>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Icon size={16} className="text-muted-foreground" />
              {field.label}
            </label>
            <input
              type={field.type}
              value={config[field.key]}
              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
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
            className="overflow-hidden"
          >
            <div
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                status === "loading"
                  ? "bg-muted text-muted-foreground"
                  : status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {status === "loading" && (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t("statusTesting")}</span>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 size={18} />
                  <span>
                    {companyName
                      ? t("statusSuccessCompany", { company: companyName })
                      : t("statusSuccess")}
                  </span>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle size={18} />
                  <span>{errorMessage ?? t("statusError")}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Plug size={16} />
          {t("testConnection")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={status !== "success"}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {saved ? (
            <>
              <CheckCircle2 size={16} />
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
