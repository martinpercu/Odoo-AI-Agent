"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Sidebar } from "@/components/chat/sidebar";
import { PinnedSidebar } from "@/components/pinned/pinned-sidebar";
import { FlyingPinPortal } from "@/components/pinned/flying-pin-animation";
import { LangGraphTracePanel, type TraceEntry } from "@/components/chat/langgraph-trace-panel";
import { useChat } from "@/hooks/use-chat";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { IntroProvider } from "@/hooks/use-intro";
import { IntroModal } from "@/components/intro/intro-modal";
import { IntroPanel } from "@/components/intro/intro-panel";
import { captureUtm } from "@/lib/analytics";

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within AppShell");
  return ctx;
}

export type RightPanelTab = "pins" | "alerts";

interface RightPanelContextType {
  activeTab: RightPanelTab;
  setActiveTab: (tab: RightPanelTab) => void;
}

const RightPanelContext = createContext<RightPanelContextType | null>(null);

export function useRightPanel() {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error("useRightPanel must be used within AppShell");
  return ctx;
}

function isShelllessPath(pathname: string) {
  // next-intl's usePathname already strips the locale prefix (e.g. returns /invite, not /es/invite)
  return pathname.startsWith("/invite");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<RightPanelTab>("pins");

  const isPublic = isShelllessPath(pathname);

  // Extract chat ID from pathname if on a chat/[id] page
  const chatIdMatch = pathname.match(/^\/chat\/(.+)$/);
  const chatIdFromUrl = chatIdMatch ? chatIdMatch[1] : undefined;

  const { user } = useAuth();
  const { meData } = useSession();
  const chat = useChat(chatIdFromUrl, user?.id);
  const { loadAllPins } = usePinnedInsights();
  const isBuilder = meData?.user?.role === "ADMIN" || meData?.user?.role === "SUPERADMIN";

  // Stub LangGraph trace — TODO: replace with real SSE `trace` event when backend exposes it.
  // Pushes a synthetic entry on each isStreaming transition so Builder can validate the panel.
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const prevStreamingRef = useRef(chat.isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current === chat.isStreaming) return;
    const ts = new Date().toTimeString().slice(0, 8);
    if (chat.isStreaming) {
      setTraceEntries((prev) => [
        ...prev,
        { ts, level: "info", node: "stream:start", message: `chat=${chat.currentChatId ?? "new"}` },
      ]);
    } else if (prevStreamingRef.current) {
      setTraceEntries((prev) => [
        ...prev,
        { ts, level: "ok", node: "stream:end", message: "completed" },
      ]);
    }
    prevStreamingRef.current = chat.isStreaming;
  }, [chat.isStreaming, chat.currentChatId]);

  useEffect(() => {
    if (!user) {
      chat.clearChats();
    } else {
      chat.loadServerConversations(0);
      loadAllPins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handleNewChat() {
    chat.setCurrentChatId(undefined);
    router.push("/chat");
  }

  function handleSelectChat(id: string) {
    chat.setCurrentChatId(id);
    router.push(`/chat/${id}`);
  }

  const handleBellClick = useCallback(() => {
    setActiveTab("alerts");
  }, []);

  // Capture utm_* from the landing URL once, to associate with a later signup.
  useEffect(() => {
    captureUtm();
  }, []);

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <ChatContext.Provider value={chat}>
      <RightPanelContext.Provider value={{ activeTab, setActiveTab }}>
        <IntroProvider>
          <div className="flex h-screen overflow-hidden bg-base">
            <Sidebar
              chatGroups={chat.chatGroups}
              currentChatId={chat.currentChatId}
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
              onBellClick={handleBellClick}
              onLoadMore={chat.loadMoreConversations}
              hasMore={chat.hasMore}
              onDeleteChat={chat.deleteChat}
            />
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
            <PinnedSidebar />
            <FlyingPinPortal />
            {isBuilder && <LangGraphTracePanel entries={traceEntries} />}
          </div>
          <IntroModal />
          <IntroPanel />
        </IntroProvider>
      </RightPanelContext.Provider>
    </ChatContext.Provider>
  );
}
