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
  "text-emerald-500",
  "text-amber-500",
  "text-blue-500",
  "text-purple-500",
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <h3 className="text-xl font-semibold">{t("heading")}</h3>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
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
              className={`relative flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all ${
                available
                  ? "border-border bg-card hover:border-primary/30 hover:bg-muted hover:shadow-sm"
                  : "cursor-not-allowed border-border/50 bg-muted/50 opacity-60"
              }`}
            >
              <Icon size={18} className={available ? SUGGESTION_COLORS[i] : "text-muted-foreground"} />
              <span>{text}</span>
              {!available && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Lock size={10} />
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
