"use client";

import { Printer } from "lucide-react";

/** "Download as PDF" without generating one: the browser's print dialog saves a PDF,
 *  and the page carries `print:` styles so what comes out is just the document. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-btn-sm items-center gap-2 rounded-btn border border-border px-3 text-small font-medium text-text-secondary transition-colors hover:bg-raised hover:text-foreground print:hidden"
    >
      <Printer size={16} strokeWidth={1.5} aria-hidden />
      {label}
    </button>
  );
}
