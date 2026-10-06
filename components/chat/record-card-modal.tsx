"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  Check,
  Database,
  FileText,
  FolderKanban,
  ListChecks,
  Loader2,
  Package,
  PackageOpen,
  RefreshCw,
  ShoppingCart,
  Target,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
 *
 * Diseño (Martin, 2026-10-06): mientras carga sólo se ve el spinner — nada de botones
 * que después cambian de lugar. No hay "X": cerrar es click afuera o Esc. La salida a
 * Odoo es la flecha ↗ de arriba a la derecha, con su explicación en el tooltip. El pie
 * existe sólo si hay algo que hacer (el interruptor de edición, guardar).
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
  const Icon = iconFor(record.model);

  // En lectura, el nombre ya es el título y el primer monto va destacado debajo: no se
  // repiten en la grilla. En edición vuelven a la grilla, que es donde se editan.
  const nameField = !editing ? card?.fields.find((f) => f.display && f.display === title) : undefined;
  const hero = !editing
    ? card?.fields.find((f) => f.type === "monetary" && f.display)
    : undefined;
  const gridFields = (card?.fields ?? []).filter((f) => f !== nameField && f !== hero);

  return (
    <A11yModal
      open
      onClose={onClose}
      labelledBy={titleId}
      containerClassName="items-end sm:items-center sm:p-4"
      className="w-full sm:max-w-lg"
    >
      {/* Sin botón de cerrar: un click afuera o Esc alcanzan (A11yModal). */}
      <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-card border border-border bg-surface shadow-lg sm:rounded-card">
        {!card && !loadError && (
          // Mientras carga no hay nada más: ni título, ni botones, ni el interruptor.
          <div className="flex min-h-36 items-center justify-center gap-2 text-small text-text-secondary">
            <h2 id={titleId} className="sr-only">{record.name}</h2>
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden />
            {t("loading")}
          </div>
        )}

        {loadError && (
          <div className="flex min-h-36 items-center justify-center px-6 py-8">
            <h2 id={titleId} className="sr-only">{record.name}</h2>
            <p className="flex max-w-sm items-start gap-2 text-small text-text-secondary">
              <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning-solid" aria-hidden />
              {loadError}
            </p>
          </div>
        )}

        {card && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Encabezado: qué es, cómo se llama y la salida a Odoo */}
            <div className="relative z-10 flex items-start gap-3.5 px-5 pb-4 pt-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
                <Icon size={22} strokeWidth={1.5} aria-hidden />
              </div>
              <div className="min-w-0 flex-1 self-center">
                <h2
                  id={titleId}
                  className="break-words text-subheading font-semibold leading-snug text-foreground"
                >
                  {title}
                </h2>
                {hero && (
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-heading font-semibold tabular-nums tracking-tight text-foreground">
                      {hero.display}
                    </span>
                    <span className="text-small text-text-muted">{hero.label}</span>
                  </p>
                )}
              </div>
              {url && <OpenInOdoo url={url} label={openLabel} hint={t("newTab")} />}
            </div>

            <div className="mx-5 border-t border-border" />

            {/* Los datos */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {gridFields.map((f) => {
                  const asInput = editing && f.editable;
                  return (
                    <div
                      key={f.name}
                      className={`min-w-0 transition-opacity ${
                        f.type === "text" ? "col-span-2" : ""
                      } ${editing && !f.editable ? "opacity-50" : ""}`}
                    >
                      <dt className="text-micro font-medium uppercase tracking-wide text-text-muted">
                        {f.label}
                      </dt>
                      <dd className="mt-1">
                        {asInput ? (
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
                          <FieldValue field={f} />
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {saveError && (
                <p className="mt-5 flex items-start gap-2 text-small text-error" role="alert">
                  <AlertTriangle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
                  {saveError}
                </p>
              )}
            </div>

            {/* Pie: sólo existe si hay algo que hacer (el interruptor, guardar) */}
            {(showToggle || savedFlash) && (
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border bg-base/40 px-5 py-2.5">
                {showToggle ? (
                  <ReadEditToggle
                    editing={editing}
                    onChange={startEditing}
                    label={t("edit")}
                    blockedText={card.can_edit ? null : card.edit_blocked_text}
                    disabled={saving}
                  />
                ) : <span />}
                {editing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(false)}
                      disabled={saving}
                      className="h-btn-sm rounded-btn px-3 text-small text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={!hasChanges || saving}
                      className="inline-flex h-btn-sm items-center gap-2 rounded-btn bg-accent px-4 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
                    >
                      {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" aria-hidden />}
                      {saving ? t("saving") : t("save")}
                    </button>
                  </div>
                ) : (
                  savedFlash && (
                    <span className="flex shrink-0 items-center gap-1 text-small text-success-solid" role="status">
                      <Check size={14} strokeWidth={1.5} aria-hidden />
                      {t("saved")}
                    </span>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </A11yModal>
  );
}

const NUMERIC = new Set(["integer", "float", "monetary"]);

/** Un valor en lectura. Un mail o un teléfono se pueden tocar (mailto / tel). */
function FieldValue({ field }: { field: RecordCardField }) {
  const shown = field.display;
  if (!shown) return <p className="text-body text-text-muted">—</p>;

  const href = /email/.test(field.name)
    ? `mailto:${shown}`
    : /phone|mobile/.test(field.name)
      ? `tel:${shown.replace(/[^\d+]/g, "")}`
      : null;
  if (href) {
    return (
      <a
        href={href}
        title={shown}
        className="block truncate text-body text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        {shown}
      </a>
    );
  }
  return (
    <p
      className={`break-words text-body text-foreground ${
        NUMERIC.has(field.type) ? "tabular-nums" : ""
      } ${field.type === "text" ? "whitespace-pre-line" : ""}`}
    >
      {shown}
    </p>
  );
}

/** El ícono del tipo de registro. Usa el modelo sólo para elegirlo: el nombre técnico
 *  nunca se muestra. Un modelo nuevo cae en `Database` (registro de Odoo). */
const MODEL_ICON: Record<string, LucideIcon> = {
  "res.partner": Building2,
  "res.users": UserRound,
  "hr.employee": UserRound,
  "crm.lead": Target,
  "sale.order": ShoppingCart,
  "purchase.order": PackageOpen,
  "account.move": FileText,
  "account.payment": Banknote,
  "product.product": Package,
  "product.template": Package,
  "project.project": FolderKanban,
  "project.task": ListChecks,
  "mail.activity": CalendarClock,
  "stock.picking": Truck,
  "stock.warehouse.orderpoint": RefreshCw,
};

function iconFor(model: string): LucideIcon {
  return MODEL_ICON[model] ?? Database;
}

/** La salida a Odoo: una flecha arriba a la derecha con su explicación al pasar. */
function OpenInOdoo({ url, label, hint }: { url: string; label: string; hint: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}. ${hint}`}
      className="group relative -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-text-muted transition-colors hover:bg-accent-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowUpRight
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-64 rounded-btn border border-border bg-raised px-3 py-2 text-left opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="block text-small font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-micro text-text-muted">{hint}</span>
      </span>
    </a>
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
