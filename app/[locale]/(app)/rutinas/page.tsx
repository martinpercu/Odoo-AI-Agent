"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";
import {
  deleteAllRoutineRuns,
  fetchRoutine,
  listMyRoutineSchedules,
  listRoutineRuns,
  listRoutines,
  runRoutine,
} from "@/lib/api";
import type { Routine, RoutineRunSummary, RoutineSchedule } from "@/lib/types";
import { instanceLabelById } from "@/lib/instance-label";
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

  const role = meData?.user?.role;
  const isBuilder = role === "ADMIN" || role === "SUPERADMIN";

  /**
   * Las instancias entre las que un implementador puede elegir al ejecutar.
   *
   * ⚠️ Sólo las que tienen la Conexión del llamador en `active`: una Rutina corre con SUS
   * credenciales (invariante #3), así que ofrecer una instancia donde todavía no cargó su
   * API key es ofrecer una corrida que va a fallar recién después del spinner.
   *
   * Para un `CLIENT_USER` la lista queda vacía a propósito: tiene una sola instancia y el
   * paso de elegir no existe para él.
   */
  const selectableInstances = useMemo(
    () =>
      isBuilder && !isDemoMode
        ? (meData?.odoo_configs ?? []).filter((c) => c.connection_status === "active")
        : [],
    [isBuilder, isDemoMode, meData?.odoo_configs]
  );

  /**
   * ¿Puede escribir Rutinas?
   *
   * ⚠️ **Desde 2026-08-12 hace falta permiso**, otorgado por el ADMIN por usuario y
   * apagado por defecto. Antes bastaba con tener org (D3: "crear puede cualquiera de la
   * organización"); ese default le ponía al cliente final una herramienta de
   * implementador delante sin que nadie lo decidiera.
   *
   * Se lee el valor YA RESUELTO por el backend (`routines.can_author`), que contempla al
   * implementador por rol. Recalcularlo acá es cómo aparece un botón que el backend
   * contesta con 403. Sigue haciendo falta una org (D6) y no valer en demo, donde se
   * guardaría contra una org que el visitante no tiene.
   */
  const canAuthor = !!meData?.org?.id && !isDemoMode && !!meData?.routines?.can_author;

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
  /** "Vaciar el historial": confirmación en línea + su estado de envío. */
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

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

  /**
   * Dispara una corrida. `configId` es explícito y **no cae a la instancia activa por
   * defecto**: quien llama siempre sabe contra qué instancia quiere correr — la tarjeta
   * porque el usuario la eligió, el historial porque la corrida original la registró — y
   * un default silencioso acá es cómo un "volver a correr" termina consultando la base
   * de otro cliente.
   */
  const handleRun = async (
    routineId: string,
    params: Record<string, unknown> = {},
    configId?: string | null
  ) => {
    const target = configId ?? activeConfigId;
    if (!target) return;
    setStartingId(routineId);
    setError(null);
    // Los pasos localizados sólo vienen en el detalle, no en el catálogo — y sin ellos la
    // barra de progreso muestra las claves crudas y en el orden que devuelva el JSONB.
    fetchRoutine(routineId, target, locale).then((det) => {
      if (det.success && det.routine) setRunningRoutine(det.routine);
    });
    const res = await runRoutine(routineId, target, params, locale);
    setStartingId(null);
    if (res.success && res.runId) {
      setActiveRunId(res.runId);
      return;
    }
    // 429 = tope de corridas simultáneas (A8). Es una espera, no una falla.
    if (res.rateLimited) return setError(t("tooManyRuns"));
    // 409 = la instancia elegida no cumple el `requires`. Desde que se puede elegir
    // instancia esto es esperable —el catálogo se filtró contra la ACTIVA— y el mensaje
    // tiene que nombrarla, si no el usuario no sabe cuál cambiar.
    if (res.notAvailable) {
      return setError(
        t("notAvailableOnInstance", {
          instance: instanceLabelById(meData?.odoo_configs, target) ?? "",
        })
      );
    }
    setError(t("startFailed"));
  };

  const handleClearHistory = async () => {
    setClearBusy(true);
    setError(null);
    const res = await deleteAllRoutineRuns();
    setClearBusy(false);
    setClearingHistory(false);
    if (res.success) {
      setRuns([]);
      return;
    }
    setError(t("clearHistoryFailed"));
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
                        onRun={(params, configId) => handleRun(routine.id, params, configId)}
                        onChanged={canAuthor ? loadCatalog : undefined}
                        configId={activeConfigId}
                        instances={selectableInstances}
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

        {/* Historial. ⚠️ **La sección entera desaparece cuando no hay corridas** — antes
            quedaba el título "Historial" sobre una tarjeta que decía "todavía no
            corriste ninguna Rutina", o sea dos elementos de interfaz para comunicar
            que no hay nada. En una pantalla cuyo problema declarado es el exceso de
            información, el estado vacío más honesto es no ocupar lugar. */}
        {runs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-subheading">{t("history")}</h2>
            {/* "Vaciar el historial" sólo aparece cuando hay algo que vaciar, y pide
                confirmación en línea. Es irreversible: borra las corridas y sus
                checkpoints, aunque NO los pins que las Rutinas hayan dejado en el
                Tablero (viven por Rutina, no por corrida). */}
            {clearingHistory ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-small text-text-muted">{t("clearHistoryConfirm")}</span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    disabled={clearBusy}
                    className="flex h-btn-sm items-center rounded-btn border border-error/40 px-2.5 text-small text-error transition-colors hover:bg-error-subtle disabled:opacity-50"
                  >
                    {clearBusy ? (
                      <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      t("confirmYes")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearingHistory(false)}
                    disabled={clearBusy}
                    className="flex h-btn-sm items-center rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised disabled:opacity-50"
                  >
                    {t("confirmNo")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setClearingHistory(true)}
                  /* `text-text-secondary` y no `text-text-muted`: en muted se leía como
                   deshabilitado, y un botón que parece apagado o no se toca o se toca
                   dos veces. Sigue siendo de baja jerarquía —es destructivo— y recién
                   en hover se pone rojo. */
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small text-text-secondary transition-colors hover:bg-raised hover:text-error"
                >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                {t("clearHistory")}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {runs.map((run) => (
                <RoutineHistoryItem
                  key={run.id}
                  run={run}
                  routine={routineById.get(run.routine_id)}
                  instanceName={
                    isBuilder ? instanceLabelById(meData?.odoo_configs, run.config_id) : null
                  }
                  rerunning={startingId === run.routine_id}
                  onRerun={() => handleRun(run.routine_id, {}, run.config_id)}
                  onDeleted={() =>
                    setRuns((prev) => prev.filter((r) => r.id !== run.id))
                  }
                />
            ))}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
