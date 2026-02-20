"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { ActionProposalMetadata, ActionContext } from "@/lib/types";

interface ActionProposalButtonProps {
  metadata: ActionProposalMetadata;
  onAction: (actionContext: ActionContext) => Promise<void>;
}

export function ActionProposalButton({ metadata, onAction }: ActionProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rejected, setRejected] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      // Send the full action context object as required by the backend contract
      await onAction(metadata.action);
      setCompleted(true);
    } catch (error) {
      console.error("Action confirmation failed:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleReject() {
    setRejected(true);
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
    return null; // Backend sends confirmation message in chat, no need for UI here
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 flex items-center gap-2"
    >
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
    </motion.div>
  );
}
