"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";

/**
 * Aviso de conexión caída (spec §6.8). Aislado por usuario: sólo lo ve el usuario
 * cuya Connection quedó `invalid`. CTA para re-cargar la API key.
 * Audience-neutral copy via the `Connection` namespace ({company} interpolated).
 */
export function ConnectionInvalidBanner({
  companyName,
  onReload,
}: {
  companyName?: string | null;
  onReload?: () => void;
}) {
  const t = useTranslations("Connection.invalidBanner");
  const company = companyName || t("yourSystem");

  return (
    <div className="flex items-start gap-3 rounded-card border border-error/30 bg-error-subtle px-4 py-3">
      <ShieldAlert size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-error" />
      <div className="min-w-0 flex-1">
        <p className="text-small font-medium text-error">{t("title", { company })}</p>
        <p className="text-small text-text-secondary">{t("desc")}</p>
      </div>
      {onReload && (
        <button
          type="button"
          onClick={onReload}
          className="shrink-0 rounded-btn bg-error px-3 py-1.5 text-small font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </button>
      )}
    </div>
  );
}
