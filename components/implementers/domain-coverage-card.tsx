"use client";

import { useTranslations } from "next-intl";
import { Check, EyeOff, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Coverage card for one Odoo domain (Block A of the implementer manual).
 *
 * Deliberately NOT a binary "read / write" badge: write support is uneven even
 * inside a single domain, so each card lists the concrete confirmed write
 * actions (or says "read only for now") — a generic badge would over-promise.
 * Odoo model names are passed through untranslated on purpose.
 */
export function DomainCoverageCard({
  icon: Icon,
  name,
  models,
  read,
  writes,
  limit,
}: {
  icon: LucideIcon;
  name: string;
  models: readonly string[];
  read: string;
  writes: readonly string[];
  limit?: string;
}) {
  const t = useTranslations("ImplementerManual.coverage");

  return (
    <article className="flex flex-col rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <h3 className="text-subheading">{name}</h3>
      </div>

      <Label>{t("modelsLabel")}</Label>
      <ul className="mb-4 flex flex-wrap gap-1.5">
        {models.map((model) => (
          <li
            key={model}
            className="rounded-btn border border-border bg-base px-2 py-0.5 font-technical text-small text-text-secondary"
          >
            {model}
          </li>
        ))}
      </ul>

      <Label>{t("readLabel")}</Label>
      <p className="mb-4 text-small text-text-secondary">{read}</p>

      {writes.length > 0 ? (
        <>
          <Label>{t("writeLabel")}</Label>
          <ul className="space-y-1.5">
            {writes.map((write) => (
              <li key={write} className="flex items-start gap-2 text-small text-text-secondary">
                <Check
                  size={14}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-success-solid"
                  aria-hidden="true"
                />
                <span>{write}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="flex items-start gap-2 text-small text-text-secondary">
          <EyeOff
            size={14}
            strokeWidth={1.5}
            className="mt-1 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <span>{t("readOnlyLabel")}</span>
        </p>
      )}

      {limit && (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-small text-text-muted">
          <Info size={14} strokeWidth={1.5} className="mt-1 shrink-0" aria-hidden="true" />
          <span>{limit}</span>
        </p>
      )}
    </article>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-micro uppercase tracking-wide text-text-muted">{children}</p>
  );
}
