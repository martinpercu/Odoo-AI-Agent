"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { fetchMyCredential, saveMyCredential, NETWORK_ERROR } from "@/lib/api";
import type { OdooConfigSummary, UserOdooCredential } from "@/lib/types";

// ---- Multi-config row (ADMIN) ----

interface CredentialState {
  loading: boolean;
  credential: UserOdooCredential | null;
  notConfigured: boolean;
}

interface ConfigCredentialRowProps {
  config: OdooConfigSummary;
}

function ConfigCredentialRow({ config }: ConfigCredentialRowProps) {
  const t = useTranslations("Settings.credentials");

  const [state, setState] = useState<CredentialState>({
    loading: true,
    credential: null,
    notConfigured: false,
  });
  const [expanded, setExpanded] = useState(false);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCredential(config.id).then((r) => {
      if (r.notFound) {
        setState({ loading: false, credential: null, notConfigured: true });
      } else if (r.success && r.credential) {
        setState({ loading: false, credential: r.credential, notConfigured: false });
        setUsername(r.credential.odoo_username);
      } else {
        setState({ loading: false, credential: null, notConfigured: true });
      }
    });
  }, [config.id]);

  const isConfigured = !state.notConfigured && state.credential !== null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !apiKey.trim()) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    const result = await saveMyCredential(config.id, {
      odoo_username: username.trim(),
      odoo_api_key: apiKey.trim(),
    });

    if (result.success && result.credential) {
      setState({ loading: false, credential: result.credential, notConfigured: false });
      setSaveStatus("success");
      setApiKey("");
      setExpanded(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      setSaveError(
        result.error === NETWORK_ERROR ? t("networkError") : result.error ?? t("saveError")
      );
    }
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-raised transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {state.loading ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted shrink-0" />
          ) : isConfigured ? (
            <CheckCircle2 size={16} strokeWidth={1.5} className="text-success-solid shrink-0" />
          ) : (
            <AlertTriangle size={16} strokeWidth={1.5} className="text-warning-solid shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-body font-medium truncate">{config.label || config.url}</p>
            <p className="text-small font-technical text-text-muted truncate">
              {config.url} · {config.db_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {!state.loading && (
            <span className={`text-micro font-medium px-2 py-0.5 rounded-md ${
              isConfigured
                ? "bg-success-subtle text-success-solid"
                : "bg-warning-subtle text-warning-solid"
            }`}>
              {isConfigured ? t("statusConfigured") : t("statusNotConfigured")}
            </span>
          )}
          {expanded
            ? <ChevronUp size={16} strokeWidth={1.5} className="text-text-muted" />
            : <ChevronDown size={16} strokeWidth={1.5} className="text-text-muted" />
          }
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSave} className="border-t border-border px-4 py-4 space-y-4">
              {isConfigured && state.credential && (
                <div className="flex items-center gap-2 rounded-md bg-raised px-3 py-2">
                  <User size={14} strokeWidth={1.5} className="text-text-muted shrink-0" />
                  <span className="text-small text-text-secondary">{t("currentUser")}</span>
                  <span className="text-small font-technical font-medium text-foreground">
                    {state.credential.odoo_username}
                  </span>
                </div>
              )}
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
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </div>
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
                    className="w-full rounded-md border border-border bg-base px-3 py-2 pr-10 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors"
                    aria-label={showKey ? t("hideKey") : t("showKey")}
                  >
                    {showKey ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                <p className="mt-1 text-micro text-text-muted">{t("apiKeyHint")}</p>
              </div>
              {saveStatus === "error" && saveError && (
                <p className="flex items-center gap-1.5 text-small text-error font-technical">
                  <AlertTriangle size={14} strokeWidth={1.5} />
                  {saveError}
                </p>
              )}
              {saveStatus === "success" && (
                <p className="flex items-center gap-1.5 text-small text-success-solid">
                  <CheckCircle2 size={14} strokeWidth={1.5} />
                  {t("saveSuccess")}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !username.trim() || !apiKey.trim()}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-small font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  {saving && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
                  {isConfigured ? t("updateBtn") : t("saveBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => { setExpanded(false); setApiKey(""); setSaveStatus("idle"); }}
                  className="flex h-8 items-center px-3 rounded-md border border-border text-small text-text-secondary hover:bg-raised transition-colors"
                >
                  {t("cancelBtn")}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Single-config block (CLIENT_USER) ----

interface ClientUserCredentialBlockProps {
  config: OdooConfigSummary;
}

function ClientUserCredentialBlock({ config }: ClientUserCredentialBlockProps) {
  const t = useTranslations("Settings.credentials");

  const [loading, setLoading] = useState(true);
  const [credential, setCredential] = useState<UserOdooCredential | null>(null);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // If /me already told us there are no credentials, skip the fetch
    if (config.has_credentials === false) {
      setLoading(false);
      return;
    }
    fetchMyCredential(config.id).then((r) => {
      if (r.success && r.credential) {
        setCredential(r.credential);
        setUsername(r.credential.odoo_username);
      }
      setLoading(false);
    });
  }, [config.id, config.has_credentials]);

  const isConfigured = credential !== null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !apiKey.trim()) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    const result = await saveMyCredential(config.id, {
      odoo_username: username.trim(),
      odoo_api_key: apiKey.trim(),
    });

    if (result.success && result.credential) {
      setCredential(result.credential);
      setUsername(result.credential.odoo_username);
      setApiKey("");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      setSaveError(
        result.error === NETWORK_ERROR ? t("networkError") : result.error ?? t("saveError")
      );
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Instance — read-only */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-small font-medium text-text-secondary">
          {t("instanceLabel")}
        </label>
        <div className="rounded-md border border-border bg-raised/50 px-3 py-2">
          <p className="text-body font-medium text-foreground">{config.label || config.url}</p>
          <p className="text-small font-technical text-text-muted">{config.url} · {config.db_name}</p>
        </div>
      </div>

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
          className="w-full rounded-md border border-border bg-base px-3 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* API Key */}
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
            className="w-full rounded-md border border-border bg-base px-3 py-2 pr-10 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors"
            aria-label={showKey ? t("hideKey") : t("showKey")}
          >
            {showKey ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
        <p className="mt-1 text-micro text-text-muted">{t("apiKeyHint")}</p>
      </div>

      {saveStatus === "error" && saveError && (
        <p className="flex items-center gap-1.5 text-small text-error font-technical">
          <AlertTriangle size={14} strokeWidth={1.5} />
          {saveError}
        </p>
      )}
      {saveStatus === "success" && (
        <p className="flex items-center gap-1.5 text-small text-success-solid">
          <CheckCircle2 size={14} strokeWidth={1.5} />
          {t("saveSuccess")}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !username.trim() || !apiKey.trim()}
        className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-small font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
      >
        {saving && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
        {isConfigured ? t("updateBtn") : t("saveBtn")}
      </button>
    </form>
  );
}

// ---- Section ----

export function UserCredentialsSection() {
  const t = useTranslations("Settings.credentials");
  const { meData } = useSession();
  const configs = meData?.odoo_configs ?? [];
  const role = meData?.user?.role;
  const isClientUser = role === "CLIENT_USER";

  if (configs.length === 0) {
    if (isClientUser) {
      return (
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound size={20} strokeWidth={1.5} className="text-accent" />
            <h2 className="text-subheading">{t("sectionTitle")}</h2>
          </div>
          <p className="text-small text-text-secondary">{t("noInstanceAssigned")}</p>
        </div>
      );
    }
    return null;
  }

  // CLIENT_USER: show only the first config (should only ever have 1)
  if (isClientUser) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound size={20} strokeWidth={1.5} className="text-accent" />
          <h2 className="text-subheading">{t("sectionTitle")}</h2>
        </div>
        <p className="mb-5 text-small text-text-secondary">{t("sectionDescClient")}</p>
        <ClientUserCredentialBlock config={configs[0]} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <KeyRound size={20} strokeWidth={1.5} className="text-accent" />
        <h2 className="text-subheading">{t("sectionTitle")}</h2>
      </div>
      <p className="mb-5 text-small text-text-secondary">{t("sectionDesc")}</p>
      <div className="space-y-2">
        {configs.map((cfg) => (
          <ConfigCredentialRow key={cfg.id} config={cfg} />
        ))}
      </div>
    </div>
  );
}
