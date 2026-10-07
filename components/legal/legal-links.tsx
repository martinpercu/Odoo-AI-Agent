"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/** "Terms · Privacy" footer for the public surfaces (login, register, invite, pricing).
 *  People look for these BEFORE creating an account, so they live outside the app. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const t = useTranslations("Legal");
  const locale = useLocale();
  return (
    <nav
      aria-label={`${t("terms")} · ${t("privacy")}`}
      className={`flex items-center justify-center gap-3 text-micro text-text-muted ${className}`}
    >
      <Link href={`/${locale}/legal/terms`} className="hover:text-foreground hover:underline">
        {t("terms")}
      </Link>
      <span aria-hidden>·</span>
      <Link href={`/${locale}/legal/privacy`} className="hover:text-foreground hover:underline">
        {t("privacy")}
      </Link>
    </nav>
  );
}
