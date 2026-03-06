"use client";

import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AppNotification } from "@/lib/types";

interface NotificationCardProps {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    borderColor: "border-l-red-500",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-l-amber-500",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    borderColor: "border-l-blue-500",
    iconColor: "text-blue-500",
  },
  success: {
    icon: CheckCircle,
    borderColor: "border-l-emerald-500",
    iconColor: "text-emerald-500",
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={() => onClick(notification)}
      className={`w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 border-l-[3px] ${config.borderColor} ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={`mt-0.5 shrink-0 ${config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!notification.read && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
            <p className={`truncate text-xs leading-tight ${notification.read ? "font-normal" : "font-medium"}`}>
              {notification.title}
            </p>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {notification.body}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            {timeAgo(notification.createdAt)} {t("timeAgo")}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
