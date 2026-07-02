"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ArrowLeft,
  Loader2,
  User as UserIcon,
  KeyRound,
  ChevronDown,
  Mail,
  Clock,
  AlertTriangle,
  UserPlus,
  Pencil,
  X,
  Loader2 as Spinner,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { fetchInstanceDetail, saveUserCredential, updateOdooConfig } from "@/lib/api";
import type { InstanceDetail, InstanceUser, InstanceInvitation, SeatType } from "@/lib/types";
import { ConnectionStatusBadge } from "@/components/odoo/connection-status-badge";
import { InstanceHealthSummary } from "@/components/odoo/instance-health-summary";
import { CredentialForm } from "@/components/odoo/credential-form";
import { InviteUserForm } from "@/components/odoo/invite-user-form";

function SeatTag({ seat }: { seat: SeatType }) {
  const t = useTranslations("Instances.seat");
  return (
    <span className="rounded-btn bg-raised px-2 py-0.5 text-micro font-medium text-text-secondary">
      {t(seat)}
    </span>
  );
}

function UserRow({
  user,
  instance,
  orgId,
  onChanged,
}: {
  user: InstanceUser;
  instance: InstanceDetail;
  orgId: string;
  onChanged: () => void;
}) {
  const t = useTranslations("Instances.users");
  const [expanded, setExpanded] = useState(false);
  // The two blocking states (spec §4) always surface their exit action.
  const isBlocking = user.connection_status === "unset" || user.connection_status === "invalid";

  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserIcon size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" />
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-foreground">{user.email}</p>
            {user.odoo_username && (
              <p className="truncate text-small font-technical text-text-muted">{user.odoo_username}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SeatTag seat={user.seat_type} />
          <ConnectionStatusBadge status={user.connection_status} />
          {isBlocking && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small text-text-secondary transition-colors hover:bg-raised"
              aria-expanded={expanded}
            >
              <KeyRound size={14} strokeWidth={1.5} />
              {t("loadCreds")}
              <ChevronDown size={14} strokeWidth={1.5} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4">
              <p className="mb-3 text-small text-text-secondary">{t("loadCredsHint")}</p>
              <CredentialForm
                instance={instance}
                currentUsername={user.odoo_username}
                currentStatus={user.connection_status}
                onSave={(username, apikey) =>
                  saveUserCredential(orgId, user.user_id, instance.id, {
                    odoo_username: username,
                    odoo_api_key: apikey,
                  })
                }
                onSaved={() => {
                  setExpanded(false);
                  onChanged();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvitationRow({ inv }: { inv: InstanceInvitation }) {
  const t = useTranslations("Instances.seat");
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Mail size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" />
        <p className="truncate text-body text-foreground">{inv.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-btn bg-raised px-2 py-0.5 text-micro font-medium text-text-secondary">{t(inv.seat_type)}</span>
        <ConnectionStatusBadge status="pending" />
      </div>
    </div>
  );
}

/**
 * Edit an instance (spec §6.9). Label edit (cosmetic) is separated from the
 * url/db edit (which affects every user and forces re-validation), with its own save.
 */
function InstanceEditForm({
  detail,
  orgId,
  onSaved,
  onCancel,
}: {
  detail: InstanceDetail;
  orgId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Instances");
  const [label, setLabel] = useState(detail.label ?? "");
  const [url, setUrl] = useState(detail.url);
  const [dbName, setDbName] = useState(detail.db_name);
  const [savingLabel, setSavingLabel] = useState(false);
  const [savingConn, setSavingConn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-btn border border-border bg-base px-3 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

  async function saveLabel() {
    setSavingLabel(true);
    setError(null);
    const res = await updateOdooConfig(orgId, detail.id, {
      label: label.trim() || null,
      url: detail.url,
      db_name: detail.db_name,
    });
    if (res.success) onSaved();
    else setError(res.error ?? t("edit.saveError"));
    setSavingLabel(false);
  }

  async function saveConnection(e: React.FormEvent) {
    e.preventDefault();
    setSavingConn(true);
    setError(null);
    const res = await updateOdooConfig(orgId, detail.id, {
      label: label.trim() || null,
      url,
      db_name: dbName,
    });
    if (res.success) onSaved();
    else setError(res.error ?? t("edit.saveError"));
    setSavingConn(false);
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {/* Label — cosmetic, single inline row with its own save */}
      <div>
        <label className="mb-1.5 block text-small text-text-secondary">{t("edit.labelLabel")}</label>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("edit.labelPlaceholder")}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={saveLabel}
            disabled={savingLabel}
            className="flex h-btn-md shrink-0 items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {savingLabel && <Spinner size={14} strokeWidth={1.5} className="animate-spin" />}
            {t("edit.labelSave")}
          </button>
        </div>
      </div>

      {/* URL + DB — affects all users, requires re-validation */}
      <form onSubmit={saveConnection} className="space-y-3 rounded-card border border-border bg-raised/30 p-4">
        <p className="flex items-start gap-2 rounded-btn bg-warning-subtle px-3 py-2 text-small text-warning-solid">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {t("edit.warning")}
        </p>
        <div>
          <label className="mb-1.5 block text-small text-text-secondary">{t("create.urlLabel")}</label>
          <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-small text-text-secondary">{t("create.databaseLabel")}</label>
          <input type="text" required value={dbName} onChange={(e) => setDbName(e.target.value)} className={inputCls} />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={savingConn}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {savingConn && <Spinner size={14} strokeWidth={1.5} className="animate-spin" />}
            {t("edit.save")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-btn-sm items-center rounded-btn border border-border px-3 text-small text-text-secondary transition-colors hover:bg-raised"
          >
            {t("edit.cancel")}
          </button>
        </div>
      </form>

      {error && (
        <p className="flex items-center gap-1.5 text-small text-error">
          <AlertTriangle size={14} strokeWidth={1.5} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function InstanceDetailPage() {
  const t = useTranslations("Instances");
  const params = useParams();
  const router = useRouter();
  const { meData } = useSession();
  const configId = String(params?.id ?? "");
  const orgId = meData?.org?.id;
  const role = meData?.user?.role;
  const orgName = meData?.org?.name ?? "";
  // Invites & client management unlock only once the org is `partner` — the
  // backend flips solitary→partner when the partner validates its own instance
  // (spec §4). The front just reads org.type and gates accordingly.
  const isPartner = meData?.org?.type === "PARTNER";

  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);

  // setState lives inside the .then callback (not directly in the effect body).
  const load = useCallback(() => {
    if (!orgId || !configId) return;
    fetchInstanceDetail(orgId, configId).then((res) => {
      if (res.success && res.detail) setDetail(res.detail);
      else setNotFound(true);
    });
  }, [orgId, configId]);

  useEffect(() => {
    if (meData && role && role !== "ADMIN" && role !== "SUPERADMIN") router.replace("/chat");
  }, [meData, role, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (!meData || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Link href="/instances" className="mb-4 inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-foreground">
          <ArrowLeft size={16} strokeWidth={1.5} />
          {t("backToList")}
        </Link>
        <div className="flex items-center gap-2 rounded-card border border-border bg-error-subtle px-4 py-3 text-error">
          <AlertTriangle size={18} strokeWidth={1.5} />
          {t("notFound")}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const title = detail.company_name || detail.label || detail.url;
  const showLabel = !!detail.label && detail.label !== title;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/instances" className="mb-4 inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-foreground">
        <ArrowLeft size={16} strokeWidth={1.5} />
        {t("backToList")}
      </Link>

      {/* Instance header */}
      <div className="mb-6 rounded-card border border-border bg-surface p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <Building2 size={24} strokeWidth={1.5} className="self-center text-accent" />
            <h1 className="text-heading">{title}</h1>
            {showLabel && <span className="text-body text-text-muted">{detail.label}</span>}
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small text-text-secondary transition-colors hover:bg-raised"
            aria-label={t("edit.button")}
          >
            {editing ? <X size={14} strokeWidth={1.5} /> : <Pencil size={14} strokeWidth={1.5} />}
            {t("edit.button")}
          </button>
        </div>
        <p className="mb-4 text-small font-technical text-text-muted">
          {detail.url} · {detail.db_name}
          {detail.odoo_version && ` · Odoo ${detail.odoo_version}`}
        </p>
        <InstanceHealthSummary counts={detail.counts} seats={detail.seats} />

        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <InstanceEditForm
                detail={detail}
                orgId={orgId!}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  load();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Users on this instance */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-subheading">{t("users.title")}</h2>
          {isPartner && (
            <button
              type="button"
              onClick={() => setInviting((v) => !v)}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <UserPlus size={16} strokeWidth={1.5} />
              {t("invite.button")}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isPartner && inviting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mb-4 rounded-card border border-border bg-surface p-4">
                <InviteUserForm
                  orgId={orgId!}
                  instanceId={detail.id}
                  orgName={orgName}
                  seats={detail.seats}
                  onInvited={load}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {detail.users.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-small text-text-secondary">
            {t("users.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {detail.users.map((u) => (
              <UserRow key={u.user_id} user={u} instance={detail} orgId={orgId!} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* Pending invitations */}
      {detail.invitations.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-subheading">
            <Clock size={18} strokeWidth={1.5} className="text-info" />
            {t("invitations.title")}
          </h2>
          <div className="space-y-2">
            {detail.invitations.map((inv) => (
              <InvitationRow key={inv.id} inv={inv} />
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
