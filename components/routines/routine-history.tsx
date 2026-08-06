"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { fetchRoutineRun, regenerateRoutineRun } from "@/lib/api";
import type { Routine, RoutineRunSummary } from "@/lib/types";

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "reporte.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Una corrida del historial.
 *
 * ⚠️ **`partial` se muestra como éxito con nota, nunca como error.** Es el estado normal
 * de una corrida fail-open donde 7 de 8 pasos salieron bien: el entregable existe y sirve.
 *
 * Dos botones distintos y no uno (decisión A7): *Regenerar* rearma el archivo desde los
 * resultados guardados al instante y sin tocar Odoo; *Volver a correr* consulta la
 * instancia de nuevo. Los archivos viven ~10 minutos, los resultados quedan.
 */
export function RoutineHistoryItem({
  run,
  routine,
  onRerun,
  rerunning,
}: {
  run: RoutineRunSummary;
  routine?: Routine;
  onRerun: () => void;
  rerunning: boolean;
}) {
  const t = useTranslations("Routines");
  const [busy, setBusy] = useState<"download" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const failed = run.status === "error";
  const partial = run.status === "partial";

  const handleDownload = async () => {
    setBusy("download");
    setError(null);
    // El archivo puede haber expirado (A7): si no viene, se regenera y listo. El usuario
    // no tiene por qué saber que existe un TTL.
    const res = await fetchRoutineRun(run.id);
    if (res.success && res.run?.pdf_base64) {
      downloadBase64Pdf(res.run.pdf_base64, res.run.filename ?? "reporte.pdf");
      setBusy(null);
      return;
    }
    const regen = await regenerateRoutineRun(run.id);
    if (regen.success && regen.pdfBase64) {
      downloadBase64Pdf(regen.pdfBase64, regen.filename ?? "reporte.pdf");
    } else {
      setError(t("downloadFailed"));
    }
    setBusy(null);
  };

  const handleRegenerate = async () => {
    setBusy("regenerate");
    setError(null);
    const res = await regenerateRoutineRun(run.id);
    if (res.success && res.pdfBase64) {
      downloadBase64Pdf(res.pdfBase64, res.filename ?? "reporte.pdf");
    } else {
      setError(t("downloadFailed"));
    }
    setBusy(null);
  };

  const when = run.finished_at || run.started_at;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {failed ? (
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0 text-emerald-500" />
            )}
            <span className="truncate text-body font-medium">
              {routine?.name ?? run.routine_id}
            </span>
          </div>
          <p className="mt-0.5 text-small text-text-muted">
            {when ? new Date(when).toLocaleString() : ""}
            {run.step_total ? ` · ${t("progress", { done: run.step_done, total: run.step_total })}` : ""}
          </p>

          {/* `partial` = éxito con nota. Nunca rojo. */}
          {partial && (
            <p className="mt-2 flex items-start gap-1.5 text-small text-text-muted">
              <Info size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              {t("partialNote")}
            </p>
          )}
          {failed && run.error && (
            <p className="mt-2 text-small text-red-500">{run.error}</p>
          )}
          {error && <p className="mt-2 text-small text-red-500">{error}</p>}
        </div>

        {!failed && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy !== null}
              title={t("download")}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              {busy === "download" ? (
                <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Download size={15} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={busy !== null}
              title={t("regenerate")}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              {busy === "regenerate" ? (
                <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <RefreshCw size={15} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunning}
              title={t("rerun")}
              className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              {rerunning ? (
                <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <RotateCw size={15} strokeWidth={1.5} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
