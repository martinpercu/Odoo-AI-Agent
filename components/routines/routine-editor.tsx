"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  FlaskConical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import {
  createRoutine,
  dryRunRoutine,
  proposeRoutineSteps,
  reviewRoutineSteps,
  updateRoutine,
} from "@/lib/api";
import type { Routine, RoutineDryRun, RoutineStepReview } from "@/lib/types";

/**
 * El editor de una Rutina (F3, §3.5).
 *
 * ⚠️ **Es una lista ordenable de frases, y tiene que seguir siéndolo.** El riesgo
 * declarado de esta pantalla es que se convierta en un IDE. Si aparece la necesidad de
 * condicionales, la respuesta es **una operación derivada nueva en Python**, no una
 * feature del editor ([`CONTRATO-RUTINA.md` §11](../../PLAN_RUTINAS/CONTRATO-RUTINA.md)).
 *
 * Tres cosas que hace y por qué:
 *
 * 1. **Valida mientras se escribe** (`review-steps`, con debounce). Decirle al usuario
 *    que su frase no sirve *después* de que le puso nombre a la Rutina se lee como que
 *    el producto le hizo perder el tiempo.
 * 2. **El `dry-run` está a la vista, no escondido** (§3.3). Es la salvaguarda que hace
 *    segura la autoría: convierte "esta frase parece razonable" en "esta frase devuelve
 *    esto", con los datos reales del usuario y antes de guardar.
 * 3. **La autoría asistida es un botón secundario.** Es el complemento, no el camino
 *    crítico — sin LLM devuelve una lista vacía y la pantalla sigue funcionando igual.
 */
