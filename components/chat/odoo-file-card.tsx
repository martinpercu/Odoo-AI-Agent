"use client";

import { FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { FileAttachmentMetadata } from "@/lib/types";

interface OdooFileCardProps {
  metadata: FileAttachmentMetadata;
  messageId: string;
}

/** Build a Blob from the in-memory base64 PDF and trigger an "al aire" download. */
function downloadActionReport(metadata: FileAttachmentMetadata) {
  if (!metadata.pdf_base64) return;
  const bytes = Uint8Array.from(atob(metadata.pdf_base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: metadata.mimetype || "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = metadata.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function OdooFileCard({ metadata }: OdooFileCardProps) {
  const t = useTranslations("ChatMessages");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-subtle text-error">
          <FileText size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{metadata.filename}</p>
          <p className="text-small text-text-muted font-technical">PDF</p>
        </div>
        <button
          type="button"
          onClick={() => downloadActionReport(metadata)}
          className="inline-flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Download size={16} strokeWidth={1.5} />
          <span>{t("fileCard.downloadPdf")}</span>
        </button>
      </div>
    </motion.div>
  );
}
