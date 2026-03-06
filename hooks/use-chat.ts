"use client";

import { useState, useCallback, useRef } from "react";
import type {
  Message,
  MessageMetadata,
  Chat,
  ChatGroup,
  ActionContext,
  ActionSuccessMetadata,
  FileAttachmentMetadata,
  ChartSSEEvent,
  ExcelExportMetadata,
} from "@/lib/types";
import { API_BASE, toBackendConfig, executeAction as executeActionAPI, uploadImage as uploadImageAPI, fetchChatHistory } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useLocale, useTranslations } from "next-intl";

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const yesterday = new Date(today.getTime() - 86400000);

function groupChatsByDate(chats: Chat[]): ChatGroup[] {
  const groups: ChatGroup[] = [];
  const todayChats: Chat[] = [];
  const yesterdayChats: Chat[] = [];
  const weekChats: Chat[] = [];
  const olderChats: Chat[] = [];

  for (const chat of chats) {
    const chatDate = new Date(
      chat.updatedAt.getFullYear(),
      chat.updatedAt.getMonth(),
      chat.updatedAt.getDate()
    );
    if (chatDate.getTime() === today.getTime()) {
      todayChats.push(chat);
    } else if (chatDate.getTime() === yesterday.getTime()) {
      yesterdayChats.push(chat);
    } else if (chatDate.getTime() > today.getTime() - 86400000 * 7) {
      weekChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  }

  if (todayChats.length) groups.push({ label: "today", chats: todayChats });
  if (yesterdayChats.length) groups.push({ label: "yesterday", chats: yesterdayChats });
  if (weekChats.length) groups.push({ label: "last7Days", chats: weekChats });
  if (olderChats.length) groups.push({ label: "older", chats: olderChats });

  return groups;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChat(chatId?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedChatIdsRef = useRef<Set<string>>(new Set());
  const { config: odooConfig } = useOdooConfig();
  const locale = useLocale();
  const t = useTranslations("ChatMessages");

  const currentChat = chats.find((c) => c.id === currentChatId) ?? null;
  const chatGroups = groupChatsByDate(chats);

  const createChat = useCallback(
    (firstMessage: string): string => {
      const id = Date.now().toString();
      const title = firstMessage.length > 50 ? firstMessage.slice(0, 47) + "..." : firstMessage;
      const newChat: Chat = {
        id,
        title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(id);
      return id;
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, explicitChatIdOrImage?: string | File, maybeImage?: File) => {
      // Resolve overloaded args: sendMessage(content, chatId?, image?)
      let explicitChatId: string | undefined;
      let image: File | undefined;
      if (typeof explicitChatIdOrImage === "string") {
        explicitChatId = explicitChatIdOrImage;
        image = maybeImage;
      } else if (explicitChatIdOrImage instanceof File) {
        image = explicitChatIdOrImage;
      }

      let targetId = explicitChatId ?? currentChatId;
      if (!targetId) {
        targetId = createChat(content || "Image upload");
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
        ...(image && { imageUrl: URL.createObjectURL(image) }),
      };

      const assistantId = `msg-${Date.now() + 1}`;

      // Add user message + empty assistant message
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  userMessage,
                  { id: assistantId, role: "assistant" as const, content: "", timestamp: new Date() },
                ],
                updatedAt: new Date(),
              }
            : c
        )
      );

      setIsStreaming(true);

      // Guard: require Odoo config before calling backend
      if (!odooConfig) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `⚠️ ${t("configNotSet")}` }
                      : m
                  ),
                }
              : c
          )
        );
        setIsStreaming(false);
        return;
      }

      // Image upload flow: POST to /upload (not SSE)
      if (image) {
        try {
          const result = await uploadImageAPI(targetId, image, odooConfig, locale);

          if (!result.success) {
            setChats((prev) =>
              prev.map((c) =>
                c.id === targetId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: `⚠️ ${result.error || "Upload failed"}` }
                          : m
                      ),
                    }
                  : c
              )
            );
            return;
          }

          // Parse upload response — may contain text + action_proposal
          const data = result.data!;
          let metadata: MessageMetadata | undefined;
          const responseContent = (data.message as string) || (data.content as string) || "";

          if (data.type === "action_proposal" || data.action_proposal) {
            const proposal = data.type === "action_proposal" ? data : data.action_proposal;
            metadata = proposal as MessageMetadata;
          } else if (data.metadata) {
            metadata = data.metadata as MessageMetadata;
          }

          setChats((prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: responseContent, ...(metadata && { metadata }) }
                        : m
                    ),
                  }
                : c
            )
          );
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/chat/${targetId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, odoo_config: toBackendConfig(odooConfig), language: locale }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";
        let charts: ChartSSEEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines: "data: <text>\n\n"
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6);

              // Try to parse as JSON
              let text = "";
              let metadata: MessageMetadata | undefined = undefined;
              try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                  // Skip step events like {"step":"..."}
                  if ("step" in parsed) continue;

                  // Handle backend format with explicit type field
                  if ("type" in parsed) {
                    if (parsed.type === "text") {
                      text = parsed.content || "";
                    } else if (parsed.type === "action_proposal") {
                      metadata = parsed as MessageMetadata;
                      text = "";
                    } else if (parsed.type === "selection_prompt") {
                      metadata = parsed as MessageMetadata;
                      text = "";
                    } else if (parsed.type === "action_prompt") {
                      metadata = parsed as MessageMetadata;
                      text = "";
                    } else if (parsed.type === "action_success") {
                      metadata = parsed as MessageMetadata;
                      text = "";
                    } else if (parsed.type === "chart") {
                      charts = [...charts, parsed as ChartSSEEvent];
                      text = "";
                    } else if (parsed.type === "export") {
                      metadata = {
                        type: "excel_export",
                        export_url: parsed.export_url,
                        filename: parsed.filename,
                      } satisfies ExcelExportMetadata;
                      text = "";
                    } else {
                      continue;
                    }
                  } else if ("content" in parsed) {
                    // Backward compatibility: {"content": "..."} without type
                    text = parsed.content;
                    if ("metadata" in parsed && parsed.metadata) {
                      metadata = parsed.metadata;
                    }
                  } else {
                    continue;
                  }
                }
              } catch {
                // Not valid JSON — treat as plain text content
                text = raw;
              }

              accumulated += text;

              setChats((prev) =>
                prev.map((c) =>
                  c.id === targetId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                content: accumulated,
                                ...(metadata && { metadata }),
                                ...(charts.length > 0 && { charts }),
                              }
                            : m
                        ),
                      }
                    : c
                )
              );
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User stopped streaming — keep what we have
        } else {
          // Show error in the assistant message
          const errorMsg = (err as Error).message || "Error de conexión";
          setChats((prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: `⚠️ ${errorMsg}` }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [currentChatId, createChat, odooConfig, locale, t]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const executeAction = useCallback(
    async (actionContext: ActionContext) => {
      if (!currentChatId || !odooConfig) return;

      const result = await executeActionAPI(currentChatId, actionContext, odooConfig, locale);

      if (!result.success) {
        // If we have per-field validation errors (422), throw them back to the
        // ActionProposalButton so it can display inline error indicators.
        if (result.fieldErrors) {
          const err = new Error(result.error || "Validation failed");
          (err as Error & { fieldErrors: Record<string, string> }).fieldErrors = result.fieldErrors;
          throw err;
        }

        const errorMessage: Message = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${result.error || "Action failed"}`,
          timestamp: new Date(),
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === currentChatId
              ? { ...c, messages: [...c.messages, errorMessage] }
              : c
          )
        );
        return;
      }

      // Build success metadata
      let metadata: ActionSuccessMetadata | FileAttachmentMetadata | undefined;

      if (result.result?.action === "report") {
        // Report: show file card
        metadata = {
          type: "file_attachment",
          file_url: result.result.file_url,
          filename: result.result.filename,
        } satisfies FileAttachmentMetadata;
      } else if (result.result) {
        // CRUD / method_call success
        const r = result.result;
        metadata = {
          type: "action_success",
          action: r.action,
          recordId: "id" in r ? r.id : ("ids" in r ? r.ids[0] : ""),
          model: r.model,
          actionType: r.action === "method_call" ? "method_call" : "crud",
          actionMessage: result.message,
        } satisfies ActionSuccessMetadata;
      }

      const responseMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: result.message || "Action completed successfully",
        timestamp: new Date(),
        ...(metadata && { metadata }),
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, responseMessage] }
            : c
        )
      );

      // Auto-sequence: if queue_next is present, send the next message after a delay
      if (result.queue_next) {
        await delay(500);
        sendMessage(result.queue_next.text, currentChatId);
      }
    },
    [currentChatId, odooConfig, locale, sendMessage]
  );

  const loadChatHistory = useCallback(
    async (targetChatId: string) => {
      // Skip if already loaded or currently loading
      if (loadedChatIdsRef.current.has(targetChatId)) return;
      // Skip if chat already exists in state with messages
      const existing = chats.find((c) => c.id === targetChatId);
      if (existing && existing.messages.length > 0) {
        loadedChatIdsRef.current.add(targetChatId);
        return;
      }
      if (!odooConfig) return;

      loadedChatIdsRef.current.add(targetChatId);
      setIsLoadingHistory(true);

      try {
        const result = await fetchChatHistory(targetChatId, odooConfig);
        if (!result.success || !result.messages) {
          return;
        }
        const messages = result.messages;
        if (messages.length === 0) return; // Empty = new chat, WelcomeDashboard will show

        setChats((prev) => {
          const existingChat = prev.find((c) => c.id === targetChatId);
          if (existingChat) {
            // Hydrate existing chat
            return prev.map((c) =>
              c.id === targetChatId ? { ...c, messages } : c
            );
          }
          // Create new chat entry from history
          const title =
            messages.find((m) => m.role === "user")?.content.slice(0, 47) || "Chat";
          const newChat: Chat = {
            id: targetChatId,
            title: title.length >= 47 ? title + "..." : title,
            messages,
            createdAt: messages[0]?.timestamp ?? new Date(),
            updatedAt: messages[messages.length - 1]?.timestamp ?? new Date(),
          };
          return [newChat, ...prev];
        });
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [chats, odooConfig]
  );

  return {
    chats,
    chatGroups,
    currentChat,
    currentChatId,
    setCurrentChatId,
    sendMessage,
    isStreaming,
    isLoadingHistory,
    stopStreaming,
    createChat,
    executeAction,
    loadChatHistory,
  };
}
