"use client";

import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";

export function DemoBanner() {
  const t = useTranslations("Auth");
  const { user } = useAuth();
  const { meData } = useSession();

  // Logged-in user with no org yet → point to onboarding
  const loggedInNoOrg = !!user && !meData?.org;

  const ctaHref = loggedInNoOrg ? "/onboarding" : "/login";
  const ctaText = loggedInNoOrg ? t("demoConnectOdoo") : t("demoSignUp");
  const bannerText = loggedInNoOrg ? t("demoBannerConnectOdoo") : t("demoBanner");

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-warning-subtle px-4 py-2 text-small text-warning-solid shrink-0">
      <div className="flex items-center gap-2">
        <Zap size={16} strokeWidth={1.5} className="shrink-0" />
        <span>{bannerText}</span>
      </div>
      <Link href={ctaHref} className="shrink-0 font-medium underline underline-offset-2 hover:no-underline">
        {ctaText}
      </Link>
    </div>
  );
}
