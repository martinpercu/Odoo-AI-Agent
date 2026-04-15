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
import { ExcelExportCard } from "./excel-export-card";

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
}

function TypingIndicator() {
  const t = useTranslations("ChatMessages");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex items-start gap-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        <Database size={16} strokeWidth={1.5} />
      </div>
      <div className="rounded-lg rounded-tl-sm bg-raised px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-body text-text-secondary">{t("typingIndicator")}</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, times: [0, 0.5, 1] }}
            className="text-accent"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`flex items-start gap-4 ${isUser ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isUser
                  ? "bg-accent text-white"
                  : "bg-accent-subtle text-accent"
              }`}
            >
              {isUser ? <User size={16} strokeWidth={1.5} /> : <Bot size={16} strokeWidth={1.5} />}
            </div>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                isUser
                  ? "rounded-tr-sm bg-accent text-white"
                  : "rounded-tl-sm bg-raised"
              }`}
            >
              {isUser ? (
                <div>
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Uploaded"
                      className="mb-2 max-w-48 rounded-md"
                    />
                  )}
                  {message.content && (
                    <p className="text-body leading-relaxed">{message.content}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="markdown-content text-body">
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
                        <OdooFileCard metadata={message.metadata} messageId={message.id} />
                      )}
                      {message.metadata.type === "excel_export" && (
                        <ExcelExportCard metadata={message.metadata} messageId={message.id} />
                      )}
                    </>
                  )}
                  {message.charts && message.charts.length > 0 && (
                    <>
                      {message.charts.map((chart, ci) => (
                        <OdooChartCard key={`chart-${ci}`} chart={chart} messageId={message.id} chartIndex={ci} />
                      ))}
                    </>
                  )}
                  {/* Watermark: show unless explicitly set to false (safe default = show) */}
                  {message.watermark !== false && message.content && (
                    <p className="mt-2 text-micro text-text-muted select-none">
                      Powered by The Odoo Agent
                    </p>
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
