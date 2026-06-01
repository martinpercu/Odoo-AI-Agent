"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Loader2, X, Pencil, Check, AlertTriangle } from "lucide-react";
import type { ActionProposalMetadata, ActionContext, EntitySearchResult } from "@/lib/types";
import { EntityAutocomplete } from "./entity-autocomplete";
import { AuditHistoryPopover } from "./audit-history-popover";
import { useChatContext } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";

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
  const { meData } = useSession();
  const isBuilder = meData?.user?.role === "ADMIN" || meData?.user?.role === "SUPERADMIN";

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
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-2 rounded-md border border-border bg-raised px-4 py-3 text-body text-text-secondary"
      >
        <div className="flex items-start gap-2">
          <X size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
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
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-2 flex items-center gap-3"
      >
        <div className="flex items-center gap-1.5 text-small text-success-solid">
          <Check size={16} strokeWidth={1.5} />
          <span>{t("completed")}</span>
        </div>
        {currentChatId && <AuditHistoryPopover chatId={currentChatId} />}
      </motion.div>
    );
  }

  const fieldEntries = Object.entries(initialValsRef.current);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-lg border border-border bg-surface p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-small text-text-secondary">
        {isBuilder ? (
          <span className="font-medium uppercase tracking-wide font-technical">
            {metadata.action.action} &middot; {metadata.action.model}
          </span>
        ) : (
          <span className="font-medium">{t("actionProposal.confirm")}</span>
        )}
        <AnimatePresence>
          {dirtyCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={dirtyTransition}
              className="rounded-md bg-success-subtle px-2 py-0.5 text-micro font-semibold text-success-solid"
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
                  ? "var(--state-error-subtle)"
                  : dirty
                    ? "var(--state-success-subtle)"
                    : "transparent",
                borderColor: fieldError
                  ? "var(--state-error)"
                  : dirty
                    ? "var(--state-success)"
                    : "transparent",
              }}
              transition={dirtyTransition}
              className="relative flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-body"
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
                    className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success-solid shadow-sm"
                  >
                    <Pencil size={8} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Label */}
              <span className="w-36 shrink-0 truncate text-text-secondary" title={key}>
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
                        color: dirty ? "var(--state-success)" : "inherit",
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
                  className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:bg-raised hover:text-foreground"
                  title={t("actionProposal.editField")}
                  aria-label={t("actionProposal.editField")}
                >
                  {isEditing ? <Check size={14} strokeWidth={1.5} /> : <Pencil size={14} strokeWidth={1.5} />}
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
                    className="absolute -bottom-8 left-10 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-small text-background shadow-lg"
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
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex items-center gap-1 px-2.5 text-small text-error font-technical"
                >
                  <AlertTriangle size={12} strokeWidth={1.5} className="shrink-0" />
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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-2 flex items-center gap-2 rounded-md border border-error-subtle bg-error-subtle px-3 py-2 text-small text-error"
          >
            <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
            <span>{t("actionProposal.validationError")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex h-btn-md items-center gap-2 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
          <span>{loading ? metadata.labels.confirm_btn : metadata.labels.action_btn}</span>
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="inline-flex h-btn-md items-center gap-2 rounded-btn border border-border bg-surface px-4 text-body font-medium transition-colors hover:bg-raised disabled:opacity-50"
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
    ? "border-success-solid bg-success-subtle"
    : "border-border bg-surface";

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
        className={`w-full rounded-md border px-3 py-1.5 text-body font-technical outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 ${dirtyInputClass}`}
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
        className={`w-full rounded-md border px-3 py-1.5 text-body font-technical outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 ${dirtyInputClass}`}
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
          className="h-4 w-4 rounded-md border-border accent-[var(--state-success)]"
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
      className={`w-full rounded-md border px-3 py-1.5 text-body outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 ${dirtyInputClass}`}
      autoFocus
    />
  );
}
