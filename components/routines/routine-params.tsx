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
 */

/**
 * Los períodos que el backend sabe resolver (`api/routines/params.py` → `PERIOD_KEYS`).
 * ⚠️ **Lista cerrada y espejada:** un valor que no esté allá no resuelve a ninguna
 * ventana, y el paso terminaría consultando sin filtro de fecha.
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

function labelFor(table: Record<string, string> | undefined, locale: string): string {
  if (!table) return "";
  return table[locale] || table.en || table.es || Object.values(table)[0] || "";
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

function optionsFor(
  param: RoutineParam,
  locale: string,
  t: ReturnType<typeof useTranslations<"Routines">>
): Array<{ value: string; label: string }> {
  if (param.type === "period") {
    return PERIOD_VALUES.map((v) => ({ value: v, label: t(`period.${v}`) }));
  }
  if (param.type === "compare_with") {
    return COMPARE_VALUES.map((v) => ({ value: v, label: t(`compare.${v}`) }));
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
