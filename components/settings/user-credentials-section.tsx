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

interface CredentialState {
  loading: boolean;
  credential: UserOdooCredential | null;
  /** true when the 404 came from the server (not configured yet) */
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
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-raised transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Status indicator */}
          {state.loading ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted shrink-0" />
          ) : isConfigured ? (
            <CheckCircle2 size={16} strokeWidth={1.5} className="text-success-solid shrink-0" />
          ) : (
            <AlertTriangle size={16} strokeWidth={1.5} className="text-warning-solid shrink-0" />
          )}

          <div className="min-w-0">
            <p className="text-body font-medium truncate">
              {config.label || config.url}
            </p>
            <p className="text-small font-technical text-text-muted truncate">
              {config.url} · {config.db_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {!state.loading && (
            <span
              className={`text-micro font-medium px-2 py-0.5 rounded-md ${
                isConfigured
                  ? "bg-success-subtle text-success-solid"
                  : "bg-warning-subtle text-warning-solid"
              }`}
            >
              {isConfigured ? t("statusConfigured") : t("statusNotConfigured")}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} strokeWidth={1.5} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} strokeWidth={1.5} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded form */}
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

              {/* Status feedback */}
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

export function UserCredentialsSection() {
  const t = useTranslations("Settings.credentials");
  const { meData } = useSession();
  const configs = meData?.odoo_configs ?? [];

  if (configs.length === 0) return null;

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
