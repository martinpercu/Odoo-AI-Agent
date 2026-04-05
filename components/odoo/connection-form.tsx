"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Database,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plug,
} from "lucide-react";
import { createOdooConfig, NETWORK_ERROR } from "@/lib/api";
import { useSession } from "@/hooks/use-session";

interface ConfigFormState {
  label: string;
  url: string;
  db_name: string;
}

type SaveStatus = "idle" | "loading" | "success" | "error";

export function ConnectionForm() {
  const t = useTranslations("Settings.form");
  const router = useRouter();
  const pathname = usePathname();
  const { meData, reload } = useSession();

  const [form, setForm] = useState<ConfigFormState>({
    label: "",
    url: "",
    db_name: "",
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const orgId = meData?.org?.id;
    if (!orgId) return;

    setStatus("loading");
    setErrorMessage(null);

    const result = await createOdooConfig(orgId, {
      label: form.label || undefined,
      url: form.url,
      db_name: form.db_name,
    });

    if (result.success) {
      setStatus("success");
      await reload();
      const locale = pathname.split("/")[1] || "en";
      setTimeout(() => router.push(`/${locale}/chat`), 600);
    } else {
      setStatus("error");
      setErrorMessage(
        result.error === NETWORK_ERROR ? t("networkError") : result.error ?? t("statusError")
      );
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Label (optional) */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-small font-medium text-text-secondary">
          <Tag size={16} strokeWidth={1.5} className="text-text-secondary" />
          {t("labelLabel")}
          <span className="text-text-muted">({t("optional")})</span>
        </label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder={t("labelPlaceholder")}
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-body outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-1"
        />
      </div>

      {/* URL */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-small font-medium text-text-secondary">
          <Globe size={16} strokeWidth={1.5} className="text-text-secondary" />
          {t("urlLabel")}
        </label>
        <input
          type="url"
          required
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder={t("urlPlaceholder")}
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-1"
        />
      </div>

      {/* DB Name */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-small font-medium text-text-secondary">
          <Database size={16} strokeWidth={1.5} className="text-text-secondary" />
          {t("databaseLabel")}
        </label>
        <input
          type="text"
          required
          value={form.db_name}
          onChange={(e) => setForm({ ...form, db_name: e.target.value })}
          placeholder={t("databasePlaceholder")}
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-body font-technical outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-1"
        />
      </div>

      {/* Status feedback */}
      <AnimatePresence mode="wait">
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-body ${
                status === "loading"
                  ? "bg-raised text-text-secondary"
                  : status === "success"
                    ? "bg-success-subtle text-success-solid"
                    : "bg-error-subtle text-error"
              }`}
            >
              {status === "loading" && (
                <>
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  <span>{t("statusSaving")}</span>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.5} />
                  <span>{t("statusSaved")}</span>
                </>
              )}
              {status === "error" && (
                <>
                  <AlertTriangle size={16} strokeWidth={1.5} />
                  <span className="font-technical">{errorMessage ?? t("statusError")}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="flex h-9 items-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {status === "loading" ? (
          <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 size={16} strokeWidth={1.5} />
        ) : (
          <Plug size={16} strokeWidth={1.5} />
        )}
        {status === "success" ? t("saved") : t("saveConfig")}
      </button>
    </form>
  );
}