export function RoutineEditor({ routine }: { routine?: Routine }) {
  const t = useTranslations("Routines.editor");
  const locale = useLocale();
  const router = useRouter();
  const { activeConfigId, isConfigured } = useOdooConfig();

  const isNew = !routine;
  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [steps, setSteps] = useState<string[]>(() => {
    const fromRoutine = (routine?.steps ?? [])
      .filter((s) => s.kind === "ask")
      .map((s) => s.ask ?? s.label);
    return fromRoutine.length > 0 ? fromRoutine : [""];
  });

  const [reviews, setReviews] = useState<RoutineStepReview[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dryRun, setDryRun] = useState<RoutineDryRun | null>(null);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunError, setDryRunError] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [proposing, setProposing] = useState(false);
  const [proposalEmpty, setProposalEmpty] = useState(false);

  // -- validación en vivo, con debounce ------------------------------------
  // Todo el `setState` vive DENTRO del timeout: hacerlo sincrónico en el cuerpo del
  // efecto (por ejemplo para limpiar la lista cuando no hay nada escrito) dispara
  // renders en cascada, y acá el efecto corre con cada tecla.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const filled = steps.map((s) => s.trim());
    debounce.current = setTimeout(() => {
      if (filled.every((s) => !s)) {
        setReviews([]);
        return;
      }
      reviewRoutineSteps(filled, locale).then(setReviews);
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [steps, locale]);

  const usableSteps = useMemo(
    () => steps.map((s) => s.trim()).filter(Boolean),
    [steps]
  );
  const anyUsable = reviews.some((r) => r.usable);
  const canSave = name.trim().length > 0 && usableSteps.length > 0 && !saving;

  // -- acciones de la lista -------------------------------------------------
  const setStep = (i: number, value: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));

  const addStep = () => setSteps((prev) => [...prev, ""]);

  const removeStep = (i: number) =>
    setSteps((prev) => (prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)));

  const move = (i: number, delta: number) =>
    setSteps((prev) => {
      const target = i + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });

  // -- dry-run --------------------------------------------------------------
  const handleDryRun = async () => {
    if (!activeConfigId || usableSteps.length === 0) return;
    setDryRunning(true);
    setDryRun(null);
    setDryRunError(null);
    const res = await dryRunRoutine({
      configId: activeConfigId,
      steps: usableSteps,
      language: locale,
    });
    setDryRunning(false);
    if (res.success && res.result) {
      setDryRun(res.result);
      return;
    }
    // 429 = tope de corridas simultáneas (A8). Un dry-run pega contra el Odoo del
    // cliente igual que una corrida, así que toma un lugar igual que una corrida.
    setDryRunError(res.rateLimited ? t("dryRunBusy") : t("dryRunFailed"));
  };

  // -- autoría asistida (B7) -------------------------------------------------
  const handlePropose = async () => {
    if (!goal.trim()) return;
    setProposing(true);
    setProposalEmpty(false);
    const res = await proposeRoutineSteps(goal.trim(), locale);
    setProposing(false);
    const proposed = (res.steps ?? []).map((s) => s.text);
    if (proposed.length === 0) {
      setProposalEmpty(true);
      return;
    }
    // Se AGREGAN a lo que ya había: pisar lo que el usuario escribió sería la peor
    // forma de "ayudar".
    setSteps((prev) => [...prev.filter((s) => s.trim()), ...proposed]);
    setGoal("");
  };

  // -- guardar ---------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = isNew
      ? await createRoutine({
          name: name.trim(),
          steps: usableSteps,
          description: description.trim(),
          language: locale,
          configId: activeConfigId ?? undefined,
        })
      : await updateRoutine(routine.id, {
          name: name.trim(),
          steps: usableSteps,
          description: description.trim(),
          language: locale,
        });
    setSaving(false);
    if (!res.success) {
      setError(res.errorCode === "no_usable_steps" ? t("noUsableSteps") : t("saveFailed"));
      return;
    }
    router.push("/rutinas");
  };

  const reviewFor = (i: number): RoutineStepReview | undefined => reviews[i];

  return (
    <div className="space-y-6">
      {/* Identidad */}
      <section className="rounded-card border border-border bg-surface p-5">
        <label htmlFor="r-name" className="mb-1.5 block text-small font-medium">
          {t("nameLabel")}
        </label>
        <input
          id="r-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="h-btn-md w-full rounded-btn border border-border bg-base px-3 text-body outline-none focus:border-accent"
        />

        <label htmlFor="r-desc" className="mb-1.5 mt-4 block text-small font-medium">
          {t("descriptionLabel")}
        </label>
        <input
          id="r-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="h-btn-md w-full rounded-btn border border-border bg-base px-3 text-body outline-none focus:border-accent"
        />
      </section>

      {/* Los pasos */}
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-subheading">{t("stepsTitle")}</h2>
        <p className="mt-1 text-small text-text-muted">{t("stepsHint")}</p>

        <ul className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              value={step}
              review={reviewFor(i)}
              total={steps.length}
              onChange={(v) => setStep(i, v)}
              onRemove={() => removeStep(i)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
        </ul>

        <button
          type="button"
          onClick={addStep}
          className="mt-3 flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small transition-colors hover:bg-raised"
        >
          <Plus size={16} strokeWidth={1.5} />
          {t("addStep")}
        </button>
      </section>

      {/* Autoría asistida (B7) — el COMPLEMENTO, no el camino crítico */}
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-subheading">
          <Sparkles size={18} strokeWidth={1.5} className="text-accent" />
          {t("assistTitle")}
        </h2>
        <p className="mt-1 text-small text-text-muted">{t("assistHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t("assistPlaceholder")}
            className="h-btn-md min-w-0 flex-1 rounded-btn border border-border bg-base px-3 text-body outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handlePropose}
            disabled={proposing || !goal.trim()}
            className="flex h-btn-md items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised disabled:opacity-50"
          >
            {proposing ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Sparkles size={16} strokeWidth={1.5} />
            )}
            {t("assistCta")}
          </button>
        </div>
        {proposalEmpty && (
          <p className="mt-2 text-small text-text-muted">{t("assistEmpty")}</p>
        )}
      </section>

      {/* Dry-run (§3.3) */}
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-subheading">
          <FlaskConical size={18} strokeWidth={1.5} className="text-accent" />
          {t("dryRunTitle")}
        </h2>
        <p className="mt-1 text-small text-text-muted">{t("dryRunHint")}</p>

        <button
          type="button"
          onClick={handleDryRun}
          disabled={dryRunning || !isConfigured || usableSteps.length === 0}
          className="mt-3 flex h-btn-sm items-center gap-1.5 rounded-btn border border-border px-3 text-small font-medium transition-colors hover:bg-raised disabled:opacity-50"
        >
          {dryRunning ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <FlaskConical size={16} strokeWidth={1.5} />
          )}
          {t("dryRunCta")}
        </button>

        {dryRunError && (
          <p className="mt-3 text-small text-error" role="alert">
            {dryRunError}
          </p>
        )}

        {dryRun && <DryRunResults result={dryRun} />}
      </section>

      {/* Guardar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-muted">
          {anyUsable ? t("readyToSave") : t("nothingUsableYet")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/rutinas")}
            className="h-btn-md rounded-btn border border-border px-4 text-small transition-colors hover:bg-raised"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex h-btn-md items-center gap-1.5 rounded-btn bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Check size={16} strokeWidth={1.5} />
            )}
            {isNew ? t("create") : t("save")}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-small text-error" role="alert">
          {error}
        </p>
      )}

      {/* ⚠️ El aviso de versionado. Cambiar los pasos INCREMENTA la versión
          (CONTRATO §10) y una corrida guarda con cuál corrió — que el histórico deje
          de ser comparable no puede ser una sorpresa. */}
      {!isNew && (
        <p className="text-micro text-text-muted">
          {t("versionNote", { version: routine.version })}
        </p>
      )}
    </div>
  );
}

