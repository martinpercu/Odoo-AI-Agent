"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Shield,
  Building2,
  Plug,
  Database,
  Users,
  UserPlus,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Flag,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Zap,
  BookSearch,
} from "lucide-react";
import { ConnectionForm } from "@/components/odoo/connection-form";
import { InstanceInspector } from "@/components/odoo/instance-inspector";
import { UserCredentialsSection } from "@/components/settings/user-credentials-section";
import { AdminUserCredentialsModal } from "@/components/settings/admin-user-credentials-modal";
import { AdminInvitationCredentialsModal } from "@/components/settings/admin-invitation-credentials-modal";
import { useSession } from "@/hooks/use-session";
import {
  listOdooConfigs,
  deleteOdooConfig,
  updateOrg,
  listOrgUsers,
  updateOrgUser,
  removeOrgUser,
  createInvitation,
  listInvitations,
  cancelInvitation,
  savePendingCredential,
  fetchAdminFeedback,
  updateTenantNotes,
} from "@/lib/api";
import type { OdooConfigItem, OdooConfigSummary, OrgUser, Invitation, UserRole, FeedbackReport } from "@/lib/types";

// ---- CollapsibleCard ----

interface CollapsibleCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Extra content rendered below the title row, inside the header area (always visible) */
  subheader?: React.ReactNode;
}

