"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Routine } from "@/lib/types";
import { RoutineParams } from "@/components/routines/routine-params";

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
}: {
  routine: Routine;
  onRun: (params: Record<string, unknown>) => void;
  running: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("Routines");
  // Los defaults ya vienen adaptados por el backend a lo que ESTA instancia usa
  // (B6), así que arrancar en ellos es arrancar en algo que devuelve datos.
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(routine.params.map((p) => [p.key, p.default]))
  );

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-2 flex items-start gap-3">
        <span className="shrink-0 text-[22px] leading-none" aria-hidden>
          {routine.icon || "📋"}
        </span>
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-small text-text-muted">
          {t("stepCount", { count: routine.step_count })}
        </span>
        <button
          type="button"
          onClick={() => onRun(values)}
          disabled={running || disabled}
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
  );
}
