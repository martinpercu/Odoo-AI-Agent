"use client";

import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { useIntro } from "@/hooks/use-intro";
import { useIconSize } from "@/hooks/use-icon-size";

interface Props {
  collapsed?: boolean;
  onOpened?: () => void;
  className?: string;
}

export function HowItWorksSidebarItem({ collapsed = false, onOpened, className }: Props) {
  const t = useTranslations("HowItWorks");
  const { openHowItWorksPanel } = useIntro();
  const iconInline = useIconSize("inline");

  function handleClick() {
    openHowItWorksPanel();
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
      <HelpCircle size={iconInline} strokeWidth={1.5} className="shrink-0" />
      {!collapsed && <span className="truncate">{t("sidebarItem")}</span>}
    </button>
  );
}
