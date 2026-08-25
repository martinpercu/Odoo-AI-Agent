"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Sidebar } from "@/components/chat/sidebar";
import { PinnedSidebar } from "@/components/pinned/pinned-sidebar";
import { FlyingPinPortal } from "@/components/pinned/flying-pin-animation";
import { LangGraphTracePanel } from "@/components/chat/langgraph-trace-panel";
import { useChat } from "@/hooks/use-chat";
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { IntroProvider } from "@/hooks/use-intro";
import { PartnerNudgeProvider } from "@/hooks/use-partner-nudge";
import { IntroModal } from "@/components/intro/intro-modal";
import { IntroPanel } from "@/components/intro/intro-panel";
import { HowItWorksPanel } from "@/components/intro/how-it-works-panel";
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
  const { activeConfigId, setActiveConfigId } = useOdooConfig();
  const isBuilder = meData?.user?.role === "ADMIN" || meData?.user?.role === "SUPERADMIN";

  // El historial se pide YA filtrado por instancia (ver `fetchMyConversations`), así que
  // cambiar de instancia — o pedir "ver todos" — es volver a pedir la primera página.
  useEffect(() => {
    if (!user) {
      chat.clearChats();
      return;
    }
    chat.loadServerConversations(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeConfigId, chat.showAllInstances]);

  useEffect(() => {
    if (user) loadAllPins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // De qué instancia es el chat que está abierto. Se calcula como VALOR y no se usa
  // `displayChats` de dependencia: esa lista es un array nuevo en cada render.
  const openChatConfigId = chatIdFromUrl
    ? chat.displayChats.find((c) => c.id === chatIdFromUrl)?.configId ?? null
    : null;

  /**
   * ⭐ **Abrir un chat selecciona su instancia.** Un chat nació contra una base y sus
   * respuestas siguientes tienen que salir de esa misma base: el `config_id` del stream es
   * la instancia activa, así que sin esto continuar una conversación vieja mientras se
   * apunta a otro cliente mezclaba el historial de una empresa con los datos de otra, y el
   * resultado no se ve distinto de uno correcto. Al sincronizar acá, todo lo que lee la
   * instancia activa —el cartel del sidebar, el Tablero, las Rutinas— queda diciendo lo
   * mismo, sin que ningún componente tenga que enterarse.
   *
   * ⚠️ **Depende del chat abierto y NADA más.** Agregar `activeConfigId` a las dependencias
   * parece más prolijo y hace lo contrario de lo que se quiere: cambiar de instancia desde
   * el menú estando adentro de un chat volvía a correr este efecto —navegar es asíncrono y
   * el `setState` no, así que durante un render la URL todavía tiene el chat viejo— y
   * REVERTÍA la instancia recién elegida. Las dos reglas se pisaban y ganaba la vieja.
   *
   * ⚠️ Un `configId` nulo no cambia nada: es "no sabemos de qué instancia es" (chat anterior
   * al estampado, o de demo), y adivinar sería peor que dejar la activa donde está.
   */
  useEffect(() => {
    if (openChatConfigId) setActiveConfigId(openChatConfigId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatConfigId]);

  function handleNewChat() {
    chat.setCurrentChatId(undefined);
    router.push("/chat");
  }

  function handleSelectChat(id: string) {
    // Se hace también acá, y no sólo en el efecto de arriba, para que el cartel cambie en
    // el mismo frame del click: el efecto cubre el caso de llegar por URL (mail, refresh,
    // otra pestaña), donde la lista todavía no está cargada al montar.
    const target = chat.displayChats.find((c) => c.id === id);
    if (target?.configId && target.configId !== activeConfigId) {
      setActiveConfigId(target.configId);
    }
    chat.setCurrentChatId(id);
    router.push(`/chat/${id}`);
  }

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
          <PartnerNudgeProvider>
            <div className="flex h-screen overflow-hidden bg-base">
              <Sidebar
                chatGroups={chat.chatGroups}
                currentChatId={chat.currentChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                onLoadMore={chat.loadMoreConversations}
                hasMore={chat.hasMore}
                onDeleteChat={chat.deleteChat}
                otherInstancesCount={chat.otherInstancesCount}
                showAllInstances={chat.showAllInstances}
                onToggleAllInstances={chat.setShowAllInstances}
              />
              <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
              <PinnedSidebar />
              <FlyingPinPortal />
              {user && isBuilder && <LangGraphTracePanel entries={chat.traceEntries} />}
            </div>
            <IntroModal />
            <IntroPanel />
            <HowItWorksPanel />
          </PartnerNudgeProvider>
        </IntroProvider>
      </RightPanelContext.Provider>
    </ChatContext.Provider>
  );
}
