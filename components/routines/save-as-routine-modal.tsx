"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, ClipboardList, Loader2 } from "lucide-react";

import { A11yModal } from "@/components/intro/a11y-modal";
import { useRouter } from "@/i18n/navigation";
import {
  createRoutineFromConversation,
  reviewConversationForRoutine,
} from "@/lib/api";
import type { RoutineStepReview } from "@/lib/types";

/**
 * **Guardar la conversación como Rutina** — el camino primario de la Fase 3 (§3.1).
 *
 * El usuario no aprende un formato, no abre un editor, no elige modelos. Hace lo que ya
 * hacía —preguntar— y al final dice *"esto, todos los meses"*. Su propia conversación es
 * la plantilla, y el costo de autoría es cero.
 *
 * ⭐ **Dos decisiones de diseño que se ven acá y no hay que deshacer:**
 *
 * 1. **El usuario elige qué mensajes entran.** No adivinamos. Una conversación real
 *    tiene ida y vuelta, correcciones y preguntas descartadas; convertirla entera
 *    produciría basura.
 * 2. **El dictamen se pide al ABRIR, no al guardar.** Los checkboxes salen ya
 *    deshabilitados con su motivo. Enterarse de que la mitad de lo que seleccionaste no
 *    servía *después* de ponerle nombre a la Rutina es la peor secuencia posible.
 *
 * ⚠️ **Los motivos de rechazo NO se reescriben acá.** Vienen redactados del backend
 * (decisión [A9]) y dicen *qué hacer*, no sólo que no se puede. Reimplementarlos en 11
 * locales garantizaría que diverjan del criterio real del validador — el mismo motivo por
 * el que `routine-results` no reescribe la `narrative`.
 */
export function SaveAsRoutineModal({
  open,
  onClose,
  chatId,
  configId,
}: {
  open: boolean;
  onClose: () => void;
  chatId: string;
  configId?: string | null;
}) {
  const t = useTranslations("Routines.save");
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RoutineStepReview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usable = useMemo(() => messages.filter((m) => m.usable), [messages]);

  /**
   * El dictamen se pide **al montar**, y el modal se monta recién cuando se abre (el
   * llamador lo renderiza condicionalmente). Por eso no hay un `if (open)` acá ni un
   * `setLoading(true)` de arranque: el estado inicial ya es "cargando", y un `setState`
   * sincrónico dentro de un efecto dispara renders en cascada.
   */
  useEffect(() => {
    let cancelled = false;
    reviewConversationForRoutine(chatId, locale).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success || !res.review) {
        setError(t("loadFailed"));
        return;
      }
      setMessages(res.review.messages);
      // Todo lo utilizable arranca tildado: el caso normal es "guardá esta
      // conversación", no "elegí de a una". Destildar es más barato que tildar.
      setSelected(
        new Set(
          res.review.messages
            .filter((m) => m.usable && m.message_id)
            .map((m) => m.message_id as string)
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [chatId, locale, t]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!name.trim() || selected.size === 0) return;
    setSaving(true);
    setError(null);
    const res = await createRoutineFromConversation({
      chatId,
      name: name.trim(),
      messageIds: Array.from(selected),
      language: locale,
      configId: configId ?? undefined,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.errorCode === "no_org" ? t("noOrg") : t("saveFailed"));
      return;
    }
    onClose();
    router.push("/rutinas");
  };

  const canSave = name.trim().length > 0 && selected.size > 0 && !saving;

  return (
    <A11yModal open={open} onClose={onClose} labelledBy="save-routine-title"
               className="w-full max-w-lg">
      <div className="flex max-h-[85vh] flex-col rounded-card border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 id="save-routine-title" className="flex items-center gap-2 text-subheading">
            <ClipboardList size={20} strokeWidth={1.5} className="text-accent" />
            {t("title")}
          </h2>
          <p className="mt-1 text-small text-text-muted">{t("subtitle")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} strokeWidth={1.5}
                       className="animate-spin text-text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-small text-text-muted">{t("emptyConversation")}</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((m, i) => (
                <MessageRow
                  key={m.message_id || `${i}`}
                  review={m}
                  checked={!!m.message_id && selected.has(m.message_id)}
                  onToggle={() => m.message_id && toggle(m.message_id)}
                />
              ))}
            </ul>
          )}

          {!loading && usable.length === 0 && messages.length > 0 && (
            <p className="mt-4 rounded-card border border-border bg-raised p-3 text-small text-text-muted">
              {t("nothingUsable")}
            </p>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <label htmlFor="routine-name" className="mb-1.5 block text-small font-medium">
            {t("nameLabel")}
          </label>
          <input
            id="routine-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            disabled={saving || usable.length === 0}
            className="h-btn-md w-full rounded-btn border border-border bg-base px-3 text-body outline-none focus:border-accent disabled:opacity-50"
          />

          {error && (
            <p className="mt-2 text-small text-error" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-small text-text-muted">
              {t("selectedCount", { count: selected.size })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-btn-sm rounded-btn border border-border px-3 text-small transition-colors hover:bg-raised"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Check size={16} strokeWidth={1.5} />
                )}
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </A11yModal>
  );
}

/**
 * Un mensaje de la conversación con su dictamen.
 *
 * Los rechazados **se muestran igual**, deshabilitados y con el motivo: esconderlos
 * dejaría al usuario buscando la pregunta que hizo y no encuentra. Ver por qué no entra
 * es parte de aprender a escribir Rutinas.
 */
function MessageRow({
  review,
  checked,
  onToggle,
}: {
  review: RoutineStepReview;
  checked: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Routines.save");
  const disabled = !review.usable;

  return (
    <li
      className={`rounded-card border p-3 transition-colors ${
        disabled
          ? "border-border bg-raised/40"
          : checked
            ? "border-accent bg-accent-subtle"
            : "border-border bg-base"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)] disabled:cursor-not-allowed"
          aria-label={review.text}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-small ${disabled ? "text-text-muted line-through" : "text-foreground"}`}
          >
            {review.text}
          </p>

          {/* El motivo llega redactado del backend (A9): dice qué hacer. */}
          {disabled && review.reason && (
            <p className="mt-1.5 flex items-start gap-1.5 text-micro text-text-muted">
              <AlertTriangle size={13} strokeWidth={1.5}
                             className="mt-px shrink-0 text-warning-solid" />
              {review.reason}
            </p>
          )}

          {/* Aviso que NO impide guardar: la frase funciona, pero su clasificación
              depende del LLM y puede variar entre corridas. */}
          {!disabled && review.warnings.includes("llm_classified") && (
            <p className="mt-1.5 flex items-start gap-1.5 text-micro text-text-muted">
              <AlertTriangle size={13} strokeWidth={1.5}
                             className="mt-px shrink-0 text-warning-solid" />
              {t("llmWarning")}
            </p>
          )}
        </div>
      </label>
    </li>
  );
}
