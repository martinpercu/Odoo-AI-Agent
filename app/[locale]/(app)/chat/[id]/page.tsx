"use client";

import { use, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, MessageSquareOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { DemoBanner } from "@/components/chat/demo-banner";
import { PartnerNudge } from "@/components/intro/partner-nudge";
import { SaveAsRoutineButton } from "@/components/routines/save-as-routine-button";
import { useChatContext } from "@/components/app-shell";
import { usePinnedInsights } from "@/hooks/use-pinned-insights";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useVoiceInput } from "@/hooks/use-voice-input";

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
    isChatMissing,
    isPlayingAudio,
    stopAudio,
  } = useChatContext();
  const { loadPins } = usePinnedInsights();
  const t = useTranslations("ChatHistory");
  const { isDemoMode } = useOdooConfig();
  const { sttAvailable, autoSendVoice, onTranscribe } = useVoiceInput();

  useEffect(() => {
    setCurrentChatId(id);
    loadPins(id);
    loadChatHistory(id);
  }, [id, setCurrentChatId, loadPins, loadChatHistory]);

  const hasMessages = currentChat && currentChat.messages.length > 0;
  const missing = !hasMessages && !isLoadingHistory && isChatMissing(id);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isDemoMode && <DemoBanner />}
      {isDemoMode && <PartnerNudge />}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          {isLoadingHistory && !hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-20"
            >
              <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-accent" />
              <span className="text-body text-text-secondary">{t("loading")}</span>
            </motion.div>
          )}
          {missing && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
              <MessageSquareOff size={24} strokeWidth={1.5} className="text-text-muted" aria-hidden />
              <p className="text-subheading">{t("notFound")}</p>
              <p className="max-w-sm text-body text-text-secondary">{t("notFoundHint")}</p>
              <Link
                href="/chat"
                className="mt-2 inline-flex h-btn-md items-center rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                {t("notFoundCta")}
              </Link>
            </div>
          )}
          {hasMessages && (
            <ChatMessages messages={currentChat.messages} isStreaming={isStreaming} />
          )}
          {/* F1 — "guardar como Rutina". Va al PIE de la conversación, no en la barra
              de entrada: el gesto ocurre al final, mirando lo que ya se contestó.
              Oculto mientras se está respondiendo (la conversación todavía no terminó). */}
          {!isStreaming && (
            <SaveAsRoutineButton chatId={id} hasMessages={!!hasMessages} />
          )}
        </div>
      </div>

      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        sttAvailable={sttAvailable}
        onTranscribe={onTranscribe}
        autoSendVoice={autoSendVoice}
        isPlayingAudio={isPlayingAudio}
        onStopAudio={stopAudio}
      />
    </div>
  );
}