function CollapsibleCard({ icon, title, defaultOpen = false, children, subheader }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-subheading">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="shrink-0 text-text-muted"
        >
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.div>
      </button>

      {subheader && open && (
        <div className="px-6 pb-3 -mt-2">
          {subheader}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Org Section ----

function OrgSection() {
  const t = useTranslations("Settings");
  const { meData, reload } = useSession();
  const org = meData?.org;
  const subscription = meData?.subscription;
  const slots = meData?.slots_used;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError(null);
    const result = await updateOrg(org.id, { name });
    if (result.success) {
      await reload();
      setEditing(false);
    } else {
      setError(result.error ?? t("admin.saveError"));
    }
    setSaving(false);
  }

  if (!org) return null;

  return (
    <CollapsibleCard icon={<Building2 size={20} strokeWidth={1.5} className="text-accent" />} title={t("admin.orgTitle")}>
      {!editing ? (
        <div className="space-y-3">
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">{t("admin.orgName")}</span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">{t("admin.orgSlug")}</span>
            <span className="font-technical text-text-muted">{org.slug}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">{t("admin.orgType")}</span>
            <span>{org.type}</span>
          </div>
          {subscription && (
            <>
              <div className="flex justify-between text-body">
                <span className="text-text-secondary">{t("admin.tier")}</span>
                <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent">
                  {subscription.tier}
                </span>
              </div>
              <div className="flex justify-between text-body">
                <span className="text-text-secondary">{t("admin.slots")}</span>
                <span>
                  {t("admin.slotsValue", {
                    paid: slots?.paid ?? 0,
                    paidLimit: subscription.paid_slots_limit,
                    free: slots?.free ?? 0,
                    freeLimit: subscription.free_slots_limit,
                  })}
                </span>
              </div>
            </>
          )}
          <button
            onClick={() => { setEditing(true); setName(org.name); }}
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-body hover:bg-raised transition-colors"
          >
            {t("admin.edit")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">{t("admin.orgName")}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          {error && <p className="text-small text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-body text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
              {t("admin.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-body hover:bg-raised transition-colors"
            >
              {t("admin.cancel")}
            </button>
          </div>
        </form>
      )}
    </CollapsibleCard>
  );
}

// ---- Odoo Configs Section ----

function OdooConfigsSection() {
  const t = useTranslations("Settings");

  return (
    <CollapsibleCard icon={<Plug size={20} strokeWidth={1.5} className="text-accent" />} title={t("admin.odooConfigsTitle")}>
      <ConnectionForm />
    </CollapsibleCard>
  );
}

// ---- Saved Configs Section ----

function SavedConfigsSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;

  const [configs, setConfigs] = useState<OdooConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    listOdooConfigs(orgId).then((r) => {
      if (r.success) setConfigs(r.configs ?? []);
      setLoading(false);
    });
  }, [orgId]);

  async function handleDelete(id: string) {
    if (!orgId) return;
    setDeletingId(id);
    await deleteOdooConfig(orgId, id);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  return (
    <CollapsibleCard icon={<Database size={20} strokeWidth={1.5} className="text-accent" />} title={t("admin.savedConfigs")}>
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-text-secondary" />
        </div>
      ) : configs.length === 0 ? (
        <p className="text-body text-text-secondary">{t("admin.noConfigs")}</p>
      ) : (
        <div className="space-y-2">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-body"
            >
              <div>
                <p className="font-medium">{cfg.label}</p>
                <p className="text-small text-text-muted font-technical">{cfg.url} · {cfg.db_name}</p>
              </div>
              {confirmDeleteId === cfg.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-small text-error">{t("admin.confirmDelete")}</span>
                  <button
                    onClick={() => handleDelete(cfg.id)}
                    disabled={deletingId === cfg.id}
                    className="rounded-md px-2 py-1 text-small bg-error text-white hover:opacity-90"
                  >
                    {deletingId === cfg.id ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" /> : t("admin.yes")}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-md px-2 py-1 text-small border border-border hover:bg-raised"
                  >
                    {t("admin.no")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(cfg.id)}
                  className="rounded-md p-1.5 text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                  title={t("admin.delete")}
                  aria-label={t("admin.delete")}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

// ---- Users Section (ADMIN) ----

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "CLIENT_USER"];

function UsersSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;
  const myUserId = meData?.user?.id;
  const subscription = meData?.subscription;
  const configs = (meData?.odoo_configs ?? []) as OdooConfigSummary[];

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [credentialsUser, setCredentialsUser] = useState<OrgUser | null>(null);
  const [freeToggleError, setFreeToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    listOrgUsers(orgId).then((r) => {
      if (r.success) setUsers(r.users ?? []);
      setLoading(false);
    });
  }, [orgId]);

  async function handleRoleChange(userId: string, role: UserRole) {
    if (!orgId) return;
    await updateOrgUser(orgId, userId, { role });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
  }

  async function handleFreeToggle(userId: string, is_free_license: boolean) {
    if (!orgId) return;
    setFreeToggleError(null);
    const result = await updateOrgUser(orgId, userId, { is_free_license });
    if (result.success) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_free_license } : u));
    } else {
      // 409 from backend — show the error message inline
      const msg = is_free_license
        ? t("admin.paidToFreeError")
        : t("admin.freeTooPaidError");
      setFreeToggleError(msg);
      setTimeout(() => setFreeToggleError(null), 6000);
    }
  }

  async function handleRemove(userId: string) {
    if (!orgId) return;
    await removeOrgUser(orgId, userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirmRemoveId(null);
  }

  // Compute seat counts from the loaded users list
  const paidUsed = users.filter((u) => !u.is_free_license).length;
  const freeUsed = users.filter((u) => u.is_free_license).length;
  const paidLimit = subscription?.paid_slots_limit ?? 0;
  const freeLimit = subscription?.free_slots_limit ?? 0;

  const seatsWidget = subscription ? (
    <div className="inline-flex items-center gap-3 rounded-md bg-raised px-3 py-1.5 text-small">
      <span className="text-text-secondary font-medium">{t("admin.seatsWidget")}</span>
      <span className={`font-technical ${paidUsed >= paidLimit ? "text-error" : "text-foreground"}`}>
        {t("admin.seatsPaid")}: {paidUsed}/{paidLimit}
      </span>
      <span className="text-border">·</span>
      <span className={`font-technical ${freeUsed >= freeLimit ? "text-warning-solid" : "text-foreground"}`}>
        {t("admin.seatsFree")}: {freeUsed}/{freeLimit}
      </span>
    </div>
  ) : undefined;

  return (
    <>
      <CollapsibleCard
        icon={<Users size={20} strokeWidth={1.5} className="text-accent" />}
        title={t("admin.usersTitle")}
        subheader={seatsWidget}
      >
        {/* Free/Paid toggle error banner */}
        {freeToggleError && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-error-subtle px-3 py-2.5 text-small text-rose-700 dark:text-rose-300">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>{freeToggleError}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-text-secondary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-body text-text-secondary">{t("admin.noUsers")}</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3 text-body sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Role selector — disabled for own account */}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={user.id === myUserId}
                    className="hidden rounded-md border border-border bg-surface px-2 py-1 text-small font-technical focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  {/* Feedback toggle */}
                  <button
                    onClick={async () => {
                      if (!orgId) return;
                      await updateOrgUser(orgId, user.id, { allow_feedback: !user.allow_feedback });
                      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, allow_feedback: !u.allow_feedback } : u));
                    }}
                    className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
                      user.allow_feedback
                        ? "bg-warning-subtle text-warning-solid"
                        : "bg-raised text-text-secondary"
                    }`}
                    title="Toggle feedback"
                  >
                    {user.allow_feedback ? t("admin.feedback") : t("admin.noFeedback")}
                  </button>

                  {/* Free/Paid toggle */}
                  <button
                    onClick={() => handleFreeToggle(user.id, !user.is_free_license)}
                    className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
                      user.is_free_license
                        ? "bg-raised text-text-secondary"
                        : "bg-accent-subtle text-accent"
                    }`}
                    title={t("admin.toggleFree")}
                  >
                    {user.is_free_license ? t("admin.free") : t("admin.paid")}
                  </button>

                  {/* Credentials button */}
                  {orgId && (
                    <button
                      onClick={() => setCredentialsUser(user)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-micro text-text-secondary hover:text-accent hover:border-accent/40 hover:bg-accent-subtle transition-colors"
                      title={t("admin.manageCredentials")}
                    >
                      <KeyRound size={13} strokeWidth={1.5} />
                      {t("admin.credentials")}
                    </button>
                  )}

                  {/* Remove */}
                  {user.id !== myUserId && confirmRemoveId === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={14} strokeWidth={1.5} className="text-error" />
                      <button
                        onClick={() => handleRemove(user.id)}
                        className="rounded-md px-2 py-1 text-small bg-error text-white hover:opacity-90"
                      >
                        {t("admin.yes")}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="rounded-md px-2 py-1 text-small border border-border hover:bg-raised"
                      >
                        {t("admin.no")}
                      </button>
                    </div>
                  ) : user.id !== myUserId ? (
                    <button
                      onClick={() => setConfirmRemoveId(user.id)}
                      className="rounded-md p-1.5 text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                      aria-label={t("admin.removeUser")}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Credentials modal */}
      {credentialsUser && orgId && (
        <AdminUserCredentialsModal
          user={credentialsUser}
          orgId={orgId}
          configs={configs}
          onClose={() => setCredentialsUser(null)}
        />
      )}
    </>
  );
}

