"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  Loader2,
  RotateCw,
  Server,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteRoutineRun, fetchRoutineRun, regenerateRoutineRun } from "@/lib/api";
import type { Routine, RoutineRunDetail, RoutineRunSummary } from "@/lib/types";
import { RoutineResults } from "@/components/routines/routine-results";

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
 * ⭐ **Dos acciones, no tres** (2026-08-12). Había *Descargar · Regenerar · Volver a
 * correr*, tres íconos sin etiqueta, y las dos primeras **terminaban en lo mismo**: un PDF
 * bajado, sin tocar Odoo. La decisión A7 las separó cuando Descargar podía fallar por el
 * TTL del archivo (~10 min), pero Descargar ya regenera solo cuando el archivo expiró
 * (`handleDownload`), así que Regenerar no agregaba ninguna capacidad — sólo obligaba al
 * usuario a distinguir "archivo cacheado" de "archivo rearmado", que es un detalle de
 * implementación nuestro. Las dos que quedan hacen cosas genuinamente distintas y **ahora
 * lo dicen con texto**:
 *   - **Descargar** — el entregable de ESTA corrida, con ESTOS números. No toca Odoo.
 *   - **Volver a correr** — consulta la instancia de nuevo: números nuevos, corrida nueva.
 *     Es la única que cuesta tiempo y toma un lugar de concurrencia.
 */
