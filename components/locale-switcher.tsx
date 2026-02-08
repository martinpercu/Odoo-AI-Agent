"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe, ChevronDown } from "lucide-react";
import { routing } from "@/i18n/routing";

interface LocaleSwitcherProps {
  collapsed?: boolean;
}

export function LocaleSwitcher({ collapsed = false }: LocaleSwitcherProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchTo(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-hover"
      >
        <Globe size={18} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{t(locale)}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full min-w-[160px] rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchTo(loc)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-hover ${
                loc === locale ? "font-medium text-primary" : ""
              }`}
            >
              {t(loc)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
