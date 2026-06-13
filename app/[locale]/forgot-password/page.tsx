"use client";

import { useState, FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const { requestPasswordReset } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locale = pathname?.split("/")[1] || "en";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      // Anti-enumeration: only a rate limit stops us. Any other case (including a
      // non-existent email, which does not error) advances to the verify screen.
      if (result.rateLimited) {
        setError(t("rateLimited"));
        return;
      }
      router.push(`/${locale}/reset-password?email=${encodeURIComponent(email)}`);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-lg">
        <h1 className="mb-2 text-heading">{t("forgotTitle")}</h1>
        <p className="mb-6 text-small text-text-secondary">{t("forgotSubtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("email")}
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-btn border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
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
            {isSubmitting ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Mail size={16} strokeWidth={1.5} />
            )}
            {isSubmitting ? t("sendingCode") : t("sendCodeCta")}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-1.5 text-body font-medium text-text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
