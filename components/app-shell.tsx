"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Sidebar } from "@/components/chat/sidebar";
import { PinnedSidebar } from "@/components/pinned/pinned-sidebar";
import { FlyingPinPortal } from "@/components/pinned/flying-pin-animation";
import { useChat } from "@/hooks/use-chat";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

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
  const chat = useChat(chatIdFromUrl, user?.id);

  useEffect(() => {
    if (!user) {
      chat.clearChats();
    } else {
      chat.loadServerConversations(0);
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

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <ChatContext.Provider value={chat}>
      <RightPanelContext.Provider value={{ activeTab, setActiveTab }}>
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
        </div>
      </RightPanelContext.Provider>
    </ChatContext.Provider>
  );
}
