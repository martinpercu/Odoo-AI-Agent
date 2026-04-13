import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are configured. False → DEV MODE (no auth). */
export const IS_AUTH_ENABLED = !!(supabaseUrl && supabaseAnonKey);

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
