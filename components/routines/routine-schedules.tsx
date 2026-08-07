"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CalendarClock, Loader2, Trash2 } from "lucide-react";

import { deleteRoutineSchedule, updateRoutineSchedule } from "@/lib/api";
import type { Routine, RoutineSchedule } from "@/lib/types";
import { formatHour } from "@/components/routines/routine-schedule-form";

/**
 * "Mis agendados" (Fase 4 · F2).
 *
 * ⚠️ **Son del USUARIO, no de la organización.** Cada agendado corre con las credenciales
 * de su dueño (invariante #3): dos personas que agendan la misma Rutina reciben lo que su
 * propio Odoo les deja ver. Por eso no hay —ni debería haber— una vista "los agendados de
 * mi org": mostrarle a un ADMIN agendados que corren con credenciales ajenas invita a
 * leerlos como propios.
 *
 * El on/off es un `PATCH is_active`, no un borrado: apagar el digest de vacaciones y
 * volver a prenderlo en marzo no tiene por qué costar volver a configurarlo. Al
 * reactivarlo el backend **recalcula** `next_run_at` — si no, un agendado apagado hace un
 * mes dispararía en el mismo instante en que lo prendés.
 */
export function RoutineSchedulesSection({
  schedules,
  routines,
  onChanged,
}: {
  schedules: RoutineSchedule[];
  routines: Map<string, Routine>;
  onChanged: () => void;
}) {
  const t = useTranslations("Routines");

  if (schedules.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-subheading">{t("mySchedules")}</h2>
      <div className="space-y-3">
        {schedules.map((schedule) => (
          <ScheduleRow
            key={schedule.id}
            schedule={schedule}
            routine={routines.get(schedule.routine_id)}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}

function ScheduleRow({
  schedule,
  routine,
  onChanged,
}: {
  schedule: RoutineSchedule;
  routine?: Routine;
  onChanged: () => void;
}) {
  const t = useTranslations("Routines");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const toggle = async () => {
    setBusy(true);
    await updateRoutineSchedule(schedule.id, { isActive: !schedule.is_active });
    setBusy(false);
    onChanged();
  };

  const remove = async () => {
    setBusy(true);
    await deleteRoutineSchedule(schedule.id);
    setBusy(false);
    onChanged();
  };

  /** "Días hábiles a las 08:00" / "Los martes a las 09:00". */
  const when =
    schedule.cadence === "weekly"
      ? t("scheduleWhenWeekly", {
          weekday: t(`weekday.${schedule.weekday ?? 0}`),
          hour: formatHour(schedule.hour_local),
        })
      : schedule.cadence === "monthly"
        ? t("scheduleWhenMonthly", {
            day: schedule.day_of_month ?? 1,
            hour: formatHour(schedule.hour_local),
          })
        : t("scheduleWhenSimple", {
            cadence: t(`cadence.${schedule.cadence}`),
            hour: formatHour(schedule.hour_local),
          });

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CalendarClock
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 ${schedule.is_active ? "text-accent" : "text-text-muted"}`}
              aria-hidden
            />
            <span className="truncate text-body font-medium">
              {routine?.name ?? schedule.routine_id}
            </span>
            {/* Estado con TEXTO, no sólo con el color del icono. */}
            {!schedule.is_active && (
              <span className="shrink-0 rounded-btn bg-raised px-1.5 py-0.5 text-micro text-text-muted">
                {t("schedulePaused")}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-small text-text-muted">
            {when} · {schedule.timezone}
          </p>

          {/* La próxima corrida SÍ es un instante absoluto: acá el formato local del
              browser es lo correcto (a diferencia de la hora del agendado). */}
          {schedule.is_active && (
            <p className="mt-0.5 text-micro text-text-muted">
              {t("scheduleNextRun", {
                when: new Date(schedule.next_run_at).toLocaleString(),
              })}
            </p>
          )}

          {/* Que el último envío haya fallado no se puede silenciar: el usuario cree que
              está recibiendo el digest y no lo está. */}
          {schedule.last_error && (
            <p className="mt-1.5 flex items-start gap-1.5 text-micro text-text-muted">
              <AlertCircle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
              {t("scheduleLastError", { reason: schedule.last_error })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="h-btn-sm rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
            ) : schedule.is_active ? (
              t("schedulePause")
            ) : (
              t("scheduleResume")
            )}
          </button>

          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-btn-sm rounded-btn bg-error px-2.5 text-small font-medium text-white disabled:opacity-50"
              >
                {t("scheduleDeleteConfirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-btn-sm rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              title={t("scheduleDelete")}
              aria-label={t("scheduleDelete")}
              className="flex h-btn-sm items-center rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
