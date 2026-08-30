"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Loader2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/hooks/use-session";
import { createRoutineSchedule } from "@/lib/api";
import type { RoutineCadence, RoutineSchedule } from "@/lib/types";

/** 0 = lunes … 6 = domingo — la convención del backend (`datetime.weekday()`). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const CADENCES: RoutineCadence[] = ["daily", "weekdays", "weekly", "monthly"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** `"08:00"` — la hora del agendado NO se formatea con la locale del browser: es una
 *  hora en la zona del AGENDADO, no un instante, y `toLocaleTimeString` la correría. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const selectClass =
  "h-btn-sm rounded-btn border border-border bg-base px-2 text-small " +
  "focus:border-accent focus:outline-none disabled:opacity-50";

/**
 * El formulario de agendado (Fase 4 · F1).
 *
 * ⭐ **Hereda los parámetros que el usuario tiene puestos en la tarjeta.** Agendar es
 * decir *"esto que acabo de armar, todos los días"* — obligarlo a volver a elegir período
 * y comparación adentro de otro formulario rompería justamente la continuidad que hace
 * que el agendado se entienda.
 *
 * ⚠️ **La zona horaria se muestra siempre, y es un link.** El riesgo #1 de la fase es un
 * digest a las 3 de la mañana: quien agenda "a las 8:00" tiene que ver, en ese mismo
 * momento, a las 8:00 de dónde. No se manda la zona del browser — el backend resuelve la
 * del PERFIL, porque agendar desde un aeropuerto no debería fijar el digest en la zona
 * del aeropuerto.
 */
/** El botón que abre el panel. Vive en la fila de acciones de la tarjeta. */
export function RoutineScheduleButton({
  onClick,
  disabled,
  open,
}: {
  onClick: () => void;
  disabled?: boolean;
  open: boolean;
}) {
  const t = useTranslations("Routines");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small transition-colors hover:bg-raised/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <CalendarClock size={16} strokeWidth={1.5} className="text-accent" aria-hidden />
      {t("schedule")}
    </button>
  );
}

/**
 * El panel. Es CONTROLADO (el que lo abre es la tarjeta) porque tiene que renderizarse a
 * lo ancho, debajo de la fila de acciones — dentro de la fila los cuatro selectores
 * quedan apretados contra el botón de correr.
 */
export function RoutineScheduleForm({
  routineId,
  configId,
  params,
  onCreated,
  onClose,
}: {
  routineId: string;
  configId: string | null;
  params: Record<string, unknown>;
  onCreated: (schedule: RoutineSchedule) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Routines");
  const locale = useLocale();
  const { meData } = useSession();

  const [cadence, setCadence] = useState<RoutineCadence>("weekdays");
  const [hour, setHour] = useState(8);
  const [weekday, setWeekday] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = meData?.timezone;

  const submit = async () => {
    if (!configId) return;
    setSaving(true);
    setError(null);
    const res = await createRoutineSchedule({
      routineId,
      configId,
      cadence,
      hourLocal: hour,
      params,
      language: locale,
      weekday: cadence === "weekly" ? weekday : null,
      dayOfMonth: cadence === "monthly" ? dayOfMonth : null,
    });
    setSaving(false);
    if (res.success && res.schedule) {
      onCreated(res.schedule);
      onClose();
      return;
    }
    setError(res.notAvailable ? t("scheduleNotAvailable") : t("scheduleFailed"));
  };

  return (
    <div className="mt-3 w-full rounded-card border border-border bg-base p-4">
      <p className="mb-3 text-small font-medium">{t("scheduleTitle")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value as RoutineCadence)}
          disabled={saving}
          aria-label={t("scheduleCadence")}
          className={selectClass}
        >
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {t(`cadence.${c}`)}
            </option>
          ))}
        </select>

        {cadence === "weekly" && (
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            disabled={saving}
            aria-label={t("scheduleWeekday")}
            className={selectClass}
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {t(`weekday.${d}`)}
              </option>
            ))}
          </select>
        )}

        {cadence === "monthly" && (
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            disabled={saving}
            aria-label={t("scheduleDayOfMonth")}
            className={selectClass}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {t("scheduleDayNumber", { day: d })}
              </option>
            ))}
          </select>
        )}

        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          disabled={saving}
          aria-label={t("scheduleHour")}
          className={selectClass}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </div>

      {/* Un 29/30/31 no existe todos los meses. Se avisa acá y no después: el backend
          lo lleva al último día del mes, y saltear febrero sería peor. */}
      {cadence === "monthly" && dayOfMonth > 28 && (
        <p className="mt-2 text-micro text-text-muted">{t("scheduleShortMonthNote")}</p>
      )}

      {/* La respuesta a "¿a las 8:00 de dónde?", en el momento de decidirlo. */}
      <p className="mt-3 text-micro text-text-muted">
        {t("scheduleTimezone", { timezone: timezone ?? "UTC" })}{" "}
        <Link href="/settings/odoo" className="text-accent hover:underline">
          {t("scheduleChangeTimezone")}
        </Link>
      </p>
      <p className="mt-1 text-micro text-text-muted">{t("scheduleDeliveryNote")}</p>

      {error && <p className="mt-2 text-small text-error">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving && <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />}
          {t("scheduleConfirm")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-btn-sm rounded-btn border border-border px-3 text-small transition-colors hover:bg-raised/60"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
