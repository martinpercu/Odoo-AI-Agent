"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PanelRightClose, Trash2, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useNotifications } from "@/hooks/use-notifications";
import { useRightPanel } from "@/components/app-shell";
import { useChatContext } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { usePathname } from "@/i18n/navigation";
import { PinnedInsightMiniCard } from "@/components/pinned/pinned-insight-mini-card";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { useRouter } from "@/i18n/navigation";
import type { AppNotification, PinnedChart, PinnedInsight } from "@/lib/types";

function isLivePin(pin: PinnedInsight): boolean {
  if (pin.kind !== "chart") return false;
  const volatility = (pin as PinnedChart).query_context?.volatility ?? "variable";
  return volatility === "variable";
}

export function PinnedSidebar() {
  const [collapsed, setCollapsedState] = useState(true);
  const tPins = useTranslations("PinnedInsights");
  const tNotif = useTranslations("Notifications");
  const { pins, clearAll } = usePinnedInsights();
  const { unreadCount, markAsRead } = useNotifications();
  const { activeTab, setActiveTab } = useRightPanel();
  const { sendMessage, createChat, currentChatId } = useChatContext();
  const { user } = useAuth();
  const { meData } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);

  function setCollapsed(v: boolean) {
    setCollapsedState(v);
  }

  function handleNotificationClick(notification: AppNotification) {
    markAsRead(notification.id);
    setActiveTab("pins");
    setCollapsed(true);

    if (currentChatId) {
      sendMessage(notification.chatPrompt);
    } else {
      const id = createChat(notification.title);
      router.push(`/chat/${id}`);
      sendMessage(notification.chatPrompt, id);
    }
  }

  const isOnChat = pathname.startsWith("/chat");
  if (!user || !meData?.org || !isOnChat) return null;

  // Split pins into live (variable) and saved (static + files + excel)
  const livePins = pins.filter(isLivePin);
  const savedPins = pins.filter((p) => !isLivePin(p));

  // Collapsed state
  if (collapsed) {
    return (
      <motion.aside
        animate={{ width: 48 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="hidden h-screen shrink-0 border-l border-sidebar-border bg-sidebar lg:flex lg:flex-col"
      >
        <div className="flex flex-col items-center gap-2 pt-3">
          <button
            onClick={() => { setActiveTab("pins"); setCollapsed(false); }}
            className="relative rounded-md p-2 text-text-secondary transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={tPins("title")}
            aria-label={tPins("title")}
          >
            <Pin size={20} strokeWidth={1.5} />
            {pins.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                {pins.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("alerts"); setCollapsed(false); }}
            className="relative rounded-md p-2 text-text-secondary transition-colors hover:bg-sidebar-active hover:text-foreground"
            title={tNotif("title")}
            aria-label={tNotif("title")}
          >
            <Bell size={20} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
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
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hidden h-screen shrink-0 overflow-hidden border-l border-sidebar-border bg-sidebar lg:flex lg:flex-col"
    >
      {/* Header */}
      <div ref={headerRef} className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        {activeTab === "pins" ? (
          <Pin size={16} strokeWidth={1.5} className="shrink-0 text-accent" />
        ) : (
          <Bell size={16} strokeWidth={1.5} className="shrink-0 text-error" />
        )}
        <span className="flex-1 truncate text-body font-semibold text-foreground">
          {activeTab === "pins" ? tPins("title") : tNotif("title")}
        </span>
        {activeTab === "pins" && pins.length > 0 && (
          <>
            <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-micro font-medium text-accent">
              {pins.length}
            </span>
            <button
              onClick={() => clearAll()}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-error-subtle hover:text-error"
              title={tPins("clearAll")}
              aria-label={tPins("clearAll")}
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </>
        )}
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-sidebar-active hover:text-foreground"
          aria-label="Collapse panel"
        >
          <PanelRightClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-sidebar-border">
        <button
          onClick={() => setActiveTab("pins")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-small font-medium transition-colors ${
            activeTab === "pins"
              ? "border-b-2 border-accent text-accent"
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Pin size={12} strokeWidth={1.5} />
          {tPins("title")}
          {pins.length > 0 && (
            <span className="rounded-md bg-accent-subtle px-1.5 text-micro font-medium text-accent">
              {pins.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-small font-medium transition-colors ${
            activeTab === "alerts"
              ? "border-b-2 border-accent text-accent"
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Bell size={12} strokeWidth={1.5} />
          {tNotif("title")}
          {unreadCount > 0 && (
            <span className="rounded-md bg-error-subtle px-1.5 text-micro font-medium text-error">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === "pins" ? (
        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <Pin size={32} strokeWidth={1.5} className="mb-3 text-text-muted" />
              <p className="text-body font-medium text-text-secondary">{tPins("empty")}</p>
              <p className="mt-1 text-small text-text-muted">{tPins("emptyHint")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* En vivo — variable charts */}
              {livePins.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-solid" />
                    <span className="text-micro font-medium uppercase tracking-wide text-text-secondary">
                      {tPins("liveSection")}
                    </span>
                    <span className="ml-auto rounded-md bg-accent-subtle px-1.5 text-micro font-medium text-accent">
                      {livePins.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <AnimatePresence mode="popLayout">
                      {livePins.map((pin) => (
                        <PinnedInsightMiniCard key={pin.id} pin={pin} />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Guardados — static charts + files + excel */}
              {savedPins.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-micro font-medium uppercase tracking-wide text-text-muted">
                      {tPins("savedSection")}
                    </span>
                    <span className="ml-auto rounded-md bg-raised px-1.5 text-micro font-medium text-text-secondary">
                      {savedPins.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Static charts in 2-col grid */}
                    {(() => {
                      const staticCharts = savedPins.filter((p) => p.kind === "chart");
                      const docs = savedPins.filter((p) => p.kind !== "chart");
                      return (
                        <>
                          {staticCharts.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              <AnimatePresence mode="popLayout">
                                {staticCharts.map((pin) => (
                                  <PinnedInsightMiniCard key={pin.id} pin={pin} />
                                ))}
                              </AnimatePresence>
                            </div>
                          )}
                          <AnimatePresence mode="popLayout">
                            {docs.map((pin) => (
                              <PinnedInsightMiniCard key={pin.id} pin={pin} />
                            ))}
                          </AnimatePresence>
                        </>
                      );
                    })()}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        <NotificationFeed onNotificationClick={handleNotificationClick} />
      )}
    </motion.aside>
  );
}

export { PinnedSidebar as default };
