"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PanelRightClose, Trash2, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useNotifications } from "@/hooks/use-notifications";
import { useRightPanel } from "@/components/app-shell";
import { useChatContext } from "@/components/app-shell";
import { PinnedInsightMiniCard } from "@/components/pinned/pinned-insight-mini-card";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { useRouter } from "@/i18n/navigation";
import type { AppNotification } from "@/lib/types";

export function PinnedSidebar() {
  const [collapsed, setCollapsedState] = useState(true);
  const tPins = useTranslations("PinnedInsights");
  const tNotif = useTranslations("Notifications");
  const { pins, clearAll } = usePinnedInsights();
  const { unreadCount, markAsRead } = useNotifications();
  const { activeTab, setActiveTab } = useRightPanel();
  const { sendMessage, createChat, currentChatId } = useChatContext();
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);

  function setCollapsed(v: boolean) {
    setCollapsedState(v);
  }

  function handleNotificationClick(notification: AppNotification) {
    markAsRead(notification.id);
    setActiveTab("pins");
    setCollapsed(true);

    // Deep link: inject the chatPrompt into a chat
    if (currentChatId) {
      sendMessage(notification.chatPrompt);
    } else {
      const id = createChat(notification.title);
      router.push(`/chat/${id}`);
      sendMessage(notification.chatPrompt, id);
    }
  }

  // Collapsed state
  if (collapsed) {
    const hasBadge = pins.length > 0 || unreadCount > 0;
    return (
      <motion.aside
        animate={{ width: 48 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden h-screen shrink-0 border-l border-sidebar-border bg-sidebar lg:flex lg:flex-col"
      >
        <div className="flex flex-col items-center gap-2 pt-3">
          <button
            onClick={() => { setActiveTab("pins"); setCollapsed(false); }}
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={tPins("title")}
          >
            <Pin size={18} />
            {pins.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-odoo-purple text-[9px] font-bold text-white">
                {pins.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("alerts"); setCollapsed(false); }}
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={tNotif("title")}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      animate={{ width: 320 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="hidden h-screen shrink-0 overflow-hidden border-l border-sidebar-border bg-sidebar lg:flex lg:flex-col"
    >
      {/* Header */}
      <div ref={headerRef} className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        {activeTab === "pins" ? (
          <Pin size={16} className="shrink-0 text-odoo-purple" />
        ) : (
          <Bell size={16} className="shrink-0 text-red-500" />
        )}
        <span className="flex-1 truncate text-sm font-semibold text-foreground">
          {activeTab === "pins" ? tPins("title") : tNotif("title")}
        </span>
        {activeTab === "pins" && pins.length > 0 && (
          <>
            <span className="rounded-full bg-odoo-purple/10 px-2 py-0.5 text-[11px] font-medium text-odoo-purple">
              {pins.length}
            </span>
            <button
              onClick={() => clearAll()}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title={tPins("clearAll")}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-sidebar-border">
        <button
          onClick={() => setActiveTab("pins")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "pins"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pin size={12} />
          {tPins("title")}
          {pins.length > 0 && (
            <span className="rounded-full bg-odoo-purple/10 px-1.5 text-[10px] font-medium text-odoo-purple">
              {pins.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "alerts"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell size={12} />
          {tNotif("title")}
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500/10 px-1.5 text-[10px] font-medium text-red-500">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === "pins" ? (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <Pin size={32} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">{tPins("empty")}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{tPins("emptyHint")}</p>
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
      ) : (
        <NotificationFeed onNotificationClick={handleNotificationClick} />
      )}
    </motion.aside>
  );
}

/** Ref to sidebar header for flying animation target */
export { PinnedSidebar as default };
