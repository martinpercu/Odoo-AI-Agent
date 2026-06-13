"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { resolvePostAuthPath } from "@/lib/post-auth";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const { meData, isLoading: sessionLoading } = useSession();

  const locale = pathname?.split("/")[1] || "en";

  useEffect(() => {
    if (authLoading || sessionLoading) return;

    if (!user) {
      router.push(`/${locale}/chat`);
      return;
    }

    if (!meData) {
      // Session not yet loaded — wait for next tick
      return;
    }

    // Auto-provisioned admins have an org but no instance — resolvePostAuthPath sends
    // them to the first-instance gate (unless they chose demo). SUPERADMIN handled inside.
    router.push(`/${locale}/${resolvePostAuthPath(meData)}`);
  }, [authLoading, sessionLoading, user, meData, locale, router]);

  return null;
}
