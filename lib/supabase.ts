import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are configured. False → DEV MODE (no auth). */
export const IS_AUTH_ENABLED = !!(supabaseUrl && supabaseAnonKey);

/**
 * Locales the transactional email templates (e.g. password recovery) can render.
 * App locales outside this set fall back to the bilingual EN/ES email — so we only
 * persist `user_metadata.lang` when it's one of these.
 */
export const SUPPORTED_EMAIL_LANGS = ["es", "en", "fr", "de", "pt", "it"] as const;
export type SupportedEmailLang = (typeof SUPPORTED_EMAIL_LANGS)[number];

/** Returns the lang if the email templates support it, otherwise undefined (best-effort). */
export function normalizeEmailLang(lang: string | undefined): SupportedEmailLang | undefined {
  return SUPPORTED_EMAIL_LANGS.includes(lang as SupportedEmailLang)
    ? (lang as SupportedEmailLang)
    : undefined;
}

// Only create the client when both env vars are present.
export const supabase: SupabaseClient | null = IS_AUTH_ENABLED
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * Returns the current Supabase access token, or null in DEV MODE / not logged in.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
