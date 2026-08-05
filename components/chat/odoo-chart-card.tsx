"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart as PieIcon, Table as TableIcon, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type ChartViewType = ChartSSEEvent["chart_type"];

/** A pie shows at most this many real slices; the rest collapse into "others". */
const PIE_MAX_SLICES = 6;

/**
 * Collapse the tail of a pie into a single "others" slice.
 *
 * Lives here, and NOT in the backend, on purpose: it is a DISPLAY decision. The
 * backend payload feeds three consumers at once — this chart, the Excel export
 * and the pin snapshot — so collapsing rows there truncated the Excel to 6 rows
 * and pinned the truncated set. The payload always carries every group; only the
 * pie rendering folds the tail.
 *
 * Points arrive in the aggregation's own order (usually descending by value), so
 * the tail is whatever falls past the head. `meta.total` is untouched: the footer
 * keeps showing the real global total.
 */
function collapseForPie(
  data: ChartSSEEvent["data"],
  otherLabel: string,
  maxSlices: number = PIE_MAX_SLICES
): ChartSSEEvent["data"] {
  if (data.length <= maxSlices) return data;
  const head = data.slice(0, maxSlices - 1);
  const tail = data.slice(maxSlices - 1);
  const value = tail.reduce((acc, d) => acc + (d.value ?? 0), 0);
  return [...head, { label: `${otherLabel} (${tail.length})`, value }];
}

const VIEW_TYPES: { type: ChartViewType; Icon: LucideIcon }[] = [
  { type: "bar", Icon: BarChart3 },
  { type: "line", Icon: TrendingUp },
  { type: "pie", Icon: PieIcon },
  { type: "table", Icon: TableIcon },
];

/**
 * In-situ format switcher. The backend already picked a sensible default (date
 * groupby → line, ≤5 groups → pie, else bar) and honours an explicit request in
 * the question; this lets the user override it **without another round trip**.
 *
 * That is the whole point: the payload holds the same numbers for every format,
 * and all four renderers are already mounted here — so switching is a `useState`,
 * not a query. Asking the agent in words would cost an Odoo fetch plus an LLM
 * call to flip one string.
 */
