"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Plus,
  ChevronRight,
  Loader2,
  Building2,
  Lock,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { listOdooConfigs } from "@/lib/api";
import type { OdooConfigSummary } from "@/lib/types";
import { ConnectionStatusBadge } from "@/components/odoo/connection-status-badge";
import { InstanceHealthSummary } from "@/components/odoo/instance-health-summary";
import { InstanceCreateForm } from "@/components/odoo/instance-create-form";

function InstanceCard({ config }: { config: OdooConfigSummary }) {
  const title = config.company_name || config.label || config.url;
  const showLabel = !!config.label && config.label !== title;
  return (
    <Link
      href={`/instances/${config.id}`}
      className="block rounded-card border border-border bg-surface p-5 transition-colors hover:bg-raised/40"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={18} strokeWidth={1.5} className="shrink-0 text-accent" />
            <h3 className="truncate text-subheading">{title}</h3>
            {showLabel && <span className="shrink-0 truncate text-small text-text-muted">{config.label}</span>}
          </div>
          <p className="mt-0.5 truncate text-small font-technical text-text-muted">
            {config.url} · {config.db_name}
            {config.odoo_version && ` · Odoo ${config.odoo_version}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {config.my_connection_status && <ConnectionStatusBadge status={config.my_connection_status} />}
          <ChevronRight size={18} strokeWidth={1.5} className="text-text-muted" />
        </div>
      </div>
      {config.counts && <InstanceHealthSummary counts={config.counts} seats={config.seats} />}
    </Link>
  );
}

export default function InstancesPage() {
  const t = useTranslations("Instances");
  const router = useRouter();
  const { meData, reload } = useSession();

  const role = meData?.user?.role;
  const orgId = meData?.org?.id;
  const isPartner = meData?.org?.type === "PARTNER";

  const [configs, setConfigs] = useState<OdooConfigSummary[] | null>(null);
  const [adding, setAdding] = useState(false);

  // setState lives inside the .then callback (not directly in the effect body).
  const load = useCallback(() => {
    if (!orgId) return;
    listOdooConfigs(orgId).then((res) => {
      setConfigs(res.success && res.configs ? res.configs : []);
    });
  }, [orgId]);

  // Admin-only route — bounce everyone else to chat.
  useEffect(() => {
    if (meData && role && role !== "ADMIN" && role !== "SUPERADMIN") {
      router.replace("/chat");
    }
  }, [meData, role, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (!meData || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database size={24} strokeWidth={1.5} className="text-accent" />
          <h1 className="text-heading">{t("title")}</h1>
        </div>
        {isPartner && configs && configs.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex h-btn-sm items-center gap-1.5 rounded-btn bg-accent px-3 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} strokeWidth={1.5} />
            {t("addInstance")}
          </button>
        )}
      </div>

      {/* Add-instance form (PARTNER only) */}
      <AnimatePresence>
        {adding && orgId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mb-6 rounded-card border border-border bg-surface p-5">
              <h2 className="mb-4 text-subheading">{t("create.title")}</h2>
              <InstanceCreateForm
                orgId={orgId}
                onCreated={async () => {
                  setAdding(false);
                  await reload();
                  load();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instances list */}
      {configs === null ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-text-muted" />
        </div>
      ) : configs.length === 0 && !adding ? (
        <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center">
          <Database size={28} strokeWidth={1.5} className="mx-auto mb-3 text-text-muted" />
          <p className="mb-4 text-body text-text-secondary">{t("empty")}</p>
          {/* The first instance is always creatable (PARTNER or SOLITARY) — only additional ones are PARTNER-only. */}
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-btn-md items-center gap-1.5 rounded-btn bg-accent px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <Plus size={16} strokeWidth={1.5} />
              {t("addFirstInstance")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <InstanceCard key={c.id} config={c} />
          ))}
        </div>
      )}

      {/* SOLITARY upgrade banner */}
      {!isPartner && configs && configs.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-card border border-border bg-accent-subtle px-4 py-3">
          <Lock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-small font-medium text-foreground">{t("solitaryTitle")}</p>
            <p className="text-small text-text-secondary">{t("solitaryDesc")}</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
