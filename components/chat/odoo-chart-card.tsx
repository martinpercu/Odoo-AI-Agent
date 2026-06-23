"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart as PieIcon, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ChartSSEEvent } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useChatContext } from "@/components/app-shell";
import { PinToggleButton } from "@/components/pinned/pin-toggle-button";

// Brand indigo palette for pie charts (Rule 3: odoo-purple is logo-only)
const PIE_COLORS = ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"];

function formatValue(
  val: number,
  format: string,
  symbol: string,
  noDecimals = false
): string {
  switch (format) {
    case "currency": {
      const decimals = noDecimals ? 0 : 2;
      return `${symbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val)}`;
    }
    case "integer":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
    case "decimal":
    case "number":
    default:
      return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }
}

function formatAxisValue(
  val: number,
  format: string,
  symbol: string,
  noDecimals = false
): string {
  if (format !== "currency" && format !== "decimal" && format !== "number") {
    return formatValue(val, format, symbol, noDecimals);
  }

  const abs = Math.abs(val);
  let compact: string;

  if (abs >= 1_000_000_000_000) {
    compact = `${parseFloat((val / 1_000_000_000_000).toFixed(1))}T`;
  } else if (abs >= 1_000_000_000) {
    compact = `${parseFloat((val / 1_000_000_000).toFixed(1))}B`;
  } else if (abs >= 1_000_000) {
    compact = `${parseFloat((val / 1_000_000).toFixed(1))}M`;
  } else if (abs >= 1_000) {
    compact = `${parseFloat((val / 1_000).toFixed(1))}K`;
  } else {
    const decimals = noDecimals ? 0 : 2;
    compact = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  }

  return format === "currency" ? `${symbol}${compact}` : compact;
}

function ChartTooltip(props: Record<string, unknown> & { meta: ChartSSEEvent["meta"] }) {
  const { active, payload, label, meta } = props as {
    active?: boolean;
    payload?: { value?: number; name?: string }[];
    label?: string | number;
    meta: ChartSSEEvent["meta"];
  };
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-small font-medium text-foreground">{label ?? payload[0].name}</p>
      <p className="text-body font-semibold font-technical text-accent">
        {formatValue(payload[0].value as number, meta.value_format, meta.currency_symbol, meta.no_decimals)}
      </p>
    </div>
  );
}

function truncateLabel(label: string, maxLen: number = 14): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
}

interface OdooChartCardProps {
  chart: ChartSSEEvent;
  messageId: string;
  chartIndex: number;
}

export function OdooChartCard({ chart, messageId, chartIndex }: OdooChartCardProps) {
  const t = useTranslations("ChatMessages.chart");
  const { chart_type, title, data, meta } = chart;
  const { currentChatId } = useChatContext();
  const { isPinned, togglePinChart } = usePinnedInsights();
  const chatId = currentChatId ?? "";
  const pinIdentifier = `${chatId}:${messageId}:${chartIndex}`;
  const chartPinned = isPinned("chart", pinIdentifier);

  // Detect narrow container via ResizeObserver for container-query-like behavior
  const [isNarrow, setIsNarrow] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 400);
      }
    });
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef]);

  const chartIcon =
    chart_type === "bar" ? <BarChart3 size={16} strokeWidth={1.5} /> :
    chart_type === "line" ? <TrendingUp size={16} strokeWidth={1.5} /> :
    <PieIcon size={16} strokeWidth={1.5} />;

  const isHorizontalBar = chart_type === "bar" && isNarrow;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
          {chartIcon}
        </div>
        <h3 className="text-body font-semibold text-foreground leading-tight flex-1">
          {title}
        </h3>
        <PinToggleButton
          pinned={chartPinned}
          onToggle={() => togglePinChart(chatId, messageId, chartIndex, chart)}
          volatility={chart.query_context?.volatility}
        />
        {chart.export_url && (
          <a
            href={`${API_BASE}${chart.export_url}`}
            download
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-small font-medium text-accent transition-colors hover:bg-accent-subtle"
          >
            <Download size={14} strokeWidth={1.5} />
            <span>{t("downloadExcel")}</span>
          </a>
        )}
      </div>

      {/* Chart area */}
      <div ref={setContainerRef} className="w-full">
        {data.length === 0 ? (
          <p className="py-8 text-center text-body text-text-secondary">
            {t("noData")}
          </p>
        ) : (
          <div style={{ width: "100%", height: isHorizontalBar ? Math.max(data.length * 40, 200) : 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chart_type === "bar" ? (
                isHorizontalBar ? (
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals)}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      tickFormatter={(v) => truncateLabel(v, 12)}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                    <Bar dataKey="value" fill="var(--brand)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      tickFormatter={(v) => truncateLabel(v)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals)}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                    <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )
              ) : chart_type === "line" ? (
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={(v) => truncateLabel(v)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals)}
                  />
                  <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--brand)"
                    strokeWidth={2}
                    fill="url(#purpleGradient)"
                  />
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="label"
                    label={({ name, percent }) =>
                      `${truncateLabel(name ?? "", 10)} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "var(--color-text-secondary)", strokeWidth: 1 }}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer: total */}
      {meta.total != null && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-text-secondary">
            {t("globalTotal")}
          </span>
          <span className="text-body font-semibold font-technical text-accent">
            {formatValue(meta.total, meta.value_format, meta.currency_symbol, meta.no_decimals)}
          </span>
        </div>
      )}

      {/* Grouped by info */}
      {meta.group_by && (
        <div className="mt-1 text-small text-text-secondary">
          {t("groupedBy")}: <span className="font-technical font-medium">{meta.group_by}</span>
        </div>
      )}
    </motion.div>
  );
}
