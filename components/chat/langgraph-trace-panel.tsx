"use client";

import { useState } from "react";
import { Terminal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

export type TraceLevel = "ok" | "info" | "err" | "warn";

export interface TraceEntry {
  ts: string;
  level: TraceLevel;
  node: string;
  message: string;
}

interface Props {
  entries: TraceEntry[];
}

export function LangGraphTracePanel({ entries }: Props) {
  const t = useTranslations("Builder.Trace");
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-4 bottom-4 z-50 flex h-btn-md items-center gap-2 rounded-btn px-3 shadow-lg hover:opacity-90 deep-surface"
        aria-label={t("expand")}
        title={t("title")}
      >
        <Terminal size={16} strokeWidth={1.5} />
        <span className="font-technical-sm">{t("title")}</span>
        {entries.length > 0 && (
          <span className="ml-1 rounded-full bg-[#35312D] px-1.5 text-[10px] font-medium tracking-wider">
            {entries.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="deep-surface fixed right-0 top-0 z-40 flex h-screen w-[320px] flex-col border-l border-[#2A2520]"
      >
        <header className="flex items-center justify-between border-b border-[#2A2520] px-4 py-3">
          <h2 className="font-technical-sm uppercase tracking-wider">
            {t("title")}
          </h2>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[#7A7670] hover:text-[#B8B3AC]"
            aria-label={t("collapse")}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>
        <ol className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.7]">
          {entries.length === 0 ? (
            <li className="deep-ts">{t("empty")}</li>
          ) : (
            entries.map((e, i) => (
              <li key={i} className="mb-1 break-words">
                <span className="deep-ts">{e.ts}</span>{" "}
                <span className={`deep-${e.level}`}>[{e.node}]</span>{" "}
                <span>{e.message}</span>
              </li>
            ))
          )}
        </ol>
      </motion.aside>
    </AnimatePresence>
  );
}
