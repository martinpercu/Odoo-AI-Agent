import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { TERMS } from "@/lib/legal/terms";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { title: `${TERMS.title} · TheOdooAgent` };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocumentView doc={TERMS} kind="terms" locale={locale} />;
}
