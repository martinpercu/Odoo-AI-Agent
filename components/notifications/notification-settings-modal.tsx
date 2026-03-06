"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationSettings } from "@/lib/types";

interface NotificationSettingsModalProps {
  onClose: () => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsModal({ onClose }: NotificationSettingsModalProps) {
  const t = useTranslations("Notifications");
  const { settings, updateSettings, loadSettings } = useNotifications();
  const [local, setLocal] = useState<NotificationSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    await updateSettings(local);
    setSaving(false);
    onClose();
  }

  function toggle(key: keyof NotificationSettings) {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("settingsTitle")}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toggles */}
        <div className="divide-y divide-border">
          <ToggleRow
            label={t("salesAlerts")}
            description={t("salesAlertsDesc")}
            checked={local.salesAlerts}
            onChange={() => toggle("salesAlerts")}
          />
          <ToggleRow
            label={t("stockAlerts")}
            description={t("stockAlertsDesc")}
            checked={local.stockAlerts}
            onChange={() => toggle("stockAlerts")}
          />
          <ToggleRow
            label={t("invoiceAlerts")}
            description={t("invoiceAlertsDesc")}
            checked={local.invoiceAlerts}
            onChange={() => toggle("invoiceAlerts")}
          />
          <ToggleRow
            label={t("dailySummary")}
            description={t("dailySummaryDesc")}
            checked={local.dailySummary}
            onChange={() => toggle("dailySummary")}
          />
        </div>

        {/* Save */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "..." : t("save")}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
