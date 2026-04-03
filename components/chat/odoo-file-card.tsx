"use client";

import { FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { FileAttachmentMetadata } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useChatContext } from "@/components/app-shell";
import { PinToggleButton } from "@/components/pinned/pin-toggle-button";

interface OdooFileCardProps {
  metadata: FileAttachmentMetadata;
  messageId: string;
}

export function OdooFileCard({ metadata, messageId }: OdooFileCardProps) {
  const t = useTranslations("ChatMessages");
  const fullUrl = `${API_BASE}${metadata.file_url}`;
  const { currentChatId } = useChatContext();
  const { isPinned, togglePinFile } = usePinnedInsights();
  const chatId = currentChatId ?? "";
  const filePinned = isPinned("file", metadata.file_url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-subtle text-error">
          <FileText size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{metadata.filename}</p>
          <p className="text-small text-text-muted font-technical">PDF</p>
        </div>
        <PinToggleButton
          pinned={filePinned}
          onToggle={() => togglePinFile(chatId, messageId, metadata)}
        />
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Download size={16} strokeWidth={1.5} />
          <span>{t("fileCard.downloadPdf")}</span>
        </a>
      </div>
    </motion.div>
  );
}
