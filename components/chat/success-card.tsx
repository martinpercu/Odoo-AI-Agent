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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-2 rounded-lg border border-border bg-success-subtle p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-subtle">
          <CheckCircle2 size={16} strokeWidth={1.5} className="text-success-solid" />
        </div>
        <div className="flex-1">
          <p className="text-body font-medium text-success-solid">
            {metadata.actionType === "method_call" && metadata.actionMessage
              ? metadata.actionMessage
              : t("title")}
          </p>
          {metadata.recordName && (
            <p className="mt-1 text-body font-technical text-foreground">{metadata.recordName}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-small text-text-muted">
            <span className="font-technical">{t("recordId", { id: metadata.recordId })}</span>
            {metadata.odooUrl && (
              <a
                href={metadata.odooUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:underline"
              >
                <span>{t("viewInOdoo")}</span>
                <ExternalLink size={12} strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
