"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BarChart3, FileUp, Package, FileText, Lock } from "lucide-react";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { inspectInstance } from "@/lib/api";

const SUGGESTION_KEYS = ["sales", "invoice", "inventory", "report"] as const;
const SUGGESTION_ICONS = [BarChart3, FileUp, Package, FileText];
const SUGGESTION_COLORS = [
  "text-success-solid",
  "text-warning-solid",
  "text-info",
  "text-accent",
];

/** Map suggestion keys to the Odoo module names they require. */
const MODULE_REQUIREMENTS: Record<string, string | null> = {
  sales: "sale",
  invoice: "account",
  inventory: "stock",
  report: null, // always available
};

interface WelcomeDashboardProps {
  onSend: (message: string) => void;
}

export function WelcomeDashboard({ onSend }: WelcomeDashboardProps) {
  const t = useTranslations("WelcomeDashboard");
  const { config } = useOdooConfig();
  const [installedModules, setInstalledModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!config) return;
    inspectInstance(config).then((result) => {
      if (result.success && result.modules) {
        const installed = new Set(
          result.modules
            .filter((m) => m.state === "installed")
            .map((m) => m.name)
        );
        setInstalledModules(installed);
      }
    });
  }, [config]);

  function isAvailable(key: string): boolean {
    const requiredModule = MODULE_REQUIREMENTS[key];
    if (!requiredModule) return true; // No module requirement
    if (!installedModules) return true; // Still loading, assume available
    return installedModules.has(requiredModule);
  }

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
          const available = isAvailable(key);
          return (
            <button
              key={key}
              onClick={() => available && onSend(text)}
              disabled={!available}
              className={`relative flex items-center gap-3 rounded-md border p-4 text-left text-body transition-all ${
                available
                  ? "border-border bg-surface hover:border-accent/30 hover:bg-raised hover:shadow-sm"
                  : "cursor-not-allowed border-border bg-raised/50 opacity-60"
              }`}
            >
              <Icon size={20} strokeWidth={1.5} className={available ? SUGGESTION_COLORS[i] : "text-text-secondary"} />
              <span>{text}</span>
              {!available && (
                <span className="ml-auto flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-micro font-medium text-text-secondary">
                  <Lock size={10} strokeWidth={1.5} />
                  {t("comingSoon")}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
