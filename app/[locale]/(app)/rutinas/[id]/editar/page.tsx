"use client";

import { use, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, Loader2 } from "lucide-react";

import { RoutineEditor } from "@/components/routines/routine-editor";
import { useRouter } from "@/i18n/navigation";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { fetchRoutine } from "@/lib/api";
import type { Routine } from "@/lib/types";

/**
 * Editar una Rutina existente (F3).
 *
 * ⚠️ **El permiso lo decide el backend, no esta pantalla.** `fetchRoutine` pasa por la
 * misma resolución de visibilidad que el listado (es el anti-IDOR de la fase: un endpoint
 * de detalle que no repite el filtro del listado fue exactamente el hallazgo H-1 de la
 * auditoría de 2026-06 en `/chat/{id}/history`), y sólo manda el TEXTO de los pasos
 * cuando el llamador puede editarlos. Acá se lee `can_manage` para no dibujar un editor
 * que va a dar 403 al guardar — pero la puerta está del otro lado.
 */
export default function EditRoutinePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("Routines.editor");
  const locale = useLocale();
  const router = useRouter();
  const { activeConfigId } = useOdooConfig();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);

  useEffect(() => {
    fetchRoutine(id, activeConfigId ?? undefined, locale).then((res) => {
      if (!res.success || !res.routine) {
        router.replace("/rutinas");
        return;
      }
      if (!res.routine.can_manage) {
        setNotAllowed(true);
        return;
      }
      setRoutine(res.routine);
    });
  }, [id, activeConfigId, locale, router]);

  if (notAllowed) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <p className="rounded-card border border-border bg-surface p-4 text-small text-text-muted">
            {t("notAllowed")}
          </p>
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="flex flex-1 justify-center py-20">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-2 flex items-center gap-2">
          <ClipboardList size={24} strokeWidth={1.5} className="text-accent" />
          <h1 className="text-heading">{t("editTitle")}</h1>
        </div>
        <p className="mb-6 text-body text-text-muted">{t("editSubtitle")}</p>

        <RoutineEditor routine={routine} />
      </div>
    </div>
  );
}
