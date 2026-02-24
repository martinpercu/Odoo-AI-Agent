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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "#1D6F42" }}>
          <FileSpreadsheet size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{metadata.filename}</p>
          <p className="text-xs text-muted-foreground">{t("exportReady")}</p>
        </div>
        <PinToggleButton
          pinned={excelPinned}
          onToggle={() => togglePinExcel(chatId, messageId, metadata)}
        />
        <a
          href={fullUrl}
          download
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1D6F42" }}
        >
          <Download size={16} />
          <span>{t("downloadExcel")}</span>
        </a>
      </div>
    </motion.div>
  );
}
