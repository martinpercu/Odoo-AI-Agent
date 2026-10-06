"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Loader2, X, Check, AlertTriangle } from "lucide-react";

import { A11yModal } from "@/components/intro/a11y-modal";
import { ReadEditToggle } from "@/components/ui/read-edit-toggle";
import { useAudience } from "@/hooks/use-audience";
import {
  getRecordCard,
  getRecordFieldOptions,
  patchRecordCard,
  NETWORK_ERROR,
} from "@/lib/api";
import type { RecordCardData, RecordCardField, RecordM2OValue, RecordRef } from "@/lib/types";

interface RecordCardModalProps {
  record: RecordRef;
  configId: string;
  /** El chat donde se abrió: la edición queda en su historial de acciones. */
  chatId?: string | null;
  onClose: () => void;
}

const INPUT =
  "w-full rounded-md border border-border bg-base px-3 py-1.5 text-body text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none";

/** Igualdad de valores para saber qué cambió (un many2one se compara por id). */
function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => {
    if (v === "" || v === undefined) return null;
    if (v && typeof v === "object" && "id" in (v as Record<string, unknown>)) {
      return (v as RecordM2OValue).id;
    }
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/** Lo que se manda al back: un many2one va como id, un vacío como null. */
function toPayload(field: RecordCardField, v: unknown): unknown {
  if (v === "" || v === undefined) return null;
  if (field.type === "many2one") return v ? (v as RecordM2OValue).id : null;
  if (["integer", "float", "monetary"].includes(field.type) && typeof v === "string") {
    return v.trim() === "" ? null : Number(v);
  }
  return v;
}

/**
 * La tarjeta flotante de un registro listado por el agente (contrato back
 * `DOCS/contracts/record-card.md`).
 *
 * ⭐ **Nace de SÓLO LECTURA.** El usuario casi siempre quiere ver el dato; editar es un
 * gesto explícito (`ReadEditToggle`), disponible sólo si el back dice `can_edit`. Sin
 * cuenta (el visitante del demo) el switch se ve apagado con el motivo.
 *
 * Todo lo que se muestra en lectura (`display`) viene formateado del back — miles,
 * moneda, fechas, estados traducidos. Esta pieza no formatea números.
 */
export function RecordCardModal({ record, configId, chatId, onClose }: RecordCardModalProps) {
  const t = useTranslations("RecordCard");
  const locale = useLocale();
  const { isPreviewingAsClient } = useAudience();
  const titleId = useId();
  const audience = isPreviewingAsClient ? ("client" as const) : undefined;

  const [card, setCard] = useState<RecordCardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getRecordCard(record.model, record.id, {
        configId, language: locale, audience,
      });
      if (!alive) return;
      if (res.ok) {
        setCard(res.card);
      } else {
        setLoadError(
          res.detail ?? (res.errorCode === NETWORK_ERROR ? t("networkError") : t("loadError"))
        );
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.model, record.id, configId, locale]);

  const initial = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of card?.fields ?? []) out[f.name] = f.value;
    return out;
  }, [card]);

  function startEditing(next: boolean) {
    setEditing(next);
    setDraft(next ? { ...initial } : {});
    setFieldErrors({});
    setSaveError(null);
  }

  const changed = useMemo(() => {
    if (!card || !editing) return {};
    const out: Record<string, unknown> = {};
    for (const f of card.fields) {
      if (f.editable && !sameValue(draft[f.name], initial[f.name])) {
        out[f.name] = toPayload(f, draft[f.name]);
      }
    }
    return out;
  }, [card, draft, editing, initial]);
  const hasChanges = Object.keys(changed).length > 0;

  async function save() {
    if (!card || !hasChanges) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    const res = await patchRecordCard(record.model, record.id, {
      configId, language: locale, chatId, audience, values: changed,
    });
    setSaving(false);
    if (res.ok) {
      setCard(res.card);
      setEditing(false);
      setDraft({});
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
      return;
    }
    if (res.fields) setFieldErrors(res.fields);
    setSaveError(
      res.fields ? t("fixFields")
        : res.detail ?? (res.errorCode === NETWORK_ERROR ? t("networkError") : t("saveError"))
    );
  }

  const title = card?.title || record.name;
  const openLabel = card?.open_label || record.openLabel || t("openInOdoo");
  const url = card?.url || record.url;
  const showToggle = Boolean(card && (card.can_edit || card.edit_blocked_reason));

  return (
    <A11yModal
      open
      onClose={onClose}
      labelledBy={titleId}
      containerClassName="items-end sm:items-center sm:p-4"
      className="w-full sm:max-w-lg"
    >
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-card border border-border bg-surface shadow-lg sm:rounded-card">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id={titleId} className="min-w-0 break-words text-subheading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-raised hover:text-foreground"
            aria-label={t("close")}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {showToggle && card && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
            <ReadEditToggle
              editing={editing}
              onChange={startEditing}
              label={t("edit")}
              blockedText={card.can_edit ? null : card.edit_blocked_text}
              disabled={saving}
            />
            {savedFlash && (
              <span className="flex shrink-0 items-center gap-1 text-small text-success-solid">
                <Check size={14} strokeWidth={1.5} aria-hidden />
                {t("saved")}
              </span>
            )}
          </div>
        )}

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!card && !loadError && (
            <div className="flex items-center gap-2 py-6 text-small text-text-secondary">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              {t("loading")}
            </div>
          )}
          {loadError && (
            <div className="flex items-start gap-2 rounded-md border border-warning-solid/30 bg-warning-subtle px-3 py-2.5 text-small text-text-secondary">
              <AlertTriangle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning-solid" />
              {loadError}
            </div>
          )}
          {card && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {card.fields.map((f) => (
                <div key={f.name} className="contents">
                  <dt className="pt-1.5 text-small font-medium text-text-secondary">{f.label}</dt>
                  <dd className="min-w-0">
                    {editing && f.editable ? (
                      <FieldInput
                        field={f}
                        value={draft[f.name]}
                        onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))}
                        error={fieldErrors[f.name]}
                        model={record.model}
                        recordId={record.id}
                        configId={configId}
                      />
                    ) : (
                      <p className="break-words py-1.5 text-body text-foreground">
                        {f.display || <span className="text-text-muted">—</span>}
                      </p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {saveError && (
            <p className="mt-4 text-small text-error" role="alert">{saveError}</p>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-btn-md items-center gap-1.5 rounded-btn border border-accent/30 px-3 text-small font-medium text-accent transition-colors hover:border-accent hover:bg-accent-subtle"
          >
            <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
            {openLabel}
          </a>
          {editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startEditing(false)}
                disabled={saving}
                className="h-btn-md rounded-btn px-4 text-small text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!hasChanges || saving}
                className="inline-flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </A11yModal>
  );
}

interface FieldInputProps {
  field: RecordCardField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  model: string;
  recordId: number;
  configId: string;
}

function FieldInput({ field, value, onChange, error, model, recordId, configId }: FieldInputProps) {
  const t = useTranslations("RecordCard");
  const errorText = error
    ? (["required", "invalid_value", "not_editable"].includes(error)
        ? t(`errors.${error}`) : t("errors.invalid_value"))
    : null;
  const invalid = errorText ? " border-error" : "";
  const str = value === null || value === undefined || value === false ? "" : String(value);

  let input: React.ReactNode;
  switch (field.type) {
    case "text":
      input = (
        <textarea rows={3} value={str} onChange={(e) => onChange(e.target.value)}
                  aria-label={field.label} className={`${INPUT} resize-none${invalid}`} />
      );
      break;
    case "integer":
    case "float":
    case "monetary":
      input = (
        <input type="number" inputMode="decimal" step={field.type === "integer" ? 1 : "any"}
               value={str} onChange={(e) => onChange(e.target.value)}
               aria-label={field.label} className={`${INPUT}${invalid}`} />
      );
      break;
    case "date":
      input = (
        <input type="date" value={str.slice(0, 10)} onChange={(e) => onChange(e.target.value)}
               aria-label={field.label} className={`${INPUT}${invalid}`} />
      );
      break;
    case "boolean":
      input = (
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)}
               aria-label={field.label} className="mt-2 h-4 w-4 accent-accent" />
      );
      break;
    case "selection":
      input = (
        <select value={str} onChange={(e) => onChange(e.target.value)}
                aria-label={field.label} className={`${INPUT}${invalid}`}>
          {!field.required && <option value="">—</option>}
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case "many2one":
      input = (
        <M2OPicker field={field} value={(value as RecordM2OValue | null) ?? null}
                   onChange={onChange} invalid={Boolean(errorText)}
                   model={model} recordId={recordId} configId={configId} />
      );
      break;
    default:
      input = (
        <input type="text" value={str} onChange={(e) => onChange(e.target.value)}
               aria-label={field.label} className={`${INPUT}${invalid}`} />
      );
  }

  return (
    <div>
      {input}
      {errorText && <p className="mt-1 text-micro text-error">{errorText}</p>}
    </div>
  );
}

interface M2OPickerProps {
  field: RecordCardField;
  value: RecordM2OValue | null;
  onChange: (v: RecordM2OValue | null) => void;
  invalid: boolean;
  model: string;
  recordId: number;
  configId: string;
}

/** Buscador de un many2one: escribe → candidatos del back (debounce 250 ms). */
function M2OPicker({ field, value, onChange, invalid, model, recordId, configId }: M2OPickerProps) {
  const t = useTranslations("RecordCard");
  const locale = useLocale();
  const listId = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RecordM2OValue[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    setQuery(q);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const found = await getRecordFieldOptions(model, recordId, field.name, {
        configId, language: locale, q,
      });
      setOptions(found);
      setSearching(false);
    }, 250);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={field.label}
          value={query}
          placeholder={t("searchPlaceholder")}
          onFocus={() => search(query === value?.name ? "" : query)}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => {
            setOpen(false);
            setQuery(value?.name ?? "");
          }, 150)}
          className={`${INPUT}${invalid ? " border-error" : ""}`}
        />
        {value && !field.required && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-raised hover:text-foreground"
            aria-label={t("clear")}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {searching && options.length === 0 && (
            <li className="px-3 py-1.5 text-small text-text-muted">{t("searching")}</li>
          )}
          {!searching && options.length === 0 && (
            <li className="px-3 py-1.5 text-small text-text-muted">{t("noResults")}</li>
          )}
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value?.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o);
                  setQuery(o.name);
                  setOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-body transition-colors hover:bg-raised ${
                  o.id === value?.id ? "text-accent" : "text-foreground"
                }`}
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
