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

// Purple palette for pie charts
const PIE_COLORS = ["#714B67", "#8d6584", "#a87fa1", "#c49bbe", "#deb8db"];

function formatValue(
  val: number,
  format: string,
  symbol: string
): string {
  switch (format) {
    case "currency":
      return `${symbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
    case "integer":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
    case "decimal":
    case "number":
    default:
      return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }
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
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{label ?? payload[0].name}</p>
      <p className="text-sm font-semibold text-odoo-purple">
        {formatValue(payload[0].value as number, meta.value_format, meta.currency_symbol)}
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
    chart_type === "bar" ? <BarChart3 size={16} /> :
    chart_type === "line" ? <TrendingUp size={16} /> :
    <PieIcon size={16} />;

  const isHorizontalBar = chart_type === "bar" && isNarrow;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-3 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-odoo-purple/10 text-odoo-purple">
          {chartIcon}
        </div>
        <h3 className="text-sm font-semibold text-foreground leading-tight flex-1">
          {title}
        </h3>
        <PinToggleButton
          pinned={chartPinned}
          onToggle={() => togglePinChart(chatId, messageId, chartIndex, chart)}
        />
        {chart.export_url && (
          <a
            href={`${API_BASE}${chart.export_url}`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-odoo-purple transition-colors hover:bg-odoo-purple/10"
          >
            <Download size={14} />
            <span>{t("downloadExcel")}</span>
          </a>
        )}
      </div>

      {/* Chart area */}
      <div ref={setContainerRef} className="w-full">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
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
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => formatValue(v, meta.value_format, meta.currency_symbol)}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => truncateLabel(v, 12)}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                    <Bar dataKey="value" fill="var(--color-odoo-purple)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => truncateLabel(v)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => formatValue(v, meta.value_format, meta.currency_symbol)}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                    <Bar dataKey="value" fill="var(--color-odoo-purple)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )
              ) : chart_type === "line" ? (
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-odoo-purple)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-odoo-purple)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => truncateLabel(v)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => formatValue(v, meta.value_format, meta.currency_symbol)}
                  />
                  <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-odoo-purple)"
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
                    labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
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
          <span className="text-xs text-muted-foreground">
            {t("globalTotal")}
          </span>
          <span className="text-sm font-semibold text-odoo-purple">
            {formatValue(meta.total, meta.value_format, meta.currency_symbol)}
          </span>
        </div>
      )}

      {/* Grouped by info */}
      {meta.group_by && (
        <div className="mt-1 text-xs text-muted-foreground">
          {t("groupedBy")}: <span className="font-medium">{meta.group_by}</span>
        </div>
      )}
    </motion.div>
  );
}
