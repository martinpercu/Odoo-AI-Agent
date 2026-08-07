"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Info, Loader2, RefreshCw } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fetchRoutine, fetchRoutineRun, regenerateRoutineRun } from "@/lib/api";
import type { Routine, RoutineRunDetail } from "@/lib/types";
import { RoutineResults } from "@/components/routines/routine-results";

/**
 * El detalle de UNA corrida, en su propia URL (Fase 4 · F5).
 *
 * ⭐ **Existe porque el digest de las 8:00 necesita a dónde llevar.** El resto de la
 * sección Rutinas guarda las corridas en estado local de `/rutinas`, lo cual está bien
 * para quien ya está adentro de la app — pero un link de un mail llega en frío, muchas
 * veces desde otro dispositivo, y tiene que abrir EXACTAMENTE esa corrida sin que el
 * usuario tenga que buscarla en un historial de veinte.
 *
 * El backend ya escopea la corrida por org **y** por usuario: se ejecutó con las
 * credenciales de una persona (invariante #3), así que sus resultados son lo que Odoo le
 * deja ver a ella. Reenviar el link a un compañero no le muestra los datos — le muestra
 * un 404, que es la respuesta correcta.
 */
export default function RoutineRunDetailPage() {
  const t = useTranslations("Routines");
  const locale = useLocale();
  const params = useParams<{ runId: string }>();
  const runId = params?.runId;

  const [run, setRun] = useState<RoutineRunDetail | null>(null);
  const [routine, setRoutine] = useState<Routine | undefined>();
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    fetchRoutineRun(runId).then((res) => {
      if (cancelled) return;
      if (res.success && res.run) {
        setRun(res.run);
        // El nombre y las etiquetas de los pasos viven en la definición, no en la
        // corrida: sin esto la pantalla muestra claves crudas (`ventas_base`).
        fetchRoutine(res.run.routine_id, undefined, locale).then((det) => {
          if (!cancelled && det.success && det.routine) setRoutine(det.routine);
        });
      } else {
        setNotFound(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runId, locale]);

  const download = useCallback(
    async (forceRegenerate: boolean) => {
      if (!runId) return;
      setBusy(true);
      setError(null);
      // A7: el archivo vive ~10 minutos y los resultados quedan. Alguien que abre el
      // link del digest al día siguiente cae siempre en el camino de regenerar — por eso
      // es transparente y no un mensaje de "el archivo expiró".
      let base64 = forceRegenerate ? undefined : run?.pdf_base64;
      let filename = run?.filename;
      if (!base64) {
        const regen = await regenerateRoutineRun(runId, locale);
        base64 = regen.pdfBase64;
        filename = regen.filename;
      }
      if (base64) {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "reporte.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        setError(t("downloadFailed"));
      }
      setBusy(false);
    },
    [runId, run, locale, t]
  );

  const backLink = (
    <Link
      href="/rutinas"
      className="mb-6 inline-flex items-center gap-1.5 text-small text-text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
      {t("backToRoutines")}
    </Link>
  );

  if (notFound) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          {backLink}
          <div className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} strokeWidth={1.5} className="text-text-muted" />
              <h1 className="text-subheading">{t("runNotFoundTitle")}</h1>
            </div>
            <p className="mt-2 text-small text-text-muted">{t("runNotFoundBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const when = run.finished_at || run.started_at;
  const failed = run.status === "error";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {backLink}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-heading">{routine?.name ?? run.routine_id}</h1>
            <p className="mt-1 text-small text-text-muted">
              {when ? new Date(when).toLocaleString() : ""}
              {run.step_total
                ? ` · ${t("progress", { done: run.step_done, total: run.step_total })}`
                : ""}
            </p>
          </div>

          {!failed && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => download(false)}
                disabled={busy}
                title={t("download")}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Download size={15} strokeWidth={1.5} />
                )}
              </button>
              <button
                type="button"
                onClick={() => download(true)}
                disabled={busy}
                title={t("regenerate")}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
              >
                <RefreshCw size={15} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* `partial` = éxito con nota, nunca error: es el estado normal de una corrida
            fail-open donde 7 de 8 pasos salieron bien. */}
        {run.status === "partial" && (
          <p className="mt-4 flex items-start gap-1.5 text-small text-text-muted">
            <Info size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            {t("partialNote")}
          </p>
        )}
        {failed && run.error && (
          <p className="mt-4 rounded-card border border-red-500/30 bg-red-500/5 p-4 text-small text-red-500">
            {run.error}
          </p>
        )}
        {error && <p className="mt-4 text-small text-red-500">{error}</p>}

        {!failed && <RoutineResults run={run} routine={routine} />}
      </div>
    </div>
  );
}
