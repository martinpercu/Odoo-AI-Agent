"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";

import { SaveAsRoutineModal } from "@/components/routines/save-as-routine-modal";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";

/**
 * El punto de entrada del camino primario de la Fase 3: *"esto, todos los meses"*.
 *
 * Flota sobre la conversación en vez de vivir en la barra de entrada: el gesto ocurre
 * **al final**, mirando lo que ya se contestó, no mientras se escribe.
 *
 * Se esconde en dos casos, los dos por la misma razón —una Rutina que no se puede
 * guardar no debe ofrecerse—:
 *  - **en demo**, porque los datos son de NUESTRA instancia y la Rutina se guardaría
 *    contra una org que el visitante no tiene;
 *  - **sin organización**, porque una Rutina de usuario siempre pertenece a una org
 *    ([D6](../../PLAN_RUTINAS/DECISIONES.md#d6)).
 *
 * ⚠️ **Hace falta permiso de autoría** (2026-08-12). D3 decía "crear puede cualquiera de
 * la organización, `CLIENT_USER` incluido"; en la práctica eso le ponía al cliente final
 * una herramienta de implementador delante del chat sin que su implementador lo hubiera
 * decidido. Ahora el ADMIN lo otorga por usuario y nace apagado.
 *
 * ⚠️ Se gatea en `meData.routines.can_author` —el valor YA RESUELTO por el backend—, no
 * en `user.can_author_routines`: ese es el flag crudo del cliente y no contempla que el
 * implementador puede por rol. Con el crudo, un ADMIN perdería su propio botón.
 */
export function SaveAsRoutineButton({
  chatId,
  hasMessages,
}: {
  chatId: string;
  hasMessages: boolean;
}) {
  const t = useTranslations("Routines.save");
  const [open, setOpen] = useState(false);
  const { activeConfigId, isDemoMode } = useOdooConfig();
  const { meData } = useSession();

  if (!hasMessages || isDemoMode || !meData?.org?.id) return null;
  if (!meData?.routines?.can_author) return null;

  return (
    <>
      <div className="pointer-events-none sticky bottom-2 z-10 flex justify-end px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex h-btn-sm items-center gap-1.5 rounded-btn border border-border bg-surface px-3 text-small font-medium shadow-sm transition-colors hover:bg-raised"
        >
          <ClipboardList size={16} strokeWidth={1.5} className="text-accent" />
          {t("cta")}
        </button>
      </div>

      {open && (
        <SaveAsRoutineModal
          open={open}
          onClose={() => setOpen(false)}
          chatId={chatId}
          configId={activeConfigId}
        />
      )}
    </>
  );
}
