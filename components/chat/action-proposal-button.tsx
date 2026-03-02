"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Loader2, X, Pencil, Check, AlertCircle } from "lucide-react";
import type { ActionProposalMetadata, ActionContext, EntitySearchResult } from "@/lib/types";
import { EntityAutocomplete } from "./entity-autocomplete";
import { AuditHistoryPopover } from "./audit-history-popover";
import { useChatContext } from "@/components/app-shell";

interface ActionProposalButtonProps {
  metadata: ActionProposalMetadata;
  onAction: (actionContext: ActionContext) => Promise<void>;
}

/** Infer field input type from the field key and value. */
function getFieldType(key: string, value: unknown): "entity" | "number" | "date" | "boolean" | "text" {
  if (key.endsWith("_id")) return "entity";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  if (key.includes("date") || key.includes("fecha")) return "date";
  if (key.includes("amount") || key.includes("price") || key.includes("total") || key.includes("qty") || key.includes("quantity")) return "number";
  return "text";
}

/** Extract model name from a relational field key (e.g., "partner_id" → "res.partner"). */
function fieldKeyToModel(key: string): string {
  const mapping: Record<string, string> = {
    partner_id: "res.partner",
    product_id: "product.product",
    product_tmpl_id: "product.template",
    account_id: "account.account",
    journal_id: "account.journal",
    user_id: "res.users",
    company_id: "res.company",
    currency_id: "res.currency",
    warehouse_id: "stock.warehouse",
    location_id: "stock.location",
    tax_id: "account.tax",
    pricelist_id: "product.pricelist",
    payment_term_id: "account.payment.term",
    analytic_account_id: "account.analytic.account",
    team_id: "crm.team",
    category_id: "res.partner.category",
    country_id: "res.country",
    state_id: "res.country.state",
  };
  return mapping[key] || key.replace(/_id$/, "").replace(/_/g, ".");
}

/** Human-readable label from field key. */
function formatFieldLabel(key: string): string {
  return key
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display value for non-editing state. */
function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === "number") return String(value[1]);
    return value.join(", ");
  }
  return String(value);
}

