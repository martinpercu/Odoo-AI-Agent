"use client";

import { motion } from "framer-motion";
import { BarChart3, PieChart, TrendingUp, FileText, FileSpreadsheet, X, Download } from "lucide-react";
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
  const { unpin } = usePinnedInsights();

  if (pin.kind === "chart") {
    const Icon = chartIcons[pin.chart.chart_type] ?? BarChart3;
    const total = formatTotal(pin.chart.meta.total, pin.chart.meta.value_format, pin.chart.meta.currency_symbol);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
      >
        <button
          onClick={() => unpin(pin.id)}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title={t("unpinTooltip")}
        >
          <X size={12} />
        </button>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-odoo-purple/10 text-odoo-purple">
            <Icon size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight">{pin.chart.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{total}</p>
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
      >
        <button
          onClick={() => unpin(pin.id)}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title={t("unpinTooltip")}
        >
          <X size={12} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600">
            <FileText size={14} />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{pin.metadata.filename}</p>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-odoo-purple"
          >
            <Download size={12} />
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <button
        onClick={() => unpin(pin.id)}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title={t("unpinTooltip")}
      >
        <X size={12} />
      </button>
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: "#1D6F42", opacity: 0.8 }}>
          <FileSpreadsheet size={14} />
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-medium">{pin.metadata.filename}</p>
        <a
          href={excelUrl}
          download
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-odoo-purple"
        >
          <Download size={12} />
        </a>
      </div>
    </motion.div>
  );
}
