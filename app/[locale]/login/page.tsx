"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2, Zap } from "lucide-react";

function LoginContent() {
  const t = useTranslations("Auth");
  const { login, isLoading: authLoading } = useAuth();
  const { reload, meData } = useSession();
  const demoAvailable = meData?.demo_available ?? false;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locale = pathname?.split("/")[1] || "en";
  const nextPath = searchParams.get("next") || `/${locale}/chat`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      const me = await reload();
      if (!me || me.org === null) {
        router.push(`/${locale}/onboarding`);
      } else {
        router.push(nextPath);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!IS_AUTH_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center shadow-lg">
          <p className="mb-2 text-body font-medium text-warning-solid">
            {t("devMode")}
          </p>
          <p className="mb-6 text-small text-text-muted">
            {t("devModeDesc")}
          </p>
          <button
            onClick={() => router.push(nextPath)}
            className="h-9 w-full rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            {t("devModeContinue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-lg">
        <h1 className="mb-6 text-heading">
          {t("loginTitle")}
        </h1>

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
              className="rounded-md border border-border bg-base px-3 py-2 text-body text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-medium text-text-secondary">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-md border border-border bg-base px-3 py-2 text-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
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
            className="mt-1 flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {isSubmitting ? t("loggingIn") : t("loginCta")}
          </button>
        </form>

        <p className="mt-5 text-center text-body text-text-muted">
          {t("noAccount")}{" "}
          <Link
            href={`/${locale}/register`}
            className="font-medium text-accent hover:underline"
          >
            {t("registerLink")}
          </Link>
        </p>

        {demoAvailable && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/chat`)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-body font-medium text-foreground hover:bg-raised transition-colors"
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
