"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquarePen,
  Menu,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { MarkB, Wordmark } from "@/components/AgentMark";
import { useIconSize } from "@/hooks/use-icon-size";
import { UserMenu } from "@/components/chat/user-menu";
import type { ChatGroup } from "@/lib/types";

interface SidebarProps {
  chatGroups: ChatGroup[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onDeleteChat: (id: string) => Promise<{ success: boolean }>;
}

export function Sidebar({ chatGroups, currentChatId, onNewChat, onSelectChat, onLoadMore, hasMore, onDeleteChat }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const t = useTranslations("Sidebar");
  const tGroups = useTranslations("ChatGroups");
  const iconBtn = useIconSize("button");
  const iconInline = useIconSize("inline");

  const displayGroups = chatGroups;

  async function handleDeleteChat(id: string) {
    setDeletingId(id);
    await onDeleteChat(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  const sidebarContent = (
    <div
      className={`flex h-full flex-col bg-sidebar text-sidebar-foreground ${collapsed ? "cursor-(--cursor-expand-right)" : ""}`}
      onClick={collapsed ? () => setCollapsed(false) : undefined}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-sidebar-border p-4 ${collapsed ? "justify-center" : ""}`}>
        {/* Logo — when collapsed: hover swaps MarkB → PanelLeftOpen, click opens sidebar */}
        <div
          className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white ${collapsed ? "cursor-pointer" : ""}`}
          onClick={collapsed ? (e) => { e.stopPropagation(); setCollapsed(false); } : undefined}
          role={collapsed ? "button" : undefined}
          tabIndex={collapsed ? 0 : undefined}
          aria-label={collapsed ? t("expand") : undefined}
          onKeyDown={collapsed ? (e) => { if (e.key === "Enter" || e.key === " ") setCollapsed(false); } : undefined}
        >
          <span className={`flex items-center justify-center ${collapsed ? "group-hover:hidden" : ""}`}>
            <MarkB size={22} fg="#FFFFFF" accent="#FFFFFF" odoo="#FFFFFF" />
          </span>
          {collapsed && (
            <PanelLeftOpen size={18} strokeWidth={1.5} className="absolute hidden text-white group-hover:block" />
          )}
        </div>

        {/* Wordmark — only when expanded */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="ml-3 overflow-hidden whitespace-nowrap"
          >
            <Wordmark scale={0.9} />
          </motion.div>
        )}

        {/* Collapse button — only when expanded; PanelLeft → PanelLeftClose on hover */}
        {!collapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
            className="group ml-auto hidden rounded-btn p-1.5 text-text-secondary transition-colors hover:bg-sidebar-hover hover:text-foreground lg:flex"
            aria-label={t("collapse")}
          >
            <PanelLeft size={iconBtn} strokeWidth={1.5} className="block group-hover:hidden" />
            <PanelLeftClose size={iconBtn} strokeWidth={1.5} className="hidden group-hover:block" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
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
                  onClick={(e) => { e.stopPropagation(); onSelectChat(chat.id); }}
                  title={chat.title}
                  aria-label={chat.title}
                  className={`rounded-btn p-2 transition-colors cursor-pointer ${
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

      {/* Bottom Navigation — consolidated user menu */}
      <div
        className="border-t border-sidebar-border p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <UserMenu collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
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
