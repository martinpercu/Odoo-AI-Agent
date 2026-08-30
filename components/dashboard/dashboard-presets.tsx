"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { listRoutines, runRoutine } from "@/lib/api";
import type { Routine } from "@/lib/types";

/**
 * Tableros preset por rol (PLAN_RUTINAS Fase 5 · F4 / §3.3).
 *
 * ⭐ **Un preset ES una Rutina cuyo `compose` es sólo `pin`.** Cero maquinaria nueva:
 * este panel lista las Rutinas del catálogo cuyo id empieza con `tablero_`, las corre
 * con el endpoint de siempre, y el runner deja los gráficos en el Tablero. Un endpoint
 * "crear tablero preset" sería una segunda forma de hacer lo mismo.
 *
 * ⭐ **El gating sale gratis.** El catálogo se pide CON `config_id`, así que el backend
 * ya filtró por el `CapabilityProfile` real: el preset de Vendedor no aparece en una
 * instancia sin CRM (invariante #7). Acá no se decide nada — se muestra lo que llegó.
 */

/** El prefijo que distingue un preset de una Rutina normal en el catálogo del sistema. */
const PRESET_PREFIX = "tablero_";

interface DashboardPresetsProps {
  configId: string | null;
  /** Se llama cuando una corrida terminó, para recargar las tarjetas. */
  onApplied: () => void;
  disabled?: boolean;
}

export function DashboardPresets({ configId, onApplied, disabled }: DashboardPresetsProps) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [presets, setPresets] = useState<Routine[] | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configId) {
      setPresets([]);
      return;
    }
    listRoutines(configId, locale).then((res) => {
      const all = res.success && res.routines ? res.routines : [];
      setPresets(all.filter((r) => r.id.startsWith(PRESET_PREFIX)));
    });
  }, [configId, locale]);

  /**
   * Correr el preset y esperar a que termine.
   *
   * ⚠️ Los pins los publica el runner AL CERRAR la corrida, no al dispararla — así que
   * recargar el Tablero apenas vuelve el `202` mostraría el estado anterior y el usuario
   * concluiría que el botón no hizo nada. Se poléa hasta que la corrida sea terminal,
   * igual que hace `RoutineRunProgress` en `/rutinas`.
   */
  async function apply(routineId: string) {
    if (!configId) return;
    setRunningId(routineId);
    setError(null);
    const res = await runRoutine(routineId, configId, {}, locale);
    if (!res.success || !res.runId) {
      setRunningId(null);
      setError(res.rateLimited ? t("presets.tooManyRuns") : t("presets.failed"));
      return;
    }
    const { fetchRoutineRun } = await import("@/lib/api");
    const deadline = Date.now() + 3 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const run = await fetchRoutineRun(res.runId);
      const status = run.success ? run.run?.status : undefined;
      if (status && !["queued", "running"].includes(status)) {
        // `partial` es un éxito con nota (7 de 8 pasos): las tarjetas que salieron
        // bien ya están en el Tablero y hay que mostrarlas.
        if (status === "error") setError(t("presets.failed"));
        break;
      }
    }
    setRunningId(null);
    onApplied();
  }

  if (presets === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }
  if (presets.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
        <h2 className="text-subheading">{t("presets.title")}</h2>
      </div>
      <p className="mb-3 text-small text-text-muted">{t("presets.subtitle")}</p>

      {error && (
        <div className="mb-3 rounded-card border border-error/30 bg-error-subtle p-3 text-small text-error">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              {preset.icon && <span aria-hidden>{preset.icon}</span>}
              <h3 className="min-w-0 flex-1 text-body font-semibold text-foreground">
                {preset.name}
              </h3>
            </div>
            {preset.description && (
              <p className="text-small text-text-muted">{preset.description}</p>
            )}
            <button
              onClick={() => apply(preset.id)}
              disabled={disabled || runningId !== null || !configId}
              className="mt-1 flex h-btn-sm items-center justify-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {runningId === preset.id ? (
                <>
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  {t("presets.building")}
                </>
              ) : (
                t("presets.apply")
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
