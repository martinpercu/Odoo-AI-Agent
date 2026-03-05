"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationErrorMetadata } from "@/lib/types";

interface ValidationPromptProps {
  metadata: ValidationErrorMetadata;
}

export function ValidationPrompt({ metadata }: ValidationPromptProps) {
  const t = useTranslations("ChatMessages.validation");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-2 rounded-xl border border-warning/20 bg-warning/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
          <AlertCircle size={18} className="text-warning" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-warning">{t("title")}</p>
          <p className="mt-1 text-sm text-foreground">{t("description")}</p>
          <ul className="mt-2 space-y-1">
            {metadata.missingFields.map((field) => (
              <li key={field} className="text-sm text-muted-foreground">
                • {field}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
