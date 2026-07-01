"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { resolvePostAuthPath } from "@/lib/post-auth";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2, Zap, Check } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { FoundingInfoModal } from "@/components/pricing/founding-info-modal";

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
  const [infoOpen, setInfoOpen] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  const accessCodeValid = accessCode === ACCESS_CODE;
  // Only scold once the user has left the field — never mid-typing.
  const showAccessError = codeTouched && accessCode.length > 0 && !accessCodeValid;

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
            <div className="relative w-40 shrink-0">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  // Clear the error the moment they resume editing.
                  setCodeTouched(false);
                }}
                onBlur={() => setCodeTouched(true)}
                placeholder={t("accessCodePlaceholder")}
                className={`w-full rounded-btn border bg-base py-1 pl-2.5 pr-7 text-small text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 ${
                  accessCodeValid
                    ? "border-success-solid focus:ring-success-solid/30"
                    : "border-border focus:ring-accent/30"
                }`}
                autoComplete="off"
              />
              {accessCodeValid && (
                <Check
                  size={16}
                  strokeWidth={2}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-success-solid"
                />
              )}
            </div>
          </div>
          {showAccessError && (
            <p className="mt-1.5 rounded-md bg-error-subtle px-3 py-2 text-small text-error">
              {t.rich("accessCodeError", {
                mail: (chunks) => (
                  <a
                    href={`mailto:${t("requestAccessEmail")}?subject=${encodeURIComponent(
                      "Founding Partners"
                    )}`}
                    className="font-medium underline hover:no-underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}
          {/* Subtle path in for visitors without a code → email Martin */}
          {!showAccessError && (
            <p className="mt-2 text-micro text-text-muted">
              {t.rich("requestAccess", {
                mail: (chunks) => (
                  <a
                    href={`mailto:${t("requestAccessEmail")}?subject=${encodeURIComponent(
                      "Founding Partners"
                    )}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
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
            disabled={isSubmitting || authLoading}
            aria-disabled={!accessCodeValid}
            onClick={(e) => {
              // Gated by the invitation code: the button looks disabled but is
              // clickable so a visitor without a code gets the path in (modal →
              // email Martin) instead of a dead control.
              if (!accessCodeValid) {
                e.preventDefault();
                setInfoOpen(true);
              }
            }}
            className={`mt-1 flex h-btn-md items-center justify-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50 ${
              !accessCodeValid ? "opacity-50" : ""
            }`}
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

      <FoundingInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
