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

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
/** La porción "Otros" va en gris: no es un grupo más, es lo que el top dejó afuera. */
const OTHERS_FILL = "var(--color-text-muted)";

/**
 * ⚠️ **El locale es el de la APP y es obligatorio.** Estaba fijo en `"en-US"`: el
 * Tablero mostraba `₲7,556,304,062` en una pantalla en español mientras el chat, que
 * formatea el backend, decía `₲7.556.304.062` — el mismo número de dos maneras (la
 * misma familia que el bug 15 del ROADMAP). Sin default a propósito: un llamador que
 * se olvide no compila, en vez de caer callado en inglés.
 *
 * `useGrouping: "always"`: en español `Intl` no agrupa los números de 4 cifras
 * ("2623" al lado de "11.968" en la misma tarjeta).
 */
function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    useGrouping: "always",
    ...options,
  } as Intl.NumberFormatOptions);
}

export function formatValue(
  val: number,
  format: string,
  symbol: string,
  noDecimals: boolean | undefined,
  locale: string
): string {
  switch (format) {
    case "currency": {
      const decimals = noDecimals ? 0 : 2;
      return `${symbol}${numberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val)}`;
    }
    case "integer":
      return numberFormat(locale, { maximumFractionDigits: 0 }).format(val);
    case "decimal":
    case "number":
    default:
      return numberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }
}

export function formatAxisValue(
  val: number,
  format: string,
  symbol: string,
  noDecimals: boolean | undefined,
  locale: string
): string {
  if (format !== "currency" && format !== "decimal" && format !== "number") {
    return formatValue(val, format, symbol, noDecimals, locale);
  }

  // Las abreviaturas también son del idioma: "B" es inglés — en español mil millones
  // es "mil M", y "billón" sería otra cosa (10¹²). Las arma `Intl`, no nosotros.
  const compact =
    Math.abs(val) >= 1_000
      ? numberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(val)
      : numberFormat(locale, {
          minimumFractionDigits: noDecimals ? 0 : 2,
          maximumFractionDigits: noDecimals ? 0 : 2,
        }).format(val);

  return format === "currency" ? `${symbol}${compact}` : compact;
}

