"use client";

import { useState, FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const { register, isLoading: authLoading } = useAuth();
  const { reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locale = pathname?.split("/")[1] || "en";

  // Redirect in DEV MODE — register is not meaningful without Supabase
  if (!IS_AUTH_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg)">
        <div className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-surface) p-8 text-center shadow-lg">
          <p className="mb-4 text-sm text-(--color-muted)">{t("devMode")}</p>
          <Link
            href={`/${locale}/login`}
            className="text-sm font-medium text-(--color-primary) hover:underline"
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
      const result = await register(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      const me = await reload();
      if (me?.org) {
        router.push(`/${locale}/chat`);
      } else {
        router.push(`/${locale}/onboarding`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg)">
      <div className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-surface) p-8 shadow-lg">
        <h1 className="mb-6 text-xl font-semibold text-(--color-text)">
          {t("registerTitle")}
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
              className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--color-text)">
              {t("password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
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
            {isSubmitting ? t("registering") : t("registerCta")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-(--color-muted)">
          {t("hasAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-(--color-primary) hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
