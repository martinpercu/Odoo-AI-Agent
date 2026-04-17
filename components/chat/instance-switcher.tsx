"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Server, ChevronDown, Check } from "lucide-react";
import { useOdooConfig } from "@/hooks/use-odoo-config";

interface InstanceSwitcherProps {
  collapsed?: boolean;
}

export function InstanceSwitcher({ collapsed = false }: InstanceSwitcherProps) {
  const t = useTranslations("InstanceSwitcher");
  const { configs, activeConfigId, setActiveConfigId } = useOdooConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const configsWithCreds = configs.filter((c) => c.hasCredentials);

  if (configsWithCreds.length <= 1) return null;

  const activeConfig = configs.find((c) => c.id === activeConfigId);

  function selectConfig(id: string) {
    setActiveConfigId(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors hover:bg-raised"
        aria-label={t("instances")}
      >
        <Server size={20} strokeWidth={1.5} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">
              {activeConfig?.label ?? t("instances")}
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full min-w-[180px] rounded-md border border-border bg-surface py-1 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-micro uppercase tracking-wide text-text-muted">
            {t("instances")}
          </p>
          {configsWithCreds.map((config) => (
            <button
              key={config.id}
              onClick={() => selectConfig(config.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-raised"
            >
              <span className="flex-1 truncate">
                {config.label}
                {config.odoo_username && (
                  <span className="block text-micro text-text-muted truncate">
                    {config.odoo_username}
                  </span>
                )}
              </span>
              {config.id === activeConfigId && (
                <Check size={14} strokeWidth={2} className="shrink-0 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
