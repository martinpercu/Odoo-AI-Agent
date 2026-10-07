"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

/** The signup checkbox. Native `required`: the browser blocks the submit and says why,
 *  in the user's language, with no extra copy of ours. The links open in a new tab so
 *  reading the terms doesn't throw away a half-filled form. */
export function LegalConsent({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useTranslations("Legal");
  const locale = useLocale();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-small text-text-secondary">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
      />
      <span>{t.rich("accept", {
          terms: (chunks) => <DocLink href={`/${locale}/legal/terms`}>{chunks}</DocLink>,
          privacy: (chunks) => <DocLink href={`/${locale}/legal/privacy`}>{chunks}</DocLink>,
        })}</span>
    </label>
  );
}

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
      {children}
    </a>
  );
}
