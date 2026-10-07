import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { PRIVACY } from "@/lib/legal/privacy";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { title: `${PRIVACY.title} · TheOdooAgent` };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocumentView doc={PRIVACY} kind="privacy" locale={locale} />;
}
