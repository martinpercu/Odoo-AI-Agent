"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarOff,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Minus,
  RefreshCw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { DashboardRefreshResult, PinnedChart, PinnedInsight } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { useAudienceT } from "@/hooks/use-audience-translations";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import {
  ChartPlot,
  ChartTable,
  ChartTypeSwitcher,
  chartIconFor,
  formatValue,
} from "@/components/charts/chart-plot";
import type { ChartViewType } from "@/components/charts/chart-plot";

/**
 * Una tarjeta del Tablero (PLAN_RUTINAS Fase 5 · F1).
 *
 * Es la mini-card del panel lateral crecida a una tarjeta de grilla: acá el gráfico se
 * VE, y por eso el Tablero es una sección con entidad propia y no una lista de
 * favoritos. El dibujo lo pone `ChartPlot`, el mismo que usa la tarjeta del chat — el
 * usuario fija algo en una conversación y lo tiene que reconocer acá.
 *
 * ⭐ **Dos estados que la tarjeta tiene que decir, y no son lo mismo:**
 *
 * - **"no depende del período"** (`date_dependent === false`) — el selector global no la
 *   toca. Es la honestidad del §3.1: sin este cartel, cambiar a "trimestre" y ver que el
 *   stock por categoría no se mueve se lee como un bug, no como un pin sin dimensión
 *   temporal.
 * - **el resultado del último "actualizar todo"** (`refreshState`) — ok / sin cambios /
 *   error, POR TARJETA. Un pin roto no interrumpe a los demás (§3.2), así que el error
 *   tiene que vivir en la tarjeta que falló y no en un toast global que no dice cuál.
 */

interface DashboardCardProps {
  pin: PinnedInsight;
  /** El veredicto del último refresh batch para ESTA tarjeta, si hubo uno. */
  refreshState?: DashboardRefreshResult;
  /** El período global activo — se manda en el refresh individual para que la tarjeta
   *  quede consistente con el resto del Tablero. */
  period?: { start: string; end: string };
}

export function DashboardCard({ pin, refreshState, period }: DashboardCardProps) {
  const t = useAudienceT("Dashboard");
  const tChart = useTranslations("ChatMessages.chart");
  const { unpin, refreshPin } = usePinnedInsights();
  const { isDemoMode, activeConfig } = useOdooConfig();
  const [refreshing, setRefreshing] = useState(false);

  if (pin.kind !== "chart") return <DocumentCard pin={pin} />;
  if (!pin.chart) return null;

  return (
    <ChartCard
      pin={pin}
      refreshState={refreshState}
      period={period}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          await refreshPin(pin.id, pin.chatId, period);
        } finally {
          setRefreshing(false);
        }
      }}
      onRemove={() => unpin(pin.id)}
      canRefresh={
        // `refreshable` lo decide el backend; `undefined` (pins que llegaron por un
        // endpoint que no lo manda) cae al comportamiento anterior: refrescable si es
        // "en vivo". Nunca en demo, donde la instancia no es del usuario.
        (pin.refreshable ?? (pin.query_context?.volatility ?? "variable") === "variable") &&
        !isDemoMode &&
        activeConfig !== null
      }
      t={t}
      tChart={tChart}
    />
  );
}