// ---- Invite Form Section ----

function InviteFormSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;
  const configs = (meData?.odoo_configs ?? []) as OdooConfigSummary[];

  const [email, setEmail] = useState("");
  const role: UserRole = "CLIENT_USER";
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Pre-load credential fields (CLIENT_USER only)
  // If org has 1 config: credConfigId is fixed; if 2+ configs: starts empty (required)
  const [credConfigId, setCredConfigId] = useState<string>(configs.length === 1 ? (configs[0]?.id ?? "") : "");
  const [credUsername, setCredUsername] = useState("");
  const [credApiKey, setCredApiKey] = useState("");
  const [showCredKey, setShowCredKey] = useState(false);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    // For CLIENT_USER with multiple configs, instance selection is required
    if (role === "CLIENT_USER" && configs.length > 1 && !credConfigId) {
      setInviteError(t("admin.preloadInstanceRequired"));
      return;
    }
    setSubmitting(true);
    setInviteError(null);
    setInviteLink(null);
    const result = await createInvitation(orgId, email, role);
    if (result.success && result.invitation) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${baseUrl}/invite?token=${result.invitation.token}`);
      // Pre-load credential for CLIENT_USER if credential fields were filled
      if (credUsername.trim() && credApiKey.trim() && credConfigId) {
        await savePendingCredential(orgId, result.invitation.id, credConfigId, {
          odoo_username: credUsername.trim(),
          odoo_api_key: credApiKey.trim(),
        });
      }
      setEmail("");
      setCredUsername("");
      setCredApiKey("");
      setCredConfigId(configs.length === 1 ? (configs[0]?.id ?? "") : "");
    } else {
      setInviteError(result.seatLimitReached ? t("admin.inviteSeatLimitReached") : (result.error ?? t("admin.inviteError")));
    }
    setSubmitting(false);
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <CollapsibleCard icon={<UserPlus size={20} strokeWidth={1.5} className="text-accent" />} title={t("admin.invitationsTitle")}>
      {/* Invite error banner */}
      {inviteError && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-error-subtle px-3 py-2.5 text-small text-rose-700 dark:text-rose-300">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>{inviteError}</span>
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("admin.inviteEmail")}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-body text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> : t("admin.invite")}
          </button>
        </div>

        {/* Required instance selection for CLIENT_USER with multiple configs */}
        {configs.length > 1 && (
          <div className="rounded-md border border-border bg-raised/30 p-3 space-y-2">
            <p className="text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("admin.preloadInstance")} <span className="text-error">*</span>
            </p>
            <select
              value={credConfigId}
              onChange={(e) => setCredConfigId(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-small font-technical outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">{t("adminCredentials.selectInstance")}</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>{c.label || c.url}</option>
              ))}
            </select>
          </div>
        )}

        {/* Optional credential pre-load */}
        {configs.length > 0 && (
          <div className="rounded-md border border-border bg-raised/30 p-3 space-y-2">
            <p className="text-micro font-medium text-text-secondary uppercase tracking-wide">
              {t("admin.preloadCredentials")}
            </p>
            <input
              type="text"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              placeholder={t("admin.preloadUsername")}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-small font-technical outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <div className="relative">
              <input
                type={showCredKey ? "text" : "password"}
                value={credApiKey}
                onChange={(e) => setCredApiKey(e.target.value)}
                placeholder={t("admin.preloadApiKey")}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-9 text-small font-technical outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setShowCredKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors"
                aria-label={showCredKey ? t("adminCredentials.hideKey") : t("adminCredentials.showKey")}
              >
                {showCredKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        )}

        {/* Generated link */}
        {inviteLink && (
          <div className="flex items-center gap-2 rounded-md bg-raised px-3 py-2">
            <p className="flex-1 truncate text-small font-technical text-text-muted dark:text-text-secondary">{inviteLink}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md p-1 hover:bg-border transition-colors"
              aria-label={copied ? t("admin.copied") : t("admin.copy")}
            >
              {copied ? <Check size={14} strokeWidth={1.5} className="text-success-solid" /> : <Copy size={14} strokeWidth={1.5} />}
            </button>
          </div>
        )}
      </form>
    </CollapsibleCard>
  );
}

// ---- Sent Invitations Section ----

function SentInvitationsSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;
  const configs = (meData?.odoo_configs ?? []) as OdooConfigSummary[];

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [credentialsInvitation, setCredentialsInvitation] = useState<Invitation | null>(null);
  const [invFilter, setInvFilter] = useState<"pending" | "accepted" | "all">("pending");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function toggleLinkExpanded(token: string) {
    setExpandedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  function handleCopyInvLink(token: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${baseUrl}/invite?token=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  useEffect(() => {
    if (!orgId) return;
    setLoadingList(true);
    listInvitations(orgId).then((r) => {
      if (r.success) setInvitations(r.invitations ?? []);
      setLoadingList(false);
    });
  }, [orgId]);

  async function handleCancelInvitation(invId: string) {
    if (!orgId) return;
    setCancellingId(invId);
    setCancelError(null);
    const result = await cancelInvitation(orgId, invId);
    if (result.success) {
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } else {
      setCancelError(result.error ?? t("admin.cancelInvitationError"));
      setTimeout(() => setCancelError(null), 5000);
    }
    setCancellingId(null);
    setConfirmCancelId(null);
  }

  return (
    <CollapsibleCard icon={<Send size={20} strokeWidth={1.5} className="text-accent" />} title={t("admin.pendingInvitations")}>
      {/* Cancel error banner */}
      {cancelError && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-error-subtle px-3 py-2.5 text-small text-error">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setInvFilter("pending")}
          className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
            invFilter === "pending" ? "bg-warning-subtle text-warning-solid" : "bg-raised text-text-secondary"
          }`}
        >
          {t("admin.filterPending")}
        </button>
        <button
          onClick={() => setInvFilter("accepted")}
          className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
            invFilter === "accepted" ? "bg-success-subtle text-success-solid" : "bg-raised text-text-secondary"
          }`}
        >
          {t("admin.filterAccepted")}
        </button>
        <button
          onClick={() => setInvFilter("all")}
          className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
            invFilter === "all" ? "bg-accent-subtle text-accent" : "bg-raised text-text-secondary"
          }`}
        >
          {t("admin.filterAll")}
        </button>
      </div>

      {loadingList ? (
        <div className="flex justify-center py-2">
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-secondary" />
        </div>
      ) : invitations.length === 0 ? (
        <p className="text-body text-text-secondary">{t("admin.noInvitations")}</p>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            const isPending = !inv.accepted_at && !expired;
            const isAccepted = !!inv.accepted_at;
            if (invFilter === "pending" && !isPending) return null;
            if (invFilter === "accepted" && !isAccepted) return null;
            const isExpanded = expandedTokens.has(inv.token);
            const invLink = `${typeof window !== "undefined" ? window.location.origin : ""}/invite?token=${inv.token}`;
            return (
              <div
                key={inv.id ?? inv.token}
                className="rounded-md border border-border text-body overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="font-medium">{inv.email}</p>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => setCredentialsInvitation(inv)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-small text-text-secondary hover:bg-raised transition-colors"
                        aria-label={t("admin.credentials")}
                      >
                        <KeyRound size={13} strokeWidth={1.5} />
                        {t("admin.credentials")}
                      </button>
                    )}
                    {inv.accepted_at ? (
                      <span className="text-small text-success-solid">{t("admin.accepted")}</span>
                    ) : expired ? (
                      <span className="text-small text-error">{t("admin.expired")}</span>
                    ) : (
                      <span className="text-small text-warning-solid">{t("admin.pending")}</span>
                    )}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => toggleLinkExpanded(inv.token)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-small text-text-secondary hover:bg-raised transition-colors"
                      >
                        {isExpanded ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                        {t("admin.showLink")}
                      </button>
                    )}
                    {/* Cancel invitation */}
                    {isPending && (
                      confirmCancelId === inv.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-small text-error">{t("admin.confirmCancelInvitation")}</span>
                          <button
                            type="button"
                            onClick={() => handleCancelInvitation(inv.id)}
                            disabled={cancellingId === inv.id}
                            className="rounded-md px-2 py-1 text-small bg-error text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {cancellingId === inv.id
                              ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                              : t("admin.yes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="rounded-md px-2 py-1 text-small border border-border hover:bg-raised"
                          >
                            {t("admin.no")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(inv.id)}
                          className="rounded-md p-1.5 text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                          aria-label={t("admin.cancelInvitation")}
                        >
                          <X size={13} strokeWidth={1.5} />
                        </button>
                      )
                    )}
                  </div>
                </div>
                {isPending && isExpanded && (
                  <div className="flex items-center gap-2 border-t border-border bg-raised px-3 py-2">
                    <p className="flex-1 truncate text-small font-technical text-text-muted dark:text-text-secondary">{invLink}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyInvLink(inv.token)}
                      className="shrink-0 rounded-md p-1 hover:bg-border transition-colors"
                      aria-label={copiedToken === inv.token ? t("admin.copied") : t("admin.copy")}
                    >
                      {copiedToken === inv.token
                        ? <Check size={14} strokeWidth={1.5} className="text-success-solid" />
                        : <Copy size={14} strokeWidth={1.5} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invitation credentials modal */}
      {credentialsInvitation && orgId && (
        <AdminInvitationCredentialsModal
          invitation={credentialsInvitation}
          orgId={orgId}
          configs={configs}
          onClose={() => setCredentialsInvitation(null)}
        />
      )}
    </CollapsibleCard>
  );
}

