"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Loader2,
  KeyRound,
  Pencil,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import {
  fetchMyCredential,
  saveMyCredential,
  revalidateMyCredential,
} from "@/lib/api";
import type { OdooConfigSummary, OdooConnectionStatus } from "@/lib/types";
import { ConnectionStatusBadge } from "@/components/odoo/connection-status-badge";
import { ConnectionInvalidBanner } from "@/components/odoo/connection-invalid-banner";
import { CredentialForm } from "@/components/odoo/credential-form";

/** A single instance the current user can self-manage credentials for (spec §6.5/§6.6). */
function MyConnectionRow({ config, isClient }: { config: OdooConfigSummary; isClient: boolean }) {
  const t = useTranslations("Connection");
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<OdooConnectionStatus>("unset");
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  // setState lives inside the .then callback (not directly in the effect body).
  const load = useCallback(() => {
    fetchMyCredential(config.id).then((r) => {
      if (r.success && r.credential) {
        setUsername(r.credential.odoo_username || null);
        setStatus(r.credential.status ?? (r.credential.odoo_username ? "active" : "unset"));
        setLastValidatedAt(r.credential.last_validated_at ?? null);
      } else {
        // 404 (notFound) or empty → no credentials yet.
        setStatus(config.connection_status ?? "unset");
      }
      setLoading(false);
    });
  }, [config.id, config.connection_status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevalidate() {
    setRevalidating(true);
    await revalidateMyCredential(config.id);
    load();
    setRevalidating(false);
  }

  const title = config.company_name || config.label || config.url;
  const isUnset = status === "unset";
  const isInvalid = status === "invalid";

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={18} strokeWidth={1.5} className="shrink-0 text-accent" />
            <h3 className="truncate text-subheading">{title}</h3>
          </div>
          {/* <p className="mt-0.5 truncate text-small font-technical text-text-muted">
            {config.url} · {config.db_name}
          </p> */}
        </div>
        {!loading && <ConnectionStatusBadge status={status} />}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted" />
        </div>
      ) : isInvalid ? (
        <div className="space-y-3">
          <ConnectionInvalidBanner companyName={config.company_name} onReload={() => setEditing(true)} />
          <button
            type="button"
            onClick={handleRevalidate}
            disabled={revalidating}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small text-text-secondary transition-colors hover:bg-raised disabled:opacity-40"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={revalidating ? "animate-spin" : ""} />
            {t("revalidate")}
          </button>
        </div>
      ) : isUnset ? (
        <div className="rounded-btn bg-warning-subtle px-4 py-3">
          <p className="mb-2 text-small text-warning-solid">{t("unsetDesc", { company: title })}</p>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <KeyRound size={14} strokeWidth={1.5} />
              {t("unsetCta")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-small text-success-solid">
            <CheckCircle2 size={14} strokeWidth={1.5} />
            {t("activeNote")}
            {username && <span className="font-technical text-text-secondary">· {username}</span>}
          </p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 rounded-btn p-1.5 text-text-muted transition-colors hover:bg-raised hover:text-foreground"
            aria-label={t("editCreds")}
          >
            <Pencil size={14} strokeWidth={1.5} />
            <ChevronDown size={14} strokeWidth={1.5} className={editing ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 px-1 border-t border-border pt-4">
              <CredentialForm
                instance={config}
                currentUsername={username}
                currentStatus={status}
                lastValidatedAt={lastValidatedAt}
                hideInstanceInfo={isClient}
                onSave={(u, k) => saveMyCredential(config.id, { odoo_username: u, odoo_api_key: k })}
                onSaved={() => {
                  setEditing(false);
                  load();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyOdooConnectionPage() {
  const t = useTranslations("Connection");
  const { meData } = useSession();
  const configs = meData?.odoo_configs ?? [];
  const isClient = meData?.user?.role === "CLIENT_USER";

  if (!meData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      {!isClient && (
        <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-foreground">
          <ArrowLeft size={16} strokeWidth={1.5} />
          {t("backToSettings")}
        </Link>
      )}

      <div className="mb-2 flex items-center gap-2">
        <KeyRound size={24} strokeWidth={1.5} className="text-accent" />
        <h1 className="text-heading">{isClient ? t("myTitleClient") : t("myTitleAdmin")}</h1>
      </div>
      <p className="mb-6 text-body text-text-secondary">
        {isClient ? t("subtitleClient") : t("subtitleAdmin")}
      </p>

      {configs.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center text-small text-text-secondary">
          {t("noInstance")}
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <MyConnectionRow key={c.id} config={c} isClient={isClient} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
