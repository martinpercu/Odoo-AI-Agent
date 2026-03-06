"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { PinnedInsightMiniCard } from "@/components/pinned/pinned-insight-mini-card";

export function PinnedSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const t = useTranslations("PinnedInsights");
  const { pins, clearAll } = usePinnedInsights();
  const headerRef = useRef<HTMLDivElement>(null);

  // Don't render on desktop if no pins and collapsed
  if (pins.length === 0 && collapsed) {
    return (
      <motion.aside
        animate={{ width: 48 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden h-screen shrink-0 border-l border-sidebar-border bg-sidebar lg:block"
      >
        <div className="flex h-14 items-center justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={t("title")}
          >
            <Pin size={18} />
          </button>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 320 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="hidden h-screen shrink-0 overflow-hidden border-l border-sidebar-border bg-sidebar lg:flex lg:flex-col"
    >
      {/* Header */}
      <div ref={headerRef} className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={t("title")}
          >
            <div className="relative">
              <Pin size={18} />
              {pins.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-odoo-purple text-[9px] font-bold text-white">
                  {pins.length}
                </span>
              )}
            </div>
          </button>
        ) : (
          <>
            <Pin size={16} className="shrink-0 text-odoo-purple" />
            <span className="flex-1 truncate text-sm font-semibold text-foreground">
              {t("title")}
            </span>
            {pins.length > 0 && (
              <span className="rounded-full bg-odoo-purple/10 px-2 py-0.5 text-[11px] font-medium text-odoo-purple">
                {pins.length}
              </span>
            )}
            {pins.length > 0 && (
              <button
                onClick={() => clearAll()}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title={t("clearAll")}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
            >
              <PanelRightClose size={16} />
            </button>
          </>
        )}
      </div>

      {/* Content - only show when expanded */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <Pin size={32} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">{t("empty")}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{t("emptyHint")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {pins.map((pin) => (
                  <PinnedInsightMiniCard key={pin.id} pin={pin} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  );
}

/** Ref to sidebar header for flying animation target */
export { PinnedSidebar as default };
