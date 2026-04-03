"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bot, Database, FileText, Users, BarChart3, Package, AlertTriangle, Zap } from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatContext } from "@/components/app-shell";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useRouter } from "@/i18n/navigation";
import { useTranslations as useT } from "next-intl";

const SUGGESTION_KEYS = ["inventory", "invoices", "sales", "employees"] as const;
const SUGGESTION_ICONS = [Package, FileText, BarChart3, Users];
const SUGGESTION_COLORS = ["text-info", "text-warning-solid", "text-success-solid", "text-accent"];

export default function NewChatPage() {
  const router = useRouter();
  const t = useTranslations("NewChat");
  const { sendMessage, isStreaming, stopStreaming, createChat } = useChatContext();
  const { isConfigured, isDemoMode } = useOdooConfig();
  const tAuth = useT("Auth");

  async function handleSend(content: string, image?: File) {
    const id = createChat(content || "Image upload");
    router.push(`/chat/${id}`);
    sendMessage(content, id, image);
  }

  function handleSuggestion(text: string) {
    handleSend(text);
  }

  return (
    <div className="flex flex-1 flex-col">
      {isDemoMode && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-warning-subtle px-4 py-2 text-small text-warning-solid">
          <div className="flex items-center gap-2">
            <Zap size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{tAuth("demoBanner")}</span>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            {tAuth("demoSignUp")}
          </button>
        </div>
      )}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mb-10 text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-accent-subtle">
              <Bot size={32} strokeWidth={1.5} className="text-accent" />
            </div>
            <h2 className="mb-3 text-display">{t("heading")}</h2>
            <p className="text-body text-text-secondary">{t("subheading")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: 0.1, ease: "easeOut" }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {SUGGESTION_KEYS.map((key, i) => {
              const Icon = SUGGESTION_ICONS[i];
              const text = t(`suggestions.${key}`);
              return (
                <button
                  key={key}
                  onClick={() => handleSuggestion(text)}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-left text-body transition-all hover:border-accent/30 hover:bg-raised hover:shadow-sm"
                >
                  <Icon size={20} strokeWidth={1.5} className={SUGGESTION_COLORS[i]} />
                  <span>{text}</span>
                </button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
            className="mt-6 flex items-center justify-center gap-2 text-small text-text-muted"
          >
            {isConfigured ? (
              <>
                <Database size={16} strokeWidth={1.5} />
                <span>{t("connectedMessage")}</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} strokeWidth={1.5} className="text-error" />
                <span className="text-error">{t("notConnected")}</span>
              </>
            )}
          </motion.div>
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