export function RoutineHistoryItem({
  run,
  routine,
  onRerun,
  rerunning,
  onDeleted,
  instanceName,
}: {
  run: RoutineRunSummary;
  routine?: Routine;
  onRerun: () => void;
  rerunning: boolean;
  onDeleted?: () => void;
  /**
   * Contra qué instancia corrió. **`null` para un `CLIENT_USER`** — tiene una sola, así
   * que nombrarla no distingue nada y sólo agrega ruido a una pantalla que ya tiene
   * demasiado. Lo decide quien renderiza; acá no se consulta el rol.
   *
   * También llega `null` cuando la instancia ya no está en la lista del usuario (se
   * borró, o le sacaron el acceso): entonces no se muestra nada, en vez del UUID.
   */
  instanceName?: string | null;
}) {
  const t = useTranslations("Routines");
  const [busy, setBusy] = useState<"download" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Los números viven en el DETALLE, no en el listado (el listado sería enorme con
  // 20 corridas). Se piden al desplegar: leer el resultado no debería costar una
  // descarga de PDF.
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<RoutineRunDetail | null>(null);

  useEffect(() => {
    if (!expanded || detail) return;
    fetchRoutineRun(run.id).then((res) => {
      if (res.success && res.run) setDetail(res.run);
    });
  }, [expanded, detail, run.id]);

  const failed = run.status === "error";
  const partial = run.status === "partial";

  const handleDownload = async () => {
    setBusy("download");
    setError(null);
    // El archivo puede haber expirado (A7): si no viene, se regenera y listo. El usuario
    // no tiene por qué saber que existe un TTL — y por eso "Regenerar" dejó de ser un
    // botón propio: era este mismo fallback, expuesto como si fuera una decisión suya.
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

  const handleDelete = async () => {
    setBusy("delete");
    setError(null);
    const res = await deleteRoutineRun(run.id);
    setBusy(null);
    if (res.success) {
      onDeleted?.();
      return;
    }
    setConfirmingDelete(false);
    setError(t("deleteRunFailed"));
  };

  const when = run.finished_at || run.started_at;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {failed ? (
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 text-error" />
            ) : (
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0 text-success-solid" />
            )}
            {/* Sin fallback al id: una corrida cuya Rutina ya no existe no llega hasta
                acá — el backend la omite del historial (§4b). Mostrar `run.routine_id`
                pintaba un hexadecimal de 32 caracteres donde va un nombre. */}
            <span className="truncate text-body font-medium">
              {routine?.name ?? t("deletedRoutine")}
            </span>
          </div>
          <p className="mt-0.5 text-small text-text-muted">
            {when ? new Date(when).toLocaleString() : ""}
            {run.step_total ? ` · ${t("progress", { done: run.step_done, total: run.step_total })}` : ""}
          </p>

          {/* ⭐ De qué base salieron estos números. Para un implementador con dos clientes
              es la diferencia entre leer un informe y leer el informe equivocado — y un
              número correcto sobre la empresa que no era no se ve distinto de uno
              correcto. Va con el ícono, no sólo con el nombre: la fila de abajo tiene
              varias piezas de texto gris y sin el ancla visual esto se pierde. */}
          {instanceName && (
            <p className="mt-1 flex items-center gap-1.5 text-micro text-text-secondary">
              <Server size={13} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span className="truncate">{instanceName}</span>
            </p>
          )}

          {/* `partial` = éxito con nota. Nunca rojo. */}
          {partial && (
            <p className="mt-2 flex items-start gap-1.5 text-small text-text-muted">
              <Info size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              {t("partialNote")}
            </p>
          )}
          {failed && run.error && (
            <p className="mt-2 text-small text-error">{run.error}</p>
          )}
          {error && <p className="mt-2 text-small text-error">{error}</p>}

          {!failed && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 flex items-center gap-1 text-small text-accent transition-colors hover:text-accent-hover"
            >
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
              {expanded ? t("hideResults") : t("showResults")}
            </button>
          )}

          {expanded &&
            (detail ? (
              <RoutineResults run={detail} routine={routine} />
            ) : (
              <Loader2
                size={16}
                strokeWidth={1.5}
                className="mt-3 animate-spin text-text-muted"
              />
            ))}
        </div>

        {/* Confirmación en línea, no un modal: borrar UNA corrida es reversible en el
            sentido que importa (se puede volver a correr la Rutina), así que un diálogo
            aparte sería más ceremonia que la acción. Mismo patrón que cancelar una
            invitación en Settings. */}
        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-small text-text-muted">{t("deleteRunConfirm")}</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null}
              className="flex h-btn-sm items-center rounded-btn border border-error/40 px-2.5 text-small text-error transition-colors hover:bg-error-subtle disabled:opacity-50"
            >
              {busy === "delete" ? (
                <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
              ) : (
                t("confirmYes")
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy !== null}
              className="flex h-btn-sm items-center rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              {t("confirmNo")}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Etiquetas VISIBLES, no sólo `title`. Tres íconos sin texto obligaban a
                adivinar cuál de ellos vuelve a consultar la instancia — y esa es
                justamente la que cuesta. En pantallas chicas el texto se esconde y queda
                el `aria-label`, que antes no existía en ninguno de los tres. */}
            {!failed && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy !== null}
                aria-label={t("download")}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
              >
                {busy === "download" ? (
                  <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Download size={15} strokeWidth={1.5} aria-hidden />
                )}
                <span className="hidden sm:inline">{t("download")}</span>
              </button>
            )}
            {/* "Volver a correr" existe también para una corrida FALLIDA: reintentar es
                justo lo que se quiere hacer con la que se rompió. Antes toda la fila de
                acciones se ocultaba en `error`, así que la única salida era buscar la
                Rutina en el catálogo. */}
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunning || busy !== null || !routine}
              aria-label={t("rerun")}
              /* ⚠️ No vuelve a preguntar la instancia: repite la de esta corrida, que es
                 la que la tarjeta está mostrando. Preguntar de nuevo dejaría comparar
                 sin querer dos períodos de dos empresas distintas. */
              title={
                routine
                  ? instanceName
                    ? t("rerunOn", { instance: instanceName })
                    : undefined
                  : t("rerunUnavailable")
              }
              className="flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-2.5 text-small transition-colors hover:bg-raised/60 disabled:opacity-50"
            >
              {rerunning ? (
                <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <RotateCw size={15} strokeWidth={1.5} aria-hidden />
              )}
              <span className="hidden sm:inline">{t("rerun")}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy !== null}
              aria-label={t("deleteRun")}
              className="flex h-btn-sm items-center rounded-btn border border-border px-2.5 text-small text-text-muted transition-colors hover:bg-raised/60 hover:text-error disabled:opacity-50"
            >
              <Trash2 size={15} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
