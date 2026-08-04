"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { RecordLinksEvent } from "@/lib/types";

interface RecordLinksCardProps {
  event: RecordLinksEvent;
}

/**
 * Chip row for the `record_links` SSE event (record-links.md contract).
 * Each chip links to the record's own page inside the user's Odoo instance.
 * `event.model` is technical and must never be shown; `event.tooltip` is
 * already localized by the backend and used verbatim as the hover title.
 */
export function RecordLinksCard({ event }: RecordLinksCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 flex flex-wrap gap-2"
    >
      {event.records.map((record) => (
        <a
          key={record.id}
          href={record.url}
          target="_blank"
          rel="noopener noreferrer"
          title={event.tooltip}
          className="flex items-center gap-1.5 rounded-btn border border-border bg-surface px-3 py-1.5 text-small text-foreground transition-colors hover:bg-raised hover:text-accent"
        >
          {record.name}
          <ExternalLink size={12} strokeWidth={1.5} className="shrink-0 text-text-muted" />
        </a>
      ))}
    </motion.div>
  );
}
