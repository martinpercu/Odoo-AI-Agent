"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Wraps a page and redirects to /login if no authenticated user.
 * In DEV MODE (no Supabase), always renders children.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] || "en";

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login?next=${encodeURIComponent(pathname ?? "")}`);
    }
  }, [user, isLoading, locale, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
