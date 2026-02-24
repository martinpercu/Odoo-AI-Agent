"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bot, Database, FileText, Users, BarChart3, Package, XCircle } from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatContext } from "@/components/app-shell";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useRouter } from "@/i18n/navigation";

const SUGGESTION_KEYS = ["inventory", "invoices", "sales", "employees"] as const;
const SUGGESTION_ICONS = [Package, FileText, BarChart3, Users];
const SUGGESTION_COLORS = ["text-blue-500", "text-amber-500", "text-emerald-500", "text-purple-500"];

export default function NewChatPage() {
  const router = useRouter();
  const t = useTranslations("NewChat");
  const { sendMessage, isStreaming, stopStreaming, createChat } = useChatContext();
  const { isConfigured } = useOdooConfig();

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
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot size={32} className="text-primary" />
            </div>
            <h2 className="mb-3 text-3xl font-bold">{t("heading")}</h2>
            <p className="text-muted-foreground">{t("subheading")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {SUGGESTION_KEYS.map((key, i) => {
              const Icon = SUGGESTION_ICONS[i];
              const text = t(`suggestions.${key}`);
              return (
                <button
                  key={key}
                  onClick={() => handleSuggestion(text)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm transition-all hover:border-primary/30 hover:bg-muted hover:shadow-sm"
                >
                  <Icon size={18} className={SUGGESTION_COLORS[i]} />
                  <span>{text}</span>
                </button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
          >
            {isConfigured ? (
              <>
                <Database size={12} />
                <span>{t("connectedMessage")}</span>
              </>
            ) : (
              <>
                <XCircle size={12} className="text-destructive" />
                <span className="text-destructive">{t("notConnected")}</span>
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