/**
 * Deep-compare two field values for equality.
 * Handles primitives, arrays (many2one tuples), dates, null/undefined.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  // Array comparison (many2one tuples [id, name])
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => valuesEqual(v, b[i]));
  }
  // Number comparison (handle string "100" vs number 100)
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
  // Date string normalization (compare only date part)
  if (typeof a === "string" && typeof b === "string") {
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    if (datePattern.test(a) && datePattern.test(b)) {
      return a.slice(0, 10) === b.slice(0, 10);
    }
  }
  return String(a) === String(b);
}

// ---- Framer Motion variants for dirty state ----
const dirtyTransition = { duration: 0.25, ease: "easeInOut" as const };

export function ActionProposalButton({ metadata, onAction }: ActionProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [editedVals, setEditedVals] = useState<Record<string, unknown>>({ ...metadata.action.vals });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hoveredDirtyField, setHoveredDirtyField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { currentChatId } = useChatContext();
  const t = useTranslations("ChatMessages");

  // Immutable reference to original values from backend/OCR — never mutated
  const initialValsRef = useRef<Record<string, unknown>>({ ...metadata.action.vals });

  /** Check if a specific field has been modified from its original value. */
  const isFieldDirty = useCallback(
    (fieldName: string): boolean => {
      return !valuesEqual(editedVals[fieldName], initialValsRef.current[fieldName]);
    },
    [editedVals]
  );

  /** Count of total dirty fields. */
  const dirtyCount = Object.keys(initialValsRef.current).filter(isFieldDirty).length;

  async function handleConfirm() {
    setLoading(true);
    setFieldErrors({});
    try {
      const modifiedAction: ActionContext = {
        ...metadata.action,
        vals: editedVals,
      };
      await onAction(modifiedAction);
      setCompleted(true);
    } catch (error) {
      // Handle per-field validation errors (422)
      const err = error as Error & { fieldErrors?: Record<string, string> };
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        console.error("Action confirmation failed:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReject() {
    setRejected(true);
  }

  function updateField(key: string, value: unknown) {
    setEditedVals((prev) => ({ ...prev, [key]: value }));
    // Clear field error when user edits the field
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  if (rejected) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        className="mt-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
      >
        <div className="flex items-start gap-2">
          <X size={16} className="mt-0.5 shrink-0" />
          <span>{metadata.labels.cancelled_msg}</span>
        </div>
      </motion.div>
    );
  }

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 flex items-center gap-3"
      >
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <Check size={14} />
          <span>{t("completed")}</span>
        </div>
        {currentChatId && <AuditHistoryPopover chatId={currentChatId} />}
      </motion.div>
    );
  }

  const fieldEntries = Object.entries(initialValsRef.current);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-card p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          {metadata.action.action} &middot; {metadata.action.model}
        </span>
        <AnimatePresence>
          {dirtyCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={dirtyTransition}
              className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {dirtyCount} {t("actionProposal.fieldEdited").toLowerCase()}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Editable fields */}
      <div className="space-y-1.5">
        {fieldEntries.map(([key]) => {
          const originalValue = initialValsRef.current[key];
          const fieldType = getFieldType(key, originalValue);
          const isEditing = editingField === key;
          const currentValue = editedVals[key];
          const dirty = isFieldDirty(key);
          const isHovered = hoveredDirtyField === key;
          const fieldError = fieldErrors[key];

          return (
            <div key={key}>
            <motion.div
              animate={{
                backgroundColor: fieldError
                  ? "rgba(239,68,68,0.06)"
                  : dirty
                    ? "var(--dirty-field-bg, rgba(34,197,94,0.06))"
                    : "transparent",
                borderColor: fieldError
                  ? "rgba(239,68,68,0.5)"
                  : dirty
                    ? "var(--dirty-field-border, rgba(34,197,94,0.35))"
                    : "transparent",
              }}
              transition={dirtyTransition}
              className="relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
              onMouseEnter={() => dirty && setHoveredDirtyField(key)}
              onMouseLeave={() => setHoveredDirtyField(null)}
            >
              {/* Dirty indicator dot */}
              <AnimatePresence>
                {dirty && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={dirtyTransition}
                    className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 shadow-sm"
                  >
                    <Pencil size={8} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Label */}
              <span className="w-36 shrink-0 truncate text-muted-foreground" title={key}>
                {formatFieldLabel(key)}
              </span>

              {/* Value / Input */}
              <div className="flex-1">
                {isEditing ? (
                  <FieldInput
                    fieldKey={key}
                    fieldType={fieldType}
                    value={currentValue}
                    onChange={(v) => updateField(key, v)}
                    chatId={currentChatId || ""}
                    onDone={() => setEditingField(null)}
                    isDirty={dirty}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{
                        color: dirty ? "var(--dirty-text, rgb(22,163,74))" : "inherit",
                        fontWeight: dirty ? 600 : 400,
                      }}
                      transition={dirtyTransition}
                    >
                      {formatDisplayValue(currentValue)}
                    </motion.span>
                  </div>
                )}
              </div>

              {/* Edit toggle */}
              {!loading && (
                <button
                  type="button"
                  onClick={() => setEditingField(isEditing ? null : key)}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={t("actionProposal.editField")}
                >
                  {isEditing ? <Check size={14} /> : <Pencil size={14} />}
                </button>
              )}

              {/* Tooltip: original value on hover */}
              <AnimatePresence>
                {dirty && isHovered && !isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -bottom-8 left-10 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-lg"
                  >
                    {t("actionProposal.originalValue")}: {formatDisplayValue(originalValue)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <AnimatePresence>
              {fieldError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1 px-2.5 text-xs text-red-500"
                >
                  <AlertCircle size={12} className="shrink-0" />
                  {fieldError}
                </motion.p>
              )}
            </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Validation error banner */}
      <AnimatePresence>
        {Object.keys(fieldErrors).length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{t("actionProposal.validationError")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--odoo-purple)" }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          <span>{loading ? metadata.labels.confirm_btn : metadata.labels.action_btn}</span>
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {metadata.labels.cancel_btn}
        </button>
      </div>
    </motion.div>
  );
}

// ---- Field Input Components ----

interface FieldInputProps {
  fieldKey: string;
  fieldType: "entity" | "number" | "date" | "boolean" | "text";
  value: unknown;
  onChange: (value: unknown) => void;
  chatId: string;
  onDone: () => void;
  isDirty: boolean;
}

function FieldInput({ fieldKey, fieldType, value, onChange, chatId, onDone, isDirty }: FieldInputProps) {
  const dirtyInputClass = isDirty
    ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20"
    : "border-border bg-background";

  if (fieldType === "entity") {
    const model = fieldKeyToModel(fieldKey);
    let entityValue: EntitySearchResult | null = null;
    if (Array.isArray(value) && value.length === 2) {
      entityValue = { id: value[0] as number, name: value[1] as string };
    } else if (typeof value === "number") {
      entityValue = { id: value, name: `#${value}` };
    }

    return (
      <EntityAutocomplete
        chatId={chatId}
        model={model}
        value={entityValue}
        onChange={(entity) => {
          if (entity) {
            onChange([entity.id, entity.name]);
          } else {
            onChange(null);
          }
        }}
      />
    );
  }

  if (fieldType === "number") {
    return (
      <input
        type="number"
        step="any"
        value={value != null ? Number(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && onDone()}
        className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary ${dirtyInputClass}`}
        autoFocus
      />
    );
  }

  if (fieldType === "date") {
    const dateStr = typeof value === "string" ? value.slice(0, 10) : "";
    return (
      <input
        type="date"
        value={dateStr}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onDone()}
        className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary ${dirtyInputClass}`}
        autoFocus
      />
    );
  }

  if (fieldType === "boolean") {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => {
            onChange(e.target.checked);
            onDone();
          }}
          className="h-4 w-4 rounded border-border accent-emerald-500"
        />
      </label>
    );
  }

  // Default: text input
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onDone()}
      className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary ${dirtyInputClass}`}
      autoFocus
    />
  );
}
