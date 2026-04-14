"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSession } from "@/hooks/use-session";
import { useAuth } from "@/hooks/use-auth";
import { routing } from "@/i18n/routing";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Eye,
  X,
  Sun,
  Moon,
  Globe,
  LogOut,
} from "lucide-react";
import {
  superadminListOrgs,
  superadminListUsers,
  superadminGetOrg,
  superadminSuspendOrg,
  superadminActivateOrg,
  superadminUpdateSubscription,
  superadminSuspendUser,
  superadminActivateUser,
  superadminUpdateUser,
  type UpdateOrgSubscriptionPayload,
} from "@/lib/api";
import type {
  SuperAdminOrg,
  SuperAdminUser,
  SuperAdminOrgDetail,
  UserRole,
} from "@/lib/types";

type Tab = "orgs" | "users" | "activity";

const TIER_OPTIONS = [
  "FREE",
  "STARTER",
  "GROWTH",
  "BUSINESS",
  "ENTERPRISE",
  "CUSTOM",
];

const ROLE_OPTIONS: UserRole[] = ["CLIENT_USER", "ADMIN"];

// ---- Shared helpers ----

function Badge({
  active,
  labelTrue,
  labelFalse,
}: {
  active: boolean;
  labelTrue: string;
  labelFalse: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-small font-medium ${
        active
          ? "bg-success-subtle text-success-solid"
          : "bg-error-subtle text-error"
      }`}
    >
      {active ? (
        <CheckCircle2 size={12} strokeWidth={1.5} />
      ) : (
        <XCircle size={12} strokeWidth={1.5} />
      )}
      {active ? labelTrue : labelFalse}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, string> = {
    SUPERADMIN: "bg-accent-subtle text-accent font-bold",
    ADMIN: "bg-raised text-text-secondary",
    CLIENT_USER: "bg-surface text-text-muted",
  };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-small ${colors[role]}`}
    >
      {role}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-block rounded-md bg-accent-subtle px-2 py-0.5 text-small font-medium text-accent">
      {tier}
    </span>
  );
}

function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-body shadow-lg ${
        type === "success"
          ? "bg-success-subtle text-success-solid"
          : "bg-error-subtle text-error"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 size={16} strokeWidth={1.5} />
      ) : (
        <AlertTriangle size={16} strokeWidth={1.5} />
      )}
      {msg}
      <button onClick={onClose} className="ml-2" aria-label="Cerrar">
        <X size={14} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}

// ---- Edit Subscription Modal ----

