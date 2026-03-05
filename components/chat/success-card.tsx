"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActionSuccessMetadata } from "@/lib/types";

interface SuccessCardProps {
  metadata: ActionSuccessMetadata;
}

export function SuccessCard({ metadata }: SuccessCardProps) {
  const t = useTranslations("ChatMessages.success");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-2 rounded-xl border border-success/20 bg-success/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10">
          <CheckCircle2 size={18} className="text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-success">
            {metadata.actionType === "method_call" && metadata.actionMessage
              ? metadata.actionMessage
              : t("title")}
          </p>
          {metadata.recordName && (
            <p className="mt-1 text-sm text-foreground">{metadata.recordName}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{t("recordId", { id: metadata.recordId })}</span>
            {metadata.odooUrl && (
              <a
                href={metadata.odooUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <span>{t("viewInOdoo")}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