function ChartTypeSwitcher({
  value,
  onChange,
  labels,
  groupLabel,
}: {
  value: ChartViewType;
  onChange: (t: ChartViewType) => void;
  labels: Record<ChartViewType, string>;
  groupLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5"
    >
      {VIEW_TYPES.map(({ type, Icon }) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={active}
            title={labels[type]}
            aria-label={labels[type]}
            className={`rounded p-1.5 transition-colors ${
              active
                ? "bg-accent-subtle text-accent"
                : "text-text-muted hover:bg-raised hover:text-text-secondary"
            }`}
          >
            <Icon size={14} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Table rendering of the same aggregation payload — reached either because the
 * user asked for it in the question ("mostrámelo en tabla") or because they hit
 * the table button in the switcher.
 *
 * Headers come from the payload (`meta.group_by`, `meta.value_label`), which the
 * backend already localizes. Labels are NOT truncated here: a table has room, and
 * truncating is a chart-axis concession. It always shows EVERY row — the pie's
 * "others" collapse is a pie problem, and the table is where the user goes to see
 * the tail it folded.
 */
function ChartTable({
  data,
  meta,
  compact = false,
}: {
  data: ChartSSEEvent["data"];
  meta: ChartSSEEvent["meta"];
  /** Narrow card: drop the % column so the two columns that matter fit without
      a horizontal scroll. The share is the derived value, so it is the one to go. */
  compact?: boolean;
}) {
  const total = data.reduce((acc, d) => acc + (d.value ?? 0), 0);

  return (
    <div className="max-h-[320px] min-w-0 overflow-auto rounded-md border border-border">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="sticky top-0 bg-raised">
          <tr>
            <th className="px-3 py-2 text-small font-medium text-text-secondary">
              {meta.group_by}
            </th>
            <th className="w-[40%] px-3 py-2 text-right text-small font-medium text-text-secondary">
              {meta.value_label}
            </th>
            {!compact && (
              <th className="w-16 px-3 py-2 text-right text-small font-medium text-text-secondary">
                %
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {/* break-words: supplier names run long ("ADIMAX INDUSTRIA E
                  COMERCIO DE ALIMENTOS LTDA.") and with table-fixed they must
                  wrap inside their cell instead of widening the table. */}
              <td className="px-3 py-2 text-body text-foreground break-words">
                {row.label}
              </td>
              <td className="px-3 py-2 text-right text-body font-technical text-foreground tabular-nums">
                {formatValue(row.value, meta.value_format, meta.currency_symbol, meta.no_decimals)}
              </td>
              {!compact && (
                <td className="px-3 py-2 text-right text-small font-technical text-text-secondary tabular-nums">
                  {total > 0 ? `${((row.value / total) * 100).toFixed(0)}%` : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface OdooChartCardProps {
  chart: ChartSSEEvent;
  messageId: string;
  chartIndex: number;
}

export function OdooChartCard({ chart, messageId, chartIndex }: OdooChartCardProps) {
  const t = useTranslations("ChatMessages.chart");
  const { chart_type, title, data, meta } = chart;

  // The backend's chart_type is the STARTING POINT, not the final word: it seeds
  // the view and the user can override it in situ. No refetch — every format
  // renders the same payload.
  const [viewType, setViewType] = useState<ChartViewType>(chart_type);
  const viewData = viewType === "pie" ? collapseForPie(data, t("others")) : data;

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
    viewType === "bar" ? <BarChart3 size={16} strokeWidth={1.5} /> :
    viewType === "line" ? <TrendingUp size={16} strokeWidth={1.5} /> :
    viewType === "table" ? <TableIcon size={16} strokeWidth={1.5} /> :
    <PieIcon size={16} strokeWidth={1.5} />;

  const isHorizontalBar = viewType === "bar" && isNarrow;

  const viewLabels: Record<ChartViewType, string> = {
    bar: t("viewAs.bar"),
    line: t("viewAs.line"),
    pie: t("viewAs.pie"),
    table: t("viewAs.table"),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      /* min-w-0: the card sits in a max-w-[85%] bubble, and a flex item's
         min-width:auto beats max-width — so without this, wide content could
         push the whole bubble past its cap instead of shrinking the card. */
      className="mt-3 min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      {/* Header. Two rows by default (mobile-first), one row from 781px up.
          ┌─────────────────────────────────────────────┐
          │ icon + title                                │  row 1
          │ [switcher]              [pin] [excel]       │  row 2
          └─────────────────────────────────────────────┘

          ⚠️ The breakpoint is EXPLICIT and not `flex-wrap`. Wrapping decides by
          available space, so hiding the Excel label (below a 400px card) freed
          just enough room to collapse BACK to one row and then re-wrap lower
          down — a flip-flop the user hit at 588px. An explicit breakpoint can't
          do that: below it, two rows, full stop.

          780px is derived, not arbitrary: the chat column is `mx-auto max-w-3xl`
          (768px) and the message area's scrollbar takes ~12px, so 780px is
          exactly where the bubble stops being 768px and starts contracting —
          the moment the header runs out of room. If the column's max-width ever
          changes, this number moves with it. */}
      <div className="mb-3 flex flex-col gap-2 min-[781px]:flex-row min-[781px]:items-center">
        {/* Row 1 — icon + title */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
            {chartIcon}
          </div>
          <h3 className="min-w-0 flex-1 text-body font-semibold text-foreground leading-tight">
            {title}
          </h3>
        </div>
        {/* Row 2 — switcher anchored left, pin + Excel anchored right.
            On one row (≥781px) it collapses to a single right-aligned group. */}
        <div className="flex items-center justify-between gap-2 min-[781px]:shrink-0 min-[781px]:justify-end">
          {data.length > 0 ? (
            <ChartTypeSwitcher
              value={viewType}
              onChange={setViewType}
              labels={viewLabels}
              groupLabel={t("viewAs.label")}
            />
          ) : (
            // Keeps `justify-between` honest when there is no switcher: without a
            // first child, pin + Excel would jump to the left edge.
            <span aria-hidden />
          )}
          <div className="flex shrink-0 items-center gap-1">
            <PinToggleButton
              pinned={chartPinned}
              onToggle={() => togglePinChart(chatId, messageId, chartIndex, chart)}
              volatility={chart.query_context?.volatility}
            />
            {chart.export_url && (
              <a
                href={`${API_BASE}${chart.export_url}`}
                download
                title={t("downloadExcel")}
                aria-label={t("downloadExcel")}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md text-small font-medium text-accent transition-colors hover:bg-accent-subtle ${
                  isNarrow ? "p-1.5" : "px-2.5 py-1.5"
                }`}
              >
                <Download size={14} strokeWidth={1.5} />
                {/* Below a 400px card the label is what overflowed the row. The
                    icon + tooltip + aria-label carry the meaning on their own.
                    Kept as a CARD-width rule (not the viewport breakpoint above)
                    because it is about the button fitting, not about the layout. */}
                {!isNarrow && <span>{t("downloadExcel")}</span>}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div ref={setContainerRef} className="w-full">
        {data.length === 0 ? (
          <p className="py-8 text-center text-body text-text-secondary">
            {t("noData")}
          </p>
        ) : viewType === "table" ? (
          <ChartTable data={data} meta={meta} compact={isNarrow} />
        ) : (
          <div style={{ width: "100%", height: isHorizontalBar ? Math.max(viewData.length * 40, 200) : 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              {viewType === "bar" ? (
                isHorizontalBar ? (
                  <BarChart data={viewData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                  <BarChart data={viewData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              ) : viewType === "line" ? (
                <AreaChart data={viewData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                    data={viewData}
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
                    {viewData.map((_, i) => (
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
