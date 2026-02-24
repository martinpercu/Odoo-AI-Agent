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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{metadata.filename}</p>
          <p className="text-xs text-muted-foreground">PDF</p>
        </div>
        <PinToggleButton
          pinned={filePinned}
          onToggle={() => togglePinFile(chatId, messageId, metadata)}
        />
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "var(--odoo-purple)" }}
        >
          <Download size={16} />
          <span>{t("fileCard.downloadPdf")}</span>
        </a>
      </div>
    </motion.div>
  );
}
