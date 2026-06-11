"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { useIntro } from "@/hooks/use-intro";
import { useIconSize } from "@/hooks/use-icon-size";
import { track } from "@/lib/analytics";

interface Props {
  collapsed?: boolean;
  /** Called after opening the panel — used to close the mobile sidebar. */
  onOpened?: () => void;
  /** Override the button styling to match the surrounding menu context. */
  className?: string;
}

/** Surface B entry point — "¿Qué es TheOdooAgent?" in the sidebar. */
export function IntroSidebarItem({ collapsed = false, onOpened, className }: Props) {
  const t = useTranslations("Intro");
  const { openPanel } = useIntro();
  const iconInline = useIconSize("inline");

  function handleClick() {
    track("info_opened_from_panel", { source: "sidebar" });
    openPanel();
    onOpened?.();
  }

  return (
    <button
      onClick={handleClick}
      title={collapsed ? t("sidebarItem") : undefined}
      aria-label={t("sidebarItem")}
      className={
        className ??
        `flex h-btn-md w-full items-center gap-3 rounded-btn px-3 text-body text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-foreground ${
          collapsed ? "justify-center" : ""
        }`
      }
    >
      <Info size={iconInline} strokeWidth={1.5} className="shrink-0" />
      {!collapsed && <span className="truncate">{t("sidebarItem")}</span>}
    </button>
  );
}
