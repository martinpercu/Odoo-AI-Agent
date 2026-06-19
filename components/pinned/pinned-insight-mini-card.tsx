"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { BarChart3, PieChart, TrendingUp, FileText, FileSpreadsheet, X, Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PinnedInsight } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useOdooConfig } from "@/hooks/use-odoo-config";

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
    const abs = Math.abs(total);
    if (abs >= 1_000_000) return `${symbol}${(total / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${symbol}${(total / 1_000).toFixed(1)}K`;
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
  const { isDemoMode, activeConfig } = useOdooConfig();
  const [refreshing, setRefreshing] = useState(false);

  if (pin.kind === "chart") {
    if (!pin.chart) return null;

    const volatility = pin.query_context?.volatility ?? "variable";
    const isLive = volatility === "variable";
    // Refresh only makes sense for live (variable) charts with a real config
    const canRefresh = isLive && !isDemoMode && activeConfig !== null;

    const Icon = chartIcons[pin.chart.chart_type] ?? BarChart3;
    const total = pin.chart.meta.total != null
      ? formatTotal(pin.chart.meta.total, pin.chart.meta.value_format, pin.chart.meta.currency_symbol)
      : null;

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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative flex flex-col gap-1.5 rounded-card border border-border bg-surface p-2.5 transition-colors hover:bg-raised/60"
      >
        {/* Top row: icon + live dot + actions */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-odoo-purple/10 text-odoo-purple">
              <Icon size={12} strokeWidth={1.5} />
            </div>
            {isLive && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success-solid" aria-label={t("liveBadge")} />
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {canRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-md p-1 text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent disabled:opacity-50"
                title={t("refreshTooltip")}
                aria-label={t("refreshTooltip")}
              >
                <RefreshCw size={11} strokeWidth={1.5} className={refreshing ? "animate-spin" : ""} />
              </button>
            )}
            <button
              onClick={() => unpin(pin.id)}
              className="rounded-md p-1 text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
              title={t("unpinTooltip")}
              aria-label={t("unpinTooltip")}
            >
              <X size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="line-clamp-2 text-small font-medium leading-tight text-foreground">
          {pin.chart.title}
        </p>

        {/* Value */}
        {total !== null && (
          <p className="mt-auto font-technical text-small font-semibold text-odoo-purple">
            {total}
          </p>
        )}

        {/* Static badge */}
        {!isLive && (
          <span className="text-micro text-text-muted">{t("historicBadge")}</span>
        )}
      </motion.div>
    );
  }

  if (pin.kind === "file") {
    // Legacy file pins only — PDFs are no longer pinnable (in-memory base64).
    if (!pin.metadata?.file_url) return null;
    const fullUrl = pin.metadata.file_url.startsWith("http")
      ? pin.metadata.file_url
      : `${API_BASE}${pin.metadata.file_url}`;

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative rounded-card border border-border bg-surface p-2.5 transition-colors hover:bg-raised/60"
      >
        <button
          onClick={() => unpin(pin.id)}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-error-subtle hover:text-error group-hover:opacity-100"
          title={t("unpinTooltip")}
          aria-label={t("unpinTooltip")}
        >
          <X size={11} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-error-subtle text-error">
            <FileText size={12} strokeWidth={1.5} />
          </div>
          <p className="min-w-0 flex-1 truncate text-small font-medium text-foreground pr-6">
            {pin.metadata.filename}
          </p>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-accent"
            aria-label={t("downloadTooltip")}
          >
            <Download size={12} strokeWidth={1.5} />
          </a>
        </div>
      </motion.div>
    );
  }

  // excel
  if (!pin.metadata) return null;
  const excelUrl = pin.metadata.export_url.startsWith("http")
    ? pin.metadata.export_url
    : `${API_BASE}${pin.metadata.export_url}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group relative rounded-card border border-border bg-surface p-2.5 transition-colors hover:bg-raised/60"
    >
      <button
        onClick={() => unpin(pin.id)}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-error-subtle hover:text-error group-hover:opacity-100"
        title={t("unpinTooltip")}
        aria-label={t("unpinTooltip")}
      >
        <X size={11} strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success-subtle text-success-solid">
          <FileSpreadsheet size={12} strokeWidth={1.5} />
        </div>
        <p className="min-w-0 flex-1 truncate text-small font-medium text-foreground pr-6">
          {pin.metadata.filename}
        </p>
        <a
          href={excelUrl}
          download
          className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-accent"
          aria-label={t("downloadTooltip")}
        >
          <Download size={12} strokeWidth={1.5} />
        </a>
      </div>
    </motion.div>
  );
}
