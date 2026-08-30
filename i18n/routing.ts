import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en", "fr", "de", "pt", "it", "hi", "gu", "ta", "kn", "mr"],
  defaultLocale: "es",
});

/**
 * Subset of `routing.locales` rendered in language pickers
 * (UserMenu + superadmin HeaderActions).
 *
 * Routing still supports all 11 locales — `/pt`, `/it`, etc. keep resolving
 * on direct navigation (bookmarks, old links) — but the dropdown only exposes
 * these 3. `messages/*.json` for hidden locales are kept intact for an
 * instant rollback: widening this array is enough, no translations to regen.
 *
 * To show all again: `export const VISIBLE_LOCALES = routing.locales`
 * (or widen the list). To actually close routing, also shrink
 * `routing.locales` — then `/pt` would 404.
 */
export const VISIBLE_LOCALES = ["es", "en", "fr"] as const;
