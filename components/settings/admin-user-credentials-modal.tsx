"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import {
  fetchAllUserCredentials,
  fetchUserCredential,
  assignUserInstance,
  saveUserCredential,
  deleteUserCredential,
  NETWORK_ERROR,
} from "@/lib/api";
import type { OdooConfigSummary, OrgUser, UserOdooCredential } from "@/lib/types";

// ---- ADMIN role: accordion per config (unchanged) ----

interface ConfigCredentialPanelProps {
  config: OdooConfigSummary;
  orgId: string;
  userId: string;
}

function ConfigCredentialPanel({ config, orgId, userId }: ConfigCredentialPanelProps) {
  const t = useTranslations("Settings.adminCredentials");

  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [credential, setCredential] = useState<UserOdooCredential | null>(null);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUserCredential(orgId, userId, config.id).then((r) => {
      if (r.success && r.credential) {
        setCredential(r.credential);
        setUsername(r.credential.odoo_username);
      } else {
        setCredential(null);
      }
      setLoading(false);
    });
  }, [orgId, userId, config.id]);

  const isConfigured = credential !== null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !apiKey.trim()) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    const result = await saveUserCredential(orgId, userId, config.id, {
      odoo_username: username.trim(),
      odoo_api_key: apiKey.trim(),
    });

    if (result.success && result.credential) {
      setCredential(result.credential);
      setUsername(result.credential.odoo_username);
      setSaveStatus("success");
      setApiKey("");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      setSaveError(
        result.error === NETWORK_ERROR ? t("networkError") : result.error ?? t("saveError")
      );
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteUserCredential(orgId, userId, config.id);
    if (result.success) {
      setCredential(null);
      setUsername("");
      setApiKey("");
      setConfirmDelete(false);
    }
    setDeleting(false);
  }

  return (
    <div className="rounded-lg border border-border bg-raised/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-raised/50 transition-colors"
      >
        <p className="text-small font-medium truncate min-w-0 mr-3">
          {config.label || config.url}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {loading ? (
            <Loader2 size={13} strokeWidth={1.5} className="animate-spin text-text-muted" />
          ) : isConfigured ? (
            <span className="text-micro font-medium px-2 py-0.5 rounded-md bg-success-subtle text-success-solid">
              {t("statusConfigured")}
            </span>
          ) : (
            <span className="text-micro font-medium px-2 py-0.5 rounded-md bg-warning-subtle text-warning-solid">
              {t("statusNotConfigured")}
            </span>
          )}
          {expanded
            ? <ChevronUp size={14} strokeWidth={1.5} className="text-text-muted" />
            : <ChevronDown size={14} strokeWidth={1.5} className="text-text-muted" />
          }
        </div>
      </button>

      {expanded && !loading && (
        <form onSubmit={handleSave} className="border-t border-border px-4 py-4 space-y-3">
          {isConfigured && credential && (
            <div className="flex items-center gap-2 rounded-md bg-raised px-3 py-2">
              <User size={13} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <span className="text-small text-text-secondary">{t("currentUser")}</span>
              <span className="text-small font-technical font-medium text-foreground">
                {credential.odoo_username}
              </span>
            </div>
          )}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("usernameLabel")}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("usernamePlaceholder")}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-small font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("apiKeyLabel")}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConfigured ? t("apiKeyUpdatePlaceholder") : t("apiKeyPlaceholder")}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-9 text-small font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors"
                aria-label={showKey ? t("hideKey") : t("showKey")}
              >
                {showKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          {saveStatus === "error" && saveError && (
            <p className="flex items-center gap-1.5 text-micro text-error font-technical">
              <AlertTriangle size={12} strokeWidth={1.5} />
              {saveError}
            </p>
          )}
          {saveStatus === "success" && (
            <p className="flex items-center gap-1.5 text-micro text-success-solid">
              <CheckCircle2 size={12} strokeWidth={1.5} />
              {t("saveSuccess")}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !username.trim() || !apiKey.trim()}
              className="flex h-7 items-center gap-1.5 rounded-md bg-accent px-3 text-micro font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {saving && <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />}
              {isConfigured ? t("updateBtn") : t("saveBtn")}
            </button>
            {isConfigured && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-micro text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                aria-label={t("deleteBtn")}
              >
                <Trash2 size={12} strokeWidth={1.5} />
                {t("deleteBtn")}
              </button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-1.5">
                <span className="text-micro text-error">{t("confirmDelete")}</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex h-7 items-center gap-1 rounded-md bg-error px-2 text-micro text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={11} strokeWidth={1.5} className="animate-spin" /> : t("yes")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex h-7 items-center px-2 rounded-md border border-border text-micro hover:bg-raised transition-colors"
                >
                  {t("no")}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

// ---- CLIENT_USER: single credential block ----

type ClientView =
  | "loading"
  | "no_cred"        // has instance, no user credential
  | "has_cred"       // has instance + user credential
  | "editing_cred"   // pencil clicked — show credential fields
  | "changing_inst"; // "Cambiar Instancia" dropdown open

interface ClientUserCredentialBlockProps {
  configs: OdooConfigSummary[];
  orgId: string;
  userId: string;
}

function ClientUserCredentialBlock({ configs, orgId, userId }: ClientUserCredentialBlockProps) {
  const t = useTranslations("Settings.adminCredentials");

  const [view, setView] = useState<ClientView>("loading");
  const [configuredId, setConfiguredId] = useState<string | null>(null);
  const [hasAssignedInstance, setHasAssignedInstance] = useState(false);
  const [existingUsername, setExistingUsername] = useState<string | null>(null);

  // Changing instance
  const [pendingConfigId, setPendingConfigId] = useState<string>("");
  const [deletingInst, setDeletingInst] = useState(false);

  // Credential form (new or edit)
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit confirm (pencil → Yes/No)
  const [confirmEdit, setConfirmEdit] = useState(false);

  useEffect(() => {
    if (configs.length === 0) {
      setView("no_cred");
      return;
    }
    fetchAllUserCredentials(orgId, userId).then((r) => {
      const cred = r.success && r.credentials && r.credentials.length > 0 ? r.credentials[0] : null;
      if (cred) {
        setConfiguredId(cred.odoo_config_id);
        setHasAssignedInstance(true);
        if (cred.odoo_username) {
          setExistingUsername(cred.odoo_username);
          setUsername(cred.odoo_username);
          setView("has_cred");
        } else {
          setView("no_cred");
        }
      } else {
        setConfiguredId(configs[0]?.id ?? null);
        setHasAssignedInstance(false);
        setView("no_cred");
      }
    });
  }, [orgId, userId, configs]);

  const configuredConfig = configs.find((c) => c.id === configuredId);

  async function handleChangeInstance(newConfigId: string) {
    if (!newConfigId) return;
    if (newConfigId === configuredId && hasAssignedInstance) {
      setView(existingUsername ? "has_cred" : "no_cred");
      setPendingConfigId("");
      return;
    }
    setDeletingInst(true);
    // DELETE only if the user had a real assigned instance in the backend
    if (configuredId && hasAssignedInstance) {
      await deleteUserCredential(orgId, userId, configuredId);
    }
    // Assign new instance (PUT with null credentials — registers the row without credentials)
    await assignUserInstance(orgId, userId, newConfigId);
    setConfiguredId(newConfigId);
    setHasAssignedInstance(true);
    setExistingUsername(null);
    setUsername("");
    setApiKey("");
    setPendingConfigId("");
    setView("no_cred");
    setDeletingInst(false);
  }

  async function handleSaveCred(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !apiKey.trim() || !configuredId) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    const result = await saveUserCredential(orgId, userId, configuredId, {
      odoo_username: username.trim(),
      odoo_api_key: apiKey.trim(),
    });

    if (result.success && result.credential) {
      setExistingUsername(result.credential.odoo_username);
      setUsername(result.credential.odoo_username);
      setApiKey("");
      setSaveStatus("success");
      setView("has_cred");
      setConfirmEdit(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      setSaveError(
        result.error === NETWORK_ERROR ? t("networkError") : result.error ?? t("saveError")
      );
    }
    setSaving(false);
  }

  if (view === "loading") {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const instanceName = configuredConfig
    ? (configuredConfig.label || configuredConfig.url)
    : configuredId ?? "—";

  return (
    <div className="space-y-3">
      {/* Instance row */}
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-secondary uppercase tracking-wide">
          {t("instanceLabel")}
        </label>

        {view === "changing_inst" ? (
          <div className="space-y-2">
            <select
              value={pendingConfigId}
              onChange={(e) => setPendingConfigId(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-small font-technical outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">{t("selectInstance")}</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>{c.label || c.url}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pendingConfigId || deletingInst}
                onClick={() => handleChangeInstance(pendingConfigId)}
                className="flex h-7 items-center gap-1.5 rounded-md bg-accent px-3 text-micro font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                {deletingInst && <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />}
                {t("confirmChangeInstance")}
              </button>
              <button
                type="button"
                onClick={() => { setView(existingUsername ? "has_cred" : "no_cred"); setPendingConfigId(""); }}
                className="flex h-7 items-center px-3 rounded-md border border-border text-micro text-text-secondary hover:bg-raised transition-colors"
              >
                {t("no")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-border bg-raised/50 px-3 py-1.5">
            <p className="text-small font-technical text-foreground truncate mr-2">
              {instanceName}
            </p>
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => { setView("changing_inst"); setPendingConfigId(""); setConfirmEdit(false); }}
                className="text-micro text-text-secondary hover:text-accent transition-colors whitespace-nowrap"
              >
                {t("changeInstance")}
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 w-48">
                <div className="rounded-md bg-raised border border-border px-2 py-1 text-micro text-text-secondary shadow-sm text-right">
                  {t("changeInstanceTooltip")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credential row — badge always visible when not changing instance */}
      {(view === "has_cred" || view === "no_cred") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border border-border bg-raised/50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {view === "has_cred" ? (
                <CheckCircle2 size={14} strokeWidth={1.5} className="text-success-solid shrink-0" />
              ) : (
                <AlertTriangle size={14} strokeWidth={1.5} className="text-warning-solid shrink-0" />
              )}
              <span className="text-small text-text-secondary shrink-0">
                {view === "has_cred" ? t("credConfigured") : t("credNotConfigured")}
              </span>
              {view === "has_cred" && existingUsername && (
                <span className="text-small font-technical font-medium text-foreground truncate">
                  {existingUsername}
                </span>
              )}
            </div>
            {/* Pencil: no_cred → open directly; has_cred → confirm Yes/No */}
            {view === "no_cred" ? (
              <button
                type="button"
                onClick={() => { setView("editing_cred"); setApiKey(""); setSaveStatus("idle"); }}
                className="rounded-md p-1.5 text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors shrink-0 ml-2"
                aria-label={t("editCredBtn")}
              >
                <Pencil size={14} strokeWidth={1.5} />
              </button>
            ) : !confirmEdit ? (
              <button
                type="button"
                onClick={() => setConfirmEdit(true)}
                className="rounded-md p-1.5 text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors shrink-0 ml-2"
                aria-label={t("editCredBtn")}
              >
                <Pencil size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <AlertTriangle size={14} strokeWidth={1.5} className="text-warning-solid" />
                <button
                  onClick={() => { setView("editing_cred"); setApiKey(""); setSaveStatus("idle"); }}
                  className="rounded-md px-2 py-1 text-small bg-accent text-white hover:bg-accent-hover"
                >
                  {t("yes")}
                </button>
                <button
                  onClick={() => setConfirmEdit(false)}
                  className="rounded-md px-2 py-1 text-small border border-border hover:bg-raised"
                >
                  {t("no")}
                </button>
              </div>
            )}
          </div>

          {saveStatus === "success" && (
            <p className="flex items-center gap-1.5 text-micro text-success-solid">
              <CheckCircle2 size={12} strokeWidth={1.5} />
              {t("saveSuccess")}
            </p>
          )}
        </div>
      )}

      {view === "editing_cred" && (
        <form onSubmit={handleSaveCred} className="space-y-3">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("usernameLabel")}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("usernamePlaceholder")}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-small font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("apiKeyLabel")}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("apiKeyPlaceholder")}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-9 text-small font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors"
                aria-label={showKey ? t("hideKey") : t("showKey")}
              >
                {showKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {saveStatus === "error" && saveError && (
            <p className="flex items-center gap-1.5 text-micro text-error font-technical">
              <AlertTriangle size={12} strokeWidth={1.5} />
              {saveError}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !username.trim() || !apiKey.trim()}
              className="flex h-7 items-center gap-1.5 rounded-md bg-accent px-3 text-micro font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {saving && <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />}
              {t("saveBtn")}
            </button>
            <button
              type="button"
              onClick={() => { setView(existingUsername ? "has_cred" : "no_cred"); setApiKey(""); setSaveStatus("idle"); setConfirmEdit(false); }}
              className="flex h-7 items-center px-3 rounded-md border border-border text-micro text-text-secondary hover:bg-raised transition-colors"
            >
              {t("cancelBtn")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---- Modal ----

interface AdminUserCredentialsModalProps {
  user: OrgUser;
  orgId: string;
  configs: OdooConfigSummary[];
  onClose: () => void;
}

export function AdminUserCredentialsModal({
  user,
  orgId,
  configs,
  onClose,
}: AdminUserCredentialsModalProps) {
  const t = useTranslations("Settings.adminCredentials");
  const isClientUser = user.role === "CLIENT_USER";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface shadow-lg max-h-[85vh] flex flex-col"
        >
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle shrink-0">
                <KeyRound size={18} strokeWidth={1.5} className="text-accent" />
              </div>
              <div>
                <h2 className="text-subheading">{t("modalTitle")}</h2>
                <p className="text-small text-text-secondary font-technical">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:text-foreground hover:bg-raised transition-colors"
              aria-label={t("close")}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
            {configs.length === 0 ? (
              <p className="text-body text-text-secondary">{t("noConfigs")}</p>
            ) : isClientUser ? (
              <ClientUserCredentialBlock
                configs={configs}
                orgId={orgId}
                userId={user.id}
              />
            ) : (
              configs.map((cfg) => (
                <ConfigCredentialPanel
                  key={cfg.id}
                  config={cfg}
                  orgId={orgId}
                  userId={user.id}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
