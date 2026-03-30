"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { AppNotification } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchNotifications as apiFetchNotifications,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
} from "@/lib/api";
import { useToast } from "@/components/ui/error-toast";

const POLL_INTERVAL = 30_000;

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const { user } = useAuth();
  const { showError } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Polling — scoped to the active chat ----
  const poll = useCallback(async () => {
    if (!user || !activeChatId) return;
    const result = await apiFetchNotifications(activeChatId, { unreadOnly: false, limit: 50 });
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
  }, [user, activeChatId]);

  useEffect(() => {
    if (!user || !activeChatId) {
      setNotifications([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, activeChatId, poll]);

  // ---- Mark as read (optimistic) ----
  const markAsRead = useCallback(
    (id: string) => {
      if (!activeChatId) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      apiMarkRead(activeChatId, id).then((result) => {
        if (!result.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n))
          );
          showError(result.error || "Failed to mark notification as read");
        }
      });
    },
    [activeChatId, showError]
  );

  // ---- Mark all as read ----
  const markAllAsRead = useCallback(() => {
    if (!activeChatId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiMarkAllRead(activeChatId).then((result) => {
      if (!result.success) {
        showError(result.error || "Failed to mark all as read");
        poll(); // re-fetch to restore real state
      }
    });
  }, [activeChatId, showError, poll]);

  // ---- Dismiss (local only) ----
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        activeChatId,
        setActiveChatId,
        markAsRead,
        markAllAsRead,
        dismiss,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