// ---- Feedback Section (ADMIN) ----

const CATEGORY_LABELS: Record<string, string> = {
  wrong_answer: "Respuesta incorrecta",
  crash: "Fallo del agente",
  misunderstood: "No entendió",
  other: "Otro",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-accent-subtle text-accent",
  reviewed: "bg-accent-subtle text-accent",
  test_alpha: "bg-accent-subtle text-accent",
  test_beta: "bg-accent-subtle text-accent",
  resolved: "bg-success-subtle text-success-solid",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reviewed: "Revisado",
  test_alpha: "Alpha",
  test_beta: "Beta",
  resolved: "Resuelto",
};

type FeedbackTab = "data" | "messages" | "note";

function FeedbackReportRow({ r }: { r: FeedbackReport }) {
  const t = useTranslations("Settings");
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedbackTab>("data");

  // Note tab state
  const [noteText, setNoteText] = useState(r.tenant_notes ?? "");
  const [editing, setEditing] = useState(!r.tenant_notes);
  const [saving, setSaving] = useState(false);
  const [savedModal, setSavedModal] = useState(false);

  async function handleSaveNote() {
    setSaving(true);
    await updateTenantNotes(r.thread_id, r.id, noteText.trim() || null);
    setSaving(false);
    setEditing(false);
    setSavedModal(true);
    setTimeout(() => setSavedModal(false), 3000);
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Row header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-raised/80 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-small font-medium ${STATUS_COLOR[r.status] ?? "bg-accent-subtle text-accent"}`}>
            {STATUS_LABELS[r.status] ?? r.status}
          </span>
          <span className="truncate text-small text-text-secondary">
            {r.user_comment ?? r.user_query ?? "—"}
          </span>
        </div>
        <div className="shrink-0 ml-2 text-text-muted">
          {expanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["data", "messages", "note"] as FeedbackTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-center text-small font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                {t(`feedback.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
              </button>
            ))}
          </div>

          {/* Tab: DATA */}
          {activeTab === "data" && (
            <div className="px-4 py-3 space-y-3">
              {r.category && (
                <div>
                  <span className="rounded-md bg-surface border border-border px-2 py-0.5 text-small text-text-secondary">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                </div>
              )}
              {r.user_comment && (
                <div>
                  <p className="text-small text-foreground">{r.user_comment}</p>
                </div>
              )}
              {r.expected_response && (
                <div>
                  <p className="text-micro text-text-secondary mb-0.5">{t("feedback.expectedResponse")}</p>
                  <p className="text-small text-foreground">{r.expected_response}</p>
                </div>
              )}
              {r.admin_notes && (
                <div>
                  <p className="text-micro text-text-secondary mb-0.5">{t("feedback.adminNotes")}</p>
                  <p className="text-small text-foreground">{r.admin_notes}</p>
                </div>
              )}
              <p className="text-micro text-text-secondary pt-1">
                {new Date(r.reported_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Tab: MESSAGES */}
          {activeTab === "messages" && (
            <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
              {r.last_messages && r.last_messages.length > 0 ? (
                r.last_messages.map((msg, i) => (
                  <div
                    key={msg.id ?? i}
                    className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-md px-3 py-2 text-small ${
                        msg.role === "human"
                          ? "bg-accent-subtle text-foreground"
                          : "bg-surface border border-border text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-small text-text-muted">{t("feedback.noMessages")}</p>
              )}
            </div>
          )}

          {/* Tab: NOTE */}
          {activeTab === "note" && (
            <div className="px-4 py-3 space-y-3">
              {!editing && noteText ? (
                <>
                  <p className="text-small text-foreground whitespace-pre-wrap">{noteText}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-border px-3 py-1.5 text-small text-text-secondary hover:bg-raised transition-colors"
                  >
                    {t("feedback.noteEdit")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-micro text-text-secondary">{t("feedback.noteHint")}</p>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={4}
                    placeholder={t("feedback.notePlaceholder")}
                    className="w-full rounded-md border border-border bg-base px-3 py-2 text-small text-foreground placeholder:text-text-secondary focus:border-accent focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    {r.tenant_notes && (
                      <button
                        onClick={() => { setNoteText(r.tenant_notes ?? ""); setEditing(false); }}
                        className="rounded-md border border-border px-3 py-1.5 text-small text-text-secondary hover:bg-raised transition-colors"
                      >
                        {t("feedback.noteCancel")}
                      </button>
                    )}
                    <button
                      onClick={handleSaveNote}
                      disabled={saving || !noteText.trim()}
                      className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-small font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                      {saving && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
                      {t("feedback.noteSave")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success modal */}
      <AnimatePresence>
        {savedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSavedModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full max-w-sm rounded-lg border border-border bg-surface shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-subheading">{t("feedback.noteSavedTitle")}</p>
                <button
                  onClick={() => setSavedModal(false)}
                  className="rounded-md p-1 text-text-muted hover:bg-raised hover:text-foreground transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                <CheckCircle2 size={32} strokeWidth={1.5} className="text-success-solid" />
                <p className="text-body text-foreground">{t("feedback.noteSavedBody")}</p>
              </div>
              <div className="flex justify-center border-t border-border px-5 py-4">
                <button
                  onClick={() => setSavedModal(false)}
                  className="rounded-md bg-accent px-5 py-2 text-small font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;

  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetchAdminFeedback({ limit: 50 }).then((r) => {
      if (r.success && r.data) setReports(r.data.reports);
      setLoading(false);
    });
  }, [orgId]);

  return (
    <CollapsibleCard icon={<Flag size={20} strokeWidth={1.5} className="text-accent" />} title={t("feedback.title")}>
      {loading ? (
        <div className="flex items-center gap-2 text-body text-text-secondary">
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          {t("feedback.loading")}
        </div>
      ) : reports.length === 0 ? (
        <p className="text-body text-text-muted">{t("feedback.empty")}</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <FeedbackReportRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

// ---- Main Settings Page ----

type SettingsTab = "org" | "instances" | "users" | "feedback";

const TAB_CONFIG: { id: SettingsTab; icon: React.ReactNode; labelKey: string }[] = [
  { id: "org",       icon: <Building2 size={16} strokeWidth={1.5} />, labelKey: "tabOrg" },
  { id: "instances", icon: <Database  size={16} strokeWidth={1.5} />, labelKey: "tabInstances" },
  { id: "users",     icon: <Users     size={16} strokeWidth={1.5} />, labelKey: "tabUsers" },
  { id: "feedback",  icon: <Flag      size={16} strokeWidth={1.5} />, labelKey: "tabFeedback" },
];

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const role = meData?.user?.role;

  const roleUpper = role?.toUpperCase();
  const isAdmin = roleUpper === "ADMIN";
  const isClientUser = roleUpper === "CLIENT_USER";
  const hasOrg = !!meData?.org;
  const isPartner = meData?.org?.type === "PARTNER";
  const isSolitary = meData?.org?.type === "SOLITARY";

  const [activeTab, setActiveTab] = useState<SettingsTab>("org");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">

        {/* Header — centrado */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-subtle shrink-0">
              <Settings size={20} strokeWidth={1.5} className="text-accent" />
            </div>
            <h1 className="text-display">{t("heading")}</h1>
          </div>
        </motion.div>

        {/* Tab selector — ADMIN only */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
            className="mb-8 flex justify-center"
          >
            <div className="inline-flex items-center gap-1 rounded-lg bg-raised p-1">
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-small font-medium transition-colors duration-150 ${
                      isActive
                        ? "text-foreground"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-tab-pill"
                        className="absolute inset-0 rounded-md bg-surface shadow-sm border border-border"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      {tab.icon}
                      {t(tab.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {/* ---- TAB: Organización ---- */}
            {(activeTab === "org" || !isAdmin) && (
              <>
                {hasOrg && isAdmin && <OrgSection />}
                {isClientUser && hasOrg && <UserCredentialsSection />}
              </>
            )}

            {/* ---- TAB: Instancias ---- */}
            {activeTab === "instances" && isAdmin && (
              <>
                {isPartner && <OdooConfigsSection />}
                <SavedConfigsSection />
                <CollapsibleCard icon={<BookSearch size={20} strokeWidth={1.5} className="text-accent" />} title={t("inspector.heading")}>
                  <InstanceInspector />
                </CollapsibleCard>
                <CollapsibleCard icon={<Shield size={20} strokeWidth={1.5} className="text-accent" />} title={t("security.title")}>
                  <p className="text-body text-text-secondary">{t("security.description")}</p>
                </CollapsibleCard>
              </>
            )}

            {/* ---- TAB: Usuarios ---- */}
            {activeTab === "users" && isAdmin && (
              isSolitary ? (
                <div className="rounded-lg border border-border bg-surface p-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-subtle">
                    <Zap size={24} strokeWidth={1.5} className="text-accent" />
                  </div>
                  <h3 className="mb-2 text-subheading font-medium text-heading">{t("admin.solitaryBannerTitle")}</h3>
                  <p className="mb-6 text-body text-text-secondary">{t("admin.solitaryBannerBody")}</p>
                  <a
                    href="mailto:info@odooagent.com"
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-body font-medium text-white hover:bg-accent-hover transition-colors"
                  >
                    {t("admin.solitaryBannerCta")}
                  </a>
                </div>
              ) : (
                <>
                  {hasOrg && <UsersSection />}
                  {hasOrg && <InviteFormSection />}
                  {hasOrg && <SentInvitationsSection />}
                </>
              )
            )}

            {/* ---- TAB: Feedback ---- */}
            {activeTab === "feedback" && isAdmin && (
              <>
                {hasOrg && <FeedbackSection />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
