"use client";

import { use, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { WelcomeDashboard } from "@/components/chat/welcome-dashboard";
import { useChatContext } from "@/components/app-shell";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";

export default function ChatPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = use(params);
  const {
    currentChat,
    setCurrentChatId,
    sendMessage,
    isStreaming,
    isLoadingHistory,
    stopStreaming,
    loadChatHistory,
  } = useChatContext();
  const { loadPins } = usePinnedInsights();
  const t = useTranslations("ChatHistory");

  useEffect(() => {
    setCurrentChatId(id);
    loadPins(id);
    loadChatHistory(id);
  }, [id, setCurrentChatId, loadPins, loadChatHistory]);

  const hasMessages = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          {isLoadingHistory && !hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-20"
            >
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t("loading")}</span>
            </motion.div>
          )}
          {!isLoadingHistory && !hasMessages && (
            <WelcomeDashboard onSend={sendMessage} />
          )}
          {hasMessages && (
            <ChatMessages messages={currentChat.messages} isStreaming={isStreaming} />
          )}
        </div>
      </div>

      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
