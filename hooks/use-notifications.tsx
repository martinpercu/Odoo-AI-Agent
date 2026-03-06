"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { AppNotification, NotificationSettings } from "@/lib/types";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import {
  fetchNotifications as apiFetchNotifications,
  markNotificationRead as apiMarkRead,
  fetchNotificationSettings as apiFetchSettings,
  updateNotificationSettings as apiUpdateSettings,
} from "@/lib/api";
import { useToast } from "@/components/ui/error-toast";

const POLL_INTERVAL = 30_000;

interface NotificationsContextType {
  notifications: AppNotification[];
  settings: NotificationSettings;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  updateSettings: (settings: NotificationSettings) => Promise<boolean>;
  loadSettings: () => Promise<void>;
}

const defaultSettings: NotificationSettings = {
  salesAlerts: true,
  stockAlerts: true,
  invoiceAlerts: true,
  dailySummary: false,
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const { config } = useOdooConfig();
  const { showError } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Polling ----
  const poll = useCallback(async () => {
    if (!config) return;
    const result = await apiFetchNotifications(config);
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;
    // Initial fetch
    poll();
    // Set up polling
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, poll]);

  // ---- Mark as read (optimistic) ----
  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      apiMarkRead(id).then((result) => {
        if (!result.success) {
          // Rollback
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n))
          );
          showError(result.error || "Failed to mark notification as read");
        }
      });
    },
    [showError]
  );

  // ---- Mark all as read ----
  const markAllAsRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Fire individual PATCH calls
    unread.forEach((n) => {
      apiMarkRead(n.id);
    });
  }, [notifications]);

  // ---- Dismiss (local only) ----
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ---- Settings ----
  const loadSettings = useCallback(async () => {
    if (!config) return;
    const result = await apiFetchSettings(config);
    if (result.success && result.settings) {
      setSettings(result.settings);
    }
  }, [config]);

  const updateSettingsFn = useCallback(
    async (newSettings: NotificationSettings): Promise<boolean> => {
      if (!config) return false;
      const snapshot = settings;
      setSettings(newSettings);
      const result = await apiUpdateSettings(config, newSettings);
      if (!result.success) {
        setSettings(snapshot);
        showError(result.error || "Failed to update settings");
        return false;
      }
      return true;
    },
    [config, settings, showError]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        settings,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dismiss,
        updateSettings: updateSettingsFn,
        loadSettings,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
