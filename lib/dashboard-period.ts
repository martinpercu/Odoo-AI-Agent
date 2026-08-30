import type { DashboardPeriod } from "@/lib/types";

/**
 * El período global del Tablero (PLAN_RUTINAS Fase 5 · §3.1).
 *
 * ⭐ **Es lo que convierte una colección de gráficos en un tablero de verdad:** cambiar
 * "este mes" a "trimestre" arriba y que TODO se recalcule.
 *
 * ⚠️ **Se resuelve a un rango absoluto acá, en el browser, y se manda así.** El endpoint
 * de refresh no pasa por el agente — no tiene el pipeline de fechas de `domain_keywords`
 * detrás—, así que mandarle la frase obligaría a escribir un segundo intérprete de
 * períodos en el backend que podría entender "este trimestre" distinto que el chat. Un
 * rango de dos fechas no admite dos lecturas.
 *
 * ⚠️ Las fechas se arman con los getters LOCALES (`getFullYear`/`getMonth`/`getDate`),
 * nunca con `toISOString()`: éste convierte a UTC y en cualquier zona al oeste de
 * Greenwich devuelve el día ANTERIOR — el 1 de agosto en Asunción sale "2026-07-31" y el
 * Tablero arranca el período un día antes en silencio.
 */

export type DashboardPeriodKey =
  | "none"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "last_12_months";

export const DASHBOARD_PERIOD_KEYS: DashboardPeriodKey[] = [
  "none",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "last_12_months",
];

function iso(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * El rango que corresponde a una opción, o `undefined` para `"none"`.
 *
 * `"none"` significa **cada tarjeta con su propio período** — no "sin filtro". Es el
 * estado inicial y el único en el que el Tablero muestra exactamente lo que el usuario
 * fijó, sin reinterpretarlo.
 */
export function resolveDashboardPeriod(
  key: DashboardPeriodKey,
  today: Date = new Date()
): DashboardPeriod | undefined {
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (key) {
    case "none":
      return undefined;
    case "this_month":
      return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
    case "last_month":
      return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return { start: iso(new Date(y, q, 1)), end: iso(new Date(y, q + 3, 0)) };
    }
    case "this_year":
      return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
    case "last_12_months":
      // 11 meses atrás + el actual = 12 ventanas completas contando la de hoy.
      return { start: iso(new Date(y, m - 11, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
}
