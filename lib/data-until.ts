/**
 * X-04 (A6) — "Datos hasta <mes año>".
 *
 * Las instancias del parque se re-fechan, pero no seguido: una base sembrada hasta julio
 * contesta vacío a "¿cuánto vendimos el mes pasado?" en septiembre, y sin este dato eso se
 * lee como un bug del agente. `data_until` lo calcula el backend (última fecha de NEGOCIO,
 * no `create_date`) y viaja en `GET /routines/instance-usage`.
 */

/** Días de antigüedad a partir de los cuales una instancia REAL también lo muestra. */
const STALE_AFTER_DAYS = 35;

/** "AAAA-MM-DD" → Date LOCAL. `new Date("2026-07-31")` es UTC y al oeste de Greenwich da el 30. */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "julio de 2026" / "July 2026" — con el locale de la APP, nunca el del navegador. */
export function formatDataUntil(iso: string, locale: string): string | null {
  const date = parseLocalDate(iso);
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

/**
 * ¿Vale la pena decirlo? En demo siempre (es donde el desfase existe por construcción);
 * en una instancia real sólo si los datos se cortaron hace más de un mes — "datos hasta
 * hoy" en una base viva no informa nada y ocupa lugar.
 */
export function shouldShowDataUntil(iso: string | null | undefined, isDemo: boolean): boolean {
  if (!iso) return false;
  if (isDemo) return true;
  const date = parseLocalDate(iso);
  if (!date) return false;
  return Date.now() - date.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}
