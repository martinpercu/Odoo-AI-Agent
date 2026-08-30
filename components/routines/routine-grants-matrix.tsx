"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info, Loader2 } from "lucide-react";

import { fetchRoutineGrants, setRoutineGrant } from "@/lib/api";
import type { RoutineGrant, RoutineGrantsMatrix } from "@/lib/types";

/**
 * La matriz **Rutina × usuario** del ADMIN (F4, §3.4).
 *
 * ⚠️ **Hay TRES estados por celda, no dos**, y colapsarlos en un checkbox es el error
 * que hace inutilizable esta pantalla:
 *
 *  - **heredado** (no hay fila) → manda el default de la org y, si tampoco hay, el
 *    `scope`;
 *  - **habilitado** (fila en `true`) → se ve aunque el default de la org diga que no;
 *  - **deshabilitado** (fila en `false`) → no se ve aunque el default diga que sí.
 *
 * Sin el estado "heredado" el admin no puede deshacer una decisión: sólo puede cambiarla
 * por la contraria. Por eso cada celda es un selector de tres, no un toggle.
 *
 * ⭐ **El default de la org es la primera columna**, y es la que se usa el 90% de las
 * veces: *"esta Rutina la ve todo el mundo / nadie"*. Las columnas por usuario son la
 * excepción.
 *
 * ⚠️ Una Rutina `private` **no es otorgable**: compartir es pasarla a `org`, un acto
 * explícito del autor o del ADMIN. Un grant sobre algo privado o no hace nada, o
 * comparte sin que nadie lo haya decidido.
 */
export function RoutineGrantsMatrixPanel({ orgId }: { orgId: string }) {
  const t = useTranslations("Routines.grants");
  const locale = useLocale();

  const [matrix, setMatrix] = useState<RoutineGrantsMatrix | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchRoutineGrants(orgId, locale).then((res) => {
      if (res.success && res.matrix) setMatrix(res.matrix);
      else setError(t("loadFailed"));
    });
  }, [orgId, locale, t]);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (
    routineId: string,
    userId: string | null,
    enabled: boolean | null
  ) => {
    const cellId = `${routineId}:${userId ?? "__default__"}`;
    setBusy(cellId);
    setError(null);
    const res = await setRoutineGrant({ orgId, routineId, userId, enabled });
    setBusy(null);
    if (!res.success) {
      setError(
        res.errorCode === "private_routine_not_grantable"
          ? t("privateNotGrantable")
          : t("saveFailed")
      );
      return;
    }
    setMatrix((prev) =>
      prev
        ? {
            ...prev,
            grants: [
              ...prev.grants.filter(
                (g) => !(g.routine_id === routineId && g.user_id === userId)
              ),
              ...(res.grants ?? []).filter((g) => g.routine_id === routineId),
            ],
          }
        : prev
    );
  };

  if (!matrix) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const grantable = matrix.routines.filter((r) => r.grantable);

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-card border border-border bg-raised p-3 text-small text-text-muted">
        <Info size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-info" />
        {/* El riesgo #2 de la fase: la gente cree que compartir una Rutina comparte los
            datos. No los comparte, y decirlo es tranquilizador. */}
        {t("dataNotice")}
      </p>

      {error && (
        <p className="text-small text-error" role="alert">
          {error}
        </p>
      )}

      {grantable.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-small text-text-muted">
          {t("nothingGrantable")}
        </p>
      ) : (
        <div className="space-y-3">
          {grantable.map((routine) => (
            <div key={routine.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-start gap-2">
                <span className="text-[18px] leading-none" aria-hidden>
                  {routine.icon || "📋"}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-small font-medium">{routine.name}</h4>
                  <p className="text-micro text-text-muted">
                    {t(`scope.${routine.scope}`)}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {/* El default de la org: la fila que se usa casi siempre. */}
                <GrantRow
                  label={t("orgDefault")}
                  emphasis
                  value={valueOf(matrix.grants, routine.id, null)}
                  busy={busy === `${routine.id}:__default__`}
                  onChange={(v) => change(routine.id, null, v)}
                />

                {/* ⚠️ "no pude leer los usuarios" y "la org no tiene otros usuarios" se
                    ven IGUAL (una matriz sin filas) y significan cosas opuestas. Sin
                    decirlo, una matriz rota parece funcionar — que es exactamente cómo
                    pasó inadvertido el `full_name` inexistente. */}
                {matrix.users_ok === false && (
                  <p className="px-2 text-micro text-warning-solid">{t("usersFailed")}</p>
                )}

                {matrix.users.map((user) => (
                  <GrantRow
                    key={user.id}
                    label={user.name || user.email}
                    hint={user.name ? user.email : undefined}
                    value={valueOf(matrix.grants, routine.id, user.id)}
                    busy={busy === `${routine.id}:${user.id}`}
                    onChange={(v) => change(routine.id, user.id, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Las privadas se listan, apagadas, con el motivo: esconderlas dejaría al admin
          buscando una Rutina que sabe que existe. */}
      {matrix.routines.some((r) => !r.grantable) && (
        <div className="rounded-card border border-border bg-raised/40 p-4">
          <h4 className="text-small font-medium text-text-muted">{t("privateTitle")}</h4>
          <p className="mt-1 text-micro text-text-muted">{t("privateHint")}</p>
          <ul className="mt-2 space-y-1">
            {matrix.routines
              .filter((r) => !r.grantable)
              .map((r) => (
                <li key={r.id} className="text-small text-text-muted">
                  {r.icon || "📋"} {r.name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** `null` = heredado (no hay fila guardada). */
function valueOf(
  grants: RoutineGrant[],
  routineId: string,
  userId: string | null
): boolean | null {
  const row = grants.find((g) => g.routine_id === routineId && g.user_id === userId);
  return row ? row.enabled : null;
}

function GrantRow({
  label,
  hint,
  value,
  busy,
  emphasis,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean | null;
  busy: boolean;
  emphasis?: boolean;
  onChange: (v: boolean | null) => void;
}) {
  const t = useTranslations("Routines.grants");

  const options: { key: string; value: boolean | null }[] = [
    { key: "inherit", value: null },
    { key: "on", value: true },
    { key: "off", value: false },
  ];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-btn px-2 py-1.5 ${
        emphasis ? "bg-raised" : ""
      }`}
    >
      <div className="min-w-0">
        <p className={`truncate text-small ${emphasis ? "font-medium" : ""}`}>{label}</p>
        {hint && <p className="truncate text-micro text-text-muted">{hint}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
        {busy && (
          <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-text-muted" />
        )}
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={busy}
              aria-pressed={active}
              className={`h-btn-sm rounded-btn border px-2 text-micro transition-colors disabled:opacity-50 ${
                active
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border text-text-muted hover:bg-raised"
              }`}
            >
              {t(`value.${opt.key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
