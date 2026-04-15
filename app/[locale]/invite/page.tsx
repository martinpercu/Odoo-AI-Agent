"use client";

import { useEffect, useState, Suspense, FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { fetchInvitationInfo, acceptInvitation } from "@/lib/api";
import { Loader2, CheckCircle, AlertTriangle, UserPlus } from "lucide-react";

type PageStatus = "loading" | "register" | "submitting" | "success" | "no_token" | "expired" | "already_used" | "error";

function InviteContent() {
  const t = useTranslations("Invite");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const { reload } = useSession();

  const locale = pathname?.split("/")[1] || "en";
  const token = searchParams.get("token");

  const [status, setStatus] = useState<PageStatus>(token ? "loading" : "no_token");
  const [inviteEmail, setInviteEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchInvitationInfo(token).then((info) => {
      if (!info.success) {
        setStatus(info.status === 410 ? "expired" : "no_token");
        return;
      }
      setInviteEmail(info.email ?? "");
      setOrgName(info.org_name ?? "");
      setRole(info.role ?? "");
      setStatus("register");
    });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setStatus("submitting");

    const regResult = await register(inviteEmail, password);
    if (regResult.error) {
      setFormError(regResult.error);
      setStatus("register");
      return;
    }

    const accept = await acceptInvitation(token, regResult.accessToken);
    if (accept.success) {
      await reload();
      setStatus("success");
      setTimeout(() => router.push(`/${locale}/chat`), 2000);
      return;
    }

    switch (accept.status) {
      case 410: setStatus("expired"); break;
      case 409: setStatus("already_used"); break;
      default: setStatus("error"); break;
    }
  }

  if (status === "loading") {
    return (
      <Card>
        <Loader2 size={28} strokeWidth={1.5} className="mx-auto mb-4 animate-spin text-accent" />
        <p className="text-body text-text-secondary">{t("loadingDesc")}</p>
      </Card>
    );
  }

  if (status === "no_token") {
    return (
      <Card>
        <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto mb-4 text-error" />
        <h1 className="mb-2 text-heading">{t("notFound")}</h1>
        <p className="text-body text-text-secondary">{t("notFoundDesc")}</p>
      </Card>
    );
  }

  if (status === "expired") {
    return (
      <Card>
        <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto mb-4 text-error" />
        <h1 className="mb-2 text-heading">{t("expired")}</h1>
        <p className="text-body text-text-secondary">{t("expiredDesc")}</p>
      </Card>
    );
  }

  if (status === "already_used") {
    return (
      <Card>
        <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto mb-4 text-warning-solid" />
        <h1 className="mb-2 text-heading">{t("alreadyUsed")}</h1>
        <p className="mb-6 text-body text-text-secondary">{t("alreadyUsedDesc")}</p>
        <button
          onClick={() => router.push(`/${locale}/chat`)}
          className="h-9 rounded-md bg-accent px-4 text-body font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {t("goHome")}
        </button>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto mb-4 text-error" />
        <h1 className="mb-2 text-heading">{t("error")}</h1>
        <p className="text-body text-text-secondary">{t("errorDesc")}</p>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CheckCircle size={32} strokeWidth={1.5} className="mx-auto mb-4 text-success-solid" />
        <h1 className="mb-2 text-heading">{t("success")}</h1>
        <p className="text-body text-text-secondary">{t("successDesc")}</p>
      </Card>
    );
  }

  // ---- Register form ----
  return (
    <Card>
      <div className="mb-6 flex flex-col items-center gap-2">
        <UserPlus size={28} strokeWidth={1.5} className="text-accent" />
        <h1 className="text-heading">{t("registerTitle")}</h1>
        {orgName && (
          <p className="text-center text-body text-text-secondary">
            {t("registerDesc", { org: orgName })}
          </p>
        )}
        {role && (
          <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-small font-technical text-accent">
            {role}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-small font-medium text-text-secondary">{t("emailLabel")}</label>
          <input
            type="email"
            value={inviteEmail}
            readOnly
            className="rounded-md border border-border bg-raised px-3 py-2 text-body text-text-secondary cursor-default focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-small font-medium text-text-secondary">{t("passwordLabel")}</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-md border border-border bg-base px-3 py-2 text-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {formError && (
          <p className="rounded-md bg-error-subtle px-3 py-2 text-body text-error">{formError}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-1 flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 text-body font-medium text-white shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {status === "submitting" && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
          {status === "submitting" ? t("registering") : t("registerCta")}
        </button>
      </form>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center shadow-lg">
        {children}
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
