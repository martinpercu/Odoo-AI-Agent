"use client";

import { FileSpreadsheet, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ExcelExportMetadata } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useChatContext } from "@/components/app-shell";
import { PinToggleButton } from "@/components/pinned/pin-toggle-button";

interface ExcelExportCardProps {
  metadata: ExcelExportMetadata;
  messageId: string;
}

export function ExcelExportCard({ metadata, messageId }: ExcelExportCardProps) {
  const t = useTranslations("ChatMessages.chart");
  const fullUrl = `${API_BASE}${metadata.export_url}`;
  const { currentChatId } = useChatContext();
  const { isPinned, togglePinExcel } = usePinnedInsights();
  const chatId = currentChatId ?? "";
  const excelPinned = isPinned("excel", metadata.export_url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-solid">
          <FileSpreadsheet size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{metadata.filename}</p>
          <p className="text-small text-text-secondary font-technical">{t("exportReady")}</p>
        </div>
        <PinToggleButton
          pinned={excelPinned}
          onToggle={() => togglePinExcel(chatId, messageId, metadata)}
        />
        <a
          href={fullUrl}
          download
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <Download size={16} strokeWidth={1.5} />
          <span>{t("downloadExcel")}</span>
        </a>
      </div>
    </motion.div>
  );
}
