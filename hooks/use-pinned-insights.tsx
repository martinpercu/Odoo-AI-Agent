"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type {
  PinnedInsight,
  PinnedChart,
  PinnedFile,
  PinnedExcel,
  ChartSSEEvent,
  FileAttachmentMetadata,
  ExcelExportMetadata,
} from "@/lib/types";
import {
  fetchPins as apiFetchPins,
  createPin as apiCreatePin,
  deletePin as apiDeletePin,
  deleteAllPins as apiDeleteAllPins,
  refreshPin as apiRefreshPin,
} from "@/lib/api";
import { useToast } from "@/components/ui/error-toast";

const MAX_PINS = 20;

interface PinnedInsightsContextType {
  pins: PinnedInsight[];
  isPinned: (kind: string, identifier: string) => boolean;
  pinChart: (chatId: string, messageId: string, chartIndex: number, chart: ChartSSEEvent) => void;
  pinFile: (chatId: string, messageId: string, metadata: FileAttachmentMetadata) => void;
  pinExcel: (chatId: string, messageId: string, metadata: ExcelExportMetadata) => void;
  unpin: (pinId: string, chatId?: string) => void;
  togglePinChart: (chatId: string, messageId: string, chartIndex: number, chart: ChartSSEEvent) => string | null;
  togglePinFile: (chatId: string, messageId: string, metadata: FileAttachmentMetadata) => string | null;
  togglePinExcel: (chatId: string, messageId: string, metadata: ExcelExportMetadata) => string | null;
  clearAll: (chatId?: string) => void;
  getPinId: (kind: string, identifier: string) => string | undefined;
  loadPins: (chatId: string) => void;
  refreshPin: (pinId: string, chatId: string) => Promise<void>;
}

const PinnedInsightsContext = createContext<PinnedInsightsContextType | null>(null);

export function usePinnedInsights() {
  const ctx = useContext(PinnedInsightsContext);
  if (!ctx) throw new Error("usePinnedInsights must be used within PinnedInsightsProvider");
  return ctx;
}

/** Stable identifier for dedup — unique per chart/file/excel */
function chartIdentifier(chatId: string, messageId: string, chartIndex: number) {
  return `${chatId}:${messageId}:${chartIndex}`;
}

function fileIdentifier(metadata: FileAttachmentMetadata) {
  return metadata.file_url;
}

function excelIdentifier(metadata: ExcelExportMetadata) {
  return metadata.export_url;
}

function getIdentifier(pin: PinnedInsight): string {
  switch (pin.kind) {
    case "chart":
      return chartIdentifier(pin.chatId, pin.messageId, pin.chartIndex);
    case "file":
      return fileIdentifier(pin.metadata);
    case "excel":
      return excelIdentifier(pin.metadata);
  }
}

/** Build the POST payload from a PinnedInsight (sends full SSE data) */
function buildPinPayload(pin: PinnedInsight): Record<string, unknown> {
  const base = {
    content_type: pin.kind,
    message_id: pin.messageId,
  };
  switch (pin.kind) {
    case "chart":
      return { ...base, title: pin.chart.title, chart_index: pin.chartIndex, payload: pin.chart };
    case "file":
      return { ...base, title: pin.metadata.filename, payload: pin.metadata };
    case "excel":
      return { ...base, title: pin.metadata.filename, payload: pin.metadata };
  }
}

