"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BarChart3, FileUp, Package, FileText } from "lucide-react";

const SUGGESTION_KEYS = ["sales", "invoice", "inventory", "report"] as const;
const SUGGESTION_ICONS = [BarChart3, FileUp, Package, FileText];
const SUGGESTION_COLORS = [
  "text-success-solid",
  "text-warning-solid",
  "text-info",
  "text-accent",
];

interface WelcomeDashboardProps {
  onSend: (message: string) => void;
}

export function WelcomeDashboard({ onSend }: WelcomeDashboardProps) {
  const t = useTranslations("WelcomeDashboard");

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mb-8 text-center"
      >
        <h3 className="text-heading">{t("heading")}</h3>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut", delay: 0.05 }}
        className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {SUGGESTION_KEYS.map((key, i) => {
          const Icon = SUGGESTION_ICONS[i];
          const text = t(`suggestions.${key}`);
          return (
            <button
              key={key}
              onClick={() => onSend(text)}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-left text-body transition-all hover:border-accent/30 hover:bg-raised hover:shadow-sm"
            >
              <Icon size={20} strokeWidth={1.5} className={SUGGESTION_COLORS[i]} />
              <span>{text}</span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
