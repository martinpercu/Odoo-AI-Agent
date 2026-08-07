"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, Loader2 } from "lucide-react";

import { useOdooConfig } from "@/hooks/use-odoo-config";
import { fetchRoutine, listRoutineRuns, listRoutines, runRoutine } from "@/lib/api";
import type { Routine, RoutineRunSummary } from "@/lib/types";
import { RoutineCard } from "@/components/routines/routine-card";
import { RoutineHistoryItem } from "@/components/routines/routine-history";
import { RoutineRunProgress } from "@/components/routines/routine-run-progress";
import { RoutineUnavailableCard } from "@/components/routines/routine-unavailable";

/**
 * La sección Rutinas (decisión D2).
 *
 * Las Rutinas se ejecutan **fuera del chat**, en su propia pantalla, con spinner, y ahí
 * quedan guardadas. Tres zonas: catálogo, corrida en curso e historial.
 */
export default function RoutinesPage() {
  const t = useTranslations("Routines");
  const locale = useLocale();
  const { activeConfigId, isConfigured } = useOdooConfig();

  const [routines, setRoutines] = useState<Routine[] | null>(null);
  /** Las que esta instancia NO puede correr, con su motivo (§9: el catálogo
   *  explica lo que oculta). No se ofertan — se explican. */
  const [unavailable, setUnavailable] = useState<Routine[]>([]);
  const [runs, setRuns] = useState<RoutineRunSummary[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  /** La Rutina en curso, CON sus pasos (el catálogo no los trae). */
  const [runningRoutine, setRunningRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(() => {
    listRoutineRuns().then((res) => {
      if (res.success && res.runs) setRuns(res.runs);
    });
  }, []);

  // El catálogo se pide CON el config_id: el backend lo filtra contra el
  // CapabilityProfile real de esa instancia (invariante #7).
  useEffect(() => {
    listRoutines(activeConfigId ?? undefined, locale).then((res) => {
      setRoutines(res.success && res.routines ? res.routines : []);
      setUnavailable(res.success && res.unavailable ? res.unavailable : []);
    });
  }, [activeConfigId, locale]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleRun = async (routineId: string, params: Record<string, unknown> = {}) => {
    if (!activeConfigId) return;
    setStartingId(routineId);
    setError(null);
    // Los pasos localizados sólo vienen en el detalle, no en el catálogo — y sin ellos la
    // barra de progreso muestra las claves crudas y en el orden que devuelva el JSONB.
    fetchRoutine(routineId, activeConfigId, locale).then((det) => {
      if (det.success && det.routine) setRunningRoutine(det.routine);
    });
    const res = await runRoutine(routineId, activeConfigId, params, locale);
    setStartingId(null);
    if (res.success && res.runId) {
      setActiveRunId(res.runId);
      return;
    }
    // 429 = tope de corridas simultáneas (A8). Es una espera, no una falla.
    setError(res.rateLimited ? t("tooManyRuns") : t("startFailed"));
  };

  const handleFinished = () => {
    setActiveRunId(null);
    setRunningRoutine(null);
    loadRuns();
  };

  const routineById = new Map((routines ?? []).map((r) => [r.id, r]));
  const activeRoutine = runningRoutine ?? undefined;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2">
          <ClipboardList size={24} strokeWidth={1.5} className="text-accent" />
          <h1 className="text-heading">{t("title")}</h1>
        </div>
        <p className="mb-6 text-body text-text-muted">{t("subtitle")}</p>

        {!isConfigured && (
          <div className="mb-6 rounded-card border border-border bg-surface p-4 text-small text-text-muted">
            {t("noInstance")}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-card border border-red-500/30 bg-red-500/5 p-4 text-small text-red-500">
            {error}
          </div>
        )}

        {/* En curso */}
        {activeRunId && (
          <section className="mb-8">
            <h2 className="mb-3 text-subheading">{t("inProgress")}</h2>
            <RoutineRunProgress
              runId={activeRunId}
              routine={activeRoutine}
              onFinished={handleFinished}
            />
          </section>
        )}

        {/* Catálogo */}
        <section className="mb-8">
          <h2 className="mb-3 text-subheading">{t("catalog")}</h2>
          {routines === null ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
            </div>
          ) : routines.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-4 text-small text-text-muted">
              {t("emptyCatalog")}
            </p>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  running={startingId === routine.id}
                  disabled={!isConfigured || activeRunId !== null}
                  onRun={(params) => handleRun(routine.id, params)}
                />
              ))}
            </div>
          )}

          {/* §9: el catálogo explica lo que oculta. Sin esto la Rutina simplemente
              no está y el usuario no sabe qué le falta para tenerla. */}
          {unavailable.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-small font-medium text-text-muted">
                {t("unavailableTitle")}
              </h3>
              <div className="space-y-3">
                {unavailable.map((routine) => (
                  <RoutineUnavailableCard key={routine.id} routine={routine} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Historial */}
        <section>
          <h2 className="mb-3 text-subheading">{t("history")}</h2>
          {runs.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-4 text-small text-text-muted">
              {t("emptyHistory")}
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <RoutineHistoryItem
                  key={run.id}
                  run={run}
                  routine={routineById.get(run.routine_id)}
                  rerunning={startingId === run.routine_id}
                  onRerun={() => handleRun(run.routine_id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
