"use client";

import type { ReactNode } from "react";

/**
 * Visual scaffolding for the two-block "instance data vs your credentials" form
 * (onboarding + InstanceCreateForm). Inspired by the storytelling slide: one card,
 * the two groups separated by a subtle dashed divider, each headed by a legend
 * (mono uppercase tag chip + label + right-aligned subtext).
 */

type Tone = "shared" | "personal";

export function CredentialBlockLegend({
  tag,
  label,
  sub,
  tone,
}: {
  tag: string;
  label: string;
  sub: string;
  tone: Tone;
}) {
  // DS v2.1: odoo-purple is logo-only, so "personal" uses a neutral raised chip.
  const chipCls =
    tone === "shared"
      ? "bg-accent-subtle text-accent"
      : "bg-raised text-text-secondary";
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={`rounded-btn px-2 py-0.5 font-technical text-micro uppercase tracking-wide ${chipCls}`}
      >
        {tag}
      </span>
      <span className="text-small font-medium text-foreground">{label}</span>
      <span className="ml-auto text-small text-text-muted">{sub}</span>
    </div>
  );
}

/** Card wrapper that draws a dashed divider between its block children. */
export function CredentialBlocksCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {children}
    </div>
  );
}

/** One block inside CredentialBlocksCard. Adds the dashed top divider from the 2nd on. */
export function CredentialBlock({
  children,
  divider = false,
}: {
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={`p-5 ${divider ? "border-t border-dashed border-border" : ""}`}>
      {children}
    </div>
  );
}
