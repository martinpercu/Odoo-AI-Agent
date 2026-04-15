"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AppNotification } from "@/lib/types";

interface NotificationCardProps {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    borderColor: "border-l-error",
    iconColor: "text-error",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-l-warning-solid",
    iconColor: "text-warning-solid",
  },
  info: {
    icon: Info,
    borderColor: "border-l-info",
    iconColor: "text-info",
  },
  success: {
    icon: CheckCircle2,
    borderColor: "border-l-success-solid",
    iconColor: "text-success-solid",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const t = useTranslations("Notifications");
  const config = severityConfig[notification.severity] ?? severityConfig.info;
  const Icon = config.icon;

  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={() => onClick(notification)}
      className={`w-full rounded-md border border-border bg-surface p-3 text-left transition-colors hover:bg-raised border-l-[3px] ${config.borderColor} ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={16} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!notification.read && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            )}
            <p className={`truncate text-small leading-tight ${notification.read ? "font-normal" : "font-medium"}`}>
              {notification.title}
            </p>
          </div>
          <p className="mt-0.5 line-clamp-2 text-micro text-text-secondary">
            {notification.body}
          </p>
          <p className="mt-1 text-micro text-text-muted">
            {timeAgo(notification.createdAt)} {t("timeAgo")}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
