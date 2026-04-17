"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  SquarePen,
  Settings,
  CreditCard,
  ChevronLeft,
  Menu,
  MessageSquare,
  Bot,
  Sun,
  Moon,
  Bell,
  LogOut,
  Shield,
  LogIn,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { InstanceSwitcher } from "@/components/chat/instance-switcher";
import { fetchMyConversations } from "@/lib/api";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import type { ChatGroup, ServerConversation } from "@/lib/types";

interface SidebarProps {
  chatGroups: ChatGroup[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onBellClick: () => void;
}

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const yesterday = new Date(today.getTime() - 86400000);

function groupServerConversations(conversations: ServerConversation[]): ChatGroup[] {
  const groups: Record<string, ServerConversation[]> = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.last_message_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() === today.getTime()) groups.today.push(conv);
    else if (day.getTime() === yesterday.getTime()) groups.yesterday.push(conv);
    else if (day.getTime() > today.getTime() - 86400000 * 7) groups.last7Days.push(conv);
    else groups.older.push(conv);
  }

  return (["today", "yesterday", "last7Days", "older"] as const)
    .filter((k) => groups[k].length > 0)
    .map((k) => ({
      label: k,
      chats: groups[k].map((c) => ({
        id: c.thread_id,
        title: c.title ?? "Nueva conversación",
        messages: [],
        createdAt: new Date(c.last_message_at),
        updatedAt: new Date(c.last_message_at),
      })),
    }));
}

export function Sidebar({ chatGroups, currentChatId, onNewChat, onSelectChat, onBellClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [pathname]);
  const t = useTranslations("Sidebar");
  const tGroups = useTranslations("ChatGroups");
  const { unreadCount } = useNotifications();
  const { user, logout } = useAuth();
  const { meData } = useSession();
  const settingsHref = user && !meData?.org ? "/onboarding" : "/settings";

  // Server-side conversation list (when auth is enabled)
  const [serverGroups, setServerGroups] = useState<ChatGroup[] | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadConversations = useCallback(async (offset: number) => {
    if (!IS_AUTH_ENABLED || !user) return;
    const result = await fetchMyConversations(50, offset);
    if (result.success && result.conversations) {
      const newGroups = groupServerConversations(result.conversations);
      setServerGroups((prev) => {
        if (offset === 0 || !prev) return newGroups;
        // Merge: append to existing groups
        const merged = [...prev];
        for (const ng of newGroups) {
          const existing = merged.find((g) => g.label === ng.label);
          if (existing) {
            existing.chats = [...existing.chats, ...ng.chats];
          } else {
            merged.push(ng);
          }
        }
        return merged;
      });
      setHasMore((result.count ?? 0) > offset + 50);
    }
  }, [user]);

  useEffect(() => {
    loadConversations(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadMore = useCallback(() => {
    const nextOffset = serverOffset + 50;
    setServerOffset(nextOffset);
    loadConversations(nextOffset);
  }, [serverOffset, loadConversations]);

  // Use server groups when available, otherwise fall back to local groups
  const displayGroups = serverGroups ?? chatGroups;

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
          <Bot size={20} strokeWidth={1.5} />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <h1 className="whitespace-nowrap text-subheading">{t("appName")}</h1>
          </motion.div>
        )}
        <button
          onClick={onBellClick}
          className="ml-auto relative rounded-md p-1.5 hover:bg-sidebar-hover"
          title={t("alerts")}
          aria-label={t("alerts")}
        >
          <Bell size={20} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1.5 hover:bg-sidebar-hover lg:flex"
          aria-label={collapsed ? t("expand") : t("collapse")}
        >
          <ChevronLeft
            size={20}
            strokeWidth={1.5}
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onNewChat();
            setMobileOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-md border border-sidebar-border px-3 py-2 text-body font-medium transition-colors hover:bg-sidebar-hover"
        >
          <SquarePen size={20} strokeWidth={1.5} />
          {!collapsed && <span>{t("newChat")}</span>}
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!collapsed &&
          displayGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 px-2 text-micro uppercase tracking-wide text-text-secondary">
                {tGroups(group.label)}
              </p>
              {group.chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    setMobileOpen(false);
                  }}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body transition-colors ${
                    currentChatId === chat.id
                      ? "bg-sidebar-active font-medium text-accent"
                      : "hover:bg-sidebar-hover"
                  }`}
                >
                  <MessageSquare size={16} strokeWidth={1.5} className="shrink-0 opacity-60" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          ))}

        {/* Load more button */}
        {!collapsed && hasMore && (
          <button
            onClick={loadMore}
            className="w-full rounded-md px-2.5 py-2 text-center text-small text-text-secondary hover:bg-sidebar-hover transition-colors"
          >
            {t("loadMore")}
          </button>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-1">
            {displayGroups.flatMap((g) =>
              g.chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                  aria-label={chat.title}
                  className={`rounded-md p-2 transition-colors ${
                    currentChatId === chat.id
                      ? "bg-sidebar-active text-accent"
                      : "hover:bg-sidebar-hover"
                  }`}
                >
                  <MessageSquare size={16} strokeWidth={1.5} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-3">
        <nav className="flex flex-col gap-1">
          {!user && (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors ${
                pathname === "/login"
                  ? "bg-sidebar-active font-medium text-accent"
                  : "hover:bg-sidebar-hover"
              }`}
            >
              <LogIn size={20} strokeWidth={1.5} />
              {!collapsed && <span>{t("login")}</span>}
            </Link>
          )}
          {meData?.user?.role !== "CLIENT_USER" && (
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors ${
                pathname === "/pricing"
                  ? "bg-sidebar-active font-medium text-accent"
                  : "hover:bg-sidebar-hover"
              }`}
            >
              <CreditCard size={20} strokeWidth={1.5} />
              {!collapsed && <span>{t("plans")}</span>}
            </Link>
          )}
          {user && (
            <Link
              href={settingsHref}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors ${
                pathname === "/settings" || pathname === "/onboarding"
                  ? "bg-sidebar-active font-medium text-accent"
                  : "hover:bg-sidebar-hover"
              }`}
            >
              <Settings size={20} strokeWidth={1.5} />
              {!collapsed && <span>{t("settings")}</span>}
            </Link>
          )}
          {meData?.user?.role === "SUPERADMIN" && (
            <Link
              href="/superadmin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors ${
                pathname === "/superadmin"
                  ? "bg-sidebar-active font-medium text-accent"
                  : "hover:bg-sidebar-hover"
              }`}
            >
              <Shield size={20} strokeWidth={1.5} />
              {!collapsed && <span>{t("superAdmin")}</span>}
            </Link>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors hover:bg-sidebar-hover"
            aria-label={isDark ? t("lightMode") : t("darkMode")}
          >
            {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            {!collapsed && <span>{isDark ? t("lightMode") : t("darkMode")}</span>}
          </button>
          <InstanceSwitcher collapsed={collapsed} />
          <LocaleSwitcher collapsed={collapsed} />
          {/* Logout — only shown when auth is enabled and user is logged in */}
          {IS_AUTH_ENABLED && user && (
            <button
              onClick={logout}
              className="flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors hover:bg-sidebar-hover text-text-secondary"
              title={t("logout")}
              aria-label={t("logout")}
            >
              <LogOut size={20} strokeWidth={1.5} />
              {!collapsed && <span>{t("logout")}</span>}
            </button>
          )}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-surface p-2 shadow-sm lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 280 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="hidden h-screen shrink-0 border-r border-sidebar-border lg:block"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
