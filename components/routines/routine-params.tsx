"use client";

import { useLocale, useTranslations } from "next-intl";

import type { RoutineParam } from "@/lib/types";

/**
 * Los controles de parámetros de una Rutina (PLAN_RUTINAS Fase 2, F2).
 *
 * ⭐ **Es más importante de lo que parece.** Los desplegables son la interfaz donde el
 * usuario DESCUBRE que la Rutina se puede variar — y ese descubrimiento es el punto
 * entero del catálogo base (D8: las 5 Rutinas son material de enseñanza, no el valor).
 * Si estuvieran escondidos detrás de un "configurar", el catálogo no enseñaría nada.
 *
 * El criterio de éxito de R1: la variante "los últimos 60 días contra los mismos 60 días
 * hace dos años" tiene que salir de mover **dos desplegables**, sin editar ningún paso.
 *
 * ## El menú lo declara la RUTINA, no este archivo
 *
 * `param.choices` elige cuáles de las opciones conocidas se muestran y en qué orden.
 * Existe porque el menú estaba hardcodeado acá y una Rutina no podía sacar de su propio
 * desplegable una opción que no le sirve: "Comparar dos períodos" ofrecía "Sin
 * comparación", que es exactamente lo que esa Rutina no hace.
 *
 * ⚠️ Las **etiquetas** siguen saliendo de acá (`t(...)`), no del backend: el backend
 * tiene 6 idiomas y esta UI 11, así que mandarlas en el JSON degradaría 5 locales.
 * `choices` sólo dice CUÁLES, nunca CÓMO SE LLAMAN.
 */

/**
 * Los períodos relativos que el backend sabe resolver (`api/routines/params.py` →
 * `PERIOD_KEYS`). ⚠️ **Lista cerrada y espejada:** un valor que no esté allá no resuelve
 * a ninguna ventana, y el paso terminaría consultando sin filtro de fecha.
 *
 * Es el **fallback** cuando la Rutina no declara `choices` (las de autoría de usuario).
 */
const PERIOD_VALUES = [
  "hoy",
  "esta_semana",
  "semana_pasada",
  "mes_actual",
  "mes_pasado",
  "trimestre",
  "trimestre_pasado",
  "anio",
  "anio_pasado",
  "ultimos_30_dias",
  "ultimos_60_dias",
  "ultimos_90_dias",
] as const;

/** Espejo de `COMPARE_VALUES` + el patrón `mismo_periodo_hace_N_años`. */
const COMPARE_VALUES = [
  "periodo_anterior",
  "mismo_periodo_anio_anterior",
  "mismo_periodo_hace_2_anos",
  "mismo_periodo_hace_3_anos",
  "ninguno",
] as const;

/**
 * Los dos modos que NO son un valor del vocabulario sino una puerta a otro control.
 * Van con `__` para que no puedan colisionar nunca con una clave real del backend.
 */
const MODE_ABSOLUTE = "__absolute__";
const MODE_ROLLING = "__rolling__";

/** Cuántos años atrás ofrece el selector de período absoluto. */
const YEARS_BACK = 6;

type AbsoluteUnit = "mes" | "trimestre" | "anio";

type PeriodShape =
  | { mode: "preset"; value: string }
  | { mode: "rolling"; days: number }
  | { mode: "absolute"; unit: AbsoluteUnit; year: number; index: number };

const ROLLING_RE = /^ultimos?_(\d{1,4})_dias$/;
const ABS_MONTH_RE = /^mes:(\d{4})-(\d{1,2})$/;
const ABS_QUARTER_RE = /^trimestre:(\d{4})-Q([1-4])$/i;
const ABS_YEAR_RE = /^a(?:n|ñ)(?:i)?o:(\d{4})$/;

/**
 * ⚠️ **Esto NO es una segunda implementación del vocabulario.** Sólo lee un valor ya
 * emitido para volver a poner los controles donde estaban; quien decide qué significa
 * cada valor sigue siendo `params.py`. Un valor que no matchea cae a `preset` y el
 * `<select>` simplemente no lo encuentra — degrada, no rompe.
 */
function parseShape(raw: unknown): PeriodShape {
  const value = typeof raw === "string" ? raw : "";

  const rolling = ROLLING_RE.exec(value);
  if (rolling) return { mode: "rolling", days: Number(rolling[1]) };

  const month = ABS_MONTH_RE.exec(value);
  if (month) {
    return {
      mode: "absolute",
      unit: "mes",
      year: Number(month[1]),
      index: Number(month[2]),
    };
  }

  const quarter = ABS_QUARTER_RE.exec(value);
  if (quarter) {
    return {
      mode: "absolute",
      unit: "trimestre",
      year: Number(quarter[1]),
      index: Number(quarter[2]),
    };
  }

  const year = ABS_YEAR_RE.exec(value);
  if (year) {
    return { mode: "absolute", unit: "anio", year: Number(year[1]), index: 1 };
  }

  return { mode: "preset", value };
}

