"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import dynamic from "next/dynamic";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatContext } from "@/components/app-shell";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useRouter } from "@/i18n/navigation";
import { DemoBanner } from "@/components/chat/demo-banner";
import { PartnerNudge } from "@/components/intro/partner-nudge";

const SuggestionCarousel = dynamic(
  () => import("@/components/chat/suggestion-carousel").then((m) => m.SuggestionCarousel),
  { ssr: false }
);

export default function NewChatPage() {
  const router = useRouter();
  const t = useTranslations("NewChat");
  const { sendMessage, isStreaming, stopStreaming, createChat } = useChatContext();
  const { isConfigured, isDemoMode } = useOdooConfig();

  async function handleSend(content: string, image?: File) {
    const id = createChat(content || "Image upload");
    router.push(`/chat/${id}`);
    sendMessage(content, id, image);
  }

  return (
    <div className="flex flex-1 flex-col">
      {isDemoMode && <DemoBanner />}
      {isDemoMode && <PartnerNudge />}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mb-10 text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-accent-subtle">
              <MarkB size={36} fg="currentColor" className="text-accent" />
            </div>
            <h2 className="mb-3 text-display">{t("heading")}</h2>
            <p className="text-body text-text-secondary">{t("subheading")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: 0.1, ease: "easeOut" }}
          >
            <SuggestionCarousel
              onSelect={(text) => handleSend(text)}
              getLabel={(key) => t(`suggestions.${key}`)}
            />
          </motion.div>

          {!isConfigured && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
              className="mt-6 flex items-center justify-center gap-2 text-small"
            >
              <AlertTriangle size={16} strokeWidth={1.5} className="text-error" />
              <span className="text-error">{t("notConnected")}</span>
            </motion.div>
          )}
        </div>
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
