"use client";

/**
 * El dibujo de un gráfico, separado de la tarjeta que lo contiene.
 *
 * ⭐ **Existe porque hay DOS contenedores y un solo dibujo.** La tarjeta del chat
 * (`OdooChartCard`) vive dentro de una burbuja y trae el botón de fijar; la tarjeta del
 * Tablero (Fase 5 · F1) vive en una grilla y trae el estado de actualización. Lo que NO
 * puede diferir es el gráfico: el usuario fija algo en el chat y lo tiene que reconocer
 * en el Tablero. Una segunda copia del formateo de moneda es exactamente cómo el mismo
 * guaraní termina mostrándose de dos maneras en dos pantallas.
 */

import { useState } from "react";
import { BarChart3, TrendingUp, PieChart as PieIcon, Table as TableIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

export type ChartViewType = ChartSSEEvent["chart_type"];

// Brand indigo palette for pie charts (Rule 3: odoo-purple is logo-only)
export const PIE_COLORS = ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"];

export function formatValue(
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

export function formatAxisValue(
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

export function ChartTooltip(props: Record<string, unknown> & { meta: ChartSSEEvent["meta"] }) {
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

export function truncateLabel(label: string, maxLen: number = 14): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
}

/** A pie shows at most this many real slices; the rest collapse into "others". */
export const PIE_MAX_SLICES = 6;

/**
 * Collapse the tail of a pie into a single "others" slice.
 *
 * Lives here, and NOT in the backend, on purpose: it is a DISPLAY decision. The
 * backend payload feeds three consumers at once — this chart, the Excel export
 * and the pin snapshot — so collapsing rows there truncated the Excel to 6 rows
 * and pinned the truncated set. The payload always carries every group; only the
 * pie rendering folds the tail.
 *
 * ⚠️ Folding the tail is only defensible because the points arrive RANKED, and
 * that is a backend guarantee, not a hope: `sort_groups_by_metric` orders the
 * groups right after the `read_group` (odoo_executor, and pin_refresh for a
 * refreshed pin). It is needed because `read_group` returns groups in the
 * comodel's own `_order` — a `user_id` breakdown comes back ALPHABETICAL — and
 * this function slices by POSITION. While that order was merely assumed, a
 * "ventas por vendedor" with 12 sellers folded the three biggest into a 91%
 * "Otros" slice (2026-08-10).
 *
 * The guarantee has three deliberate exceptions, all orders that mean something
 * by themselves: a date groupby (chronological), a `crm.lead` stage breakdown
 * (funnel sequence) and any `top_n` (already ranked by Odoo, possibly ASCENDING
 * on purpose — "los que menos vendieron"). The first two never reach a pie as a
 * ranking anyway; if a pie is ever rendered over one of them, the tail is a
 * positional tail and not a small one — sort here before slicing.
 *
 * `meta.total` is untouched: the footer keeps showing the real global total.
 */
export function collapseForPie(
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

export const VIEW_TYPES: { type: ChartViewType; Icon: LucideIcon }[] = [
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
export function ChartTypeSwitcher({
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
 *
 * `height` must match whatever the sibling `ChartPlot` uses in the same card
 * (280 default in the chat card, 200 in the Tablero) — the other three view
 * types (bar/line/pie) always render at that fixed height, so a table with its
 * own taller cap broke height-parity between cards in the Tablero grid, and
 * inside a single chat card switching to table view visibly shifted the bubble
 * and moved the scroll position. Fixed height (not a max), so a short table
 * doesn't collapse below it either — it just leaves the same blank space a
 * sparse pie/bar chart would.
 */
export function ChartTable({
  data,
  meta,
  compact = false,
  height = 280,
}: {
  data: ChartSSEEvent["data"];
  meta: ChartSSEEvent["meta"];
  /** Narrow card: drop the % column so the two columns that matter fit without
      a horizontal scroll. The share is the derived value, so it is the one to go. */
  compact?: boolean;
  height?: number;
}) {
  const total = data.reduce((acc, d) => acc + (d.value ?? 0), 0);

  return (
    <div
      style={{ height }}
      className="min-w-0 overflow-auto rounded-md border border-border"
    >
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


/**
 * El área de dibujo: barras (verticales u horizontales), área/línea o torta.
 *
 * `horizontalBar` lo decide el CONTENEDOR, no este componente: en el chat sale de un
 * ResizeObserver sobre la burbuja y en el Tablero de la densidad de la grilla. Medir acá
 * obligaría a cada contenedor a pelearse con el mismo observer.
 */
export function ChartPlot({
  data,
  meta,
  viewType,
  height = 280,
  horizontalBar = false,
  otherLabel = "Otros",
}: {
  data: ChartSSEEvent["data"];
  meta: ChartSSEEvent["meta"];
  viewType: ChartViewType;
  height?: number;
  horizontalBar?: boolean;
  otherLabel?: string;
}) {
  const viewData = viewType === "pie" ? collapseForPie(data, otherLabel) : data;
  const isHorizontalBar = viewType === "bar" && horizontalBar;
  const boxHeight = isHorizontalBar ? Math.max(viewData.length * 40, 200) : height;

  return (
    <div style={{ width: "100%", height: boxHeight }}>
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
              innerRadius={Math.max(20, Math.round(boxHeight * 0.18))}
              outerRadius={Math.max(45, Math.round(boxHeight * 0.36))}
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
  );
}

/** El icono que corresponde a cada formato — compartido por las dos tarjetas. */
export function chartIconFor(viewType: ChartViewType, size = 16) {
  const Icon: LucideIcon =
    viewType === "bar" ? BarChart3 :
    viewType === "line" ? TrendingUp :
    viewType === "table" ? TableIcon : PieIcon;
  return <Icon size={size} strokeWidth={1.5} />;
}

/** `useState` del formato, con el del backend como punto de partida. */
export function useChartViewType(initial: ChartViewType) {
  return useState<ChartViewType>(initial);
}
