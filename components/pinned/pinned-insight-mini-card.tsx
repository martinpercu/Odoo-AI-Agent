"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { BarChart3, PieChart, TrendingUp, FileText, FileSpreadsheet, X, Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PinnedInsight } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";

interface PinnedInsightMiniCardProps {
  pin: PinnedInsight;
}

const chartIcons = {
  bar: BarChart3,
  pie: PieChart,
  line: TrendingUp,
};

function formatTotal(total: number, format: string, symbol: string): string {
  if (format === "currency") {
    return `${symbol}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === "integer") {
    return total.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return total.toLocaleString();
}

export function PinnedInsightMiniCard({ pin }: PinnedInsightMiniCardProps) {
  const t = useTranslations("PinnedInsights");
  const { unpin, refreshPin } = usePinnedInsights();
  const [refreshing, setRefreshing] = useState(false);

  if (pin.kind === "chart") {
    const Icon = chartIcons[pin.chart.chart_type] ?? BarChart3;
    const total = formatTotal(pin.chart.meta.total, pin.chart.meta.value_format, pin.chart.meta.currency_symbol);

    async function handleRefresh() {
      setRefreshing(true);
      try {
        await refreshPin(pin.id, pin.chatId);
      } finally {
        setRefreshing(false);
      }
    }

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative rounded-md border border-border bg-surface p-3 transition-colors hover:bg-raised/50"
      >
        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={12} strokeWidth={1.5} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => unpin(pin.id)}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
            title={t("unpinTooltip")}
            aria-label={t("unpinTooltip")}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-odoo-purple/10 text-odoo-purple">
            <Icon size={14} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-medium leading-tight">{pin.chart.title}</p>
            <p className="mt-0.5 text-micro font-technical text-text-secondary">{total}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (pin.kind === "file") {
    const fullUrl = pin.metadata.file_url.startsWith("http")
      ? pin.metadata.file_url
      : `${API_BASE}${pin.metadata.file_url}`;

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative rounded-md border border-border bg-surface p-3 transition-colors hover:bg-raised/50"
      >
        <button
          onClick={() => unpin(pin.id)}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-error-subtle hover:text-error group-hover:opacity-100"
          title={t("unpinTooltip")}
          aria-label={t("unpinTooltip")}
        >
          <X size={12} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-error-subtle text-error">
            <FileText size={14} strokeWidth={1.5} />
          </div>
          <p className="min-w-0 flex-1 truncate text-small font-medium">{pin.metadata.filename}</p>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-accent"
            aria-label="Download file"
          >
            <Download size={12} strokeWidth={1.5} />
          </a>
        </div>
      </motion.div>
    );
  }

  // excel
  const excelUrl = pin.metadata.export_url.startsWith("http")
    ? pin.metadata.export_url
    : `${API_BASE}${pin.metadata.export_url}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group relative rounded-md border border-border bg-surface p-3 transition-colors hover:bg-raised/50"
    >
      <button
        onClick={() => unpin(pin.id)}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-error-subtle hover:text-error group-hover:opacity-100"
        title={t("unpinTooltip")}
        aria-label={t("unpinTooltip")}
      >
        <X size={12} strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success-subtle text-success-solid">
          <FileSpreadsheet size={14} strokeWidth={1.5} />
        </div>
        <p className="min-w-0 flex-1 truncate text-small font-medium">{pin.metadata.filename}</p>
        <a
          href={excelUrl}
          download
          className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-accent"
          aria-label="Download Excel"
        >
          <Download size={12} strokeWidth={1.5} />
        </a>
      </div>
    </motion.div>
  );
}
