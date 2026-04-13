"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const { meData, isLoading: sessionLoading } = useSession();

  const locale = pathname?.split("/")[1] || "en";

  useEffect(() => {
    if (authLoading || sessionLoading) return;

    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    if (!meData) {
      // Session not yet loaded — wait for next tick
      return;
    }

    if (meData.org === null) {
      router.push(`/${locale}/onboarding`);
      return;
    }

    router.push(`/${locale}/chat`);
  }, [authLoading, sessionLoading, user, meData, locale, router]);

  return null;
}
