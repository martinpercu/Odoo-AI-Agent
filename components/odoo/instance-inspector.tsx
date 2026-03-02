"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Package, CheckCircle2, XCircle } from "lucide-react";
import { inspectInstance, NETWORK_ERROR, type OdooModule } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import type { ConnectionStatus } from "@/lib/types";

export function InstanceInspector() {
  const t = useTranslations("Settings.inspector");
  const { config } = useOdooConfig();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [modules, setModules] = useState<OdooModule[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleInspect() {
    if (!config) return;

    setStatus("loading");
    setError(null);
    setModules([]);

    try {
      const result = await inspectInstance(config);

      if (result.success && result.modules) {
        setStatus("success");
        setModules(result.modules);
      } else {
        setStatus("error");
        setError(
          result.error === NETWORK_ERROR
            ? t("networkError")
            : result.error ?? t("errorGeneric")
        );
      }
    } catch {
      setStatus("error");
      setError(t("errorGeneric"));
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleInspect}
        disabled={status === "loading" || !config}
        className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Search size={16} />
        )}
        {t("buttonLabel")}
      </button>

      <AnimatePresence mode="wait">
        {status === "success" && modules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Package size={16} className="text-primary" />
                {t("modulesFound", { count: modules.length })}
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {modules.map((mod) => (
                  <div
                    key={mod.name}
                    className="flex items-start justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {mod.display_name || mod.name}
                      </p>
                      {mod.installed_version && (
                        <p className="text-muted-foreground">v{mod.installed_version}</p>
                      )}
                    </div>
                    {mod.state === "installed" && (
                      <CheckCircle2 size={14} className="text-success" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
