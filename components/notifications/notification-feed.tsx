"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Bell, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationCard } from "./notification-card";
import { NotificationSettingsModal } from "./notification-settings-modal";
import type { AppNotification } from "@/lib/types";

interface NotificationFeedProps {
  onNotificationClick: (notification: AppNotification) => void;
}

export function NotificationFeed({ onNotificationClick }: NotificationFeedProps) {
  const t = useTranslations("Notifications");
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-3 py-2">
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] text-primary hover:underline"
          >
            {t("markAllRead")}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-active hover:text-foreground"
          title={t("settingsTitle")}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Bell size={32} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">{t("empty")}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onClick={onNotificationClick}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <NotificationSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
