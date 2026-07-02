"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { User, KeyRound, ArrowRight, Flag } from "lucide-react";
import { MarkB, MarkI } from "@/components/AgentMark";
import { useIconSize } from "@/hooks/use-icon-size";
import { useAudienceT } from "@/hooks/use-audience-translations";
import type { Message, AggReportOption } from "@/lib/types";
import { executeAggReportAction } from "@/lib/api";
import { useChatContext } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SuccessCard } from "./success-card";
import { ValidationPrompt } from "./validation-prompt";
import { OdooActionButton } from "./odoo-action-button";
import { ActionProposalButton } from "./action-proposal-button";
import { SelectionCard } from "./selection-card";
import { ReportTypeCard } from "./report-type-card";
import { ReportOfferCard } from "./report-offer-card";
import { AggReportCard } from "./agg-report-card";
import { OdooFileCard } from "./odoo-file-card";
import { OdooChartCard } from "./odoo-chart-card";
import { ExcelExportCard } from "./excel-export-card";
import { FeedbackModal } from "./feedback-modal";

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
}

function NoCredentialsCard() {
  const t = useTranslations("ChatMessages");
  return (
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-warning-solid/30 bg-warning-subtle px-4 py-3">
      <KeyRound size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning-solid" />
      <div className="min-w-0">
        <p className="text-small font-medium text-warning-solid">{t("noCredentials.title")}</p>
        <p className="mt-0.5 text-small text-text-secondary">{t("noCredentials.desc")}</p>
        <Link
          href="/settings"
          className="mt-2 inline-flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
        >
          {t("noCredentials.cta")}
          <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}

function TypingIndicator() {
  const t = useAudienceT("ChatMessages");
  const avatarSize = useIconSize("inline");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex items-start gap-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        <MarkI size={avatarSize} fg="currentColor" className="animate-pulse" />
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
  const t = useTranslations("ChatMessages");
  const locale = useLocale();
  const avatarSize = useIconSize("inline");
  const { executeAction, sendMessage, currentChatId } = useChatContext();
  const { meData } = useSession();
  const { activeConfigId } = useOdooConfig();
  const allowFeedback = meData?.user?.allow_feedback === true;

  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);

  async function handleAggReport(opt: AggReportOption) {
    if (!currentChatId || !activeConfigId) return;
    const res = await executeAggReportAction(currentChatId, opt, activeConfigId, locale);
    if (!res.success || !res.result) return;
    const b64 = res.result.format === "excel" ? res.result.xlsx_base64 : res.result.pdf_base64;
    if (!b64) return;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: res.result.mimetype });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return null;
  }

  const lastAssistantIndex = messages.reduce(
    (last, m, i) => (m.role === "assistant" && m.content ? i : last),
    -1
  );

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
              {isUser ? <User size={avatarSize} strokeWidth={1.5} /> : <MarkB size={avatarSize} fg="currentColor" />}
            </div>
            <div className={`max-w-[85%] ${!isUser ? "group relative" : ""}`}>
              <div
                className={`rounded-lg px-4 py-3 ${
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
                    <div className="markdown-content text-body [&>*:last-child]:!mb-0">
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
                        {message.metadata.type === "selection_prompt" &&
                          ("kind" in message.metadata ? (
                            message.metadata.kind === "report_offer" ? (
                              <ReportOfferCard
                                metadata={message.metadata}
                                onAction={executeAction}
                              />
                            ) : message.metadata.kind === "agg_report" ? (
                              <AggReportCard
                                metadata={message.metadata}
                                onPick={handleAggReport}
                              />
                            ) : (
                              <ReportTypeCard
                                metadata={message.metadata}
                                onSelect={(value) => sendMessage(value)}
                              />
                            )
                          ) : (
                            <SelectionCard
                              metadata={message.metadata}
                              onSelect={(value) => sendMessage(value)}
                            />
                          ))}
                        {message.metadata.type === "file_attachment" && (
                          <OdooFileCard metadata={message.metadata} messageId={message.id} />
                        )}
                        {message.metadata.type === "excel_export" && (
                          <ExcelExportCard metadata={message.metadata} messageId={message.id} />
                        )}
                        {message.metadata.type === "no_credentials" && (
                          <NoCredentialsCard />
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
                    {message.watermark === true && message.content && (
                      <p className="mt-3 text-micro text-text-muted select-none">
                        Powered by The Odoo Agent
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Feedback button — only on the last AI message when allow_feedback is true */}
              {!isUser && allowFeedback && index === lastAssistantIndex && (
                <button
                  onClick={() => setFeedbackMessageId(message.id)}
                  className="mt-1 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-small opacity-0 group-hover:opacity-100 group-hover:text-text-secondary transition-all hover:bg-accent hover:text-white"
                  aria-label={t("feedback.report")}
                >
                  <Flag size={14} strokeWidth={1.5} />
                  {t("feedback.report")}
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Feedback modal */}
      {feedbackMessageId !== null && currentChatId && activeConfigId && (
        <FeedbackModal
          chatId={currentChatId}
          messageId={feedbackMessageId}
          configId={activeConfigId}
          onClose={() => setFeedbackMessageId(null)}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
