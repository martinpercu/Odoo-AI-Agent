"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, Chat, ChatGroup, ActionSuccessMetadata } from "@/lib/types";
import { API_BASE, toBackendConfig, executeAction as executeActionAPI } from "@/lib/api";
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

export function useChat(chatId?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
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
    async (content: string, explicitChatId?: string) => {
      let targetId = explicitChatId ?? currentChatId;
      if (!targetId) {
        targetId = createChat(content);
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
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
              let metadata = undefined;
              try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                  // Skip step events like {"step":"..."}
                  if ("step" in parsed) continue;

                  // Handle new backend format with explicit type field
                  if ("type" in parsed) {
                    if (parsed.type === "text") {
                      // Text chunk: {"type": "text", "content": "..."}
                      text = parsed.content || "";
                    } else if (parsed.type === "action_proposal") {
                      // Action proposal: {"type": "action_proposal", "action": {...}}
                      metadata = parsed as any;
                      text = "";
                    } else if (parsed.type === "action_prompt") {
                      // Action prompt (e.g. method_call): {"type": "action_prompt", ...}
                      metadata = parsed as any;
                      text = "";
                    } else if (parsed.type === "action_success") {
                      // Action success from stream: {"type": "action_success", ...}
                      metadata = parsed as any;
                      text = "";
                    } else {
                      // Other typed events (ignore for now)
                      continue;
                    }
                  } else if ("content" in parsed) {
                    // Backward compatibility: {"content": "..."} without type
                    text = parsed.content;
                    // Check for old-style nested metadata
                    if ("metadata" in parsed && parsed.metadata) {
                      metadata = parsed.metadata;
                    }
                  } else {
                    // Unknown format, skip
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
    [currentChatId, createChat, odooConfig, locale]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const executeAction = useCallback(
    async (action: string, context?: Record<string, any>) => {
      if (!currentChatId || !odooConfig) return;

      const result = await executeActionAPI(currentChatId, action, context, odooConfig, locale);

      // Build metadata for success responses
      let metadata: ActionSuccessMetadata | undefined;
      if (result.success && result.metadata) {
        metadata = {
          type: "action_success",
          action: result.metadata.action ?? action,
          recordId: result.metadata.record_id ?? "",
          recordName: result.metadata.record_name,
          model: result.metadata.model,
          odooUrl: result.metadata.odoo_url,
          actionType: result.metadata.action_type,
          actionMessage: result.metadata.action_message,
        };
      }

      // Add response message to chat (success or error)
      const responseMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: result.success
          ? result.message || "Action completed successfully"
          : `⚠️ ${result.error || "Action failed"}`,
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
    },
    [currentChatId, odooConfig, locale]
  );

  return {
    chats,
    chatGroups,
    currentChat,
    currentChatId,
    setCurrentChatId,
    sendMessage,
    isStreaming,
    stopStreaming,
    createChat,
    executeAction,
  };
}
