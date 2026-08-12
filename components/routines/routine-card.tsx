"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import type { OdooConfigSummary, Routine, RoutineSchedule } from "@/lib/types";
import { RoutineActions } from "@/components/routines/routine-actions";
import { RoutineIcon } from "@/components/routines/routine-icon";
import { RoutineParams } from "@/components/routines/routine-params";
import { RoutineRunConfirm } from "@/components/routines/routine-run-confirm";
import {
  RoutineScheduleButton,
  RoutineScheduleForm,
} from "@/components/routines/routine-schedule-form";

/**
 * Una Rutina del catálogo.
 *
 * El catálogo que llega ya viene filtrado por el backend contra el `CapabilityProfile`
 * real de la instancia (invariante #7 del programa: nada se oferta si la instancia no lo
 * soporta), así que acá no hay que decidir nada — sólo mostrar.
 *
 * ⭐ **Los parámetros van EN la tarjeta, a la vista (F2).** Es la interfaz donde el
 * usuario descubre que la Rutina se puede variar, y ese descubrimiento es el punto
 * entero del catálogo base (D8). Escondidos detrás de un "configurar", el catálogo no
 * enseñaría nada.
 */
export function RoutineCard({
  routine,
  onRun,
  running,
  disabled,
  onChanged,
  configId,
  onScheduled,
  instances,
}: {
  routine: Routine;
  onRun: (params: Record<string, unknown>, configId: string) => void;
  running: boolean;
  disabled?: boolean;
  /** Fase 3: refrescar el catálogo después de clonar / compartir / borrar. */
  onChanged?: () => void;
  /** Fase 4: la instancia contra la que se agenda. Sin ella no se puede agendar. */
  configId?: string | null;
  /** Fase 4: refrescar "Mis agendados". Ausente = no se ofrece agendar (demo). */
  onScheduled?: (schedule: RoutineSchedule) => void;
  /**
   * Instancias entre las que se puede elegir al ejecutar (2026-08-12).
   *
   * **Con una sola no se pregunta nada**: el popup de confirmación se saltea y "Ejecutar"
   * corre derecho. Preguntar entre una opción es fricción pura, y es exactamente el caso
   * del `CLIENT_USER`, para quien este paso no existe.
   */
  instances?: OdooConfigSummary[];
}) {
  const t = useTranslations("Routines");
  // Los defaults ya vienen adaptados por el backend a lo que ESTA instancia usa
  // (B6), así que arrancar en ellos es arrancar en algo que devuelve datos.
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(routine.params.map((p) => [p.key, p.default]))
  );
  const [scheduling, setScheduling] = useState(false);

  /**
   * ¿Está abierto el popup de "¿contra qué instancia?" (`RoutineRunConfirm`)?
   *
   * ⚠️ **No hay estado de "instancia elegida" en la tarjeta, y es a propósito.** La
   * versión anterior tenía un desplegable acá con su propio `runOn`, y esa elección
   * quedaba congelada: cambiar de instancia desde el menú lateral no se reflejaba en
   * ninguna tarjeta. La instancia la resuelve el popup **al abrirse**, contra la activa
   * de ese momento — sin estado que sobreviva, no hay nada que pueda quedar viejo.
   */
  const [confirming, setConfirming] = useState(false);

  const pickable = instances ?? [];
  // Con 0 o 1 instancia no hay nada que preguntar: se corre contra la activa.
  const needsConfirm = pickable.length > 1;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-2 flex items-start gap-3">
        <RoutineIcon name={routine.icon} className="shrink-0 text-text-muted" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-subheading">{routine.name}</h3>
          <p className="mt-1 text-small text-text-muted">{routine.description}</p>
        </div>
      </div>

      <RoutineParams
        params={routine.params}
        values={values}
        disabled={running || disabled}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-small text-text-muted">
          {t("stepCount", { count: routine.step_count })}
        </span>
        {onChanged && <RoutineActions routine={routine} onChanged={onChanged} />}
        <div className="flex items-center gap-2">
          {onScheduled && (
            <RoutineScheduleButton
              open={scheduling}
              disabled={running || disabled || !configId}
              onClick={() => setScheduling((v) => !v)}
            />
          )}
          <button
            type="button"
            onClick={() =>
              needsConfirm ? setConfirming(true) : configId && onRun(values, configId)
            }
            disabled={running || disabled || (!needsConfirm && !configId)}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Play size={16} strokeWidth={1.5} />
            )}
            {t("run")}
          </button>
        </div>
      </div>

      {/* El panel va a lo ancho, DEBAJO de la fila: hereda los `values` que el usuario
          tiene puestos arriba, porque agendar es "esto que acabo de armar, todos los
          días" y no un formulario aparte donde volver a elegir período y comparación. */}
      {scheduling && onScheduled && (
        <RoutineScheduleForm
          routineId={routine.id}
          configId={configId ?? null}
          params={values}
          onCreated={onScheduled}
          onClose={() => setScheduling(false)}
        />
      )}

      <RoutineRunConfirm
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={(chosen) => {
          setConfirming(false);
          onRun(values, chosen);
        }}
        routineName={routine.name}
        instances={pickable}
        activeConfigId={configId ?? null}
      />
    </div>
  );
}
