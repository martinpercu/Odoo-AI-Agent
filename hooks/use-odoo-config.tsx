"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { OdooConfigSummary } from "@/lib/types";
import { useSession } from "@/hooks/use-session";

interface OdooConfigContextType {
  configs: OdooConfigSummary[];
  activeConfig: OdooConfigSummary | null;
  activeConfigId: string | null;
  setActiveConfigId: (id: string) => void;
  isConfigured: boolean;
  isDemoMode: boolean;
  // Legacy compat: expose a minimal OdooConfig-like object for components
  // still reading url/db for display purposes (e.g. Settings form, Inspector)
  config: { url: string; db: string; login: string; apiKey: string } | null;
}

const OdooConfigContext = createContext<OdooConfigContextType | null>(null);

export function useOdooConfig() {
  const ctx = useContext(OdooConfigContext);
  if (!ctx) throw new Error("useOdooConfig must be used within OdooConfigProvider");
  return ctx;
}

export function OdooConfigProvider({ children }: { children: React.ReactNode }) {
  const { meData } = useSession();
  const configs = meData?.odoo_configs ?? [];

  // Persist the selected config_id in localStorage so it survives page refresh
  const [activeConfigId, setActiveConfigIdState] = useState<string | null>(null);

  // On mount / when configs load, restore or default to first active (or "demo" if none)
  useEffect(() => {
    if (configs.length === 0) {
      // No real configs — use demo mode
      setActiveConfigIdState("demo");
      return;
    }

    const stored = typeof window !== "undefined"
      ? localStorage.getItem("odoo_active_config_id")
      : null;

    if (stored && (stored === "demo" || configs.find((c) => c.id === stored))) {
      setActiveConfigIdState(stored);
    } else {
      const first = configs.find((c) => c.is_active) ?? configs[0];
      setActiveConfigIdState(first.id);
    }
  }, [configs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveConfigId = useCallback((id: string) => {
    setActiveConfigIdState(id);
    try { localStorage.setItem("odoo_active_config_id", id); } catch { /* ignore */ }
  }, []);

  const activeConfig = configs.find((c) => c.id === activeConfigId) ?? null;
  const isDemoMode = activeConfigId === "demo";
  const isConfigured = isDemoMode || activeConfig !== null;

  // Legacy compat shape (no apiKey — it lives only in the backend now)
  const config = activeConfig
    ? { url: activeConfig.url, db: activeConfig.db_name, login: activeConfig.username, apiKey: "" }
    : null;

  return (
    <OdooConfigContext.Provider value={{ configs, activeConfig, activeConfigId, setActiveConfigId, isConfigured, isDemoMode, config }}>
      {children}
    </OdooConfigContext.Provider>
  );
}
