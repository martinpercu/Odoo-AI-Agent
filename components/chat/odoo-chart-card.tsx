"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChartSSEEvent } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useChatContext } from "@/components/app-shell";
import { PinToggleButton } from "@/components/pinned/pin-toggle-button";
import {
  ChartPlot,
  ChartTable,
  ChartTypeSwitcher,
  chartIconFor,
  formatValue,
} from "@/components/charts/chart-plot";
import type { ChartViewType } from "@/components/charts/chart-plot";

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

  const chartIcon = chartIconFor(viewType);

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
          <ChartPlot
            data={data}
            meta={meta}
            viewType={viewType}
            horizontalBar={isNarrow}
            otherLabel={t("others")}
          />
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
