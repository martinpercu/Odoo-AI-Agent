import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en", "fr", "de", "pt"],
  defaultLocale: "es",
});
