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
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg)">
        <div className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-surface) p-8 text-center shadow-lg">
          <p className="mb-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            {t("devMode")}
          </p>
          <p className="mb-6 text-xs text-(--color-muted)">
            {t("devModeDesc")}
          </p>
          <button
            onClick={() => router.push(nextPath)}
            className="w-full rounded-lg bg-(--color-primary) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {t("devModeContinue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg)">
      <div className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-surface) p-8 shadow-lg">
        <h1 className="mb-6 text-xl font-semibold text-(--color-text)">
          {t("loginTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--color-text)">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) placeholder-text-(--color-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--color-text)">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || authLoading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-(--color-primary) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? t("loggingIn") : t("loginCta")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-(--color-muted)">
          {t("noAccount")}{" "}
          <Link
            href={`/${locale}/register`}
            className="font-medium text-(--color-primary) hover:underline"
          >
            {t("registerLink")}
          </Link>
        </p>

        {demoAvailable && (
          <div className="mt-4 border-t border-(--color-border) pt-4">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/chat`)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-(--color-border) px-4 py-2.5 text-sm font-medium text-(--color-text) hover:bg-(--color-hover) transition-colors"
            >
              <Zap size={14} className="text-amber-500" />
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
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
