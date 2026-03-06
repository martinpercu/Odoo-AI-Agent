"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, Database } from "lucide-react";
import type { Message } from "@/lib/types";
import { useChatContext } from "@/components/app-shell";
import { SuccessCard } from "./success-card";
import { ValidationPrompt } from "./validation-prompt";
import { OdooActionButton } from "./odoo-action-button";
import { ActionProposalButton } from "./action-proposal-button";
import { SelectionCard } from "./selection-card";
import { OdooFileCard } from "./odoo-file-card";
import { OdooChartCard } from "./odoo-chart-card";

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
}

function TypingIndicator() {
  const t = useTranslations("ChatMessages");
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Database size={16} />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t("typingIndicator")}</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, times: [0, 0.5, 1] }}
            className="text-primary"
          >
            ...
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { executeAction, sendMessage } = useChatContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLastAssistant =
          !isUser && index === messages.length - 1 && isStreaming && message.content === "";

        if (isLastAssistant) {
          return <TypingIndicator key={message.id} />;
        }

        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-4 ${isUser ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isUser
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted"
              }`}
            >
              {isUser ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                <>
                  <div className="markdown-content text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.metadata && (
                    <>
                      {message.metadata.type === "action_success" && (
                        <SuccessCard metadata={message.metadata} />
                      )}
                      {message.metadata.type === "validation_error" && (
                        <ValidationPrompt metadata={message.metadata} />
                      )}
                      {message.metadata.type === "action_prompt" && (
                        <OdooActionButton
                          metadata={message.metadata}
                          onAction={executeAction}
                        />
                      )}
                      {message.metadata.type === "action_proposal" && (
                        <ActionProposalButton
                          metadata={message.metadata}
                          onAction={executeAction}
                        />
                      )}
                      {message.metadata.type === "selection_prompt" && (
                        <SelectionCard
                          metadata={message.metadata}
                          onSelect={(value) => sendMessage(value)}
                        />
                      )}
                      {message.metadata.type === "file_attachment" && (
                        <OdooFileCard metadata={message.metadata} />
                      )}
                    </>
                  )}
                  {message.charts && message.charts.length > 0 && (
                    <>
                      {message.charts.map((chart, ci) => (
                        <OdooChartCard key={`chart-${ci}`} chart={chart} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
