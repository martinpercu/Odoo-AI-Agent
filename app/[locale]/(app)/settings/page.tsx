"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Shield,
  Building2,
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
  ArrowRight,
  BookSearch,
  ImagePlus,
  ClipboardList,
} from "lucide-react";
import { InstanceInspector } from "@/components/odoo/instance-inspector";
import { RoutineGrantsMatrixPanel } from "@/components/routines/routine-grants-matrix";
import { FounderClockPill } from "@/components/ui/founder-clock-pill";
import { MarkB, Wordmark } from "@/components/AgentMark";
import { AdminUserCredentialsModal } from "@/components/settings/admin-user-credentials-modal";
import { AdminInvitationCredentialsModal } from "@/components/settings/admin-invitation-credentials-modal";
import { useSession } from "@/hooks/use-session";
import {
  updateOrg,
  uploadBrandLogo,
  listOrgUsers,
  updateOrgUser,
  removeOrgUser,
  listInvitations,
  cancelInvitation,
  fetchAdminFeedback,
  updateTenantNotes,
} from "@/lib/api";
import type { OdooConfigSummary, OrgUser, Invitation, UserRole, FeedbackReport } from "@/lib/types";

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

/** Pointer card to a route that now owns a flow previously embedded in Settings (tenant refactor). */
function MovedToCard({
  icon,
  title,
  desc,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 transition-colors hover:bg-raised/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-subheading">{title}</p>
        <p className="text-small text-text-secondary">{desc}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-small font-medium text-accent">
        {cta}
        <ArrowRight size={16} strokeWidth={1.5} />
      </span>
    </Link>
  );
}

