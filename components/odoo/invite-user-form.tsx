"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Mail,
  Loader2,
  Check,
  Copy,
  AlertTriangle,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { createInvitation, sendInvitationEmail } from "@/lib/api";
import type { InvitationMode, InstanceSeats, SeatType } from "@/lib/types";
import { deriveSeatState } from "@/lib/seats";

const EMAIL_LANGS = ["es", "en", "fr", "de", "pt", "it"] as const;

const segBtn = (active: boolean) =>
  `flex-1 rounded-btn px-3 py-1.5 text-small font-medium transition-colors ${
    active ? "bg-accent text-white shadow-sm" : "text-text-secondary hover:bg-raised"
  }`;

/**
 * Invite a user to a specific instance (spec §6.3). seat (paid/free) + mode
 * (invite_only default / precreds). Blocks an email that already has an account.
 */
export function InviteUserForm({
  orgId,
  instanceId,
  orgName,
  brandName,
  companyName,
  seats,
  onInvited,
}: {
  orgId: string;
  instanceId: string;
  orgName: string;
  brandName?: string | null;
  companyName?: string | null;
  seats?: InstanceSeats;
  onInvited?: () => void;
}) {
  const t = useTranslations("Instances.invite");
  const locale = useLocale();

  const { hasPaid, hasFree, showSelector, noSeats, autoType } = deriveSeatState(seats);

  const [email, setEmail] = useState("");
  const [seatType, setSeatType] = useState<SeatType>(autoType);
  const [mode, setMode] = useState<InvitationMode>("invite_only");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const defaultLang = (EMAIL_LANGS as readonly string[]).includes(locale) ? locale : "en";
  const [inviteLang, setInviteLang] = useState<string>(defaultLang);

  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId || noSeats) return;
    setSubmitting(true);
    setError(null);
    setLink(null);
    setEmailSent(null);

    const result = await createInvitation(orgId, email, {
      instance_id: instanceId,
      seat_type: seatType,
      mode,
      prefilled_username: mode === "precreds" ? username.trim() || undefined : undefined,
      prefilled_apikey: mode === "precreds" ? apiKey.trim() || undefined : undefined,
    });

    if (result.success && result.invitation) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setLink(`${baseUrl}/invite?token=${result.invitation.token}`);
      const emailResult = await sendInvitationEmail({
        token: result.invitation.token,
        email,
        orgName,
        brandName,
        companyName,
        role: "CLIENT_USER",
        lang: inviteLang,
        expiresAt: result.invitation.expires_at,
      });
      setEmailSent(emailResult.success);
      setEmail("");
      setUsername("");
      setApiKey("");
      onInvited?.();
    } else if (result.emailHasAccount) {
      setError(t("emailHasAccount"));
    } else if (result.seatLimitReached) {
      setError(t("seatLimit"));
    } else {
      setError(result.error ?? t("error"));
    }
    setSubmitting(false);
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="flex items-start gap-2 rounded-btn bg-error-subtle px-3 py-2 text-small text-error">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Email + language */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-btn border border-border bg-base py-2 pl-9 pr-3 text-body outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>
        {/* Language selector — appearance-none so we control the chevron */}
        <div className="relative shrink-0">
          <select
            value={inviteLang}
            onChange={(e) => setInviteLang(e.target.value)}
            aria-label={t("langLabel")}
            title={t("langLabel")}
            className="h-full appearance-none rounded-btn border border-border bg-base pl-3 pr-7 text-small uppercase outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {EMAIL_LANGS.map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
        </div>
      </div>

      {/* Seat type — only shown when both paid and free are available */}
      {showSelector && (
        <div>
          <p className="mb-1.5 text-small font-medium text-text-secondary">
            {t("seatLabel")}
            {seats && (
              <span className="ml-2 font-technical text-text-muted">
                {t("seatsAvail", {
                  paidUsed: seats.paid_used,
                  paidTotal: seats.paid_total,
                  freeUsed: seats.free_used,
                  freeTotal: seats.free_total,
                })}
              </span>
            )}
          </p>
          <div className="flex gap-1 rounded-btn border border-border bg-raised/40 p-1">
            {hasPaid && (
              <button type="button" onClick={() => setSeatType("paid")} className={segBtn(seatType === "paid")}>
                {t("seatPaid")}
              </button>
            )}
            {hasFree && (
              <button type="button" onClick={() => setSeatType("free")} className={segBtn(seatType === "free")}>
                {t("seatFree")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* No seats available — disable submit + warning */}
      {noSeats && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-btn bg-warning-subtle px-3 py-2 text-small text-warning-solid">
          <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
          <span>{t("noSeatsWarning")}</span>
          <span className="text-text-muted">·</span>
          <Link
            href="/settings"
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            {t("noSeatsLink")}
          </Link>
        </p>
      )}

      {/* Mode credentials should be set by user | anyway the ADMIN can set them in settings -> users */}
      {/* <div>
        <p className="mb-1.5 text-small font-medium text-text-secondary">{t("modeLabel")}</p>
        <div className="flex gap-1 rounded-btn border border-border bg-raised/40 p-1">
          <button type="button" onClick={() => setMode("invite_only")} className={segBtn(mode === "invite_only")}>
            {t("modeInviteOnly")}
          </button>
          <button type="button" onClick={() => setMode("precreds")} className={segBtn(mode === "precreds")}>
            {t("modePrecreds")}
          </button>
        </div>
      </div> */}

      {/* Pre-loaded credentials (precreds mode) */}
      {mode === "precreds" && (
        <div className="space-y-2 rounded-btn border border-border bg-raised/30 p-3">
          <div className="relative">
            <User size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("usernamePlaceholder")}
              className="w-full rounded-btn border border-border bg-surface py-1.5 pl-9 pr-3 text-small font-technical outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="relative">
            <KeyRound size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("apiKeyPlaceholder")}
              className="w-full rounded-btn border border-border bg-surface py-1.5 pl-9 pr-9 text-small font-technical outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-foreground"
              aria-label={showKey ? t("hideKey") : t("showKey")}
            >
              {showKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}

      {/* Email status */}
      {emailSent === true && (
        <p className="flex items-center gap-2 rounded-btn bg-success-subtle px-3 py-2 text-small text-success-solid">
          <Check size={14} strokeWidth={1.5} />
          {t("emailSent")}
        </p>
      )}
      {emailSent === false && (
        <p className="flex items-start gap-2 rounded-btn bg-warning-subtle px-3 py-2 text-small text-warning-solid">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {t("emailFailed")}
        </p>
      )}

      {/* Generated link */}
      {link && (
        <div className="flex items-center gap-2 rounded-btn bg-raised px-3 py-2">
          <p className="flex-1 truncate text-small font-technical text-text-secondary">{link}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-btn p-1 transition-colors hover:bg-border"
            aria-label={copied ? t("copied") : t("copy")}
          >
            {copied ? <Check size={14} strokeWidth={1.5} className="text-success-solid" /> : <Copy size={14} strokeWidth={1.5} />}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !email || noSeats}
        className="flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {submitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        {t("submit")}
      </button>
    </form>
  );
}
