"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Database, User, KeyRound, Loader2, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { useConnectionValidator } from "@/hooks/use-connection-validator";
import { OdooApiKeyHelper } from "@/components/odoo/odoo-apikey-helper";
import {
  CredentialBlocksCard,
  CredentialBlock,
  CredentialBlockLegend,
} from "@/components/odoo/credential-blocks";
import { createOdooConfig } from "@/lib/api";
import type { ValidateErrorCode } from "@/lib/types";

const inputCls =
  "w-full rounded-btn border border-border bg-base px-3 py-2 text-body outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

const ERROR_FIELD: Record<ValidateErrorCode, "url" | "db" | "creds"> = {
  unreachable: "url",
  db_not_found: "db",
  auth_failed: "creds",
};

/**
 * Crear instancia N (spec §6.2). Credenciales del creador **opcionales** desde la 2ª:
 * si se omiten, la instancia se crea pero el admin queda sin Connection ("configurar para chatear").
 * No pide etiqueta — se asigna después editando la instancia.
 */
export function InstanceCreateForm({ orgId, onCreated }: { orgId: string; onCreated?: () => void }) {
  const t = useTranslations("Instances.create");
  const validator = useConnectionValidator();

  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const wantsCreds = !!username || !!apiKey;
  const canSubmit = !!url && !!dbName && (!wantsCreds || (!!username && !!apiKey));
  const errorField = validator.errorCode ? ERROR_FIELD[validator.errorCode] : null;

  function errorMessageFor(code: ValidateErrorCode): string {
    if (code === "unreachable") return t("errorUnreachable");
    if (code === "db_not_found") return t("errorDbNotFound");
    return t("errorAuthFailed");
  }

  function onField(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (validator.status !== "idle") validator.reset();
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);

    const result = await validator.validate({
      url,
      db_name: dbName,
      odoo_username: username || undefined,
      odoo_apikey: apiKey || undefined,
    });
    if (result.status !== "ok") return;

    setSubmitting(true);
    try {
      const created = await createOdooConfig(orgId, {
        url,
        db_name: dbName,
        odoo_username: username || undefined,
        odoo_apikey: apiKey || undefined,
      });
      if (!created.success) {
        setSubmitError(created.solitaryBlocked ? t("solitaryBlocked") : created.error ?? t("saveError"));
        return;
      }
      onCreated?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CredentialBlocksCard>
        {/* Block 1 — instance data (shared) */}
        <CredentialBlock>
          <CredentialBlockLegend
            tone="shared"
            tag={t("tagShared")}
            label={t("blockInstanceTitle")}
            sub={t("blockInstanceSub")}
          />
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-small text-text-secondary">
                <Globe size={14} strokeWidth={1.5} />
                {t("urlLabel")}
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={onField(setUrl)}
                placeholder="https://mi-odoo.com"
                className={`${inputCls} font-technical ${errorField === "url" ? "border-error" : ""}`}
              />
              {errorField === "url" && <p className="mt-1 text-small text-error">{errorMessageFor(validator.errorCode!)}</p>}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-small text-text-secondary">
                <Database size={14} strokeWidth={1.5} />
                {t("databaseLabel")}
              </label>
              <input
                type="text"
                required
                value={dbName}
                onChange={onField(setDbName)}
                placeholder="mi_base"
                className={`${inputCls} font-technical ${errorField === "db" ? "border-error" : ""}`}
              />
              {errorField === "db" && <p className="mt-1 text-small text-error">{errorMessageFor(validator.errorCode!)}</p>}
            </div>
          </div>
        </CredentialBlock>

        {/* Block 2 — your credentials (personal, optional from the 2nd instance) */}
        <CredentialBlock divider>
          <CredentialBlockLegend
            tone="personal"
            tag={t("tagPersonal")}
            label={t("blockCredsTitle")}
            sub={t("blockCredsSub")}
          />
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-small text-text-secondary">
                <User size={14} strokeWidth={1.5} />
                {t("usernameLabel")}
              </label>
              <input
                type="text"
                value={username}
                onChange={onField(setUsername)}
                placeholder="admin"
                className={`${inputCls} font-technical ${errorField === "creds" ? "border-error" : ""}`}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-small text-text-secondary">
                <KeyRound size={14} strokeWidth={1.5} />
                {t("apiKeyLabel")}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={onField(setApiKey)}
                placeholder="••••••••"
                className={`${inputCls} font-technical ${errorField === "creds" ? "border-error" : ""}`}
              />
              {errorField === "creds" && <p className="mt-1 text-small text-error">{errorMessageFor(validator.errorCode!)}</p>}
            </div>
            <OdooApiKeyHelper />
          </div>
        </CredentialBlock>
      </CredentialBlocksCard>

      <AnimatePresence>
        {validator.status === "ok" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-btn bg-success-subtle px-4 py-3 text-small text-success-solid">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} strokeWidth={1.5} />
                {t("validated")}
              </p>
              {validator.companyName && (
                <span className="mt-1 flex items-center gap-1.5 pl-6 text-text-secondary">
                  <Building2 size={14} strokeWidth={1.5} />
                  {validator.companyName}
                  {validator.odooVersion && <span className="font-technical text-text-muted">· Odoo {validator.odooVersion}</span>}
                </span>
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
        disabled={!canSubmit || validator.status === "validating" || submitting}
        className="flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {(validator.status === "validating" || submitting) && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        {validator.status === "validating" ? t("validating") : t("submit")}
      </button>
    </form>
  );
}
