"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RecordLinksEvent } from "@/lib/types";

interface RecordLinksCardProps {
  event: RecordLinksEvent;
}

/**
 * Los links a los registros dentro del Odoo del propio usuario
 * (contrato `record-links.md`).
 *
 * ⭐ **Es lo único que conecta visiblemente una respuesta con los datos reales del
 * usuario** — la prueba de que el dato no lo inventamos, que es exactamente la
 * objeción de fondo de cualquiera que prueba un agente sobre su propia base
 * (quick-wins §10). Por eso lleva un encabezado y no es una fila de chips muda:
 * sin él se lee como una lista de etiquetas y nadie los clickea.
 *
 * `event.model` es técnico y **nunca** se muestra; `event.tooltip` ya viene
 * localizado del backend y se usa tal cual.
 */
export function RecordLinksCard({ event }: RecordLinksCardProps) {
  const t = useTranslations("Chat");
  const records = event.records ?? [];
  if (records.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mt-3 rounded-card border border-accent/20 bg-accent-subtle/40 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-micro font-medium uppercase tracking-wide text-accent">
        <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
        {t("openInOdoo")}
      </p>
      <div className="flex flex-wrap gap-2">
        {records.map((record) => (
          <a
            key={record.id}
            href={record.url}
            target="_blank"
            rel="noopener noreferrer"
            title={event.tooltip}
            className="group flex items-center gap-1.5 rounded-btn border border-accent/30 bg-surface px-3 py-1.5 text-small text-foreground shadow-sm transition-colors hover:border-accent hover:bg-raised hover:text-accent"
          >
            {record.name}
            <ArrowUpRight
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-accent/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </a>
        ))}
      </div>
    </motion.div>
  );
}
