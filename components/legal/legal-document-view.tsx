import Link from "next/link";
import { Wordmark } from "@/components/AgentMark";
import { PrintButton } from "@/components/legal/print-button";
import { LEGAL_UPDATED, type LegalBlock, type LegalDocument } from "@/lib/legal/types";

// Server component. The chrome of these pages is in English like the documents
// themselves (see lib/legal/types.ts) — a Spanish "Volver" over an English contract
// would read as if a translation were missing.

type Kind = "terms" | "privacy";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "terms", label: "Terms of Service" },
  { kind: "privacy", label: "Privacy Policy" },
];

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p className="text-body leading-relaxed text-text-secondary">{block}</p>;
  }
  if ("list" in block) {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-5 text-body leading-relaxed text-text-secondary marker:text-text-muted">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-left text-small">
        <thead className="bg-raised">
          <tr>
            {block.table.head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 align-top ${i === 0 ? "font-medium text-foreground" : "text-text-secondary"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalDocumentView({
  doc,
  kind,
  locale,
}: {
  doc: LegalDocument;
  kind: Kind;
  locale: string;
}) {
  return (
    <div className="min-h-screen bg-base text-foreground">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href={`/${locale}`} aria-label="TheOdooAgent home" className="text-foreground">
            <Wordmark scale={0.8} />
          </Link>
          <nav aria-label="Legal documents" className="flex gap-1">
            {TABS.map((tab) => {
              const active = tab.kind === kind;
              return (
                <Link
                  key={tab.kind}
                  href={`/${locale}/legal/${tab.kind}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-btn px-3 py-1.5 text-small font-medium transition-colors ${
                    active
                      ? "bg-accent-subtle text-accent"
                      : "text-text-secondary hover:bg-raised hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:py-0">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display">{doc.title}</h1>
            <p className="mt-2 text-small text-text-muted">Last updated: {LEGAL_UPDATED}</p>
          </div>
          <PrintButton label="Save as PDF" />
        </div>

        {doc.summary && (
          <section className="mb-10 rounded-card border border-border bg-surface p-5 print:border-0 print:p-0">
            <h2 className="mb-3 text-subheading font-semibold">{doc.summary.heading}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-body leading-relaxed text-text-secondary marker:text-accent">
              {doc.summary.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="mb-10 flex flex-col gap-4">
          {doc.intro.map((p) => (
            <p key={p} className="text-body leading-relaxed text-text-secondary">
              {p}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 break-inside-avoid-page">
              <h2 className="mb-3 text-subheading font-semibold text-foreground">{s.heading}</h2>
              <div className="flex flex-col gap-3">
                {s.body.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
