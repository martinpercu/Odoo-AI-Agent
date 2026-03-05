"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Settings, Shield } from "lucide-react";
import { ConnectionForm } from "@/components/odoo/connection-form";
import { InstanceInspector } from "@/components/odoo/instance-inspector";

export default function SettingsPage() {
  const t = useTranslations("Settings");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Settings size={24} className="text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground">
            {t("subheading")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <ConnectionForm />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">{t("inspector.heading")}</h2>
          <InstanceInspector />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-start gap-3 rounded-xl bg-muted p-4"
        >
          <Shield size={20} className="mt-0.5 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">{t("security.title")}</p>
            <p>{t("security.description")}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
