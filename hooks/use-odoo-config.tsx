"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { OdooConfig } from "@/lib/types";

const STORAGE_KEY = "odoo_config";

interface OdooConfigContextType {
  config: OdooConfig | null;
  isConfigured: boolean;
  saveConfig: (config: OdooConfig) => void;
  clearConfig: () => void;
}

const OdooConfigContext = createContext<OdooConfigContextType | null>(null);

export function useOdooConfig() {
  const ctx = useContext(OdooConfigContext);
  if (!ctx) throw new Error("useOdooConfig must be used within OdooConfigProvider");
  return ctx;
}

export function OdooConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OdooConfig | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch {
      // Invalid JSON or localStorage unavailable
    }
  }, []);

  const saveConfig = useCallback((newConfig: OdooConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clearConfig = useCallback(() => {
    setConfig(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const isConfigured =
    config !== null &&
    config.url.length > 0 &&
    config.db.length > 0 &&
    config.login.length > 0 &&
    config.apiKey.length > 0;

  return (
    <OdooConfigContext.Provider value={{ config, isConfigured, saveConfig, clearConfig }}>
      {children}
    </OdooConfigContext.Provider>
  );
}
