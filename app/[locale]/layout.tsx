import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/hooks/use-auth";
import { SessionProvider } from "@/hooks/use-session";
import { OdooConfigProvider } from "@/hooks/use-odoo-config";
import { PinnedInsightsProvider } from "@/hooks/use-pinned-insights";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ToastProvider } from "@/components/ui/error-toast";
import { LimitReachedModalProvider } from "@/hooks/use-limit-reached-modal";
import { LimitReachedModal } from "@/components/ui/limit-reached-modal";
import { AppShell } from "@/components/app-shell";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <AuthProvider>
            <SessionProvider>
              <OdooConfigProvider>
                <ToastProvider>
                  <LimitReachedModalProvider>
                    <NotificationProvider>
                      <PinnedInsightsProvider>
                        <AppShell>{children}</AppShell>
                        <LimitReachedModal />
                      </PinnedInsightsProvider>
                    </NotificationProvider>
                  </LimitReachedModalProvider>
                </ToastProvider>
              </OdooConfigProvider>
            </SessionProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
