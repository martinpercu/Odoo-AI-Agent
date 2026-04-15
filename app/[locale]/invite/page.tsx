"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { acceptInvitation } from "@/lib/api";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

type InviteStatus = "loading" | "success" | "not_found" | "already_used" | "expired" | "error";

function InviteContent() {
  const t = useTranslations("Invite");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { reload } = useSession();

  const [status, setStatus] = useState<InviteStatus>("loading");
  const locale = pathname?.split("/")[1] || "en";
  const token = searchParams.get("token");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("not_found");
      return;
    }

    if (!user) {
      sessionStorage.setItem("invite_token", token);
      router.push(`/${locale}/login?next=${encodeURIComponent(`/${locale}/invite?token=${token}`)}`);
      return;
    }

    acceptInvitation(token).then(async (result) => {
      if (result.success) {
        await reload();
        setStatus("success");
        setTimeout(() => router.push(`/${locale}/chat`), 2000);
      } else {
        switch (result.status) {
          case 404: setStatus("not_found"); break;
          case 409: setStatus("already_used"); break;
          case 410: setStatus("expired"); break;
          default: setStatus("error"); break;
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, token]);

  const messages: Record<InviteStatus, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: {
      icon: <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-accent" />,
      title: t("loading"),
      desc: t("loadingDesc"),
    },
    success: {
      icon: <CheckCircle size={32} strokeWidth={1.5} className="text-success-solid" />,
      title: t("success"),
      desc: t("successDesc"),
    },
    not_found: {
      icon: <AlertTriangle size={32} strokeWidth={1.5} className="text-error" />,
      title: t("notFound"),
      desc: t("notFoundDesc"),
    },
    already_used: {
      icon: <AlertTriangle size={32} strokeWidth={1.5} className="text-warning-solid" />,
      title: t("alreadyUsed"),
      desc: t("alreadyUsedDesc"),
    },
    expired: {
      icon: <AlertTriangle size={32} strokeWidth={1.5} className="text-error" />,
      title: t("expired"),
      desc: t("expiredDesc"),
    },
    error: {
      icon: <AlertTriangle size={32} strokeWidth={1.5} className="text-error" />,
      title: t("error"),
      desc: t("errorDesc"),
    },
  };

  const msg = messages[status];

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-10 text-center shadow-lg">
        <div className="mb-4 flex justify-center">{msg.icon}</div>
        <h1 className="mb-2 text-heading">{msg.title}</h1>
        <p className="text-body text-text-secondary">{msg.desc}</p>

        {status !== "loading" && status !== "success" && (
          <button
            onClick={() => router.push(`/${locale}/chat`)}
            className="mt-6 h-9 rounded-md bg-accent px-4 py-2 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            {t("goHome")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-accent" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
