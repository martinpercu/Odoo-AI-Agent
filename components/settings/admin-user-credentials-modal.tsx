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
} from "lucide-react";
import {
  fetchUserCredential,
  saveUserCredential,
  deleteUserCredential,
  NETWORK_ERROR,
} from "@/lib/api";
import type { OdooConfigSummary, OrgUser, UserOdooCredential } from "@/lib/types";

interface ConfigCredentialPanel {
  config: OdooConfigSummary;
  orgId: string;
  userId: string;
}

function ConfigCredentialPanel({ config, orgId, userId }: ConfigCredentialPanel) {
  const t = useTranslations("Settings.adminCredentials");

  const [loading, setLoading] = useState(true);
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
    <div className="rounded-lg border border-border bg-base overflow-hidden">
      {/* Config header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-small font-medium truncate">{config.label || config.url}</p>
          <p className="text-micro font-technical text-text-muted truncate">
            {config.url} · {config.db_name}
          </p>
        </div>
        {loading ? (
          <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-text-muted shrink-0" />
        ) : isConfigured ? (
          <span className="text-micro font-medium px-2 py-0.5 rounded-md bg-success-subtle text-success-solid shrink-0">
            {t("statusConfigured")}
          </span>
        ) : (
          <span className="text-micro font-medium px-2 py-0.5 rounded-md bg-warning-subtle text-warning-solid shrink-0">
            {t("statusNotConfigured")}
          </span>
        )}
      </div>

      {/* Form */}
      {!loading && (
        <form onSubmit={handleSave} className="px-4 py-4 space-y-3">
          {isConfigured && credential && (
            <div className="flex items-center gap-2 rounded-md bg-raised px-3 py-2">
              <User size={13} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <span className="text-small text-text-secondary">{t("currentUser")}</span>
              <span className="text-small font-technical font-medium text-foreground">
                {credential.odoo_username}
              </span>
            </div>
          )}

          {/* Username */}
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

          {/* API Key */}
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

          {/* Status */}
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

          {/* Actions */}
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

  // Close on Escape
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
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface shadow-lg max-h-[85vh] flex flex-col"
        >
          {/* Header */}
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

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
            {configs.length === 0 ? (
              <p className="text-body text-text-secondary">{t("noConfigs")}</p>
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

          {/* Footer */}
          <div className="border-t border-border px-5 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="flex h-8 items-center px-4 rounded-md border border-border text-small text-text-secondary hover:bg-raised transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