/** El valor que viaja al backend. Único lugar donde se arma la cadena. */
function buildValue(shape: PeriodShape): string {
  if (shape.mode === "rolling") return `ultimos_${shape.days}_dias`;
  if (shape.mode === "preset") return shape.value;
  if (shape.unit === "mes") {
    return `mes:${shape.year}-${String(shape.index).padStart(2, "0")}`;
  }
  if (shape.unit === "trimestre") return `trimestre:${shape.year}-Q${shape.index}`;
  return `anio:${shape.year}`;
}

export function RoutineParams({
  params,
  values,
  onChange,
  disabled,
}: {
  params: RoutineParam[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Routines");
  const locale = useLocale();

  if (params.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
      {params.map((param) => {
        const label = labelFor(param.label, locale) || param.key;
        const value = values[param.key] ?? param.default;
        const id = `routine-param-${param.key}`;

        return (
          <div key={param.key} className="flex min-w-[9rem] flex-1 flex-col gap-1">
            <label htmlFor={id} className="text-micro text-text-muted">
              {label}
            </label>
            {param.type === "number" ? (
              <input
                id={id}
                type="number"
                min={1}
                value={String(value ?? "")}
                disabled={disabled}
                onChange={(e) => onChange(param.key, Number(e.target.value) || 1)}
                className="h-btn-sm rounded-btn border border-border bg-base px-2 text-small text-foreground disabled:opacity-50"
              />
            ) : param.type === "period" || param.type === "compare_with" ? (
              <PeriodField
                id={id}
                param={param}
                value={value}
                disabled={disabled}
                onChange={(next) => onChange(param.key, next)}
              />
            ) : (
              <select
                id={id}
                value={String(value ?? "")}
                disabled={disabled}
                onChange={(e) => onChange(param.key, e.target.value)}
                className="h-btn-sm rounded-btn border border-border bg-base px-2 text-small text-foreground disabled:opacity-50"
              >
                {optionsFor(param, locale, t).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * El selector de un `period` / `compare_with`.
 *
 * ⭐ **Dos filas, no una.** El desplegable elige la FORMA (un preset relativo, una
 * ventana móvil, un período con nombre propio) y, sólo cuando hace falta, aparece
 * debajo la fila que la completa. Meter los ~200 meses posibles como opciones del
 * mismo `<select>` haría inservible el caso normal, que es el relativo.
 *
 * ⚠️ **No se ofrecen períodos futuros.** El backend devuelve `None` para una ventana
 * que todavía no existe y el paso se salta con su motivo — correcto, pero un control
 * que deja elegir algo que después se ignora es peor que no tenerlo.
 */
function PeriodField({
  id,
  param,
  value,
  disabled,
  onChange,
}: {
  id: string;
  param: RoutineParam;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Routines");
  const locale = useLocale();
  const shape = parseShape(value);

  const isCompare = param.type === "compare_with";
  const ns = isCompare ? "compare" : "period";
  const fallback = isCompare ? COMPARE_VALUES : PERIOD_VALUES;
  const presets = param.choices?.length ? param.choices : [...fallback];

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - i);

  const selected =
    shape.mode === "absolute"
      ? MODE_ABSOLUTE
      : shape.mode === "rolling" && !presets.includes(buildValue(shape))
        ? MODE_ROLLING
        : String(value ?? "");

  function pickMode(next: string) {
    if (next === MODE_ABSOLUTE) {
      // Arranca en el mes cerrado más reciente: es el período que más se pide y
      // evita abrir el control sobre una ventana en curso (que se trunca en hoy).
      const previous = new Date(currentYear, now.getMonth() - 1, 1);
      onChange(
        buildValue({
          mode: "absolute",
          unit: "mes",
          year: previous.getFullYear(),
          index: previous.getMonth() + 1,
        })
      );
      return;
    }
    if (next === MODE_ROLLING) {
      onChange(buildValue({ mode: "rolling", days: 21 }));
      return;
    }
    onChange(next);
  }

  function pickUnit(unit: AbsoluteUnit) {
    const year = shape.mode === "absolute" ? shape.year : currentYear;
    const maxIndex = maxIndexFor(unit, year, now);
    const index = shape.mode === "absolute" ? Math.min(shape.index, maxIndex) : maxIndex;
    onChange(buildValue({ mode: "absolute", unit, year, index }));
  }

  function pickYear(year: number) {
    if (shape.mode !== "absolute") return;
    const maxIndex = maxIndexFor(shape.unit, year, now);
    onChange(
      buildValue({ ...shape, year, index: Math.min(shape.index, maxIndex) })
    );
  }

  function pickIndex(index: number) {
    if (shape.mode !== "absolute") return;
    onChange(buildValue({ ...shape, index }));
  }

  const selectClass =
    "h-btn-sm rounded-btn border border-border bg-base px-2 text-small text-foreground disabled:opacity-50";

  return (
    <div className="flex flex-col gap-1">
      <select
        id={id}
        value={selected}
        disabled={disabled}
        onChange={(e) => pickMode(e.target.value)}
        className={selectClass}
      >
        {presets.map((v) => (
          <option key={v} value={v}>
            {labelForPreset(t, ns, v)}
          </option>
        ))}
        <option value={MODE_ROLLING}>{t("period.rolling")}</option>
        <option value={MODE_ABSOLUTE}>{t(`${ns}.absolute`)}</option>
      </select>

      {shape.mode === "rolling" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={3650}
            value={shape.days}
            disabled={disabled}
            aria-label={t("periodPicker.days")}
            onChange={(e) =>
              onChange(
                buildValue({ mode: "rolling", days: Number(e.target.value) || 1 })
              )
            }
            className={`${selectClass} w-20`}
          />
          <span className="text-micro text-text-muted">{t("periodPicker.days")}</span>
        </div>
      )}

      {shape.mode === "absolute" && (
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={shape.unit}
            disabled={disabled}
            aria-label={t("periodPicker.unit")}
            onChange={(e) => pickUnit(e.target.value as AbsoluteUnit)}
            className={selectClass}
          >
            <option value="mes">{t("periodPicker.month")}</option>
            <option value="trimestre">{t("periodPicker.quarter")}</option>
            <option value="anio">{t("periodPicker.year")}</option>
          </select>

          {shape.unit !== "anio" && (
            <select
              value={shape.index}
              disabled={disabled}
              aria-label={
                shape.unit === "mes" ? t("periodPicker.month") : t("periodPicker.quarter")
              }
              onChange={(e) => pickIndex(Number(e.target.value))}
              className={selectClass}
            >
              {Array.from(
                { length: maxIndexFor(shape.unit, shape.year, now) },
                (_, i) => i + 1
              ).map((i) => (
                <option key={i} value={i}>
                  {shape.unit === "mes" ? monthName(locale, i) : `Q${i}`}
                </option>
              ))}
            </select>
          )}

          <select
            value={shape.year}
            disabled={disabled}
            aria-label={t("periodPicker.year")}
            onChange={(e) => pickYear(Number(e.target.value))}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Cuántos meses/trimestres se pueden elegir de ese año.
 *
 * En el año en curso se corta en el actual: el backend rechaza una ventana
 * enteramente futura, así que ofrecerla sería un control que no hace nada.
 */
function maxIndexFor(unit: AbsoluteUnit, year: number, now: Date): number {
  if (unit === "anio") return 1;
  const total = unit === "mes" ? 12 : 4;
  if (year < now.getFullYear()) return total;
  return unit === "mes" ? now.getMonth() + 1 : Math.floor(now.getMonth() / 3) + 1;
}

/** Los nombres de mes salen de `Intl`, no de `messages/` — 11 locales gratis. */
function monthName(locale: string, month: number): string {
  const label = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(2000, month - 1, 1)
  );
  return capitalize(label);
}

/**
 * La etiqueta de un preset.
 *
 * ⚠️ Se pregunta con `t.has` antes de traducir: `t()` sobre una clave inexistente
 * **no rompe**, devuelve la ruta ("Routines.period.ultimos_21_dias") y la pinta tal
 * cual en el desplegable. El caso real es una Rutina de usuario que declara en sus
 * `choices` un valor que este menú no enumera — el valor crudo se lee mucho mejor.
 */
function labelForPreset(
  t: ReturnType<typeof useTranslations<"Routines">>,
  ns: string,
  value: string
): string {
  const key = `${ns}.${value}`;
  return t.has(key as never) ? t(key as never) : value;
}

function labelFor(table: Record<string, string> | undefined, locale: string): string {
  if (!table) return "";
  return table[locale] || table.en || table.es || Object.values(table)[0] || "";
}

function optionsFor(
  param: RoutineParam,
  locale: string,
  t: ReturnType<typeof useTranslations<"Routines">>
): Array<{ value: string; label: string }> {
  if (param.type === "period") {
    const values = param.choices?.length ? param.choices : [...PERIOD_VALUES];
    return values.map((v) => ({ value: v, label: labelForPreset(t, "period", v) }));
  }
  if (param.type === "compare_with") {
    const values = param.choices?.length ? param.choices : [...COMPARE_VALUES];
    return values.map((v) => ({ value: v, label: labelForPreset(t, "compare", v) }));
  }
  // `choice`: el VALOR es una clave de máquina ("ventas"); lo que se muestra sale
  // de `choice_labels`, que el backend localiza. Mostrar el valor crudo dejaría
  // "facturacion" sin tilde y en español en una UI en inglés.
  return (param.choices ?? []).map((v) => ({
    value: v,
    label: capitalize(labelFor(param.choice_labels?.[v], locale) || v),
  }));
}

/**
 * ⚠️ La capitalización es cosa del FRONT, no del backend.
 *
 * `choice_labels` cumple dos funciones a la vez: el backend lo sustituye dentro del
 * texto de la consulta ("monto total de **ventas** el mes pasado" — ahí tiene que ir
 * en minúscula) y acá se muestra en un desplegable, junto a opciones capitalizadas
 * como "El mes pasado". Capitalizar en el backend rompería la consulta; no
 * capitalizar acá deja la lista despareja. Se hace donde es presentación.
 */
function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text;
}
