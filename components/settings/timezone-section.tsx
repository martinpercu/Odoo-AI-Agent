"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, Loader2 } from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { setMyTimezone } from "@/lib/api";

/**
 * La lista de zonas sale del navegador (`Intl.supportedValuesOf`), no de una constante
 * nuestra: una lista propia se desactualiza y la base IANA no. El backend valida contra
 * `ZoneInfo` de todos modos, así que una zona que el browser conozca y el servidor no
 * devuelve un 422 explícito en vez de guardarse mal.
 */
function supportedTimezones(): string[] {
  try {
    const withValues = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    const zones = withValues.supportedValuesOf?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    // Navegador viejo: se cae al detectado + UTC, que alcanza para no dejar a nadie
    // sin poder elegir.
  }
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return Array.from(new Set([detected, "UTC"].filter(Boolean)));
}

/**
 * Zona horaria del usuario (Fase 4 · F3).
 *
 * ⭐ **Es el dato que decide a qué hora llega un digest**, y por eso vive acá y no en
 * `/settings`: es una preferencia personal, y un `CLIENT_USER` —que también agenda— no
 * tiene acceso a la pantalla de administración.
 *
 * ⚠️ **"Heredar de mi organización" es un valor, no la ausencia de uno.** Limpiar la
 * elección (`null`) devuelve al usuario al default de su org, que es un estado distinto
 * de "elegí UTC" y tiene que poder verse y volver a elegirse.
 *
 * Los agendados que YA existen no se re-agendan al cambiar esto: guardaron su zona
 * cuando se crearon. Se dice en pantalla, porque lo contrario —que un cambio de perfil
 * mueva en silencio la hora de cinco digests— sería peor.
 */
export function TimezoneSection() {
  const t = useTranslations("Connection");
  const { meData, reload } = useSession();

  const zones = useMemo(() => supportedTimezones(), []);
  const stored = meData?.user?.timezone ?? "";
  const effective = meData?.timezone;
  const orgDefault = meData?.org?.default_timezone;

  const [value, setValue] = useState(stored);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  const save = async (next: string) => {
    setValue(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await setMyTimezone(next || null);
    setSaving(false);
    if (res.success) {
      setSaved(true);
      await reload();
      return;
    }
    setError(res.error ?? t("timezoneFailed"));
  };

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <Clock size={18} strokeWidth={1.5} className="shrink-0 text-accent" aria-hidden />
        <h3 className="text-subheading">{t("timezoneTitle")}</h3>
      </div>
      <p className="mb-4 text-small text-text-secondary">{t("timezoneSubtitle")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => save(e.target.value)}
          disabled={saving}
          aria-label={t("timezoneTitle")}
          className="h-btn-md min-w-0 flex-1 rounded-btn border border-border bg-base px-3 text-small focus:border-accent focus:outline-none disabled:opacity-50"
        >
          {/* El primer ítem es "heredar", no un placeholder vacío. */}
          <option value="">
            {orgDefault
              ? t("timezoneInheritWith", { timezone: orgDefault })
              : t("timezoneInherit")}
          </option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {saving && <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-text-muted" />}
        {saved && !saving && (
          <span className="flex items-center gap-1 text-small text-success-solid">
            <Check size={15} strokeWidth={1.5} aria-hidden />
            {t("timezoneSaved")}
          </span>
        )}
      </div>

      {/* Lo que importa de verdad: con qué zona se va a interpretar "a las 8:00". */}
      {effective && (
        <p className="mt-3 text-micro text-text-muted">
          {t("timezoneEffective", { timezone: effective })}
        </p>
      )}

      {/* Un atajo honesto: si la del browser no es la efectiva, probablemente sea la que
          el usuario quiere — pero se ofrece, no se aplica sola. */}
      {detected && detected !== effective && (
        <button
          type="button"
          onClick={() => save(detected)}
          disabled={saving}
          className="mt-2 text-micro text-accent transition-colors hover:underline disabled:opacity-50"
        >
          {t("timezoneUseDetected", { timezone: detected })}
        </button>
      )}

      <p className="mt-3 text-micro text-text-muted">{t("timezoneExistingNote")}</p>
      {error && <p className="mt-2 text-small text-error">{error}</p>}
    </div>
  );
}
