"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { OdooConfigSummary, OdooConfigSummaryWithCreds, OdooCredentialSummary } from "@/lib/types";
import { useSession } from "@/hooks/use-session";
import { fetchAllMyCredentials } from "@/lib/api";

interface OdooConfigContextType {
  configs: OdooConfigSummaryWithCreds[];
  activeConfig: OdooConfigSummaryWithCreds | null;
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

function enrichConfigs(
  configs: OdooConfigSummary[],
  credentials: OdooCredentialSummary[]
): OdooConfigSummaryWithCreds[] {
  return configs.map((c) => {
    const cred = credentials.find((cr) => cr.config_id === c.id);
    return { ...c, hasCredentials: !!cred, odoo_username: cred?.odoo_username };
  });
}

export function OdooConfigProvider({ children }: { children: React.ReactNode }) {
  const { meData } = useSession();
  const rawConfigs = meData?.odoo_configs ?? [];

  const [credentials, setCredentials] = useState<OdooCredentialSummary[]>([]);
  const [activeConfigId, setActiveConfigIdState] = useState<string | null>(null);

  // Load credentials once when the user session is available
  useEffect(() => {
    if (!meData?.user) return;
    fetchAllMyCredentials().then((result) => {
      if (result.success && result.credentials) {
        setCredentials(result.credentials);

        // If the currently active config has no credentials but there is exactly
        // one config that does, auto-switch to it so the user is never stuck.
        setActiveConfigIdState((current) => {
          const creds = result.credentials!;
          const currentHasCreds = creds.some((cr) => cr.config_id === current);
          if (!currentHasCreds && creds.length === 1) {
            try { localStorage.setItem("odoo_active_config_id", creds[0].config_id); } catch { /* ignore */ }
            return creds[0].config_id;
          }
          return current;
        });
      }
    });
  }, [meData?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount / when configs load, restore or default to first active (or "demo" if none)
  useEffect(() => {
    if (rawConfigs.length === 0) {
      setActiveConfigIdState("demo");
      return;
    }

    const stored = typeof window !== "undefined"
      ? localStorage.getItem("odoo_active_config_id")
      : null;

    if (stored && (stored === "demo" || rawConfigs.find((c) => c.id === stored))) {
      setActiveConfigIdState(stored);
    } else {
      const first = rawConfigs.find((c) => c.is_active) ?? rawConfigs[0];
      setActiveConfigIdState(first.id);
    }
  }, [rawConfigs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveConfigId = useCallback((id: string) => {
    setActiveConfigIdState(id);
    try { localStorage.setItem("odoo_active_config_id", id); } catch { /* ignore */ }
  }, []);

  const configs = enrichConfigs(rawConfigs, credentials);
  const activeConfig = configs.find((c) => c.id === activeConfigId) ?? null;
  const isDemoMode = activeConfigId === "demo";
  const isConfigured = isDemoMode || activeConfig !== null;

  const config = activeConfig
    ? { url: activeConfig.url, db: activeConfig.db_name, login: activeConfig.odoo_username ?? "", apiKey: "" }
    : null;

  return (
    <OdooConfigContext.Provider value={{ configs, activeConfig, activeConfigId, setActiveConfigId, isConfigured, isDemoMode, config }}>
      {children}
    </OdooConfigContext.Provider>
  );
}
