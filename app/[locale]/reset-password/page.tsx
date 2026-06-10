"use client";

import { useState, useEffect, useRef, FormEvent, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { supabase, IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

const RESEND_COOLDOWN = 45; // seconds — avoids hammering Supabase (429)
const MIN_PASSWORD = 6;

function ResetPasswordContent() {
  const t = useTranslations("Auth");
  const { verifyRecoveryCode, updatePassword, requestPasswordReset } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const locale = pathname?.split("/")[1] || "en";
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setError(null);
    const result = await requestPasswordReset(email);
    if (result.rateLimited) {
      setError(t("rateLimited"));
    }
    setCooldown(RESEND_COOLDOWN);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t("missingEmail"));
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError(t("codeInvalidFormat"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const verify = await verifyRecoveryCode(email, code);
      if (verify.error) {
        setError(t("codeIncorrect"));
        return;
      }
      const update = await updatePassword(password);
      if (update.error) {
        // Supabase policy message (length/complexity) — surface as-is.
        setError(update.error);
        return;
      }
      // Option A: force re-login. Drop the OTP session so the user proves the
      // new password works.
      await supabase?.auth.signOut();
      setDone(true);
    } catch {
      setError(t("connectionError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!IS_AUTH_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 text-center shadow-lg">
          <p className="mb-4 text-body text-text-muted">{t("devMode")}</p>
          <Link
            href={`/${locale}/login`}
            className="text-body font-medium text-accent hover:underline"
          >
            {t("loginLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <CheckCircle2 size={40} strokeWidth={1.5} className="text-success-solid" />
          </div>
          <h1 className="mb-2 text-heading">{t("resetSuccessTitle")}</h1>
          <p className="mb-6 text-small text-text-secondary">{t("resetSuccessDesc")}</p>
          <button
            onClick={() => router.replace(`/${locale}/login`)}
            className="flex h-btn-md w-full items-center justify-center rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            {t("goToLogin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-lg">
        <h1 className="mb-2 text-heading">{t("resetTitle")}</h1>
        <p className="mb-6 text-small text-text-secondary">
          {email ? t("resetSubtitle", { email }) : t("missingEmail")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("code")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="rounded-btn border border-border bg-base px-3 py-2 text-center text-heading tracking-[0.4em] text-foreground placeholder:text-text-muted placeholder:tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("newPassword")}
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              minLength={MIN_PASSWORD}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("confirmPassword")}
            </label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              required
              minLength={MIN_PASSWORD}
            />
          </div>

          {error && (
            <p className="rounded-btn bg-error-subtle px-3 py-2 text-body text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex h-btn-md items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {isSubmitting ? t("resetting") : t("resetCta")}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-body">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-1.5 font-medium text-text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            {t("backToLogin")}
          </Link>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-medium text-accent hover:underline disabled:text-text-muted disabled:no-underline"
          >
            {cooldown > 0 ? t("resendCodeIn", { seconds: cooldown }) : t("resendCode")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