export function ChartTooltip(props: Record<string, unknown> & { meta: ChartSSEEvent["meta"] }) {
  const locale = useLocale();
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
        {formatValue(payload[0].value as number, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
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

/**
 * F-11 — los datos de una torta: lo de `collapseForPie` y, en un ranking, la porción
 * "Otros" REAL (`meta.others`: el total general menos el top, B-23). Sin ella, una torta
 * de "top 5 clientes" mostraba a los 5 como si fueran el 100 % del negocio.
 */
export function pieDataFor(
  data: ChartSSEEvent["data"],
  meta: ChartSSEEvent["meta"],
  otherLabel: string
): { data: ChartSSEEvent["data"]; othersIndex: number | null } {
  const others = meta.others ?? 0;
  if (others <= 0) {
    const collapsed = collapseForPie(data, otherLabel);
    // Si `collapseForPie` plegó la cola, su última porción es la de "Otros".
    return { data: collapsed, othersIndex: collapsed.length < data.length ? collapsed.length - 1 : null };
  }
  const head = data.slice(0, PIE_MAX_SLICES - 1);
  const tail = data.slice(PIE_MAX_SLICES - 1).reduce((acc, d) => acc + (d.value ?? 0), 0);
  return { data: [...head, { label: otherLabel, value: others + tail }], othersIndex: head.length };
}

/**
 * F-11 — el nombre de una fila de ranking, ENTERO, en hasta dos líneas. Truncar a 12
 * caracteres dejaba "Aislamientos …" y "Electrónica S…": en un ranking el nombre es el
 * dato. Lo que no entra ni en dos líneas se corta, con el nombre completo en el tooltip.
 */
/** Ancho estimado de un carácter a 11px — conservador: las razones sociales vienen en MAYÚSCULAS. */
const TICK_CHAR_PX = 7.4;

function WrappedTick(props: { x?: number; y?: number; payload?: { value?: string }; width: number }) {
  const { x = 0, y = 0, payload, width } = props;
  const label = String(payload?.value ?? "");
  const perLine = Math.max(8, Math.floor(width / TICK_CHAR_PX));
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= perLine) current = next;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  const shown = lines.slice(0, 2);
  if (lines.length > 2) shown[1] = truncateLabel(`${shown[1]} ${lines.slice(2).join(" ")}`, perLine);
  if (shown[0] && shown[0].length > perLine) shown[0] = truncateLabel(shown[0], perLine);
  const dy = shown.length > 1 ? -6 : 4;
  return (
    <text x={x - 4} y={y + dy} textAnchor="end" fontSize={11} fill="var(--color-text-secondary)">
      <title>{label}</title>
      {shown.map((line, i) => (
        <tspan key={i} x={x - 4} dy={i === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * F-11 — el pie de totales, rotulado por su ÁMBITO (B-23).
 *
 * En un ranking hay dos números y no son el mismo: la suma del top ("Total del top 5")
 * y, si el backend lo midió, el total general. Rotular "Total global" a la suma del top
 * era afirmar que esos 5 clientes son todo el negocio. Fuera de un ranking, `total` ya
 * es el total de todos los grupos.
 */
export function ChartTotals({
  meta,
  compact = false,
}: {
  meta: ChartSSEEvent["meta"];
  /** El Tablero: una sola línea, el número principal. */
  compact?: boolean;
}) {
  const t = useTranslations("ChatMessages.chart");
  const locale = useLocale();
  const fmt = (v: number) =>
    formatValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals, locale);

  const rows: { label: string; value: number }[] = [];
  if (meta.scope === "top_n" && meta.top_total != null) {
    rows.push({ label: t("topTotal", { n: meta.top_n ?? 0 }), value: meta.top_total });
    if (meta.total_scope === "all" && meta.total != null && meta.total !== meta.top_total) {
      rows.push({ label: t("overallTotal"), value: meta.total });
    }
  } else if (meta.total != null) {
    rows.push({ label: t("globalTotal"), value: meta.total });
  }
  if (rows.length === 0) return null;

  if (compact) {
    const [main, ...rest] = rows;
    return (
      <span
        className="flex min-w-0 flex-col"
        title={rest.map((r) => `${r.label}: ${fmt(r.value)}`).join(" · ") || undefined}
      >
        <span className="truncate text-micro text-text-muted">{main.label}</span>
        <span className="truncate font-technical text-body font-semibold text-accent">
          {fmt(main.value)}
        </span>
      </span>
    );
  }
  return (
    <div className="mt-3 space-y-1 border-t border-border pt-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <span className="text-small text-text-secondary">{row.label}</span>
          <span className="font-technical text-body font-semibold text-accent">{fmt(row.value)}</span>
        </div>
      ))}
    </div>
  );
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
  const locale = useLocale();
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
                {formatValue(row.value, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
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
 *
 * ⚠️ La excepción es el ranking angosto (F-18): ése sí se mide acá, porque depende del
 * ancho del DIBUJO y le pasa igual al chat y al Tablero en un celular.
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
  const locale = useLocale();
  const pie = viewType === "pie" ? pieDataFor(data, meta, otherLabel) : null;
  const viewData = pie ? pie.data : data;
  // F-11 — un ranking va en barras HORIZONTALES siempre: es la única forma de que el
  // nombre (el dato de un ranking) se lea entero. Fuera de un ranking lo decide el
  // contenedor por ancho, como antes.
  const isRanking = meta.scope === "top_n";
  const isHorizontalBar = viewType === "bar" && (horizontalBar || isRanking);
  const longestLabel = viewData.reduce((m, d) => Math.max(m, String(d.label ?? "").length), 0);
  const yAxisWidth = isRanking ? Math.min(190, Math.max(90, longestLabel * TICK_CHAR_PX)) : 100;
  const boxHeight = isHorizontalBar ? Math.max(viewData.length * (isRanking ? 44 : 40), 200) : height;

  // F-18 — el ancho del dibujo, medido sólo para un ranking: en angosto el eje de nombres
  // se llevaba casi todo y las barras quedaban en ~20 px con un único tick.
  const [plotEl, setPlotEl] = useState<HTMLDivElement | null>(null);
  const [plotWidth, setPlotWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!plotEl || !isRanking) return;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(entry.contentRect.width));
    observer.observe(plotEl);
    return () => observer.disconnect();
  }, [plotEl, isRanking]);
  const rankingAsList =
    isHorizontalBar && isRanking && plotWidth !== null && plotWidth < RANKING_LIST_MAX_PX;

  if (pie) {
    const pieTotal = pie.data.reduce((acc, d) => acc + (d.value ?? 0), 0);
    const colorAt = (i: number) =>
      i === pie.othersIndex ? OTHERS_FILL : PIE_COLORS[i % PIE_COLORS.length];
    /**
     * F-11 — la leyenda es NUESTRA y no la de recharts: aquélla ordena alfabéticamente
     * (el ranking quedaba desordenado) y corta los nombres. Acá va en el orden del
     * payload —el del ranking—, con el nombre entero y su porcentaje. Todo dentro de la
     * misma altura fija que los otros formatos: el Tablero depende de esa paridad.
     */
    return (
      <div style={{ height }} className="flex w-full flex-col gap-2">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={viewData}
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="92%"
                paddingAngle={2}
                dataKey="value"
                nameKey="label"
              >
                {viewData.map((_, i) => (
                  <Cell key={i} fill={colorAt(i)} />
                ))}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="max-h-[45%] shrink-0 space-y-0.5 overflow-y-auto">
          {viewData.map((d, i) => {
            const label = String(d.label ?? "");
            const pct = pieTotal > 0 ? Math.round(((d.value ?? 0) / pieTotal) * 100) : 0;
            return (
              <li key={i} className="flex items-center gap-2 text-small">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colorAt(i) }}
                />
                <span className="min-w-0 flex-1 truncate text-text-secondary" title={label}>
                  {label}
                </span>
                <span className="shrink-0 font-technical tabular-nums text-text-secondary">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (rankingAsList) {
    return (
      <div ref={setPlotEl} className="w-full">
        <RankingList data={viewData} meta={meta} locale={locale} />
      </div>
    );
  }

  return (
    <div ref={setPlotEl} style={{ width: "100%", height: boxHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        {viewType === "bar" ? (
          isHorizontalBar ? (
            <BarChart data={viewData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
              />
              {isRanking ? (
                <YAxis
                  dataKey="label"
                  type="category"
                  width={yAxisWidth}
                  interval={0}
                  tick={(tp) => (
                    <WrappedTick
                      x={Number(tp.x)}
                      y={Number(tp.y)}
                      payload={tp.payload as { value?: string }}
                      width={yAxisWidth}
                    />
                  )}
                />
              ) : (
                <YAxis
                  dataKey="label"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  tickFormatter={(v) => truncateLabel(v, 12)}
                />
              )}
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
                tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
              />
              <Tooltip content={(props) => <ChartTooltip {...props} meta={meta} />} />
              <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )
        ) : (
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
              tickFormatter={(v) => formatAxisValue(v, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
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
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Por debajo de este ancho, un ranking se dibuja como lista y no con ejes (F-18). */
const RANKING_LIST_MAX_PX = 420;

/**
 * F-18 — un ranking en angosto: el nombre ENTERO a lo ancho, el valor al lado y la barra
 * abajo, proporcional al primero. Con ejes, a 375 px el nombre y la barra se disputaban
 * el mismo renglón y perdía la barra. Es HTML y no SVG: el nombre se parte solo, sin
 * estimar anchos de caracteres.
 */
function RankingList({
  data,
  meta,
  locale,
}: {
  data: ChartSSEEvent["data"];
  meta: ChartSSEEvent["meta"];
  locale: string;
}) {
  const max = data.reduce((m, d) => Math.max(m, Math.abs(d.value ?? 0)), 0);
  return (
    <ol className="space-y-3">
      {data.map((d, i) => {
        const value = d.value ?? 0;
        const pct = max > 0 ? Math.max((Math.abs(value) / max) * 100, 2) : 0;
        return (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-small">
              <span className="min-w-0 break-words text-text-secondary">{String(d.label ?? "")}</span>
              <span className="shrink-0 font-technical tabular-nums text-foreground">
                {formatValue(value, meta.value_format, meta.currency_symbol, meta.no_decimals, locale)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-raised" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
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
