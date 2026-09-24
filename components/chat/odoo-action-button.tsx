"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActionPromptMetadata, ActionContext } from "@/lib/types";
import { AccountRequiredNote, useWriteRequiresAccount } from "./account-required-note";

interface OdooActionButtonProps {
  metadata: ActionPromptMetadata;
  onAction: (actionContext: ActionContext) => Promise<void>;
}

export function OdooActionButton({ metadata, onAction }: OdooActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [accountRequiredDetail, setAccountRequiredDetail] = useState<string | null>(null);
  // Siempre es un `method_call`, o sea una escritura: sin cuenta no se ofrece.
  const blocked = useWriteRequiresAccount() || accountRequiredDetail !== null;
  const t = useTranslations("ChatMessages");

  const buttonLabel = metadata.action_btn ?? metadata.actionLabel;

  async function handleClick() {
    setLoading(true);
    try {
      // Build ActionContext from the legacy action_prompt metadata
      const ctx = metadata.context ?? {};
      const actionContext: ActionContext = {
        action: "method_call",
        model: (ctx.model as string) ?? "",
        vals: (ctx.vals as Record<string, unknown>) ?? {},
        target_ids: (ctx.target_ids as number[] | null) ?? (metadata.recordId ? [Number(metadata.recordId)] : null),
        method: (ctx.method as string) ?? metadata.action,
        canonical_verb: (ctx.canonical_verb as string | null) ?? null,
        status: "pending_confirmation",
      };
      await onAction(actionContext);
      setCompleted(true);
    } catch (error) {
      const err = error as Error & { accountRequired?: boolean };
      if (err.accountRequired) setAccountRequiredDetail(err.message);
      else console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  }

  if (blocked) {
    return <AccountRequiredNote detail={accountRequiredDetail ?? undefined} />;
  }

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={handleClick}
      disabled={loading || completed}
      className={`mt-2 inline-flex h-btn-md items-center gap-2 rounded-btn px-4 text-body font-medium text-white shadow-sm transition-colors disabled:opacity-50 ${
        completed ? "bg-success-solid" : "bg-accent hover:bg-accent-hover"
      }`}
    >
      {loading && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
      <span>
        {loading
          ? t("processing")
          : completed
            ? `✓ ${t("completed")}`
            : buttonLabel}
      </span>
    </motion.button>
  );
}