function ChartCard({
  pin,
  refreshState,
  refreshing,
  onRefresh,
  onRemove,
  canRefresh,
  t,
  tChart,
}: {
  pin: PinnedChart;
  refreshState?: DashboardRefreshResult;
  period?: { start: string; end: string };
  refreshing: boolean;
  onRefresh: () => void;
  onRemove: () => void;
  canRefresh: boolean;
  t: ReturnType<typeof useTranslations>;
  tChart: ReturnType<typeof useTranslations>;
}) {
  const { chart } = pin;
  const [viewType, setViewType] = useState<ChartViewType>(chart.chart_type);

  const isLive = (pin.query_context?.volatility ?? "variable") === "variable";
  // El default es `true` para no marcar como atemporal un pin que llegó de un endpoint
  // que todavía no manda el veredicto: decir de más es peor que no decir.
  const followsPeriod = pin.date_dependent ?? true;
  const total =
    chart.meta.total != null
      ? formatValue(
          chart.meta.total,
          chart.meta.value_format,
          chart.meta.currency_symbol,
          chart.meta.no_decimals
        )
      : null;

  const viewLabels: Record<ChartViewType, string> = {
    bar: tChart("viewAs.bar"),
    line: tChart("viewAs.line"),
    pie: tChart("viewAs.pie"),
    table: tChart("viewAs.table"),
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group flex min-w-0 flex-col rounded-card border border-border bg-surface p-4"
    >
      {/* Encabezado */}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
          {chartIconFor(viewType, 14)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-semibold leading-tight text-foreground">
            {chart.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isLive ? (
              <Badge tone="live" label={t("badge.live")} />
            ) : (
              <Badge tone="muted" label={t("badge.historic")} />
            )}
            {!followsPeriod && (
              <Badge
                tone="muted"
                label={t("badge.noPeriod")}
                title={t("badge.noPeriodHint")}
                icon={<CalendarOff size={10} strokeWidth={1.5} />}
              />
            )}
            <RefreshBadge state={refreshState} t={t} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {canRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent disabled:opacity-50"
              title={t("refresh")}
              aria-label={t("refresh")}
            >
              <RefreshCw
                size={14}
                strokeWidth={1.5}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          )}
          <button
            onClick={onRemove}
            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
            title={t("remove")}
            aria-label={t("remove")}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="min-w-0 flex-1">
        {chart.data.length === 0 ? (
          <p className="py-8 text-center text-small text-text-secondary">
            {tChart("noData")}
          </p>
        ) : viewType === "table" ? (
          <ChartTable data={chart.data} meta={chart.meta} compact />
        ) : (
          <ChartPlot
            data={chart.data}
            meta={chart.meta}
            viewType={viewType}
            height={200}
            otherLabel={tChart("others")}
          />
        )}
      </div>

      {/* Pie: total + selector de formato */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        {total !== null ? (
          <span className="min-w-0 truncate font-technical text-body font-semibold text-accent">
            {total}
          </span>
        ) : (
          <span aria-hidden />
        )}
        {chart.data.length > 0 && (
          <ChartTypeSwitcher
            value={viewType}
            onChange={setViewType}
            labels={viewLabels}
            groupLabel={tChart("viewAs.label")}
          />
        )}
      </div>
    </motion.div>
  );
}

/** El estado del último "actualizar todo" para esta tarjeta. Nada cuando no hubo. */
function RefreshBadge({
  state,
  t,
}: {
  state?: DashboardRefreshResult;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!state) return null;
  if (state.status === "ok") {
    return (
      <Badge
        tone="ok"
        label={t("state.updated")}
        icon={<Check size={10} strokeWidth={2} />}
      />
    );
  }
  if (state.status === "skipped") {
    return (
      <Badge
        tone="muted"
        label={t("state.unchanged")}
        title={t(`skipReason.${skipKey(state.reason)}`)}
        icon={<Minus size={10} strokeWidth={2} />}
      />
    );
  }
  return (
    <Badge
      tone="error"
      label={t("state.failed")}
      title={t(`errorReason.${errorKey(state.reason)}`)}
      icon={<AlertTriangle size={10} strokeWidth={1.5} />}
    />
  );
}

/**
 * Los códigos del backend se mapean a claves de i18n con un default explícito.
 *
 * ⚠️ Con un `t(...)` armado directamente sobre `state.reason`, un código nuevo del
 * backend rompe el render (next-intl lanza si falta la clave). Un motivo desconocido
 * tiene que degradar a "no se pudo actualizar", no tumbar el Tablero.
 */
const SKIP_KEYS = ["static", "no_context", "no_groupby", "no_model", "not_chart"] as const;
const ERROR_KEYS = ["odoo_error", "chart_failed", "unexpected"] as const;

function skipKey(reason?: string): string {
  return (SKIP_KEYS as readonly string[]).includes(reason ?? "") ? reason! : "generic";
}

function errorKey(reason?: string): string {
  return (ERROR_KEYS as readonly string[]).includes(reason ?? "") ? reason! : "generic";
}

function Badge({
  tone,
  label,
  title,
  icon,
}: {
  tone: "live" | "muted" | "ok" | "error";
  label: string;
  title?: string;
  icon?: React.ReactNode;
}) {
  const tones = {
    live: "bg-success-subtle text-success-solid",
    muted: "bg-raised text-text-muted",
    ok: "bg-accent-subtle text-accent",
    error: "bg-error-subtle text-error",
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-micro font-medium ${tones[tone]}`}
    >
      {tone === "live" && !icon && (
        <span className="h-1.5 w-1.5 rounded-full bg-success-solid" />
      )}
      {icon}
      {label}
    </span>
  );
}

/** Un Excel o un PDF fijado: no es una consulta viva, es un archivo guardado. */
function DocumentCard({ pin }: { pin: PinnedInsight }) {
  const t = useAudienceT("Dashboard");
  const { unpin } = usePinnedInsights();
  if (pin.kind === "chart" || !pin.metadata) return null;

  const isExcel = pin.kind === "excel";
  const rawUrl = isExcel ? pin.metadata.export_url : pin.metadata.file_url;
  if (!rawUrl) return null;
  const url = rawUrl.startsWith("http") ? rawUrl : `${API_BASE}${rawUrl}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group flex items-center gap-2 rounded-card border border-border bg-surface p-4"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          isExcel ? "bg-success-subtle text-success-solid" : "bg-error-subtle text-error"
        }`}
      >
        {isExcel ? (
          <FileSpreadsheet size={14} strokeWidth={1.5} />
        ) : (
          <FileText size={14} strokeWidth={1.5} />
        )}
      </div>
      <p className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
        {pin.metadata.filename}
      </p>
      <a
        href={url}
        download={isExcel || undefined}
        target={isExcel ? undefined : "_blank"}
        rel="noopener noreferrer"
        className="shrink-0 rounded-md p-1.5 text-text-secondary transition-colors hover:text-accent"
        aria-label={t("download")}
        title={t("download")}
      >
        <Download size={14} strokeWidth={1.5} />
      </a>
      <button
        onClick={() => unpin(pin.id)}
        className="shrink-0 rounded-md p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-error-subtle hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={t("remove")}
        title={t("remove")}
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
