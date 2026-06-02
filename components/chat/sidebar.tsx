"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquarePen,
  Settings,
  CreditCard,
  ChevronLeft,
  Menu,
  MessageSquare,
  Sun,
  Moon,
  Bell,
  LogOut,
  Shield,
  LogIn,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { MarkB, Wordmark } from "@/components/AgentMark";
import { PoweredBy } from "@/components/ui/powered-by";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useIconSize } from "@/hooks/use-icon-size";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { InstanceSwitcher } from "@/components/chat/instance-switcher";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import type { ChatGroup } from "@/lib/types";

interface SidebarProps {
  chatGroups: ChatGroup[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onBellClick: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onDeleteChat: (id: string) => Promise<{ success: boolean }>;
}

export function Sidebar({ chatGroups, currentChatId, onNewChat, onSelectChat, onBellClick, onLoadMore, hasMore, onDeleteChat }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [pathname]);
  const t = useTranslations("Sidebar");
  const tGroups = useTranslations("ChatGroups");
  const { unreadCount } = useNotifications();
  const { user, logout } = useAuth();
  const { meData } = useSession();
  const iconBtn = useIconSize("button");
  const iconInline = useIconSize("inline");
  const settingsHref = user && !meData?.org ? "/onboarding" : "/settings";

  const displayGroups = chatGroups;

  async function handleDeleteChat(id: string) {
    setDeletingId(id);
    await onDeleteChat(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

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
          <MarkB size={22} fg="#FFFFFF" accent="#FFFFFF" odoo="#FFFFFF" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            <Wordmark scale={0.9} />
          </motion.div>
        )}
        <button
          onClick={onBellClick}
          className="ml-auto relative rounded-md p-1.5 hover:bg-sidebar-hover"
          title={t("alerts")}
          aria-label={t("alerts")}
        >
          <Bell size={iconBtn} strokeWidth={1.5} />
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
            size={iconBtn}
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
          className="flex h-btn-md w-full items-center gap-3 rounded-btn border border-sidebar-border px-3 text-body font-medium transition-colors hover:bg-sidebar-hover"
        >
          <SquarePen size={iconBtn} strokeWidth={1.5} />
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
                <div key={chat.id} className="group/chat mb-0.5 relative">
                  {confirmDeleteId === chat.id ? (
                    <div className="flex items-center gap-1.5 rounded-md px-2.5 py-2 bg-error-subtle">
                      <AlertTriangle size={13} strokeWidth={1.5} className="shrink-0 text-error" />
                      <span className="text-small text-error flex-1">{t("confirmDeleteChat")}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteChat(chat.id)}
                        disabled={deletingId === chat.id}
                        className="rounded px-2 py-0.5 text-small bg-error text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {deletingId === chat.id
                          ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                          : t("yes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded px-2 py-0.5 text-small border border-border hover:bg-raised"
                      >
                        {t("no")}
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-body transition-colors cursor-pointer ${
                        currentChatId === chat.id
                          ? "bg-sidebar-active font-medium text-accent"
                          : "hover:bg-sidebar-hover"
                      }`}
                      onClick={() => { onSelectChat(chat.id); setMobileOpen(false); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { onSelectChat(chat.id); setMobileOpen(false); } }}
                    >
                      <MessageSquare size={iconInline} strokeWidth={1.5} className="shrink-0 opacity-60" />
                      <span className="truncate flex-1 text-left">{chat.title || t("newConversation")}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(chat.id); }}
                        className="shrink-0 rounded p-1 opacity-0 group-hover/chat:opacity-100 text-text-secondary hover:text-error hover:bg-error-subtle transition-all"
                        aria-label={t("deleteChat")}
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

        {/* Load more button */}
        {!collapsed && hasMore && (
          <button
            onClick={onLoadMore}
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
                  <MessageSquare size={iconInline} strokeWidth={1.5} />
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
              <LogIn size={iconBtn} strokeWidth={1.5} />
              {!collapsed && <span>{t("login")}</span>}
            </Link>
          )}
          {/* {meData?.user?.role !== "CLIENT_USER" && (
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors ${
                pathname === "/pricing"
                  ? "bg-sidebar-active font-medium text-accent"
                  : "hover:bg-sidebar-hover"
              }`}
            >
              <CreditCard size={iconBtn} strokeWidth={1.5} />
              {!collapsed && <span>{t("plans")}</span>}
            </Link>
          )} */}
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
              <Settings size={iconBtn} strokeWidth={1.5} />
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
              <Shield size={iconBtn} strokeWidth={1.5} />
              {!collapsed && <span>{t("superAdmin")}</span>}
            </Link>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-md px-2.5 py-2 text-body transition-colors hover:bg-sidebar-hover"
            aria-label={isDark ? t("lightMode") : t("darkMode")}
          >
            {isDark ? <Sun size={iconBtn} strokeWidth={1.5} /> : <Moon size={iconBtn} strokeWidth={1.5} />}
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
              <LogOut size={iconBtn} strokeWidth={1.5} />
              {!collapsed && <span>{t("logout")}</span>}
            </button>
          )}
        </nav>
        {/* Powered by — Client only (Builder ya tiene la marca prominente arriba) */}
        {meData?.user?.role !== "ADMIN" && meData?.user?.role !== "SUPERADMIN" && !collapsed && (
          <div className="mt-3 border-t border-sidebar-border pt-3 flex justify-center">
            <PoweredBy />
          </div>
        )}
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
        <Menu size={iconBtn} />
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
