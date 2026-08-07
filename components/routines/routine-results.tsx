"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  Routine,
  RoutineAttribution,
  RoutinePctChange,
  RoutineResultEntry,
  RoutineRunDetail,
} from "@/lib/types";
import { RoutineAttributionTable } from "@/components/routines/routine-attribution";
import { RoutineValueCard } from "@/components/routines/routine-delta";

/**
 * Los resultados de una corrida terminada: los números y su lectura.
 *
 * El PDF sigue siendo el entregable; esto es lo que se ve **sin descargarlo**, que es
 * la diferencia entre "corrí algo y bajé un archivo" y "ya sé qué pasó".
 *
 * ⚠️ **Un derivado que no se pudo calcular se muestra CON SU MOTIVO**, nunca se omite
 * en silencio: quien mira tiene que poder distinguir "no había datos" de "esto no
 * corresponde" de "se rompió". Es la misma regla de honestidad que el PDF.
 */
export function RoutineResults({
  run,
  routine,
}: {
  run: RoutineRunDetail;
  routine?: Routine;
}) {
  const t = useTranslations("Routines");

  const entries = Object.values(run.results ?? {});
  const derived = entries.filter((e) => e.kind === "derived");
  if (derived.length === 0) return null;

  const stepLabel = (key: string) =>
    routine?.steps?.find((s) => s.key === key)?.label ?? key;
  const formatAmount = makeAmountFormatter(entries);

  const scalars = derived.filter((d) => d.op === "pct_change" || d.op === "diff");
  const attributions = derived.filter((d) => d.op === "attribution");
  const others = derived.filter(
    (d) => !["pct_change", "diff", "attribution"].includes(d.op ?? "")
  );

  return (
    <div className="mt-4 space-y-4">
      {scalars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {scalars.map((d) => (
            <ScalarCard
              key={d.key}
              entry={d}
              label={stepLabel(d.key)}
              formatAmount={formatAmount}
            />
          ))}
        </div>
      )}

      {attributions.map((d) =>
        d.status === "ok" ? (
          <section key={d.key}>
            <h4 className="mb-2 text-small font-medium text-foreground">
              {t("attribution.title")}
            </h4>
            <RoutineAttributionTable
              attribution={d.data as unknown as RoutineAttribution}
              narrative={d.narrative}
              formatAmount={formatAmount}
            />
          </section>
        ) : (
          <SkippedNote key={d.key} entry={d} />
        )
      )}

      {others.map((d) =>
        d.status === "ok" ? (
          d.narrative ? (
            <p key={d.key} className="text-small text-text-secondary">
              {d.narrative}
            </p>
          ) : null
        ) : (
          <SkippedNote key={d.key} entry={d} />
        )
      )}
    </div>
  );
}

function ScalarCard({
  entry,
  label,
  formatAmount,
}: {
  entry: RoutineResultEntry;
  label: string;
  formatAmount: (v: number) => string;
}) {
  if (entry.status !== "ok") return <SkippedNote entry={entry} />;

  const data = entry.data as unknown as Partial<RoutinePctChange> & {
    magnitude?: number;
    formatted_magnitude?: string;
  };

  if (entry.op === "pct_change") {
    return (
      <RoutineValueCard
        label={label}
        value={formatAmount(data.current ?? 0)}
        change={entry.data as unknown as RoutinePctChange}
        narrative={entry.narrative}
      />
    );
  }
  // `diff`: el backend ya lo formateó CON la moneda de la instancia — usarlo tal
  // cual evita que el front adivine el símbolo y muestre otro.
  return (
    <RoutineValueCard
      label={label}
      value={data.formatted_magnitude ?? formatAmount(data.magnitude ?? 0)}
      narrative={entry.narrative}
    />
  );
}

/** Un derivado que no salió: se muestra con su motivo, nunca en blanco. */
function SkippedNote({ entry }: { entry: RoutineResultEntry }) {
  const t = useTranslations("Routines");
  return (
    <p className="flex items-start gap-2 text-small text-text-muted">
      <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
      <span>{entry.reason || t("derivedFailed")}</span>
    </p>
  );
}

/**
 * El formateador de montos de ESTA corrida.
 *
 * El símbolo sale de los pasos (la moneda de la instancia del usuario, que puede no
 * ser la del navegador). Sin decimales para las monedas que no los usan — mostrar
 * "₲1.500,00" delata que el número lo formateó alguien que no conoce la moneda.
 */
function makeAmountFormatter(entries: RoutineResultEntry[]): (value: number) => string {
  const NO_DECIMALS = new Set(["PYG", "CLP", "JPY", "KRW", "VND", "IDR", "UGX", "RWF"]);
  let symbol = "";
  let iso: string | undefined;
  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    if (typeof data?.currency_symbol === "string" && data.currency_symbol) {
      symbol = data.currency_symbol;
      iso = typeof data.currency_iso === "string" ? data.currency_iso : undefined;
      break;
    }
  }
  const decimals = iso && NO_DECIMALS.has(iso.toUpperCase()) ? 0 : 2;
  return (value: number) =>
    `${symbol}${value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
}
