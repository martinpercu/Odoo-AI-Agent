"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { resolvePostAuthPath } from "@/lib/post-auth";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2, Zap } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const ACCESS_CODE = process.env.NEXT_PUBLIC_ACCESS_CODE ?? "odoopower";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const { register, isLoading: authLoading, user } = useAuth();
  const { reload, meData } = useSession();
  const demoAvailable = meData?.demo_available ?? false;
  const router = useRouter();
  const pathname = usePathname();

  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessCodeValid = accessCode === ACCESS_CODE;
  const showAccessError = accessCode.length > 0 && !accessCodeValid;

  const locale = pathname?.split("/")[1] || "en";

  // Redirect already-logged-in users
  useEffect(() => {
    if (!authLoading && user && meData) {
      router.replace(`/${locale}/${resolvePostAuthPath(meData)}`);
    }
  }, [authLoading, user, meData, locale, router]);

  // Redirect in DEV MODE — register is not meaningful without Supabase
  if (!IS_AUTH_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center shadow-lg">
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await register(email, password, locale);
      if (result.error) {
        setError(result.error);
        return;
      }
      const me = await reload();
      router.push(`/${locale}/${me ? resolvePostAuthPath(me) : "onboarding"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-lg">
        {/* Founding Partners framing (Fase 0, spec §2) — sits above the existing form */}
        <div className="mb-6">
          <h1 className="mb-5 text-center text-heading leading-relaxed">
            {t.rich("foundingTitle", {
              br: () => <br />,
            })}
          </h1>
          <p className="mb-2 text-small text-text-secondary">
            {t.rich("foundingLine1", {
              prog: (chunks) => (
                <InfoTooltip text={t("programTooltip")}>{chunks}</InfoTooltip>
              ),
            })}
          </p>
          <p className="text-small text-text-secondary">
            {t.rich("foundingLine2", {
              prog: (chunks) => (
                <InfoTooltip text={t("programTooltip")}>{chunks}</InfoTooltip>
              ),
            })}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-micro font-medium uppercase tracking-wide text-accent">
              <InfoTooltip text={t("scarcityTooltip")} className="text-accent uppercase">
                {t("foundingScarcity")}
              </InfoTooltip>
            </p>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={t("accessCodePlaceholder")}
              className="w-40 shrink-0 rounded-btn border border-border bg-base px-2.5 py-1 text-small text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="off"
            />
          </div>
          {showAccessError && (
            <p className="mt-1.5 rounded-md bg-error-subtle px-3 py-2 text-small text-error">
              {t("accessCodeError")}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-md border border-border bg-base px-3 py-2 text-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("password")}
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="rounded-md bg-error-subtle px-3 py-2 text-body text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || authLoading || !accessCodeValid}
            className="mt-1 flex h-btn-md items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {isSubmitting ? t("registering") : t("registerCta")}
          </button>
        </form>

        <p className="mt-5 text-center text-body text-text-muted">
          {t("hasAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-accent hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>

        {demoAvailable && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/chat`)}
              className="flex h-btn-md w-full items-center justify-center gap-2 rounded-btn border border-border px-4 text-body font-medium text-foreground hover:bg-raised transition-colors"
            >
              <Zap size={16} strokeWidth={1.5} className="text-warning-solid" />
              {t("tryDemo")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
