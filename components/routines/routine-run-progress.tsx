"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, MinusCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { fetchRoutineRun } from "@/lib/api";
import type { Routine, RoutineRunDetail, RoutineStepStatus } from "@/lib/types";

/** Cada cuánto se pregunta por el estado. Una corrida dura ~30s: 2s es barato. */
const POLL_MS = 2000;

/** Techo del polling. Si a los 5 minutos sigue corriendo, algo pasó del lado del server. */
const MAX_POLLS = 150;

function StepIcon({ status }: { status: RoutineStepStatus }) {
  if (status === "ok")
    return <Check size={14} strokeWidth={2} className="shrink-0 text-emerald-500" />;
  if (status === "error")
    return <AlertCircle size={14} strokeWidth={1.5} className="shrink-0 text-red-500" />;
  if (status === "skipped")
    return <MinusCircle size={14} strokeWidth={1.5} className="shrink-0 text-text-muted" />;
  return <Loader2 size={14} strokeWidth={1.5} className="shrink-0 animate-spin text-text-muted" />;
}

/**
 * La tarjeta de una corrida en curso, con progreso **paso a paso**.
 *
 * No es una barra genérica a propósito: el riesgo declarado de la fase es que 30 segundos
 * se perciban como "colgado". El usuario tiene que ver *"6 de 12: revisando facturas"*.
 */
export function RoutineRunProgress({
  runId,
  routine,
  onFinished,
}: {
  runId: string;
  routine?: Routine;
  onFinished: (run: RoutineRunDetail) => void;
}) {
  const t = useTranslations("Routines");
  const [run, setRun] = useState<RoutineRunDetail | null>(null);

  // Ref "al último valor": el polling no puede reiniciarse porque el padre haya
  // recreado el callback. Se sincroniza en un efecto y no durante el render —
  // escribir un ref mientras se renderiza rompe el modelo concurrente de React.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;

    const tick = async () => {
      if (cancelled) return;
      polls += 1;
      const res = await fetchRoutineRun(runId);
      if (cancelled) return;
      if (res.success && res.run) {
        setRun(res.run);
        const done = ["done", "partial", "error"].includes(res.run.status);
        if (done) {
          onFinishedRef.current(res.run);
          return;
        }
      }
      if (polls < MAX_POLLS) setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const total = run?.step_total ?? routine?.step_count ?? 0;
  const done = run?.step_done ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // ⚠️ El orden lo manda la SPEC, no `progress`. Ese objeto viaja por JSONB y Postgres
  // **no preserva el orden de las claves** (ordena por longitud y después bytewise), así
  // que iterarlo mostraba los pasos mezclados — "clientes_sin_vat" antes que
  // "clientes_sin_email". Con los pasos de la spec, el progreso sigue el orden en que la
  // Rutina los declaró, que es el orden en que efectivamente corren.
  const stepLabels = new Map((routine?.steps ?? []).map((s) => [s.key, s.label]));
  const progress = run?.progress ?? {};
  const orderedKeys = routine?.steps?.length
    ? routine.steps.map((s) => s.key).filter((k) => k in progress)
    : Object.keys(progress);
  const entries: Array<[string, RoutineStepStatus]> =
    orderedKeys.map((k) => [k, progress[k]]);

  // El paso "actual" es el primero que todavía no terminó — es lo que se nombra.
  const current = entries.find(([, status]) => status === "pending");
  const currentLabel = current ? stepLabels.get(current[0]) ?? current[0] : null;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-accent" />
        <h3 className="text-subheading">{routine?.name ?? t("running")}</h3>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-small text-text-muted">
        {t("progress", { done, total })}
        {currentLabel ? ` · ${currentLabel}` : ""}
      </p>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {entries.map(([key, status]) => (
            <li key={key} className="flex items-center gap-2 text-small">
              <StepIcon status={status} />
              <span
                className={
                  status === "pending" ? "text-text-muted" : "text-text-default"
                }
              >
                {stepLabels.get(key) ?? key}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