function OrgSection() {
  const t = useTranslations("Settings");
  const { meData, reload } = useSession();
  const org = meData?.org;
  const subscription = meData?.subscription;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org?.name ?? "");
  const [brandName, setBrandName] = useState(org?.brand_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(org?.brand_logo_url ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LOGO_ERROR_MAP: Record<string, string> = {
    "413": t("admin.logoError413"),
    "415": t("admin.logoError415"),
    "422": t("admin.logoError422"),
    "generic": t("admin.logoErrorGeneric"),
  };

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setLogoError(t("admin.logoError415"));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError(t("admin.logoError413"));
      e.target.value = "";
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    const result = await uploadBrandLogo(org.id, file);
    setLogoUploading(false);
    e.target.value = "";
    if (result.url) {
      setLogoUrl(result.url);
      reload();
    } else {
      setLogoError(LOGO_ERROR_MAP[result.errorCode ?? "generic"] ?? t("admin.logoErrorGeneric"));
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError(null);
    const result = await updateOrg(org.id, {
      name,
      brand_name: brandName.trim() || null,
    });
    if (result.success) {
      await reload();
      setEditing(false);
    } else {
      setError(result.error ?? t("admin.saveError"));
    }
    setSaving(false);
  }

  if (!org) return null;

  const isFoundingPartner = org.is_founding_partner === true;

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Building2 size={20} strokeWidth={1.5} className="text-accent" />
          <span className="text-subheading">{t("admin.orgTitle")}</span>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setBrandName(org.brand_name ?? ""); setName(org.name); setLogoUrl(org.brand_logo_url ?? null); setLogoError(null); }}
            className="rounded-md border border-border px-3 py-1.5 text-body hover:bg-raised transition-colors"
          >
            {t("admin.edit")}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {!editing ? (
          <div className="flex flex-col">
            {/* Tu Marca */}
            <div className="pb-4 pt-2">
              <div className="mb-3">
                <p className="text-small text-foreground" style={{ fontWeight: 600 }}>{t("admin.brandSectionTitle")}</p>
                <p className="text-small text-text-muted">{t("admin.brandSectionDesc")}</p>
              </div>

              {/* Side-by-side sidebar header previews */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                {/* Block 1 — tenant view */}
                <div className="rounded-card border border-border bg-raised/30 p-3">
                  <p className="mb-2 text-micro text-text-muted">{t("admin.previewLabelAdmin")}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                      <MarkB size={18} fg="#FFFFFF" accent="#FFFFFF" odoo="#FFFFFF" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <Wordmark scale={0.72} />
                    </div>
                  </div>
                </div>

                {/* Block 2 — client view */}
                <div className="rounded-card border border-border bg-raised/30 p-3">
                  <p className="mb-2 text-micro text-text-muted">{t("admin.previewLabelClient")}</p>
                  <div className="flex items-center gap-2">
                    {org.brand_logo_url ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                        <img src={org.brand_logo_url} alt={org.brand_name ?? ""} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <MarkB size={18} fg="#FFFFFF" accent="#FFFFFF" odoo="#FFFFFF" />
                      </div>
                    )}
                    {org.brand_name ? (
                      <span className="truncate text-body" style={{ fontWeight: 700 }}>{org.brand_name}</span>
                    ) : (
                      <span className="truncate text-small italic text-text-muted">{t("admin.previewNoBrand")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-body">
                <span className="text-text-secondary">{t("admin.brandName")}</span>
                <span className="font-medium">{org.brand_name || "—"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-body">
                <span className="text-text-secondary">{t("admin.logoLabel")}</span>
                {org.brand_logo_url ? (
                  <div className="h-8 w-8 overflow-hidden rounded-lg border border-border bg-raised">
                    <img src={org.brand_logo_url} alt={org.brand_name ?? org.name} className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-small transition-colors hover:bg-raised disabled:opacity-50"
                  >
                    {logoUploading ? (
                      <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <ImagePlus size={13} strokeWidth={1.5} />
                    )}
                    {logoUploading ? t("admin.logoUploading") : t("admin.logoUpload")}
                  </button>
                )}
              </div>
              {logoError && <p className="mt-2 text-small text-error">{logoError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            <hr className="border-border-subtle" />

            {/* Tu cuenta */}
            <div className="py-4">
              <div className="mb-3">
                <p className="text-small text-foreground" style={{ fontWeight: 600 }}>{t("admin.accountSectionTitle")}</p>
                <p className="text-small text-text-muted">{t("admin.accountSectionDesc")}</p>
              </div>
              <div className="flex justify-between text-body">
                <span className="text-text-secondary">{t("admin.yourName")}</span>
                <span className="font-medium">{org.name}</span>
              </div>
            </div>

            {subscription && (
              <>
                <hr className="border-border-subtle" />
                <div className="flex items-center justify-between pt-4 text-body">
                  <span className="text-text-secondary">{t("admin.tier")}</span>
                  {isFoundingPartner ? (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-micro font-semibold text-white">
                      Founding Partner
                    </span>
                  ) : (
                    <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent">
                      {subscription.tier}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col">
            {/* Tu Marca */}
            <div className="pb-4 pt-2">
              <div className="mb-3">
                <p className="text-small text-foreground" style={{ fontWeight: 600 }}>{t("admin.brandSectionTitle")}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("admin.brandName")}</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t("admin.brandNamePlaceholder")}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Logo upload */}
              <div className="mt-4 flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("admin.logoLabel")}</label>
                <div className="flex items-center gap-3">
                  {/* Current logo or placeholder */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-raised">
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImagePlus size={20} strokeWidth={1.5} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-small transition-colors hover:bg-raised disabled:opacity-50"
                    >
                      {logoUploading ? (
                        <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                      ) : (
                        <ImagePlus size={13} strokeWidth={1.5} />
                      )}
                      {logoUploading ? t("admin.logoUploading") : (logoUrl ? t("admin.logoChange") : t("admin.logoUpload"))}
                    </button>
                    <p className="text-micro text-text-muted">{t("admin.logoHint")}</p>
                  </div>
                </div>
                {logoError && <p className="text-small text-error">{logoError}</p>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* Tu cuenta */}
            <div className="py-4">
              <div className="mb-3">
                <p className="text-small text-foreground" style={{ fontWeight: 600 }}>{t("admin.accountSectionTitle")}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-text-secondary">{t("admin.yourName")}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            {error && <p className="text-small text-error">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex h-btn-md items-center gap-1.5 rounded-btn bg-accent px-3 text-body text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
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
      </div>
    </div>
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
  const [voiceToggleError, setVoiceToggleError] = useState<string | null>(null);

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

  async function handleVoiceToggle(userId: string, feature: "stt_enabled" | "tts_enabled", value: boolean) {
    if (!orgId) return;
    setVoiceToggleError(null);
    const result = await updateOrgUser(orgId, userId, { [feature]: value });
    if (result.success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [feature]: value } : u)));
    } else {
      const msg = result.sttLimitReached
        ? t("admin.sttLimitReached")
        : result.ttsLimitReached
          ? t("admin.ttsLimitReached")
          : result.error ?? t("admin.voiceToggleError");
      setVoiceToggleError(msg);
      setTimeout(() => setVoiceToggleError(null), 6000);
    }
  }

  /** El permiso de escribir Rutinas. Sin cupo detrás: no puede fallar por límite. */
  async function handleAuthorToggle(userId: string, value: boolean) {
    if (!orgId) return;
    setVoiceToggleError(null);
    const result = await updateOrgUser(orgId, userId, { can_author_routines: value });
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, can_author_routines: value } : u))
      );
    } else {
      setVoiceToggleError(result.error ?? t("admin.routineAuthorError"));
      setTimeout(() => setVoiceToggleError(null), 6000);
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
  const showSeatBadge = paidLimit >= 1 && freeLimit >= 1;

  // Voice feature quotas — computed from the loaded users list + org subscription.
  const sttUsed = users.filter((u) => u.stt_enabled).length;
  const ttsUsed = users.filter((u) => u.tts_enabled).length;
  const sttLimit = subscription?.stt_slots_limit ?? 0;
  const ttsLimit = subscription?.tts_slots_limit ?? 0;
  const sttFeatureAvailable = sttLimit === -1 || sttLimit > 0;
  const ttsFeatureAvailable = ttsLimit === -1 || ttsLimit > 0;

  const seatsWidget = subscription ? (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-3 rounded-md bg-raised px-3 py-1.5 text-small">
        <span className="text-text-secondary font-medium">{t("admin.seatsWidget")}</span>
        <span className={`font-technical ${paidLimit > 0 && paidUsed >= paidLimit ? "text-error" : "text-foreground"}`}>
          {t("admin.seatsPaid")}: {paidUsed}/{paidLimit}
        </span>
        {/* Hide the free bucket entirely on plans with no free seats (e.g. founder = 6 paid / 0 free) */}
        {freeLimit > 0 && (
          <>
            <span className="text-border">·</span>
            <span className={`font-technical ${freeUsed >= freeLimit ? "text-warning-solid" : "text-foreground"}`}>
              {t("admin.seatsFree")}: {freeUsed}/{freeLimit}
            </span>
          </>
        )}
      </div>
      {(sttFeatureAvailable || ttsFeatureAvailable) && (
        <div className="inline-flex items-center gap-3 rounded-md bg-raised px-3 py-1.5 text-small">
          {sttFeatureAvailable && (
            <span className={`font-technical ${sttLimit > 0 && sttUsed >= sttLimit ? "text-error" : "text-foreground"}`}>
              {t("admin.sttWidget")}: {sttUsed}/{sttLimit === -1 ? "∞" : sttLimit}
            </span>
          )}
          {sttFeatureAvailable && ttsFeatureAvailable && <span className="text-border">·</span>}
          {ttsFeatureAvailable && (
            <span className={`font-technical ${ttsLimit > 0 && ttsUsed >= ttsLimit ? "text-error" : "text-foreground"}`}>
              {t("admin.ttsWidget")}: {ttsUsed}/{ttsLimit === -1 ? "∞" : ttsLimit}
            </span>
          )}
        </div>
      )}
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
          <div className="mb-3 flex items-start gap-2 rounded-md bg-error-subtle px-3 py-2.5 text-small text-error">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>{freeToggleError}</span>
          </div>
        )}

        {/* STT/TTS toggle error banner (quota reached) */}
        {voiceToggleError && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-error-subtle px-3 py-2.5 text-small text-error">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>{voiceToggleError}</span>
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

                  {/* Free/Paid toggle — only shown when the plan supports both seat types */}
                  {showSeatBadge && (
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
                  )}

                  {/* Voice — STT toggle */}
                  {sttFeatureAvailable && (
                    <button
                      onClick={() => handleVoiceToggle(user.id, "stt_enabled", !user.stt_enabled)}
                      className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
                        user.stt_enabled
                          ? "bg-accent-subtle text-accent"
                          : "bg-raised text-text-secondary"
                      }`}
                      title={t("admin.toggleStt")}
                    >
                      {t("admin.stt")}
                    </button>
                  )}

                  {/* Voice — TTS toggle */}
                  {ttsFeatureAvailable && (
                    <button
                      onClick={() => handleVoiceToggle(user.id, "tts_enabled", !user.tts_enabled)}
                      className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
                        user.tts_enabled
                          ? "bg-accent-subtle text-accent"
                          : "bg-raised text-text-secondary"
                      }`}
                      title={t("admin.toggleTts")}
                    >
                      {t("admin.tts")}
                    </button>
                  )}

                  {/* Rutinas — permiso de AUTORÍA (2026-08-12).
                      ⚠️ No tiene cupo de org detrás, a diferencia de STT/TTS: no consume
                      nada, es una atribución. Por eso no se gatea en un
                      `featureAvailable` ni puede devolver un "límite alcanzado".
                      ⚠️ Sólo se muestra para CLIENT_USER: un ADMIN puede por rol y el
                      toggle no haría nada — un control que no cambia nada enseña a
                      desconfiar de los que sí. */}
                  {user.role === "CLIENT_USER" && (
                    <button
                      onClick={() => handleAuthorToggle(user.id, !user.can_author_routines)}
                      className={`rounded-md px-2 py-1 text-micro font-medium transition-colors ${
                        user.can_author_routines
                          ? "bg-accent-subtle text-accent"
                          : "bg-raised text-text-secondary"
                      }`}
                      title={t("admin.toggleRoutineAuthor")}
                    >
                      {t("admin.routineAuthor")}
                    </button>
                  )}

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
                    <p className="flex-1 truncate text-small font-technical text-text-secondary">{invLink}</p>
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
              className="w-full max-w-sm rounded-lg border border-border bg-surface shadow-lg"
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

type SettingsTab = "org" | "instances" | "users" | "routines" | "feedback";

const TAB_CONFIG: { id: SettingsTab; icon: React.ReactNode; labelKey: string }[] = [
  { id: "org",       icon: <Building2     size={16} strokeWidth={1.5} />, labelKey: "tabOrg" },
  { id: "instances", icon: <Database      size={16} strokeWidth={1.5} />, labelKey: "tabInstances" },
  { id: "users",     icon: <Users         size={16} strokeWidth={1.5} />, labelKey: "tabUsers" },
  // Fase 3 · F4 — quién ve cada Rutina. Va junto a Usuarios porque es una decisión
  // sobre PERSONAS, no sobre el catálogo: el catálogo se gestiona en `/rutinas`.
  { id: "routines",  icon: <ClipboardList size={16} strokeWidth={1.5} />, labelKey: "tabRoutines" },
  { id: "feedback",  icon: <Flag          size={16} strokeWidth={1.5} />, labelKey: "tabFeedback" },
];

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { meData } = useSession();
  const role = meData?.user?.role;

  const roleUpper = role?.toUpperCase();
  const isAdmin = roleUpper === "ADMIN";
  const isClientUser = roleUpper === "CLIENT_USER";
  const hasOrg = !!meData?.org;
  const isSolitary = meData?.org?.type === "SOLITARY";
  const awaitingFirstInstance =
    meData?.org?.is_founding_partner === true && !meData?.org?.founder_since;

  const visibleTabs = awaitingFirstInstance
    ? TAB_CONFIG.filter(
        (t) => t.id !== "users" && t.id !== "feedback" && t.id !== "routines"
      )
    : TAB_CONFIG;

  const [activeTab, setActiveTab] = useState<SettingsTab>("org");

  return (
    <div className="relative flex-1 overflow-y-auto">
      {/* Founder free-beta clock — subtle, always-visible floating pill (top-left) */}
      <div className="pointer-events-none sticky top-0 z-10 h-0">
        <div className="pointer-events-auto absolute left-4 top-4 sm:left-6">
          <FounderClockPill />
        </div>
      </div>

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
              {visibleTabs.map((tab) => {
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
                {/* Client-user self-service credentials now live on /settings/odoo. */}
                {isClientUser && hasOrg && (
                  <MovedToCard
                    icon={<KeyRound size={20} strokeWidth={1.5} />}
                    title={t("admin.movedCredsTitle")}
                    desc={t("admin.movedCredsDesc")}
                    cta={t("admin.movedCredsCta")}
                    href="/settings/odoo"
                  />
                )}
              </>
            )}

            {/* ---- TAB: Instancias ---- */}
            {activeTab === "instances" && isAdmin && (
              <>
                {/* Instance create/list moved to the dedicated /instances route (tenant refactor). */}
                <MovedToCard
                  icon={<Database size={20} strokeWidth={1.5} />}
                  title={t("admin.movedInstancesTitle")}
                  desc={t("admin.movedInstancesDesc")}
                  cta={t("admin.movedInstancesCta")}
                  href="/instances"
                />
                {(meData?.odoo_configs ?? []).length > 0 && (
                  <CollapsibleCard icon={<BookSearch size={20} strokeWidth={1.5} className="text-accent" />} title={t("inspector.heading")}>
                    <InstanceInspector />
                  </CollapsibleCard>
                )}
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
                  {/* Inviting now happens per-instance (with seat + mode) on the /instances route. */}
                  {hasOrg && (
                    <MovedToCard
                      icon={<UserPlus size={20} strokeWidth={1.5} />}
                      title={t("admin.movedInviteTitle")}
                      desc={t("admin.movedInviteDesc")}
                      cta={t("admin.movedInviteCta")}
                      href="/instances"
                    />
                  )}
                  {hasOrg && <SentInvitationsSection />}
                </>
              )
            )}

            {/* ---- TAB: Rutinas (Fase 3 · F4) ---- */}
            {activeTab === "routines" && isAdmin && hasOrg && (
              <CollapsibleCard
                icon={<ClipboardList size={20} strokeWidth={1.5} className="text-accent" />}
                title={t("routines.title")}
                subheader={
                  <p className="text-small text-text-muted">{t("routines.subtitle")}</p>
                }
                defaultOpen
              >
                <RoutineGrantsMatrixPanel orgId={meData!.org!.id} />
              </CollapsibleCard>
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
