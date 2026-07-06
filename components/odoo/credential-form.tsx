"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { User, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { OdooApiKeyHelper } from "@/components/odoo/odoo-apikey-helper";
import { NETWORK_ERROR, type CredentialResult } from "@/lib/api";
import type { OdooConnectionStatus } from "@/lib/types";

const inputCls =
  "w-full rounded-btn border border-border bg-base px-3 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

export interface CredentialFormProps {
  /** Instance whose URL + DB are inherited and shown read-only (spec §6.5). */
  instance: { label?: string | null; url: string; db_name: string };
  currentUsername?: string | null;
  currentStatus?: OdooConnectionStatus | null;
  lastValidatedAt?: string | null;
  /** When true, hides the read-only instance block (URL + DB). Used for CLIENT_USER self-service. */
  hideInstanceInfo?: boolean;
  /** Persists creds — parent picks the endpoint (self-service vs admin pre-load). Validates server-side. */
  onSave: (username: string, apikey: string) => Promise<CredentialResult>;
  onSaved?: (result: CredentialResult) => void;
}

/**
 * Shared credential editor (spec §6.5/§6.7). URL+DB inherited read-only; user+apikey editable.
 * Validates on save (the backend rejects with `auth_failed`); apikey never re-shown.
 */
export function CredentialForm({
  instance,
  currentUsername,
  currentStatus,
  lastValidatedAt,
  hideInstanceInfo = false,
  onSave,
  onSaved,
}: CredentialFormProps) {
  const t = useTranslations("Instances.credentials");
  const [username, setUsername] = useState(currentUsername ?? "");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isConfigured = !!currentUsername && currentStatus === "active";

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !apiKey.trim()) return;
    setSaving(true);
    setStatus("idle");
    setError(null);

    const result = await onSave(username.trim(), apiKey.trim());
    if (result.success) {
      setApiKey("");
      setStatus("success");
      onSaved?.(result);
    } else {
      setStatus("error");
      if (result.errorCode === "auth_failed") setError(t("errorAuthFailed"));
      else if (result.error === NETWORK_ERROR) setError(t("networkError"));
      else setError(result.error ?? t("saveError"));
    }
    setSaving(false);
  }

  const validatedDate = lastValidatedAt
    ? new Date(lastValidatedAt).toLocaleDateString()
    : null;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Instance block — read-only (URL + DB inherited). Hidden for CLIENT_USER. */}
      {!hideInstanceInfo && (
        <div>
          <p className="mb-1.5 text-small font-medium text-text-secondary">{t("instanceLabel")}</p>
          <div className="rounded-btn border border-border bg-raised/50 px-3 py-2.5">
            <p className="text-small font-technical text-text-muted">
              {instance.url} · {instance.db_name}
            </p>
          </div>
        </div>
      )}

      {isConfigured && validatedDate && (
        <p className="flex items-center gap-1.5 text-small text-text-secondary">
          <CheckCircle2 size={14} strokeWidth={1.5} className="text-success-solid" />
          {t("configuredOn", { date: validatedDate })}
        </p>
      )}

      {/* Username */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-small font-medium text-text-secondary">
          <User size={14} strokeWidth={1.5} />
          {t("usernameLabel")}
        </label>
        <input
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("usernamePlaceholder")}
          className={inputCls}
        />
      </div>

      {/* API key */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-small font-medium text-text-secondary">
          <KeyRound size={14} strokeWidth={1.5} />
          {t("apiKeyLabel")}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isConfigured ? t("apiKeyUpdatePlaceholder") : t("apiKeyPlaceholder")}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-foreground"
            aria-label={showKey ? t("hideKey") : t("showKey")}
          >
            {showKey ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <OdooApiKeyHelper />

      {status === "error" && error && (
        <p className="flex items-center gap-1.5 text-small text-error">
          <AlertTriangle size={14} strokeWidth={1.5} />
          {error}
        </p>
      )}
      {status === "success" && (
        <p className="flex items-center gap-1.5 text-small text-success-solid">
          <CheckCircle2 size={14} strokeWidth={1.5} />
          {t("saveSuccess")}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !username.trim() || !apiKey.trim()}
        className="flex h-btn-sm items-center gap-2 rounded-btn bg-accent px-4 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
        {isConfigured ? t("updateBtn") : t("saveBtn")}
      </button>
    </form>
  );
}
