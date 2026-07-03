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
import { fetchInstanceDetail, listOdooConfigs, saveUserCredential, updateOdooConfig } from "@/lib/api";
import { A11yModal } from "@/components/intro/a11y-modal";
import type { InstanceDetail, InstanceUser, InstanceInvitation, SeatType } from "@/lib/types";
import { ConnectionStatusBadge } from "@/components/odoo/connection-status-badge";
import { InstanceHealthSummary } from "@/components/odoo/instance-health-summary";
import { CredentialForm } from "@/components/odoo/credential-form";
import { InviteUserForm } from "@/components/odoo/invite-user-form";

function SeatTag({ seat }: { seat: SeatType }) {
  const t = useTranslations("Instances.seat");
  if (seat === "paid") return null;
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
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Mail size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" />
        <p className="truncate text-body text-foreground">{inv.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SeatTag seat={inv.seat_type} />
        <ConnectionStatusBadge status="pending" />
      </div>
    </div>
  );
}

/**
 * Edit an instance (spec §6.9). Label edit (cosmetic) is separated from the
 * url/db edit (which affects every user and forces re-validation), with its own save.
 * URL/DB section is collapsible; saving it requires an explicit confirmation modal.
 */
function InstanceEditForm({
  detail,
  orgId,
  onSaved,
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
  const [urlExpanded, setUrlExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  async function doSaveConnection() {
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
    setShowConfirm(false);
  }

  return (
    <>
      {/* px-0.5 gives the focus ring room so it isn't clipped by the parent overflow-hidden */}
      <div className="mt-4 space-y-4 border-t border-border pt-4 px-0.5">
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

        {/* URL + DB — collapsible, affects all users, requires re-validation */}
        <div className="rounded-card border border-border">
          <button
            type="button"
            onClick={() => setUrlExpanded((v) => !v)}
            aria-expanded={urlExpanded}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-small font-medium text-text-secondary transition-colors hover:bg-raised rounded-card"
          >
            <span>{t("edit.urlDbTitle")}</span>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 text-text-muted transition-transform duration-150 ${urlExpanded ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {urlExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <form
                  onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }}
                  className="space-y-3 border-t border-border p-4"
                >
                  {/* Warning alert with collapse chevron on the right */}
                  <div className="flex items-start justify-between gap-2 rounded-btn bg-warning-subtle px-3 py-2">
                    <p className="flex items-start gap-2 text-small text-warning-solid">
                      <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                      {t("edit.warning")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setUrlExpanded(false)}
                      aria-label={t("edit.cancel")}
                      className="shrink-0 text-warning-solid/70 transition-colors hover:text-warning-solid"
                    >
                      <ChevronDown size={14} strokeWidth={1.5} className="rotate-180" />
                    </button>
                  </div>
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
                      onClick={() => setUrlExpanded(false)}
                      className="flex h-btn-sm items-center rounded-btn border border-border px-3 text-small text-text-secondary transition-colors hover:bg-raised"
                    >
                      {t("edit.cancel")}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-small text-error">
            <AlertTriangle size={14} strokeWidth={1.5} />
            {error}
          </p>
        )}
      </div>

      {/* Confirmation modal — shown before applying URL/DB changes */}
      <A11yModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        labelledBy="edit-confirm-title"
        containerClassName="items-center"
        className="w-full max-w-sm mx-4"
      >
        <div className="rounded-card border border-border bg-surface p-5 shadow-lg">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle size={18} strokeWidth={1.5} className="shrink-0 text-warning-solid" />
            <h3 id="edit-confirm-title" className="text-subheading">{t("edit.save")}</h3>
          </div>
          <p className="mb-5 text-body text-text-secondary">{t("edit.confirmTitle")}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex h-btn-sm items-center rounded-btn border border-border px-3 text-small text-text-secondary transition-colors hover:bg-raised"
            >
              {t("edit.cancel")}
            </button>
            <button
              type="button"
              onClick={doSaveConnection}
              disabled={savingConn}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {savingConn && <Spinner size={14} strokeWidth={1.5} className="animate-spin" />}
              {t("edit.confirmApply")}
            </button>
          </div>
        </div>
      </A11yModal>
    </>
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
  const brandName = meData?.org?.brand_name;
  // Invites & client management unlock only once the org is `partner` — the
  // backend flips solitary→partner when the partner validates its own instance
  // (spec §4). The front just reads org.type and gates accordingly.
  const isPartner = meData?.org?.type === "PARTNER";

  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Load detail + list in parallel; the list endpoint carries `seats` which the
  // detail endpoint doesn't include — merge so InviteUserForm gets seat counts.
  const load = useCallback(() => {
    if (!orgId || !configId) return;
    Promise.all([
      fetchInstanceDetail(orgId, configId),
      listOdooConfigs(orgId),
    ]).then(([detailRes, listRes]) => {
      if (detailRes.success && detailRes.detail) {
        const enriched = listRes.configs?.find((c) => c.id === configId);
        setDetail({
          ...detailRes.detail,
          seats: detailRes.detail.seats ?? enriched?.seats,
        });
      } else {
        setNotFound(true);
      }
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
                  brandName={brandName}
                  companyName={detail.company_name}
                  seats={detail.seats}
                  onInvited={() => {
                    setTimeout(() => {
                      setInviting(false);
                      load();
                    }, 2000);
                  }}
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
