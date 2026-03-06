"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  Settings,
  CreditCard,
  ChevronLeft,
  Menu,
  MessageSquare,
  Bot,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { ChatGroup } from "@/lib/types";

interface SidebarProps {
  chatGroups: ChatGroup[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onBellClick: () => void;
}

export function Sidebar({ chatGroups, currentChatId, onNewChat, onSelectChat, onBellClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const tGroups = useTranslations("ChatGroups");
  const { unreadCount } = useNotifications();

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot size={20} />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden"
          >
            <h1 className="whitespace-nowrap text-lg font-semibold">{t("appName")}</h1>
          </motion.div>
        )}
        <button
          onClick={onBellClick}
          className="ml-auto relative rounded-md p-1.5 hover:bg-sidebar-hover"
          title={t("alerts")}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1.5 hover:bg-sidebar-hover lg:flex"
        >
          <ChevronLeft
            size={18}
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
          className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-hover"
        >
          <MessageSquarePlus size={18} />
          {!collapsed && <span>{t("newChat")}</span>}
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!collapsed &&
          chatGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tGroups(group.label)}
              </p>
              {group.chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    setMobileOpen(false);
                  }}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    currentChatId === chat.id
                      ? "bg-sidebar-active font-medium text-primary"
                      : "hover:bg-sidebar-hover"
                  }`}
                >
                  <MessageSquare size={15} className="shrink-0 opacity-60" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          ))}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-1">
            {chatGroups.flatMap((g) =>
              g.chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                  className={`rounded-lg p-2 transition-colors ${
                    currentChatId === chat.id
                      ? "bg-sidebar-active text-primary"
                      : "hover:bg-sidebar-hover"
                  }`}
                >
                  <MessageSquare size={16} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-3">
        <nav className="flex flex-col gap-1">
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              pathname === "/pricing"
                ? "bg-sidebar-active font-medium text-primary"
                : "hover:bg-sidebar-hover"
            }`}
          >
            <CreditCard size={18} />
            {!collapsed && <span>{t("plans")}</span>}
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              pathname === "/settings"
                ? "bg-sidebar-active font-medium text-primary"
                : "hover:bg-sidebar-hover"
            }`}
          >
            <Settings size={18} />
            {!collapsed && <span>{t("settings")}</span>}
          </Link>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-hover"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{isDark ? t("lightMode") : t("darkMode")}</span>}
          </button>
          <LocaleSwitcher collapsed={collapsed} />
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-lg lg:hidden"
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
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 280 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden h-screen shrink-0 border-r border-sidebar-border lg:block"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