/** Una frase de la lista, con su dictamen debajo. */
function StepRow({
  index,
  value,
  review,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  value: string;
  review?: RoutineStepReview;
  total: number;
  onChange: (v: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useTranslations("Routines.editor");
  const filled = value.trim().length > 0;
  const bad = filled && review && !review.usable;

  return (
    <li>
      <div className="flex items-start gap-2">
        <span className="mt-2.5 w-5 shrink-0 text-right text-small text-text-muted">
          {index + 1}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("stepPlaceholder")}
          aria-label={t("stepAria", { n: index + 1 })}
          className={`h-btn-md min-w-0 flex-1 rounded-btn border bg-base px-3 text-body outline-none focus:border-accent ${
            bad ? "border-warning-solid" : "border-border"
          }`}
        />
        <div className="flex shrink-0 gap-1">
          <IconBtn label={t("moveUp")} onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp size={15} strokeWidth={1.5} />
          </IconBtn>
          <IconBtn
            label={t("moveDown")}
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ArrowDown size={15} strokeWidth={1.5} />
          </IconBtn>
          <IconBtn label={t("removeStep")} onClick={onRemove} destructive>
            <Trash2 size={15} strokeWidth={1.5} />
          </IconBtn>
        </div>
      </div>

      {/* El motivo viene redactado del backend (A9) y dice QUÉ HACER. No se
          reescribe acá: en 11 locales garantizaría divergir del validador real. */}
      {bad && review?.reason && (
        <p className="ml-7 mt-1.5 flex items-start gap-1.5 text-micro text-text-muted">
          <AlertTriangle
            size={13}
            strokeWidth={1.5}
            className="mt-px shrink-0 text-warning-solid"
          />
          {review.reason}
        </p>
      )}

      {/* Lo que la frase va a consultar. Es la única pista de que el paso "entendió"
          — y de dónde sale el `requires` derivado (§3.1.4). */}
      {filled && review?.usable && review.model && (
        <p className="ml-7 mt-1.5 text-micro text-text-muted">
          {t("resolvesTo", { model: review.model })}
        </p>
      )}
    </li>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-btn-sm items-center justify-center rounded-btn border border-border transition-colors disabled:opacity-40 ${
        destructive ? "text-error hover:bg-error-subtle" : "hover:bg-raised"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Lo que cada paso devolvería HOY, con los datos reales del usuario.
 *
 * ⚠️ `skipped` no es una falla: el paso no aplica en esta instancia. Y `partial` es un
 * estado de PRIMERA CLASE — se muestra como éxito con nota, igual que en el historial.
 */
function DryRunResults({ result }: { result: RoutineDryRun }) {
  const t = useTranslations("Routines.editor");

  return (
    <div className="mt-4 space-y-2">
      {result.steps.map((step) => (
        <div key={step.key} className="rounded-card border border-border bg-base p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-small font-medium">{step.label}</p>
            <span
              className={`shrink-0 text-micro ${
                step.status === "ok"
                  ? "text-success-solid"
                  : step.status === "error"
                    ? "text-error"
                    : "text-text-muted"
              }`}
            >
              {t(`stepStatus.${step.status}`)}
            </span>
          </div>

          {step.answer && (
            <p className="mt-1.5 whitespace-pre-wrap text-small text-text-secondary">
              {step.answer}
            </p>
          )}
          {step.reason && (
            <p className="mt-1.5 text-micro text-text-muted">{step.reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
