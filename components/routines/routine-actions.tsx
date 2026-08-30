"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Copy, Loader2, Pencil, Share2, Trash2, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { deleteRoutine, forkRoutine, shareRoutine } from "@/lib/api";
import type { Routine } from "@/lib/types";

/**
 * Las acciones de una Rutina en el catálogo (F2, §3.5).
 *
 * Quién ve qué:
 *  - **Clonar** — cualquiera que la vea. Es el camino esperado, no un atajo: el catálogo
 *    base existe para que se clone y se edite ([D8]).
 *  - **Editar / Compartir / Borrar** — sólo `can_manage` (autor o ADMIN), que lo resuelve
 *    el backend. Acá no se recalcula el permiso: duplicar esa regla en el cliente es
 *    cómo aparecen los botones que dan 403 al tocarlos.
 *
 * ⚠️ El botón de compartir lleva un **copy explícito** sobre qué significa compartir. Es
 * el riesgo #2 de la fase: la gente cree que compartir una Rutina comparte los datos. No
 * los comparte — cada persona la corre con su propio acceso a Odoo y ve sólo lo que Odoo
 * le permite ([A6]). Es verdad y es tranquilizador, así que se dice.
 */
export function RoutineActions({
  routine,
  onChanged,
}: {
  routine: Routine;
  onChanged: () => void;
}) {
  const t = useTranslations("Routines.actions");
  const locale = useLocale();
  const [busy, setBusy] = useState<null | "fork" | "share" | "delete">(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canManage = !!routine.can_manage;
  const isShared = routine.scope === "org";

  const handleFork = async () => {
    setBusy("fork");
    await forkRoutine(routine.id, t("copySuffix", { name: routine.name }), locale);
    setBusy(null);
    onChanged();
  };

  const handleShare = async () => {
    setBusy("share");
    await shareRoutine(routine.id, !isShared);
    setBusy(null);
    onChanged();
  };

  const handleDelete = async () => {
    setBusy("delete");
    await deleteRoutine(routine.id);
    setBusy(null);
    setConfirmingDelete(false);
    onChanged();
  };

  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-2 text-small">
        <span className="text-text-muted">{t("confirmDelete")}</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy !== null}
          className="h-btn-sm rounded-btn bg-error px-2.5 text-small font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy === "delete" ? "…" : t("confirmYes")}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(false)}
          className="h-btn-sm rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised"
        >
          {t("confirmNo")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <IconAction
        label={t("fork")}
        onClick={handleFork}
        loading={busy === "fork"}
        icon={<Copy size={15} strokeWidth={1.5} />}
      />

      {canManage && (
        <>
          <Link
            href={`/rutinas/${routine.id}/editar`}
            aria-label={t("edit")}
            title={t("edit")}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised"
          >
            <Pencil size={15} strokeWidth={1.5} />
            <span className="hidden sm:inline">{t("edit")}</span>
          </Link>

          <IconAction
            label={isShared ? t("unshare") : t("share")}
            title={isShared ? t("unshareHint") : t("shareHint")}
            onClick={handleShare}
            loading={busy === "share"}
            active={isShared}
            icon={
              isShared ? (
                <Users size={15} strokeWidth={1.5} />
              ) : (
                <Share2 size={15} strokeWidth={1.5} />
              )
            }
          />

          <IconAction
            label={t("delete")}
            onClick={() => setConfirmingDelete(true)}
            icon={<Trash2 size={15} strokeWidth={1.5} />}
            destructive
          />
        </>
      )}
    </div>
  );
}

function IconAction({
  label,
  title,
  onClick,
  icon,
  loading,
  active,
  destructive,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  icon: React.ReactNode;
  loading?: boolean;
  active?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={title ?? label}
      className={`flex h-btn-sm items-center gap-1.5 rounded-btn border px-2.5 text-small transition-colors disabled:opacity-50 ${
        active
          ? "border-accent bg-accent-subtle text-accent"
          : destructive
            ? "border-border text-error hover:bg-error-subtle"
            : "border-border hover:bg-raised"
      }`}
    >
      {loading ? (
        <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
      ) : (
        icon
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
