"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActionPromptMetadata, ActionContext } from "@/lib/types";

interface OdooActionButtonProps {
  metadata: ActionPromptMetadata;
  onAction: (actionContext: ActionContext) => Promise<void>;
}

export function OdooActionButton({ metadata, onAction }: OdooActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
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
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      disabled={loading || completed}
      className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
      style={{
        backgroundColor: completed ? "var(--color-success)" : "var(--odoo-purple)",
      }}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
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
