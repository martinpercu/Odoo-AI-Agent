"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import {
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { useAudienceT } from "@/hooks/use-audience-translations";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useToast } from "@/components/ui/error-toast";
import { exportDashboard } from "@/lib/api";
import {
  DASHBOARD_PERIOD_KEYS,
  resolveDashboardPeriod,
  type DashboardPeriodKey,
} from "@/lib/dashboard-period";
import type { DashboardRefreshResult } from "@/lib/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardPresets } from "@/components/dashboard/dashboard-presets";

/**
 * El **Tablero** (PLAN_RUTINAS Fase 5).
 *
 * ⭐ **Los pins dejan de ser una lista lateral de guardados sueltos.** Es el segundo
 * pedido explícito del tester ("me gustó Insights fijados, ¿quizás darle más
 * protagonismo?"), y la razón por la que es barato: *un pin no es una captura de
 * pantalla, es una consulta viva* — el backend ya sabía re-ejecutarla, sólo le faltaba
 * una pantalla donde eso se notara.
 *
 * Tres cosas que esta pantalla hace y el panel lateral no podía:
 *
 * 1. **Grilla** — el gráfico se ve, no se adivina por el título.
 * 2. **Selector de período global** — cambiar "este mes" a "trimestre" arriba recalcula
 *    todo… salvo lo que no tiene dimensión temporal, que **se marca como tal** en vez de
 *    devolver un número alterado (§3.1, el riesgo real de la fase).
 * 3. **Actualizar todo / Exportar** — con el estado por tarjeta, porque un pin roto no
 *    puede interrumpir a los demás.
 *
 * El panel lateral del chat sigue existiendo: es el acceso rápido mientras conversás.
 * Esto es donde los números viven.
 */

export default function DashboardPage() {
  const t = useAudienceT("Dashboard");
  const locale = useLocale();
  const { pins, loadAllPins, refreshAll, clearAll } = usePinnedInsights();
  const { activeConfigId, isDemoMode, isConfigured } = useOdooConfig();
  const { showError } = useToast();

  const [periodKey, setPeriodKey] = useState<DashboardPeriodKey>("none");
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  /** El resultado del último "actualizar todo", por pin. Se pinta EN la tarjeta. */
  const [states, setStates] = useState<Record<string, DashboardRefreshResult>>({});
  const [loading, setLoading] = useState(true);

  const period = useMemo(() => resolveDashboardPeriod(periodKey), [periodKey]);

  const load = useCallback(async () => {
    setLoading(true);
    await loadAllPins();
    setLoading(false);
  }, [loadAllPins]);

  useEffect(() => {
    load();
  }, [load]);

  const canQueryOdoo = !isDemoMode && isConfigured && !!activeConfigId;

  async function handleRefreshAll(key: DashboardPeriodKey = periodKey) {
    if (!canQueryOdoo) return;
    setRefreshing(true);
    try {
      const results = await refreshAll(resolveDashboardPeriod(key));
      setStates(Object.fromEntries(results.map((r) => [r.pin_id, r])));
    } finally {
      setRefreshing(false);
    }
  }

  /**
   * Cambiar el período **dispara el refresh**: sin eso el selector sería un control
   * decorativo que cambia una etiqueta y ningún número, que es peor que no tenerlo.
   * Volver a "cada tarjeta con su período" no re-consulta — los pins ya tienen ese
   * estado guardado y pedirle a Odoo 20 consultas para volver atrás es gratis para
   * nosotros y caro para la instancia del cliente.
   */
  function handlePeriodChange(key: DashboardPeriodKey) {
    setPeriodKey(key);
    setStates({});
    if (key !== "none") void handleRefreshAll(key);
  }

  async function handleExport(format: "pdf" | "excel") {
    setExporting(format);
    try {
      const res = await exportDashboard(format, locale);
      if (!res.success || !res.base64) {
        showError(res.error || t("export.failed"));
        return;
      }
      downloadBase64(res.base64, res.filename ?? `tablero.${format}`, res.mimetype);
    } finally {
      setExporting(null);
    }
  }

  const chartCount = pins.filter((p) => p.kind === "chart").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Encabezado */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <LayoutDashboard size={24} strokeWidth={1.5} className="shrink-0 text-accent" />
          <h1 className="text-heading">{t("title")}</h1>
          {pins.length > 0 && (
            <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent">
              {pins.length}
            </span>
          )}
        </div>
        <p className="mb-6 text-body text-text-muted">{t("subtitle")}</p>

        {/* Barra de acciones */}
        {pins.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
            <label className="flex items-center gap-2 text-small text-text-secondary">
              <span className="shrink-0">{t("period.label")}</span>
              <select
                value={periodKey}
                onChange={(e) => handlePeriodChange(e.target.value as DashboardPeriodKey)}
                disabled={!canQueryOdoo || refreshing}
                className="h-btn-sm rounded-btn border border-border bg-base px-2 text-small text-foreground disabled:opacity-50"
              >
                {DASHBOARD_PERIOD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`period.${key}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRefreshAll()}
                disabled={!canQueryOdoo || refreshing}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  strokeWidth={1.5}
                  className={refreshing ? "animate-spin text-accent" : "text-accent"}
                />
                {refreshing ? t("refreshingAll") : t("refreshAll")}
              </button>

              {chartCount > 0 && (
                <>
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={exporting !== null}
                    className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised disabled:opacity-50"
                  >
                    {exporting === "pdf" ? (
                      <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <Download size={14} strokeWidth={1.5} className="text-accent" />
                    )}
                    {t("export.pdf")}
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={exporting !== null}
                    className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised disabled:opacity-50"
                  >
                    {exporting === "excel" ? (
                      <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet
                        size={14}
                        strokeWidth={1.5}
                        className="text-success-solid"
                      />
                    )}
                    {t("export.excel")}
                  </button>
                </>
              )}

              <button
                onClick={() => clearAll()}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
              >
                <Trash2 size={14} strokeWidth={1.5} />
                {t("clearAll")}
              </button>
            </div>

            {/* El período congelado se dice en pantalla: el usuario tiene que poder
                distinguir "no cambió nada" de "esta tarjeta no sigue al selector". */}
            {period && (
              <p className="w-full text-micro text-text-muted">
                {t("period.applied", { start: period.start, end: period.end })}
              </p>
            )}
          </div>
        )}

        {/* Presets por rol — un click y el Tablero queda armado (§3.3) */}
        {!isDemoMode && (
          <DashboardPresets
            configId={activeConfigId}
            onApplied={load}
            disabled={refreshing}
          />
        )}

        {/* La grilla */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
          </div>
        ) : pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface px-6 py-16 text-center">
            <LayoutDashboard size={32} strokeWidth={1.5} className="mb-3 text-text-muted" />
            <p className="text-body font-medium text-text-secondary">{t("empty")}</p>
            <p className="mt-1 max-w-md text-small text-text-muted">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {pins.map((pin) => (
                <DashboardCard
                  key={pin.id}
                  pin={pin}
                  refreshState={states[pin.id]}
                  period={period}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Descarga en memoria, sin URL persistida.
 *
 * El backend devuelve base64 y NO escribe a disco: el filesystem de Railway es efímero
 * y no se comparte entre workers, así que un `/static/...` puede dar 404 desde otro
 * worker. Mismo criterio que el PDF de las Rutinas y el Excel del chat.
 */
function downloadBase64(base64: string, filename: string, mimetype?: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimetype || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
