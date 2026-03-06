"use client";

import { use, useEffect } from "react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatContext } from "@/components/app-shell";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";

export default function ChatPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = use(params);
  const { currentChat, setCurrentChatId, sendMessage, isStreaming, stopStreaming } =
    useChatContext();
  const { loadPins } = usePinnedInsights();

  useEffect(() => {
    setCurrentChatId(id);
    loadPins(id);
  }, [id, setCurrentChatId, loadPins]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          {currentChat && (
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
