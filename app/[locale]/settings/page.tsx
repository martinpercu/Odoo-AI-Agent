"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Building2,
  Plug,
  Users,
  Mail,
  Loader2,
  Trash2,
  UserCog,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { ConnectionForm } from "@/components/odoo/connection-form";
import { InstanceInspector } from "@/components/odoo/instance-inspector";
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
} from "@/lib/api";
import type { OdooConfigItem, OrgUser, Invitation, UserRole } from "@/lib/types";

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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={18} className="text-primary" />
        <h2 className="text-lg font-semibold">{t("admin.orgTitle")}</h2>
      </div>

      {!editing ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("admin.orgName")}</span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("admin.orgSlug")}</span>
            <span className="font-mono text-xs">{org.slug}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("admin.orgType")}</span>
            <span>{org.type}</span>
          </div>
          {subscription && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("admin.tier")}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {subscription.tier}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("admin.slots")}</span>
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
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            {t("admin.edit")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("admin.orgName")}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {t("admin.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {t("admin.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---- Odoo Configs Section ----

function OdooConfigsSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;

  const [configs, setConfigs] = useState<OdooConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Plug size={18} className="text-primary" />
        <h2 className="text-lg font-semibold">{t("admin.odooConfigsTitle")}</h2>
      </div>

      {/* Existing connection form for adding a new config */}
      <div className="mb-4">
        <ConnectionForm />
      </div>

      {/* List of existing configs */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.noConfigs")}</p>
      ) : (
        <div className="space-y-2 mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t("admin.savedConfigs")}
          </p>
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{cfg.label}</p>
                <p className="text-xs text-muted-foreground">{cfg.url} · {cfg.db_name}</p>
              </div>
              {confirmDeleteId === cfg.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{t("admin.confirmDelete")}</span>
                  <button
                    onClick={() => handleDelete(cfg.id)}
                    disabled={deletingId === cfg.id}
                    className="rounded px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                  >
                    {deletingId === cfg.id ? <Loader2 size={12} className="animate-spin" /> : t("admin.yes")}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded px-2 py-1 text-xs border border-border hover:bg-muted"
                  >
                    {t("admin.no")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(cfg.id)}
                  className="rounded p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t("admin.delete")}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Users Section ----

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "IMPLEMENTER", "CLIENT_USER"];

function UsersSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;
  const myUserId = meData?.user?.id;

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
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
    await updateOrgUser(orgId, userId, { is_free_license });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_free_license } : u));
  }

  async function handleRemove(userId: string) {
    if (!orgId) return;
    await removeOrgUser(orgId, userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirmRemoveId(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-primary" />
        <h2 className="text-lg font-semibold">{t("admin.usersTitle")}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.noUsers")}</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.joined")}: {new Date(user.joined_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Role selector — disabled for own account */}
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  disabled={user.id === myUserId}
                  className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Free/Paid toggle */}
                <button
                  onClick={() => handleFreeToggle(user.id, !user.is_free_license)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    user.is_free_license
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                  title={t("admin.toggleFree")}
                >
                  {user.is_free_license ? t("admin.free") : t("admin.paid")}
                </button>

                {/* Remove — hidden for own account */}
                {user.id !== myUserId && confirmRemoveId === user.id ? (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-500" />
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="rounded px-2 py-1 text-xs bg-red-500 text-white"
                    >
                      {t("admin.yes")}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="rounded px-2 py-1 text-xs border border-border"
                    >
                      {t("admin.no")}
                    </button>
                  </div>
                ) : user.id !== myUserId ? (
                  <button
                    onClick={() => setConfirmRemoveId(user.id)}
                    className="rounded p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <UserCog size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Invitations Section ----

function InvitationsSection() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const orgId = meData?.org?.id;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENT_USER");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    listInvitations(orgId).then((r) => {
      if (r.success) setInvitations(r.invitations ?? []);
      setLoadingList(false);
    });
  }, [orgId]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSubmitting(true);
    setInviteError(null);
    setInviteLink(null);
    const result = await createInvitation(orgId, email, role);
    if (result.success && result.invitation) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${baseUrl}/invite?token=${result.invitation.token}`);
      setInvitations((prev) => [result.invitation!, ...prev]);
      setEmail("");
    } else {
      setInviteError(result.error ?? t("admin.inviteError"));
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Mail size={18} className="text-primary" />
        <h2 className="text-lg font-semibold">{t("admin.invitationsTitle")}</h2>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="mb-6 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("admin.inviteEmail")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(["ADMIN", "IMPLEMENTER", "CLIENT_USER"] as UserRole[]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : t("admin.invite")}
          </button>
        </div>
        {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}

        {/* Generated link */}
        {inviteLink && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <p className="flex-1 truncate text-xs font-mono text-muted-foreground">{inviteLink}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded p-1 hover:bg-border transition-colors"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </form>

      {/* Pending invitations list */}
      {loadingList ? (
        <div className="flex justify-center py-2">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.noInvitations")}</p>
      ) : (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t("admin.pendingInvitations")}
          </p>
          {invitations.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.role}</p>
                </div>
                <div className="text-right">
                  {inv.accepted_at ? (
                    <span className="text-xs text-green-600">{t("admin.accepted")}</span>
                  ) : expired ? (
                    <span className="text-xs text-red-500">{t("admin.expired")}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("admin.pending")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Main Settings Page ----

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const role = meData?.user?.role;

  const isAdmin = role === "ADMIN";
  const isAdminOrImplementer = role === "ADMIN" || role === "IMPLEMENTER";
  const hasOrg = !!meData?.org;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Settings size={24} className="text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground">{t("subheading")}</p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* Org info — ADMIN | IMPLEMENTER */}
          {hasOrg && isAdminOrImplementer && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <OrgSection />
            </motion.div>
          )}

          {/* Odoo Connections — ADMIN | IMPLEMENTER */}
          {isAdminOrImplementer ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <OdooConfigsSection />
            </motion.div>
          ) : (
            /* Standard connection form for non-admin users */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <ConnectionForm />
              </div>
            </motion.div>
          )}

          {/* Instance Inspector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">{t("inspector.heading")}</h2>
              <InstanceInspector />
            </div>
          </motion.div>

          {/* Users — ADMIN only */}
          {hasOrg && isAdmin && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <UsersSection />
            </motion.div>
          )}

          {/* Invitations — ADMIN | IMPLEMENTER */}
          {hasOrg && isAdminOrImplementer && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <InvitationsSection />
            </motion.div>
          )}

          {/* Security notice */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
              <Shield size={20} className="mt-0.5 shrink-0 text-primary" />
              <div className="text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">{t("security.title")}</p>
                <p>{t("security.description")}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
