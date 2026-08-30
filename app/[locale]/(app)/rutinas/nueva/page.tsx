"use client";

import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";

import { RoutineEditor } from "@/components/routines/routine-editor";

/**
 * Crear una Rutina desde cero (F3).
 *
 * Es el camino **secundario** de la fase: el primario es guardar una conversación que ya
 * ocurrió (§3.1), donde el costo de autoría es cero. Éste existe para quien arranca sin
 * haber preguntado nada todavía, y para eso está la autoría asistida adentro del editor.
 *
 * **Sin gate de rol**: crear puede cualquiera de la organización, `CLIENT_USER` incluido
 * ([D3](../../../../../PLAN_RUTINAS/DECISIONES.md#d3--catálogo-autoría-y-permisos)).
 */
export default function NewRoutinePage() {
  const t = useTranslations("Routines.editor");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-2 flex items-center gap-2">
          <ClipboardList size={24} strokeWidth={1.5} className="text-accent" />
          <h1 className="text-heading">{t("newTitle")}</h1>
        </div>
        <p className="mb-6 text-body text-text-muted">{t("newSubtitle")}</p>

        <RoutineEditor />
      </div>
    </div>
  );
}