function EditSubscriptionModal({
  org,
  onClose,
  onSave,
  t,
}: {
  org: SuperAdminOrg;
  onClose: () => void;
  onSave: (payload: UpdateOrgSubscriptionPayload) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [tier, setTier] = useState(org.subscription.tier);
  const [paidSlots, setPaidSlots] = useState(org.subscription.paid_slots_limit);
  const [freeSlots, setFreeSlots] = useState(org.subscription.free_slots_limit);
  const [watermark, setWatermark] = useState(org.subscription.show_watermark);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ tier, paid_slots_limit: paidSlots, free_slots_limit: freeSlots, show_watermark: watermark });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-subheading font-medium text-heading">
            {t("orgs.editModalTitle")} — {org.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-raised"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-small text-text-secondary">
              {t("orgs.editTier")}
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-md border border-sidebar-border bg-base px-3 py-2 text-body text-foreground"
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-small text-text-secondary">
                {t("orgs.editPaidSlots")}
              </label>
              <input
                type="number"
                min={0}
                value={paidSlots}
                onChange={(e) => setPaidSlots(Number(e.target.value))}
                className="w-full rounded-md border border-sidebar-border bg-base px-3 py-2 text-body text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-small text-text-secondary">
                {t("orgs.editFreeSlots")}
              </label>
              <input
                type="number"
                min={0}
                value={freeSlots}
                onChange={(e) => setFreeSlots(Number(e.target.value))}
                className="w-full rounded-md border border-sidebar-border bg-base px-3 py-2 text-body text-foreground"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="rounded"
            />
            <span className="text-body text-foreground">
              {t("orgs.editWatermark")}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-body text-text-secondary hover:bg-raised"
          >
            {t("orgs.editCancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
            {t("orgs.editSave")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Org Detail Modal ----

function OrgDetailModal({
  orgId,
  onClose,
  t,
}: {
  orgId: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [org, setOrg] = useState<SuperAdminOrgDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminGetOrg(orgId).then((r) => {
      if (r.success && r.org) setOrg(r.org);
      setLoading(false);
    });
  }, [orgId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-subheading font-medium text-heading">
            {t("orgs.detailTitle")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-raised"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-accent" />
          </div>
        ) : org ? (
          <div className="space-y-3 text-body text-foreground">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-raised p-3">
              <div className="text-text-secondary">Nombre</div>
              <div className="font-medium">{org.name}</div>
              <div className="text-text-secondary">Slug</div>
              <div>{org.slug}</div>
              <div className="text-text-secondary">Tipo</div>
              <div>{org.type}</div>
              <div className="text-text-secondary">Plan</div>
              <div>
                <TierBadge tier={org.subscription.tier} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-small font-medium text-text-secondary">
                {t("orgs.detailSlots")}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-raised p-3 text-small">
                <div className="text-text-secondary">{t("orgs.detailPaidUsed")}</div>
                <div>
                  {org.slots?.paid_used ?? "—"} / {org.subscription.paid_slots_limit}
                </div>
                <div className="text-text-secondary">{t("orgs.detailFreeUsed")}</div>
                <div>
                  {org.slots?.free_used ?? "—"} / {org.subscription.free_slots_limit}
                </div>
              </div>
            </div>

            {org.odoo_configs && org.odoo_configs.length > 0 && (
              <div>
                <p className="mb-1 text-small font-medium text-text-secondary">
                  {t("orgs.detailOdooConfigs")}
                </p>
                <ul className="space-y-1">
                  {org.odoo_configs.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md bg-raised px-3 py-2 text-small"
                    >
                      <span className="font-medium">{c.label}</span> —{" "}
                      <span className="text-text-secondary">{c.url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-body text-error">{t("errorLoad")}</p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-body text-text-secondary hover:bg-raised"
          >
            {t("orgs.detailClose")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Orgs Tab ----

function OrgsTab({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [orgs, setOrgs] = useState<SuperAdminOrg[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [editOrg, setEditOrg] = useState<SuperAdminOrg | null>(null);
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    orgId: string;
    orgName: string;
    action: "suspend" | "activate";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await superadminListOrgs();
    if (res.success && res.data) {
      setOrgs(res.data.orgs);
      setCount(res.data.count);
    } else {
      setError(res.error ?? t("errorLoad"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(org: SuperAdminOrg) {
    if (org.is_active) {
      setConfirmAction({ orgId: org.id, orgName: org.name, action: "suspend" });
    } else {
      setConfirmAction({ orgId: org.id, orgName: org.name, action: "activate" });
    }
  }

  async function executeToggle() {
    if (!confirmAction) return;
    const { orgId, action } = confirmAction;
    setConfirmAction(null);
    const res =
      action === "suspend"
        ? await superadminSuspendOrg(orgId)
        : await superadminActivateOrg(orgId);
    if (res.success) {
      setToast({
        msg: action === "suspend" ? t("orgs.suspendSuccess") : t("orgs.activateSuccess"),
        type: "success",
      });
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, is_active: action === "activate" } : o))
      );
    } else {
      setToast({ msg: res.error ?? t("orgs.actionError"), type: "error" });
    }
  }

  async function handleEditSave(payload: UpdateOrgSubscriptionPayload) {
    if (!editOrg) return;
    const res = await superadminUpdateSubscription(editOrg.id, payload);
    if (res.success) {
      setToast({ msg: t("orgs.editSuccess"), type: "success" });
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === editOrg.id
            ? {
                ...o,
                subscription: {
                  ...o.subscription,
                  tier: payload.tier ?? o.subscription.tier,
                  paid_slots_limit: payload.paid_slots_limit ?? o.subscription.paid_slots_limit,
                  free_slots_limit: payload.free_slots_limit ?? o.subscription.free_slots_limit,
                  show_watermark: payload.show_watermark ?? o.subscription.show_watermark,
                },
              }
            : o
        )
      );
      setEditOrg(null);
    } else {
      setToast({ msg: res.error ?? t("orgs.editError"), type: "error" });
    }
  }

  const active = orgs.filter((o) => o.is_active).length;
  const suspended = orgs.filter((o) => !o.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle size={28} strokeWidth={1.5} className="text-error" />
        <p className="text-body text-error">{error}</p>
        <button
          onClick={load}
          className="rounded-md bg-accent px-4 py-2 text-body text-white hover:bg-accent-hover"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl">
            <p className="mb-4 text-body text-foreground">
              {confirmAction.action === "suspend"
                ? t("orgs.confirmSuspend", { name: confirmAction.orgName })
                : t("orgs.confirmActivate", { name: confirmAction.orgName })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md px-4 py-2 text-body text-text-secondary hover:bg-raised"
              >
                No
              </button>
              <button
                onClick={executeToggle}
                className={`rounded-md px-4 py-2 text-body font-medium text-white ${
                  confirmAction.action === "suspend"
                    ? "bg-error hover:bg-error"
                    : "bg-accent hover:bg-accent-hover"
                }`}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}

      {editOrg && (
        <EditSubscriptionModal
          org={editOrg}
          onClose={() => setEditOrg(null)}
          onSave={handleEditSave}
          t={t}
        />
      )}

      {detailOrgId && (
        <OrgDetailModal
          orgId={detailOrgId}
          onClose={() => setDetailOrgId(null)}
          t={t}
        />
      )}

      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-4 text-small text-text-secondary">
        <span>
          {t("orgs.statsTotal")}: <strong className="text-foreground">{count}</strong>
        </span>
        <span>
          {t("orgs.statsActive")}: <strong className="text-success-solid">{active}</strong>
        </span>
        <span>
          {t("orgs.statsSuspended")}: <strong className="text-error">{suspended}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-sidebar-border">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-sidebar-border bg-raised text-small text-text-secondary">
              <th className="px-3 py-2 text-left">{t("orgs.colStatus")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colName")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colSlug")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colType")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colPlan")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colSlots")}</th>
              <th className="px-3 py-2 text-center">{t("orgs.colWatermark")}</th>
              <th className="px-3 py-2 text-center">{t("orgs.colUsers")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colCreated")}</th>
              <th className="px-3 py-2 text-left">{t("orgs.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr
                key={org.id}
                className="border-b border-sidebar-border last:border-0 hover:bg-raised"
              >
                <td className="px-3 py-2">
                  <Badge
                    active={org.is_active}
                    labelTrue={t("orgs.statusActive")}
                    labelFalse={t("orgs.statusSuspended")}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-foreground">{org.name}</td>
                <td className="px-3 py-2 font-technical text-text-secondary">{org.slug}</td>
                <td className="px-3 py-2 text-text-secondary">{org.type}</td>
                <td className="px-3 py-2">
                  <TierBadge tier={org.subscription.tier} />
                </td>
                <td className="px-3 py-2 font-technical text-text-secondary">
                  {org.subscription.paid_slots_limit}P / {org.subscription.free_slots_limit}F
                </td>
                <td className="px-3 py-2 text-center text-text-secondary">
                  {org.subscription.show_watermark ? "✓" : "—"}
                </td>
                <td className="px-3 py-2 text-center text-foreground">{org.user_count}</td>
                <td className="px-3 py-2 text-small text-text-secondary">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailOrgId(org.id)}
                      className="rounded-md p-1.5 hover:bg-raised"
                      aria-label={t("orgs.btnView")}
                      title={t("orgs.btnView")}
                    >
                      <Eye size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setEditOrg(org)}
                      className="rounded-md px-2 py-1 text-small text-accent hover:bg-accent-subtle"
                    >
                      {t("orgs.btnEdit")}
                    </button>
                    <button
                      onClick={() => handleToggle(org)}
                      className={`rounded-md px-2 py-1 text-small font-medium ${
                        org.is_active
                          ? "text-error hover:bg-error-subtle"
                          : "text-success-solid hover:bg-success-subtle"
                      }`}
                    >
                      {org.is_active ? t("orgs.btnSuspend") : t("orgs.btnActivate")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---- Users Tab ----

function UsersTab({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userEmail: string;
    action: "suspend" | "activate";
  } | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await superadminListUsers();
    if (res.success && res.data) {
      setUsers(res.data.users.filter((u) => u.role !== "SUPERADMIN"));
      setCount(res.data.count);
    } else {
      setError(res.error ?? t("errorLoad"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(user: SuperAdminUser) {
    if (user.is_active) {
      setConfirmAction({ userId: user.id, userEmail: user.email, action: "suspend" });
    } else {
      setConfirmAction({ userId: user.id, userEmail: user.email, action: "activate" });
    }
  }

  async function executeToggle() {
    if (!confirmAction) return;
    const { userId, action } = confirmAction;
    setConfirmAction(null);
    const res =
      action === "suspend"
        ? await superadminSuspendUser(userId)
        : await superadminActivateUser(userId);
    if (res.success) {
      setToast({
        msg: action === "suspend" ? t("users.suspendSuccess") : t("users.activateSuccess"),
        type: "success",
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: action === "activate" } : u))
      );
    } else {
      setToast({ msg: res.error ?? t("users.actionError"), type: "error" });
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setRoleDropdown(null);
    const res = await superadminUpdateUser(userId, { role });
    if (res.success) {
      setToast({ msg: t("users.updateSuccess"), type: "success" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } else {
      setToast({ msg: res.error ?? t("users.actionError"), type: "error" });
    }
  }

  async function handleToggleFree(user: SuperAdminUser) {
    const res = await superadminUpdateUser(user.id, { is_free_license: !user.is_free_license });
    if (res.success) {
      setToast({ msg: t("users.updateSuccess"), type: "success" });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_free_license: !u.is_free_license } : u))
      );
    } else {
      setToast({ msg: res.error ?? t("users.actionError"), type: "error" });
    }
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const noOrgCount = users.filter((u) => !u.org).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle size={28} strokeWidth={1.5} className="text-error" />
        <p className="text-body text-error">{error}</p>
        <button
          onClick={load}
          className="rounded-md bg-accent px-4 py-2 text-body text-white hover:bg-accent-hover"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl">
            <p className="mb-4 text-body text-foreground">
              {confirmAction.action === "suspend"
                ? t("users.confirmSuspend", { email: confirmAction.userEmail })
                : t("users.confirmActivate", { email: confirmAction.userEmail })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md px-4 py-2 text-body text-text-secondary hover:bg-raised"
              >
                No
              </button>
              <button
                onClick={executeToggle}
                className={`rounded-md px-4 py-2 text-body font-medium text-white ${
                  confirmAction.action === "suspend"
                    ? "bg-error hover:bg-error"
                    : "bg-accent hover:bg-accent-hover"
                }`}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-4 text-small text-text-secondary">
        <span>
          {t("users.statsTotal")}: <strong className="text-foreground">{count}</strong>
        </span>
        <span>
          {t("users.statsActive")}: <strong className="text-success-solid">{activeCount}</strong>
        </span>
        <span>
          {t("users.statsNoOrg")}: <strong className="text-foreground">{noOrgCount}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-sidebar-border">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-sidebar-border bg-raised text-small text-text-secondary">
              <th className="px-3 py-2 text-left">{t("users.colStatus")}</th>
              <th className="px-3 py-2 text-left">{t("users.colEmail")}</th>
              <th className="px-3 py-2 text-left">{t("users.colRole")}</th>
              <th className="px-3 py-2 text-center">{t("users.colFeedback")}</th>
              <th className="px-3 py-2 text-center">{t("users.colFree")}</th>
              <th className="px-3 py-2 text-left">{t("users.colOrg")}</th>
              <th className="px-3 py-2 text-left">{t("users.colCreated")}</th>
              <th className="px-3 py-2 text-left">{t("users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-sidebar-border last:border-0 hover:bg-raised"
              >
                <td className="px-3 py-2">
                  <Badge
                    active={user.is_active}
                    labelTrue={t("users.statusActive")}
                    labelFalse={t("users.statusSuspended")}
                  />
                </td>
                <td className="px-3 py-2 font-technical text-foreground">{user.email}</td>
                <td className="px-3 py-2">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setRoleDropdown((prev) => (prev === user.id ? null : user.id))
                      }
                      className="flex items-center gap-1 rounded-md hover:bg-raised"
                    >
                      <RoleBadge role={user.role} />
                      <ChevronDown size={12} strokeWidth={1.5} className="text-text-muted" />
                    </button>
                    {roleDropdown === user.id && (
                      <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-lg border border-sidebar-border bg-surface shadow-lg">
                        {ROLE_OPTIONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRoleDropdown(null);
                              handleRoleChange(user.id, r as UserRole);
                            }}
                            className={`block w-full px-3 py-2 text-left text-small hover:bg-raised ${
                              user.role === r ? "font-medium text-accent" : "text-foreground"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  {user.allow_feedback ? (
                    <CheckCircle2 size={16} strokeWidth={1.5} className="text-success-solid" />
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleToggleFree(user)}
                    className="text-text-secondary hover:text-accent"
                    title="Toggle free license"
                    aria-label="Toggle free license"
                  >
                    {user.is_free_license ? (
                      <CheckCircle2 size={16} strokeWidth={1.5} className="text-success-solid" />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2 text-text-secondary">
                  {user.org ? user.org.name : (
                    <span className="text-text-muted italic">{t("users.noOrg")}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-small text-text-secondary">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleToggle(user)}
                    className={`rounded-md px-2 py-1 text-small font-medium ${
                      user.is_active
                        ? "text-error hover:bg-error-subtle"
                        : "text-success-solid hover:bg-success-subtle"
                    }`}
                  >
                    {user.is_active ? t("users.btnSuspend") : t("users.btnActivate")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---- Activity Tab ----

function ActivityTab({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [orgs, setOrgs] = useState<SuperAdminOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminListOrgs().then((res) => {
      if (res.success && res.data) {
        const sorted = [...res.data.orgs].sort((a, b) => b.user_count - a.user_count);
        setOrgs(sorted);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-small text-text-secondary">{t("activity.subtitle")}</p>
      <div className="overflow-x-auto rounded-lg border border-sidebar-border">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-sidebar-border bg-raised text-small text-text-secondary">
              <th className="px-3 py-2 text-left">{t("activity.colName")}</th>
              <th className="px-3 py-2 text-center">{t("activity.colUsers")}</th>
              <th className="px-3 py-2 text-left">{t("activity.colPlan")}</th>
              <th className="px-3 py-2 text-left">{t("activity.colType")}</th>
              <th className="px-3 py-2 text-left">{t("activity.colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr
                key={org.id}
                className="border-b border-sidebar-border last:border-0 hover:bg-raised"
              >
                <td className="px-3 py-2 font-medium text-foreground">{org.name}</td>
                <td className="px-3 py-2 text-center text-foreground">{org.user_count}</td>
                <td className="px-3 py-2">
                  <TierBadge tier={org.subscription.tier} />
                </td>
                <td className="px-3 py-2 text-text-secondary">{org.type}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-small font-medium ${
                      org.is_active ? "text-success-solid" : "text-error"
                    }`}
                  >
                    {org.is_active ? "Activa" : "Suspendida"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Header Actions (theme / locale / logout) ----

function HeaderActions() {
  const tLocale = useTranslations("LocaleSwitcher");
  const { logout } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const localeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (localeRef.current && !localeRef.current.contains(e.target as Node)) {
        setLocaleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
    setLocaleOpen(false);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Theme */}
      <button
        onClick={toggleTheme}
        className="rounded-md p-2 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
        aria-label={isDark ? "Modo claro" : "Modo oscuro"}
      >
        {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
      </button>

      {/* Locale */}
      <div ref={localeRef} className="relative">
        <button
          onClick={() => setLocaleOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md p-2 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
          aria-label="Cambiar idioma"
        >
          <Globe size={18} strokeWidth={1.5} />
          <span className="text-small font-medium uppercase">{locale}</span>
        </button>
        {localeOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-sidebar-border bg-surface py-1 shadow-lg">
            {routing.locales.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`flex w-full items-center px-3 py-2 text-left text-body transition-colors hover:bg-raised ${
                  loc === locale ? "font-medium text-accent" : "text-foreground"
                }`}
              >
                {tLocale(loc)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="rounded-md p-2 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
        aria-label="Cerrar sesión"
      >
        <LogOut size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ---- Main Page ----

export default function SuperAdminPage() {
  const t = useTranslations("SuperAdmin");
  const { meData, isLoading } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("orgs");

  const isSuperAdmin = meData?.user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!isLoading && meData && !isSuperAdmin) {
      router.push("/");
    }
  }, [isLoading, meData, isSuperAdmin, router]);

  if (isLoading || !meData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "orgs", label: t("tabOrgs"), icon: <Building2 size={16} strokeWidth={1.5} /> },
    { key: "users", label: t("tabUsers"), icon: <Users size={16} strokeWidth={1.5} /> },
    { key: "activity", label: t("tabActivity"), icon: <Activity size={16} strokeWidth={1.5} /> },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-base">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border bg-surface px-6 py-3">
        <h1 className="text-heading font-semibold text-foreground">{t("title")}</h1>
        <HeaderActions />
      </div>

      {/* Tabs */}
      <div className="border-b border-sidebar-border bg-surface px-6">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-body transition-colors ${
                activeTab === tab.key
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {activeTab === "orgs" && <OrgsTab t={t} />}
          {activeTab === "users" && <UsersTab t={t} />}
          {activeTab === "activity" && <ActivityTab t={t} />}
        </motion.div>
      </div>
    </div>
  );
}
