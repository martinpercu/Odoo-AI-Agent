"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationErrorMetadata } from "@/lib/types";

interface ValidationPromptProps {
  metadata: ValidationErrorMetadata;
}

export function ValidationPrompt({ metadata }: ValidationPromptProps) {
  const t = useTranslations("ChatMessages.validation");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-2 rounded-lg border border-border bg-warning-subtle p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-subtle">
          <AlertTriangle size={16} strokeWidth={1.5} className="text-warning-solid" />
        </div>
        <div className="flex-1">
          <p className="text-body font-medium text-warning-solid">{t("title")}</p>
          <p className="mt-1 text-body text-foreground">{t("description")}</p>
          <ul className="mt-2 space-y-1">
            {metadata.missingFields.map((field) => (
              <li key={field} className="text-body font-technical text-text-secondary">
                • {field}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
