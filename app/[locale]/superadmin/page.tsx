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
  ChevronUp,
  Eye,
  X,
  Sun,
  Moon,
  Globe,
  LogOut,
  Flag,
  Trash2,
  Save,
  BarChart2,
  ArrowLeft,
  Copy,
  EyeOff,
  Filter,
  MessageSquare,
} from "lucide-react";
import {
  superadminListOrgs,
  superadminListUsers,
  superadminGetOrg,
  superadminSuspendOrg,
  superadminActivateOrg,
  superadminUpdateSubscription,
  superadminUpdateOrgType,
  superadminSuspendUser,
  superadminActivateUser,
  superadminUpdateUser,
  fetchAdminFeedback,
  fetchFeedbackStats,
  fetchFeedbackReport,
  updateFeedbackReport,
  deleteFeedbackReport,
  type UpdateOrgSubscriptionPayload,
} from "@/lib/api";
import type {
  SuperAdminOrg,
  SuperAdminUser,
  SuperAdminOrgDetail,
  UserRole,
  OrgType,
  FeedbackReport,
  FeedbackStats,
  FeedbackStatus,
  FeedbackCategory,
} from "@/lib/types";

type Tab = "orgs" | "users" | "activity" | "feedback";

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

function TypeBadge({ type }: { type: OrgType }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-small font-medium ${
        type === "PARTNER"
          ? "bg-success-subtle text-success-solid"
          : "bg-raised text-text-secondary"
      }`}
    >
      {type}
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
              <div><TypeBadge type={org.type} /></div>
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
  const [confirmTypeAction, setConfirmTypeAction] = useState<{
    orgId: string;
    orgName: string;
    newType: OrgType;
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

  async function executeTypeToggle() {
    if (!confirmTypeAction) return;
    const { orgId, newType } = confirmTypeAction;
    setConfirmTypeAction(null);
    const res = await superadminUpdateOrgType(orgId, newType);
    if (res.success) {
      setToast({ msg: t("orgs.typeToggleSuccess"), type: "success" });
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, type: newType } : o))
      );
    } else {
      setToast({ msg: res.error ?? t("orgs.typeToggleError"), type: "error" });
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

      {/* Type toggle confirm dialog */}
      {confirmTypeAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl">
            <p className="mb-4 text-body text-foreground">
              {confirmTypeAction.newType === "PARTNER"
                ? t("orgs.typeToggleConfirmPartner", { name: confirmTypeAction.orgName })
                : t("orgs.typeToggleConfirmSolitary", { name: confirmTypeAction.orgName })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTypeAction(null)}
                className="rounded-md px-4 py-2 text-body text-text-secondary hover:bg-raised"
              >
                No
              </button>
              <button
                onClick={executeTypeToggle}
                className="rounded-md bg-accent px-4 py-2 text-body font-medium text-white hover:bg-accent-hover"
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
                <td className="px-3 py-2">
                  <TypeBadge type={org.type} />
                </td>
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
                      onClick={() =>
                        setConfirmTypeAction({
                          orgId: org.id,
                          orgName: org.name,
                          newType: org.type === "PARTNER" ? "SOLITARY" : "PARTNER",
                        })
                      }
                      className={`rounded-md px-2 py-1 text-small font-medium ${
                        org.type === "PARTNER"
                          ? "text-text-secondary hover:bg-raised"
                          : "text-success-solid hover:bg-success-subtle"
                      }`}
                      title={t("orgs.typeToggleTitle")}
                    >
                      {org.type === "PARTNER"
                        ? t("orgs.typeToggleToSolitary")
                        : t("orgs.typeToggleToPartner")}
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
                <td className="px-3 py-2">
                  <TypeBadge type={org.type} />
                </td>
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

// ---- Feedback Tab (SUPERADMIN) ----

const SA_STATUS_OPTIONS: FeedbackStatus[] = ["pending", "reviewed", "test_alpha", "test_beta", "resolved"];

const SA_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "Pendiente",
  reviewed: "Revisado",
  test_alpha: "Alpha",
  test_beta: "Beta",
  resolved: "Resuelto",
};

const SA_STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: "bg-raised text-text-secondary",
  reviewed: "bg-accent-subtle text-accent",
  test_alpha: "bg-warning-subtle text-warning-solid",
  test_beta: "bg-info-subtle text-info",
  resolved: "bg-success-subtle text-success-solid",
};

const SA_CATEGORY_LABELS: Record<string, string> = {
  wrong_answer: "Respuesta incorrecta",
  crash: "Fallo del agente",
  misunderstood: "No entendió",
  other: "Otro",
  none: "Sin categoría",
};

const SA_CATEGORY_COLORS: Record<string, string> = {
  wrong_answer: "bg-error-subtle text-error",
  crash: "bg-warning-subtle text-warning-solid",
  misunderstood: "bg-info-subtle text-info",
  other: "bg-raised text-text-secondary",
  none: "bg-raised text-text-muted",
};

function CategoryBadge({ category }: { category: string | null }) {
  const key = category ?? "none";
  return (
    <span className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-small font-medium ${SA_CATEGORY_COLORS[key] ?? "bg-raised text-text-muted"}`}>
      {SA_CATEGORY_LABELS[key] ?? key}
    </span>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-small font-medium ${SA_STATUS_COLORS[status]}`}>
      {SA_STATUS_LABELS[status]}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ---- Level 1: Stats Dashboard ----

function FeedbackDashboard({ stats, onViewAll, t }: {
  stats: FeedbackStats;
  onViewAll: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const statusBarTotal = Object.values(stats.by_status).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("feedback.statsTotal"), value: stats.total, highlight: false },
          { label: t("feedback.stats24h"), value: stats.last_24h, highlight: false },
          { label: t("feedback.stats7d"), value: stats.last_7d, highlight: false },
          { label: t("feedback.statsPending"), value: stats.by_status.pending ?? 0, highlight: (stats.by_status.pending ?? 0) > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-lg border p-4 ${highlight ? "border-warning-solid/30 bg-warning-subtle" : "border-sidebar-border bg-surface"}`}>
            <p className={`text-small ${highlight ? "text-warning-solid" : "text-text-secondary"}`}>{label}</p>
            <p className={`mt-1 text-heading font-semibold ${highlight ? "text-warning-solid" : "text-foreground"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* By Status */}
        <div className="rounded-lg border border-sidebar-border bg-surface p-4">
          <p className="mb-3 text-small font-medium text-text-secondary">{t("feedback.byStatus")}</p>
          <div className="space-y-2">
            {SA_STATUS_OPTIONS.map((s) => {
              const count = stats.by_status[s] ?? 0;
              const pct = Math.round((count / statusBarTotal) * 100);
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-small text-text-secondary">{SA_STATUS_LABELS[s]}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-raised" style={{ height: 6 }}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        s === "pending" ? "bg-warning-solid" :
                        s === "reviewed" ? "bg-accent" :
                        s === "test_alpha" ? "bg-warning-solid/60" :
                        s === "test_beta" ? "bg-info" :
                        "bg-success-solid"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-small text-text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="rounded-lg border border-sidebar-border bg-surface p-4">
          <p className="mb-3 text-small font-medium text-text-secondary">{t("feedback.byCategory")}</p>
          <div className="space-y-1.5">
            {Object.entries(stats.by_category).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <CategoryBadge category={cat === "none" ? null : cat} />
                <span className="text-small font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Orgs */}
      {stats.top_orgs.length > 0 && (
        <div className="rounded-lg border border-sidebar-border bg-surface p-4">
          <p className="mb-3 text-small font-medium text-text-secondary">{t("feedback.topOrgs")}</p>
          <div className="space-y-1.5">
            {stats.top_orgs.slice(0, 5).map((org, i) => (
              <div key={org.org_id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-small text-text-muted">#{i + 1}</span>
                <span className="flex-1 truncate font-technical text-small text-foreground">{org.org_id}</span>
                <span className="text-small font-medium text-foreground">{org.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <BarChart2 size={16} strokeWidth={1.5} />
          {t("feedback.viewAll")}
        </button>
      </div>
    </div>
  );
}

// ---- Level 3: Report Detail Panel ----

function CollapsibleSection({ title, defaultOpen, children }: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-sidebar-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-small font-medium text-foreground">{title}</span>
        {open ? <ChevronUp size={14} strokeWidth={1.5} className="text-text-muted" /> : <ChevronDown size={14} strokeWidth={1.5} className="text-text-muted" />}
      </button>
      {open && <div className="border-t border-sidebar-border px-4 py-3">{children}</div>}
    </div>
  );
}

function JsonBlock({ value, label }: { value: unknown; label?: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="relative">
      {label && <p className="mb-1 text-micro text-text-muted">{label}</p>}
      <div className="relative rounded-md bg-raised">
        <button
          onClick={copy}
          className="absolute right-2 top-2 rounded p-1 text-text-muted hover:text-foreground transition-colors"
          aria-label="Copiar"
        >
          <Copy size={12} strokeWidth={1.5} />
        </button>
        {copied && (
          <span className="absolute right-8 top-2 text-micro text-success-solid">Copiado</span>
        )}
        <pre className="max-h-48 overflow-auto p-3 text-micro font-technical text-foreground">{text}</pre>
      </div>
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{value ?? "—"}</dd>
    </>
  );
}

function ReportDetailPanel({ reportId, onClose, onUpdate, onDelete, t }: {
  reportId: string;
  onClose: () => void;
  onUpdate: (r: FeedbackReport) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>("pending");
  const [editNotes, setEditNotes] = useState("");
  const [editHidden, setEditHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchFeedbackReport(reportId).then((r) => {
      if (r.success && r.report) {
        setReport(r.report);
        setEditStatus(r.report.status);
        setEditNotes(r.report.admin_notes ?? "");
        setEditHidden(r.report.is_hidden);
      }
      setLoading(false);
    });
  }, [reportId]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (!report) return;
    setSaving(true);
    const res = await updateFeedbackReport(report.id, {
      status: editStatus,
      admin_notes: editNotes || undefined,
      is_hidden: editHidden,
    });
    if (res.success && res.report) {
      setReport(res.report);
      onUpdate(res.report);
      showToast(t("feedback.updateSuccess"), "success");
    } else {
      showToast(t("feedback.updateError"), "error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!report) return;
    const res = await deleteFeedbackReport(report.id);
    if (res.success) {
      onDelete(report.id);
      onClose();
    } else {
      showToast(t("feedback.deleteError"), "error");
    }
    setConfirmDelete(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-sidebar-border bg-base shadow-2xl"
      >
        {/* Panel header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border bg-surface px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary hover:bg-raised hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <h2 className="flex-1 text-subheading font-medium text-heading">{t("feedback.detailTitle")}</h2>
          {report && <StatusBadge status={report.status} />}
          {report?.is_hidden && (
            <span className="inline-flex items-center gap-1 rounded-md bg-error-subtle px-2 py-0.5 text-small text-error">
              <EyeOff size={12} strokeWidth={1.5} />
              {t("feedback.hidden")}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
          </div>
        ) : !report ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-body text-error">{t("errorLoad")}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Toast */}
            {toast && (
              <div className={`mx-5 mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-small ${toast.type === "success" ? "bg-success-subtle text-success-solid" : "bg-error-subtle text-error"}`}>
                {toast.type === "success" ? <CheckCircle2 size={14} strokeWidth={1.5} /> : <AlertTriangle size={14} strokeWidth={1.5} />}
                {toast.msg}
              </div>
            )}

            <div className="space-y-3 p-5">
              {/* Metadata header */}
              <div className="rounded-lg border border-sidebar-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <CategoryBadge category={report.category} />
                  <StatusBadge status={report.status} />
                  <span className="text-small text-text-muted ml-auto">
                    {new Date(report.reported_at).toLocaleString()}
                  </span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
                  <KVRow label="Org" value={report.org_id ? <span className="font-technical text-micro">{report.org_id}</span> : null} />
                  <KVRow label="Thread" value={<span className="font-technical text-micro">{report.thread_id}</span>} />
                  {report.supabase_user_id && <KVRow label="User" value={<span className="font-technical text-micro">{report.supabase_user_id}</span>} />}
                  {report.resolved_at && <KVRow label={t("feedback.resolvedAt")} value={new Date(report.resolved_at).toLocaleString()} />}
                </dl>
                {(report.user_comment || report.expected_response || report.tenant_notes) && (
                  <div className="mt-3 space-y-2">
                    {report.user_comment && (
                      <div className="flex items-start gap-2">
                        <span className="text-micro text-text-muted shrink-0 mt-0.5">💬</span>
                        <blockquote className="border-l-2 border-accent pl-3 text-small text-text-secondary italic">
                          {report.user_comment}
                        </blockquote>
                      </div>
                    )}
                    {report.expected_response && (
                      <div className="flex items-start gap-2">
                        <span className="text-micro text-text-muted shrink-0 mt-0.5">🎯</span>
                        <blockquote className="border-l-2 border-accent/50 pl-3 text-small text-text-secondary italic">
                          {report.expected_response}
                        </blockquote>
                      </div>
                    )}
                    {report.tenant_notes && (
                      <div className="flex items-start gap-2">
                        <span className="text-micro text-text-muted shrink-0 mt-0.5">🏢</span>
                        <div className="flex-1">
                          <p className="text-micro text-text-muted mb-0.5">{t("feedback.tenantNotes")}</p>
                          <blockquote className="border-l-2 border-warning-solid/60 pl-3 text-small text-text-secondary italic">
                            {report.tenant_notes}
                          </blockquote>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 1: Conversation */}
              <CollapsibleSection title={t("feedback.sectionConversation")} defaultOpen={true}>
                <div className="space-y-3">
                  {/* Main query/response */}
                  {report.user_query && (
                    <div className="rounded-md bg-raised px-3 py-2">
                      <p className="mb-1 text-micro font-medium text-text-muted">{t("feedback.userQuery")}</p>
                      <p className="text-small text-foreground">{report.user_query}</p>
                    </div>
                  )}
                  {report.agent_response && (
                    <div className="rounded-md bg-accent-subtle px-3 py-2">
                      <p className="mb-1 text-micro font-medium text-accent">{t("feedback.agentResponse")}</p>
                      <p className="text-small text-foreground whitespace-pre-wrap">{report.agent_response}</p>
                    </div>
                  )}
                  {report.expected_response && (
                    <div className="rounded-md bg-surface border border-border px-3 py-2">
                      <p className="mb-1 text-micro font-medium text-text-secondary flex items-center gap-1">
                        <MessageSquare size={12} strokeWidth={1.5} className="text-accent" />
                        {t("feedback.expectedResponse")}
                      </p>
                      <p className="text-small text-foreground italic whitespace-pre-wrap">&ldquo;{report.expected_response}&rdquo;</p>
                    </div>
                  )}

                  {/* Context pills */}
                  <div className="flex flex-wrap gap-2">
                    {report.language && (
                      <span className="rounded-md bg-raised px-2 py-0.5 text-micro text-text-secondary">
                        {t("feedback.language")}: <strong>{report.language}</strong>
                      </span>
                    )}
                    {report.is_followup_query && (
                      <span className="rounded-md bg-info-subtle px-2 py-0.5 text-micro text-info">
                        {t("feedback.followupQuery")}
                      </span>
                    )}
                  </div>

                  {/* Last messages transcript */}
                  {report.last_messages && report.last_messages.length > 0 && (
                    <div>
                      <p className="mb-2 text-micro text-text-muted">{t("feedback.transcript")}</p>
                      <div className="space-y-1.5 rounded-md border border-sidebar-border p-2">
                        {report.last_messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`rounded px-2 py-1.5 text-micro ${
                              msg.id === report.message_id
                                ? "border border-accent/40 bg-accent-subtle"
                                : msg.role === "human"
                                ? "bg-raised"
                                : "bg-surface"
                            }`}
                          >
                            <span className={`mr-1.5 font-medium ${msg.role === "human" ? "text-foreground" : "text-accent"}`}>
                              {msg.role === "human" ? "Usuario" : "Agente"}:
                            </span>
                            <span className="text-text-secondary line-clamp-2">{msg.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* Section 2: Classification */}
              <CollapsibleSection title={t("feedback.sectionClassification")} defaultOpen={true}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
                  <KVRow label={t("feedback.model")} value={report.primary_model ? <span className="font-technical">{report.primary_model}</span> : null} />
                  <KVRow label={t("feedback.queryType")} value={report.query_type} />
                  <KVRow label={t("feedback.classificationPath")} value={
                    report.keyword_classification_done != null
                      ? (report.keyword_classification_done
                          ? <span className="rounded-md bg-success-subtle px-1.5 py-0.5 text-micro text-success-solid">Keyword</span>
                          : <span className="rounded-md bg-warning-subtle px-1.5 py-0.5 text-micro text-warning-solid">LLM fallback</span>)
                      : null
                  } />
                  <dt className="text-text-secondary">{t("feedback.areas")}</dt>
                  <dd>
                    {report.classified_areas && report.classified_areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {report.classified_areas.map((a) => (
                          <span key={a} className="rounded-md bg-raised px-1.5 py-0.5 text-micro text-text-secondary">{a}</span>
                        ))}
                      </div>
                    ) : <span className="text-text-muted">—</span>}
                  </dd>
                  {report.keyword_hints && report.keyword_hints.length > 0 && (
                    <>
                      <dt className="text-text-secondary">{t("feedback.keywordHints")}</dt>
                      <dd>
                        <div className="flex flex-wrap gap-1">
                          {report.keyword_hints.map((k) => (
                            <span key={k} className="rounded-md bg-raised px-1.5 py-0.5 text-micro font-technical text-text-secondary">{k}</span>
                          ))}
                        </div>
                      </dd>
                    </>
                  )}
                </dl>
              </CollapsibleSection>

              {/* Section 3: Domain */}
              <CollapsibleSection title={t("feedback.sectionDomain")} defaultOpen={false}>
                <div className="space-y-3">
                  {report.dynamic_domain != null && <JsonBlock value={report.dynamic_domain} label={t("feedback.oodooDomain")} />}
                  {report.date_filter != null && <JsonBlock value={report.date_filter} label={t("feedback.dateFilter")} />}
                  {report.entity_filter != null && <JsonBlock value={report.entity_filter} label={t("feedback.entityFilter")} />}
                </div>
              </CollapsibleSection>

              {/* Section 4: Execution */}
              <CollapsibleSection title={t("feedback.sectionExecution")} defaultOpen={false}>
                <div className="space-y-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
                    <KVRow
                      label={t("feedback.odooCount")}
                      value={report.odoo_total_count != null ? (
                        <span>
                          {report.odoo_total_count} {t("feedback.records")}
                          {report.odoo_was_truncated && (
                            <span className="ml-2 rounded-md bg-warning-subtle px-1.5 py-0.5 text-micro text-warning-solid">
                              {t("feedback.truncated")}
                            </span>
                          )}
                        </span>
                      ) : null}
                    />
                  </dl>
                  {report.formatted_for_llm && (
                    <div>
                      <p className="mb-1 text-micro font-medium text-text-muted">{t("feedback.formattedForLlm")}</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-raised p-3 text-micro font-technical text-foreground whitespace-pre-wrap">{report.formatted_for_llm}</pre>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* Section 5: Raw Odoo Data */}
              <CollapsibleSection title={t("feedback.sectionRawData")} defaultOpen={false}>
                <div className="space-y-2">
                  <p className="text-micro text-warning-solid">{t("feedback.rawDataWarning")}</p>
                  {report.odoo_raw_data != null && <JsonBlock value={report.odoo_raw_data} />}
                </div>
              </CollapsibleSection>

              {/* Section 6: Errors (auto-open if errors exist) */}
              {(report.odoo_error || report.write_error) && (
                <CollapsibleSection title={t("feedback.sectionErrors")} defaultOpen={true}>
                  <div className="space-y-2">
                    {report.odoo_error && (
                      <div className="rounded-md bg-error-subtle p-3">
                        <p className="mb-1 text-micro font-medium text-error">{t("feedback.odooError")}</p>
                        <pre className="text-micro font-technical text-error whitespace-pre-wrap">{report.odoo_error}</pre>
                      </div>
                    )}
                    {report.write_error && (
                      <div className="rounded-md bg-error-subtle p-3">
                        <p className="mb-1 text-micro font-medium text-error">{t("feedback.writeError")}</p>
                        <pre className="text-micro font-technical text-error whitespace-pre-wrap">{report.write_error}</pre>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Section 7: Write Operation */}
              {report.is_write_operation && (
                <CollapsibleSection title={t("feedback.sectionWriteOp")} defaultOpen={false}>
                  <div className="space-y-3">
                    {report.write_vals != null && <JsonBlock value={report.write_vals} label={t("feedback.writeVals")} />}
                    {report.pending_action != null && <JsonBlock value={report.pending_action} label={t("feedback.pendingAction")} />}
                  </div>
                </CollapsibleSection>
              )}

              {/* Section 8: Admin Workflow */}
              <div className="rounded-lg border border-sidebar-border bg-surface p-4">
                <p className="mb-3 text-small font-medium text-heading">{t("feedback.sectionAdmin")}</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-small text-text-secondary">{t("feedback.status")}</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                      className="w-full rounded-md border border-sidebar-border bg-base px-3 py-2 text-small text-foreground focus:border-accent focus:outline-none"
                    >
                      {SA_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{SA_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-small text-text-secondary">{t("feedback.adminNotes")}</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      placeholder={t("feedback.adminNotesPlaceholder")}
                      className="w-full rounded-md border border-sidebar-border bg-base px-3 py-2 text-small text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-small text-text-secondary select-none">
                    <input
                      type="checkbox"
                      checked={editHidden}
                      onChange={(e) => setEditHidden(e.target.checked)}
                      className="rounded"
                    />
                    {t("feedback.markHidden")}
                  </label>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-error px-3 py-1.5 text-small text-error hover:bg-error-subtle transition-colors"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                      {t("feedback.delete")}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-small font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" /> : <Save size={13} strokeWidth={1.5} />}
                      {t("feedback.save")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl">
            <p className="mb-4 text-body text-foreground">{t("feedback.confirmDelete")}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-3 py-1.5 text-small text-text-secondary hover:bg-raised transition-colors"
              >
                {t("feedback.cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-error px-3 py-1.5 text-small font-medium text-white hover:opacity-90 transition-opacity"
              >
                {t("feedback.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Level 2: Feedback List ----

function FeedbackList({ onViewReport, onBack, t }: {
  onViewReport: (id: string) => void;
  onBack: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "">("");
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | "">("");
  const [filterOrgId, setFilterOrgId] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const LIMIT = 50;

  const load = useCallback((off: number) => {
    setLoading(true);
    fetchAdminFeedback({
      status: filterStatus || undefined,
      category: filterCategory || undefined,
      org_id: filterOrgId || undefined,
      include_hidden: includeHidden,
      limit: LIMIT,
      offset: off,
    }).then((r) => {
      if (r.success && r.data) {
        setReports(r.data.reports);
        setTotal(r.data.total);
      }
      setLoading(false);
    });
  }, [filterStatus, filterCategory, filterOrgId, includeHidden]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(0);
    load(0);
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small text-text-secondary hover:bg-raised transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {t("feedback.backToStats")}
        </button>
        <span className="text-small text-text-muted">{t("feedback.total", { count: total })}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Filter size={14} strokeWidth={1.5} className="text-text-muted" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | "")}
            className="rounded-md border border-sidebar-border bg-base px-2 py-1 text-small text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">{t("feedback.filterAllStatus")}</option>
            {SA_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{SA_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FeedbackCategory | "")}
            className="rounded-md border border-sidebar-border bg-base px-2 py-1 text-small text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">{t("feedback.filterAllCategory")}</option>
            {Object.keys(SA_CATEGORY_LABELS).filter((k) => k !== "none").map((c) => (
              <option key={c} value={c}>{SA_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            value={filterOrgId}
            onChange={(e) => setFilterOrgId(e.target.value)}
            placeholder={t("feedback.filterOrg")}
            className="rounded-md border border-sidebar-border bg-base px-2 py-1 text-small text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none w-32"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-small text-text-secondary select-none">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(e) => setIncludeHidden(e.target.checked)}
              className="rounded"
            />
            {t("feedback.includeHidden")}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
        </div>
      ) : reports.length === 0 ? (
        <p className="py-8 text-center text-body text-text-muted">{t("feedback.empty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-sidebar-border">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-sidebar-border bg-raised text-micro text-text-secondary">
                  <th className="px-3 py-2 text-left">{t("feedback.colDate")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colOrg")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colCategory")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colStatus")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colQuery")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colModelType")}</th>
                  <th className="px-3 py-2 text-left">{t("feedback.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onViewReport(r.id)}
                    className="cursor-pointer border-b border-sidebar-border last:border-0 hover:bg-raised transition-colors"
                  >
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap" title={new Date(r.reported_at).toLocaleString()}>
                      {timeAgo(r.reported_at)}
                    </td>
                    <td className="px-3 py-2 max-w-[100px] truncate font-technical text-micro text-text-secondary" title={r.org_id ?? ""}>
                      {r.org_id ? r.org_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge category={r.category} />
                        {r.expected_response && (
                          <span title={t("feedback.expectedResponseTooltip")}>
                            <MessageSquare size={13} strokeWidth={1.5} className="text-accent" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-text-secondary" title={r.user_query ?? ""}>
                      {r.user_query ? (r.user_query.length > 80 ? r.user_query.slice(0, 80) + "…" : r.user_query) : "—"}
                    </td>
                    <td className="px-3 py-2 font-technical text-micro text-text-muted whitespace-nowrap">
                      {[r.primary_model, r.query_type].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewReport(r.id)}
                          className="rounded-md p-1.5 text-text-secondary hover:bg-raised hover:text-foreground transition-colors"
                          aria-label="Ver detalle"
                        >
                          <Eye size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); load(o); }}
                disabled={offset === 0}
                className="rounded-md px-3 py-1.5 text-small text-text-secondary hover:bg-raised disabled:opacity-40 transition-colors"
              >
                ← {t("feedback.prev")}
              </button>
              <span className="text-small text-text-muted">
                {offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
              </span>
              <button
                onClick={() => { const o = offset + LIMIT; setOffset(o); load(o); }}
                disabled={offset + LIMIT >= total}
                className="rounded-md px-3 py-1.5 text-small text-text-secondary hover:bg-raised disabled:opacity-40 transition-colors"
              >
                {t("feedback.next")} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- FeedbackTab root ----

type FeedbackView = "stats" | "list";

function FeedbackTab({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [view, setView] = useState<FeedbackView>("stats");
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbackStats().then((r) => {
      if (r.success && r.data) setStats(r.data);
      setStatsLoading(false);
    });
  }, []);

  function handleUpdate(_updated: FeedbackReport) {
    fetchFeedbackStats().then((r) => {
      if (r.success && r.data) setStats(r.data);
    });
  }

  function handleDelete(_id: string) {
    fetchFeedbackStats().then((r) => {
      if (r.success && r.data) setStats(r.data);
    });
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      {view === "stats" && stats ? (
        <FeedbackDashboard stats={stats} onViewAll={() => setView("list")} t={t} />
      ) : view === "stats" && !stats ? (
        <p className="py-8 text-center text-body text-text-muted">{t("errorLoad")}</p>
      ) : (
        <FeedbackList
          onViewReport={(id) => setSelectedReportId(id)}
          onBack={() => setView("stats")}
          t={t}
        />
      )}

      {selectedReportId && (
        <ReportDetailPanel
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          t={t}
        />
      )}
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
    { key: "feedback", label: t("tabFeedback"), icon: <Flag size={16} strokeWidth={1.5} /> },
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
          {activeTab === "feedback" && <FeedbackTab t={t} />}
        </motion.div>
      </div>
    </div>
  );
}