export function PinnedInsightsProvider({ children }: { children: React.ReactNode }) {
  const [pins, setPins] = useState<PinnedInsight[]>([]);
  const { showError } = useToast();
  const t = useTranslations("PinnedInsights");
  const loadedChatsRef = useRef<Set<string>>(new Set());

  // ---- Fetch pins from backend ----
  const loadPins = useCallback(
    async (chatId: string) => {
      if (!chatId || loadedChatsRef.current.has(chatId)) return;
      loadedChatsRef.current.add(chatId);

      const result = await apiFetchPins(chatId);
      if (result.success && result.pins) {
        setPins((prev) => {
          // Merge: keep pins from other chats, replace pins for this chat
          const otherPins = prev.filter((p) => p.chatId !== chatId);
          return [...result.pins!, ...otherPins].slice(0, MAX_PINS);
        });
      }
      // Silent fail on initial load — user doesn't need a toast here
    },
    []
  );

  // ---- Helpers ----
  const isPinned = useCallback(
    (kind: string, identifier: string) => {
      return pins.some((p) => p.kind === kind && getIdentifier(p) === identifier);
    },
    [pins]
  );

  const getPinId = useCallback(
    (kind: string, identifier: string) => {
      return pins.find((p) => p.kind === kind && getIdentifier(p) === identifier)?.id;
    },
    [pins]
  );

  // ---- Optimistic pin (add) ----
  const optimisticAdd = useCallback(
    (pin: PinnedInsight) => {
      const snapshot = pins;
      // Optimistic: add immediately
      const next = [pin, ...pins].slice(0, MAX_PINS);
      setPins(next);

      // Fire API call in background
      apiCreatePin(pin.chatId, buildPinPayload(pin)).then((result) => {
        if (!result.success) {
          // Rollback
          setPins(snapshot);
          showError(result.error || t("errorPin"));
        } else if (result.pin && result.pin.id !== pin.id) {
          // Backend assigned a real ID — update it
          setPins((current) =>
            current.map((p) => (p.id === pin.id ? { ...p, id: result.pin!.id } : p))
          );
        }
      });
    },
    [pins, showError, t]
  );

  // ---- Optimistic unpin (remove) ----
  const optimisticRemove = useCallback(
    (pinId: string, chatId: string) => {
      const snapshot = pins;
      setPins((prev) => prev.filter((p) => p.id !== pinId));

      apiDeletePin(chatId, pinId).then((result) => {
        if (!result.success) {
          setPins(snapshot);
          showError(result.error || t("errorUnpin"));
        }
      });
    },
    [pins, showError, t]
  );

  // ---- Public API ----
  const pinChart = useCallback(
    (chatId: string, messageId: string, chartIndex: number, chart: ChartSSEEvent) => {
      const pin: PinnedChart = {
        kind: "chart",
        id: `pin-${Date.now()}`,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        chartIndex,
        chart,
      };
      optimisticAdd(pin);
    },
    [optimisticAdd]
  );

  const pinFile = useCallback(
    (chatId: string, messageId: string, metadata: FileAttachmentMetadata) => {
      const pin: PinnedFile = {
        kind: "file",
        id: `pin-${Date.now()}`,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        metadata,
      };
      optimisticAdd(pin);
    },
    [optimisticAdd]
  );

  const pinExcel = useCallback(
    (chatId: string, messageId: string, metadata: ExcelExportMetadata) => {
      const pin: PinnedExcel = {
        kind: "excel",
        id: `pin-${Date.now()}`,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        metadata,
      };
      optimisticAdd(pin);
    },
    [optimisticAdd]
  );

  const unpin = useCallback(
    (pinId: string, chatId?: string) => {
      const pin = pins.find((p) => p.id === pinId);
      const resolvedChatId = chatId || pin?.chatId || "";
      optimisticRemove(pinId, resolvedChatId);
    },
    [pins, optimisticRemove]
  );

  const togglePinChart = useCallback(
    (chatId: string, messageId: string, chartIndex: number, chart: ChartSSEEvent): string | null => {
      const identifier = chartIdentifier(chatId, messageId, chartIndex);
      const existing = pins.find((p) => p.kind === "chart" && getIdentifier(p) === identifier);
      if (existing) {
        optimisticRemove(existing.id, chatId);
        return null;
      }
      const id = `pin-${Date.now()}`;
      const pin: PinnedChart = {
        kind: "chart",
        id,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        chartIndex,
        chart,
      };
      optimisticAdd(pin);
      return id;
    },
    [pins, optimisticAdd, optimisticRemove]
  );

  const togglePinFile = useCallback(
    (chatId: string, messageId: string, metadata: FileAttachmentMetadata): string | null => {
      const identifier = fileIdentifier(metadata);
      const existing = pins.find((p) => p.kind === "file" && getIdentifier(p) === identifier);
      if (existing) {
        optimisticRemove(existing.id, chatId);
        return null;
      }
      const id = `pin-${Date.now()}`;
      const pin: PinnedFile = {
        kind: "file",
        id,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        metadata,
      };
      optimisticAdd(pin);
      return id;
    },
    [pins, optimisticAdd, optimisticRemove]
  );

  const togglePinExcel = useCallback(
    (chatId: string, messageId: string, metadata: ExcelExportMetadata): string | null => {
      const identifier = excelIdentifier(metadata);
      const existing = pins.find((p) => p.kind === "excel" && getIdentifier(p) === identifier);
      if (existing) {
        optimisticRemove(existing.id, chatId);
        return null;
      }
      const id = `pin-${Date.now()}`;
      const pin: PinnedExcel = {
        kind: "excel",
        id,
        pinnedAt: new Date().toISOString(),
        chatId,
        messageId,
        metadata,
      };
      optimisticAdd(pin);
      return id;
    },
    [pins, optimisticAdd, optimisticRemove]
  );

  const refreshPin = useCallback(
    async (pinId: string, chatId: string) => {
      const result = await apiRefreshPin(chatId, pinId);
      if (!result.success) {
        showError(result.error || t("errorPin"));
        return;
      }
      if (result.new_payload) {
        setPins((prev) =>
          prev.map((p) =>
            p.id === pinId && p.kind === "chart"
              ? { ...p, chart: result.new_payload!, pinnedAt: result.refreshed_at || p.pinnedAt }
              : p
          )
        );
      }
    },
    [showError, t]
  );

  const clearAll = useCallback(
    (chatId?: string) => {
      const snapshot = pins;
      setPins([]);

      const targetChatId = chatId || pins[0]?.chatId || "";
      if (targetChatId) {
        apiDeleteAllPins(targetChatId).then((result) => {
          if (!result.success) {
            setPins(snapshot);
            showError(result.error || t("errorClear"));
          }
        });
      }
    },
    [pins, showError, t]
  );

  return (
    <PinnedInsightsContext.Provider
      value={{
        pins,
        isPinned,
        pinChart,
        pinFile,
        pinExcel,
        unpin,
        togglePinChart,
        togglePinFile,
        togglePinExcel,
        clearAll,
        getPinId,
        loadPins,
        refreshPin,
      }}
    >
      {children}
    </PinnedInsightsContext.Provider>
  );
}
