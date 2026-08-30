"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Routine } from "@/lib/types";
import { RoutineIcon } from "@/components/routines/routine-icon";

/**
 * Una Rutina que ESTA instancia no puede correr (PLAN_RUTINAS Fase 2, F1).
 *
 * ⭐ **No se oferta — se explica.** La invariante #7 dice que nada se oferta si la
 * instancia no lo soporta, y esta tarjeta no tiene botón de ejecutar. Pero §9 pide que
 * el catálogo "explique por qué oculta el resto": sin esto la Rutina simplemente no
 * está, y el usuario no tiene forma de saber qué le falta para tenerla.
 *
 * El motivo llega del backend como **código + modelos**, no como frase: el agente habla
 * 6 idiomas y esta UI 11, así que la redacción vive de este lado.
 */
export function RoutineUnavailableCard({ routine }: { routine: Routine }) {
  const t = useTranslations("Routines");
  const reason = routine.unavailable_reason;

  return (
    <div className="rounded-card border border-dashed border-border bg-surface/50 p-5">
      <div className="flex items-start gap-3">
        <RoutineIcon name={routine.icon} className="shrink-0 opacity-40 text-text-muted" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-subheading text-text-muted">{routine.name}</h3>
          <p className="mt-1 text-small text-text-muted">{routine.description}</p>

          <p className="mt-3 flex items-start gap-1.5 text-small text-text-muted">
            <Lock size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {reason
                ? t(`unavailable.${reason.code}`, {
                    models: reason.models.join(", "),
                    count: reason.models.length,
                  })
                : t("unavailable.generic")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
