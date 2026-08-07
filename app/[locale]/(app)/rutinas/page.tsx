"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, Loader2, Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";
import {
  fetchRoutine,
  listMyRoutineSchedules,
  listRoutineRuns,
  listRoutines,
  runRoutine,
} from "@/lib/api";
import type { Routine, RoutineRunSummary, RoutineSchedule } from "@/lib/types";
import { RoutineCard } from "@/components/routines/routine-card";
import { RoutineHistoryItem } from "@/components/routines/routine-history";
import { RoutineRunProgress } from "@/components/routines/routine-run-progress";
import { RoutineSchedulesSection } from "@/components/routines/routine-schedules";
import { RoutineUnavailableCard } from "@/components/routines/routine-unavailable";

/**
 * La sección Rutinas (decisión D2).
 *
 * Las Rutinas se ejecutan **fuera del chat**, en su propia pantalla, con spinner, y ahí
 * quedan guardadas. Tres zonas: catálogo, corrida en curso e historial.
 *
 * **Fase 3** agrega el agrupado del catálogo (§3.5): *Del sistema · De mi organización ·
 * Mías*. No es cosmético — es la mitigación del riesgo #1 de la fase ("el usuario guarda
 * 15 Rutinas y ninguna sirve"): agrupando, el ruido propio no tapa lo curado.
 */

/**
 * Los grupos del catálogo, en orden deliberado: **lo curado primero**.
 *
 * ⚠️ **No son los tres `scope`.** `private` se parte en dos, y hace falta: el ADMIN ve
 * las privadas de su gente porque administrarlas es su atribución (§3.4), y agrupar sólo
 * por `scope` las metía bajo **"Mías"** — o sea, le atribuía al admin borradores que
 * escribió otra persona. Encontrado mirando el catálogo con dos usuarios reales; con un
 * solo usuario los dos grupos son indistinguibles y el bug es invisible.
 */
type RoutineGroup = "system" | "org" | "mine" | "others";

const GROUP_ORDER: RoutineGroup[] = ["system", "org", "mine", "others"];

function groupOf(routine: Routine): RoutineGroup {
  if (routine.scope === "system") return "system";
  if (routine.scope === "org") return "org";
  return routine.is_mine ? "mine" : "others";
}
export default function RoutinesPage() {
  const t = useTranslations("Routines");
  const locale = useLocale();
  const { activeConfigId, isConfigured, isDemoMode } = useOdooConfig();
  const { meData } = useSession();

  /**
   * ¿Puede escribir Rutinas? **No hay gate de rol** — cualquiera de la organización,
   * `CLIENT_USER` incluido (D3). Lo único que hace falta es una org: una Rutina de
   * usuario siempre pertenece a una ([D6]), y en demo se guardaría contra una org que el
   * visitante no tiene.
   */
  const canAuthor = !!meData?.org?.id && !isDemoMode;

  /**
   * ¿Puede agendar? Hace falta una instancia propia: un agendado corre con las
   * credenciales del dueño (invariante #3) y en demo las credenciales son NUESTRAS —
   * mandarle a alguien un digest diario con datos de nuestra instancia de demostración
   * sería presentarle números ajenos como si fueran su negocio.
   */
  const canSchedule = !!meData?.org?.id && !isDemoMode && isConfigured;

  const [routines, setRoutines] = useState<Routine[] | null>(null);
  /** Las que esta instancia NO puede correr, con su motivo (§9: el catálogo
   *  explica lo que oculta). No se ofertan — se explican. */
  const [unavailable, setUnavailable] = useState<Routine[]>([]);
  const [runs, setRuns] = useState<RoutineRunSummary[]>([]);
  /** Fase 4 — los agendados del usuario. Corren con SUS credenciales, así que la lista
   *  es personal: no existe una vista "los agendados de mi org". */
  const [schedules, setSchedules] = useState<RoutineSchedule[]>([]);
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

  const loadSchedules = useCallback(() => {
    if (!canSchedule) return;
    listMyRoutineSchedules().then((res) => {
      if (res.success && res.schedules) setSchedules(res.schedules);
    });
  }, [canSchedule]);

  // El catálogo se pide CON el config_id: el backend lo filtra contra el
  // CapabilityProfile real de esa instancia (invariante #7). Los permisos (B1) los
  // aplica el mismo endpoint, ANTES que la capacidad — explicarle a alguien por qué
  // no ve una Rutina que además no tiene permiso de ver sería filtrar información
  // sobre lo que hacen sus compañeros.
  const loadCatalog = useCallback(() => {
    listRoutines(activeConfigId ?? undefined, locale).then((res) => {
      setRoutines(res.success && res.routines ? res.routines : []);
      setUnavailable(res.success && res.unavailable ? res.unavailable : []);
    });
  }, [activeConfigId, locale]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

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

  /**
   * Agrupado (§3.5). Una Rutina `private` de otra persona sólo llega acá cuando el que
   * mira es ADMIN — y entonces va a su propio grupo, no a "Mías": administrarla no la
   * vuelve suya.
   */
  const groups = useMemo(() => {
    const byGroup = new Map<RoutineGroup, Routine[]>();
    for (const routine of routines ?? []) {
      const key = groupOf(routine);
      byGroup.set(key, [...(byGroup.get(key) ?? []), routine]);
    }
    return GROUP_ORDER.filter((g) => (byGroup.get(g)?.length ?? 0) > 0).map((group) => ({
      group,
      items: byGroup.get(group) as Routine[],
    }));
  }, [routines]);

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

        {/* Catálogo — agrupado por alcance (§3.5) */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-subheading">{t("catalog")}</h2>
            {canAuthor && (
              <Link
                href="/rutinas/nueva"
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised"
              >
                <Plus size={16} strokeWidth={1.5} className="text-accent" />
                {t("createNew")}
              </Link>
            )}
          </div>

          {routines === null ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
            </div>
          ) : routines.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-4 text-small text-text-muted">
              {t("emptyCatalog")}
            </p>
          ) : (
            <div className="space-y-6">
              {groups.map(({ group, items }) => (
                <div key={group}>
                  {/* El encabezado del grupo sólo aparece cuando hay MÁS de uno: con un
                      solo grupo es una etiqueta que no distingue nada. */}
                  {groups.length > 1 && (
                    <h3 className="mb-2 text-small font-medium text-text-muted">
                      {t(`group.${group}`)}
                    </h3>
                  )}
                  <div className="space-y-3">
                    {items.map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        running={startingId === routine.id}
                        disabled={!isConfigured || activeRunId !== null}
                        onRun={(params) => handleRun(routine.id, params)}
                        onChanged={canAuthor ? loadCatalog : undefined}
                        configId={activeConfigId}
                        onScheduled={canSchedule ? () => loadSchedules() : undefined}
                      />
                    ))}
                  </div>
                </div>
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

        {/* Mis agendados (Fase 4 · F2) — arriba del historial: son lo que va a PASAR,
            y el historial es lo que ya pasó. */}
        <RoutineSchedulesSection
          schedules={schedules}
          routines={routineById}
          onChanged={loadSchedules}
        />

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
