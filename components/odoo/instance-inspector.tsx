"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { inspectInstance, inspectSavedOdooConfig, NETWORK_ERROR, type OdooModule } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";
import type { ConnectionStatus } from "@/lib/types";

export function InstanceInspector() {
  const t = useTranslations("Settings.inspector");
  const { config, activeConfig } = useOdooConfig();
  const { meData } = useSession();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [modules, setModules] = useState<OdooModule[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleInspect() {
    if (!config) return;

    setStatus("loading");
    setError(null);
    setModules([]);

    try {
      const orgId = meData?.org?.id;
      const result =
        orgId && activeConfig
          ? await inspectSavedOdooConfig(orgId, activeConfig.id)
          : await inspectInstance(config);

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
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-body font-medium transition-colors hover:bg-raised disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
        ) : (
          <Search size={16} strokeWidth={1.5} />
        )}
        {t("buttonLabel")}
      </button>

      <AnimatePresence mode="wait">
        {status === "success" && modules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 flex items-center gap-2 text-body font-semibold">
                <Package size={16} strokeWidth={1.5} className="text-accent" />
                {t("modulesFound", { count: modules.length })}
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {modules.map((mod) => (
                  <div
                    key={mod.name}
                    className="flex items-start justify-between rounded-md border border-border bg-raised/50 px-3 py-2 text-small"
                  >
                    <div className="flex-1">
                      <p className="font-technical font-medium text-foreground">
                        {mod.display_name || mod.name}
                      </p>
                      {mod.installed_version && (
                        <p className="font-technical text-text-muted">v{mod.installed_version}</p>
                      )}
                    </div>
                    {mod.state === "installed" && (
                      <CheckCircle2 size={14} strokeWidth={1.5} className="text-success-solid" />
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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-md bg-error-subtle px-4 py-3 text-body text-error">
              <AlertTriangle size={16} strokeWidth={1.5} />
              <span className="font-technical">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
