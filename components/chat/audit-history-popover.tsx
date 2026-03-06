"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { fetchAuditHistory } from "@/lib/api";
import type { AuditEntry } from "@/lib/api";

interface AuditHistoryPopoverProps {
  chatId: string;
}

export function AuditHistoryPopover({ chatId }: AuditHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("ChatMessages");

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetchAuditHistory(chatId)
      .then((result) => {
        if (result.success && result.entries) {
          setEntries(result.entries);
        }
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [open, loaded, chatId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("audit.title")}
      >
        <Clock size={14} />
        <span>{t("audit.title")}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 z-50 mb-2 w-80 rounded-xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="border-b border-border px-4 py-3">
              <h4 className="text-sm font-semibold">{t("audit.title")}</h4>
              <p className="text-xs text-muted-foreground">{t("audit.subtitle")}</p>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && entries.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("audit.empty")}
                </p>
              )}

              {!loading &&
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="mb-1 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      {entry.status === "success" ? (
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle size={14} className="shrink-0 text-red-500" />
                      )}
                      <span className="font-medium">
                        {entry.action} &middot; {entry.model}
                      </span>
                    </div>
                    {entry.record_id && (
                      <span className="ml-6 text-muted-foreground">
                        ID: {entry.record_id}
                      </span>
                    )}
                    {entry.user_edits && Object.keys(entry.user_edits).length > 0 && (
                      <div className="ml-6 mt-1 text-muted-foreground">
                        {t("audit.userEdited")}:{" "}
                        {Object.keys(entry.user_edits).join(", ")}
                      </div>
                    )}
                    {entry.error_message && (
                      <div className="ml-6 mt-1 text-red-500">{entry.error_message}</div>
                    )}
                    <div className="ml-6 mt-0.5 text-muted-foreground/60">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
