"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Shield,
  Database,
  KeyRound,
  Tag,
  Sun,
  Moon,
  Globe,
  Server,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronUp,
  Check,
  User as UserIcon,
} from "lucide-react";
import { PoweredBy } from "@/components/ui/powered-by";
import { IntroSidebarItem } from "@/components/intro/intro-sidebar-item";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-session";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useIconSize } from "@/hooks/use-icon-size";
import { IS_AUTH_ENABLED } from "@/lib/supabase";
import { routing } from "@/i18n/routing";

interface UserMenuProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Derives up to two uppercase initials from an email or display name. */
function getInitials(value: string | undefined | null): string {
  if (!value) return "";
  const local = value.split("@")[0];
  const parts = local.split(/[.\-_\s]+/).filter(Boolean);
  if (parts.length === 0) return local.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type SubMenu = "lang" | "instance" | null;

export function UserMenu({ collapsed = false, onNavigate }: UserMenuProps) {
  const t = useTranslations("UserMenu");
  const tLocale = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout, updateUserLang } = useAuth();
  const { meData } = useSession();
  const { configs, activeConfigId, setActiveConfigId } = useOdooConfig();
  const iconInline = useIconSize("inline");

  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<SubMenu>(null);
  const [isDark, setIsDark] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSub(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function close() {
    setOpen(false);
    setSub(null);
    onNavigate?.();
  }

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
    // Best-effort: keep the language used for transactional emails in sync.
    if (user) void updateUserLang(next);
    close();
  }

  function selectInstance(id: string) {
    setActiveConfigId(id);
    setSub(null);
  }

  const role = meData?.user?.role;
  const email = meData?.user?.email ?? user?.email ?? null;
  const initials = getInitials(email);
  const isSuperAdmin = role === "SUPERADMIN";
  const isClient = role !== "ADMIN" && role !== "SUPERADMIN";
  const settingsHref = user && !meData?.org ? "/onboarding" : "/settings";
  // An ADMIN who hasn't connected their first instance (no configs) only gets
  // Instances — Settings stays hidden until there's at least one instance.
  const showSettings = !(role === "ADMIN" && configs.length === 0);

  // A config is "chat-ready" when the caller's Connection is active (spec §6.2).
  // Fall back to credential presence when the status field isn't populated.
  const isChatReady = (c: (typeof configs)[number]) =>
    c.connection_status ? c.connection_status === "active" : c.hasCredentials;
  const showInstance = configs.length > 1;
  const activeConfig = configs.find((c) => c.id === activeConfigId);

  function configureInstance(id: string) {
    setActiveConfigId(id);
    setSub(null);
    router.push("/settings/odoo");
    close();
  }

  const secondaryLine = [meData?.org?.name].filter(Boolean).join(" · ");

  const itemClass =
    "flex w-full items-center gap-3 rounded-btn px-2.5 py-2 text-body text-left transition-colors hover:bg-raised";
  const sidebarItemClass =
    "flex w-full items-center gap-3 rounded-btn px-2.5 py-2 text-body text-left transition-colors hover:bg-sidebar-hover";

  // Anonymous / DEV mode — show items inline, no avatar trigger
  const isAnonymous = !IS_AUTH_ENABLED || !user;

  if (isAnonymous) {
    return (
      <div ref={ref} className="relative">
        <div className="flex flex-col gap-0.5">
          {/* What is TheOdooAgent? */}
          <IntroSidebarItem
            collapsed={collapsed}
            onOpened={onNavigate}
            className={`${sidebarItemClass} ${collapsed ? "justify-center" : ""}`}
          />

          {/* Pricing */}
          <Link
            href="/pricing"
            onClick={() => onNavigate?.()}
            className={`${sidebarItemClass} ${collapsed ? "justify-center" : ""}`}
            aria-label={collapsed ? t("pricing") : undefined}
          >
            <Tag size={iconInline} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span className="flex-1">{t("pricing")}</span>}
          </Link>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className={`${sidebarItemClass} ${collapsed ? "justify-center" : ""}`}
          >
            {isDark ? (
              <Sun size={iconInline} strokeWidth={1.5} className="shrink-0" />
            ) : (
              <Moon size={iconInline} strokeWidth={1.5} className="shrink-0" />
            )}
            {!collapsed && (
              <>
                <span className="flex-1">{t("theme")}</span>
                <span className="text-micro text-text-muted">
                  {isDark ? t("themeDark") : t("themeLight")}
                </span>
              </>
            )}
          </button>

          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setSub((s) => (s === "lang" ? null : "lang"))}
              className={`${sidebarItemClass} ${collapsed ? "justify-center" : ""}`}
            >
              <Globe size={iconInline} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{t("language")}</span>
                  <span className="text-micro text-text-muted">{tLocale(locale)}</span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className={`shrink-0 transition-transform ${sub === "lang" ? "rotate-90" : ""}`}
                  />
                </>
              )}
            </button>

            <AnimatePresence>
              {sub === "lang" && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute bottom-0 left-full z-50 ml-1 max-h-[60vh] w-44 overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-lg"
                >
                  {routing.locales.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => switchLocale(loc)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-raised ${
                        loc === locale ? "font-medium text-accent" : ""
                      }`}
                    >
                      <span className="flex-1">{tLocale(loc)}</span>
                      {loc === locale && (
                        <Check size={14} strokeWidth={2} className="shrink-0 text-accent" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Login (only when auth is actually enabled) */}
          {IS_AUTH_ENABLED && (
            <Link
              href="/login"
              onClick={() => onNavigate?.()}
              className={`${sidebarItemClass} ${collapsed ? "justify-center" : ""}`}
            >
              <LogIn size={iconInline} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && <span className="flex-1">{t("login")}</span>}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Authenticated user — avatar trigger + popup
  return (
    <div ref={ref} className="relative">
      {/* Trigger: avatar button */}
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (!next) setSub(null);
            return next;
          });
        }}
        className={`flex w-full items-center gap-3 rounded-btn px-2 py-2 transition-colors hover:bg-sidebar-hover ${
          collapsed ? "justify-center" : ""
        }`}
        aria-label={email ?? t("guest")}
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-small font-medium text-white">
          {initials || <UserIcon size={iconInline} strokeWidth={1.5} />}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-body">{email ?? t("guest")}</span>
              {secondaryLine && (
                <span className="block truncate text-micro text-text-muted">{secondaryLine}</span>
              )}
            </span>
            <ChevronUp
              size={14}
              strokeWidth={1.5}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[240px] overflow-visible rounded-card border border-border bg-surface py-1 shadow-lg"
          >
            {/* Instance switcher */}
            {showInstance && (
              <>
                <div className="relative px-1">
                  <button
                    onClick={() => setSub((s) => (s === "instance" ? null : "instance"))}
                    className={itemClass}
                  >
                    <Server size={iconInline} strokeWidth={1.5} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-micro text-text-muted">{t("instance")}</span>
                      <span className="block truncate">{activeConfig?.label ?? "—"}</span>
                    </span>
                    <ChevronRight
                      size={14}
                      strokeWidth={1.5}
                      className={`shrink-0 transition-transform ${sub === "instance" ? "rotate-90" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {sub === "instance" && (
                      <motion.div
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute bottom-0 left-full z-50 ml-1 max-h-[60vh] w-56 overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-lg"
                      >
                        {configs.map((config) => {
                          const ready = isChatReady(config);
                          return (
                            <button
                              key={config.id}
                              onClick={() => (ready ? selectInstance(config.id) : configureInstance(config.id))}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-raised"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {config.label}
                                {ready && config.odoo_username ? (
                                  <span className="block truncate text-micro text-text-muted">
                                    {config.odoo_username}
                                  </span>
                                ) : !ready ? (
                                  <span className="block truncate text-micro text-warning-solid">
                                    {t("configureToChat")}
                                  </span>
                                ) : null}
                              </span>
                              {config.id === activeConfigId && (
                                <Check size={14} strokeWidth={2} className="shrink-0 text-accent" />
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="my-1 border-b border-border" />
              </>
            )}

            {/* Navigation links */}
            <div className="px-1">
              {user && role === "ADMIN" && meData?.org && (
                <Link href="/instances" onClick={close} className={itemClass}>
                  <Database size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("instances")}</span>
                </Link>
              )}
              {user && meData?.org && configs.length > 0 && (
                <Link href="/settings/odoo" onClick={close} className={itemClass}>
                  <KeyRound size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("myConnection")}</span>
                </Link>
              )}
              {user && showSettings && (
                <Link href={settingsHref} onClick={close} className={itemClass}>
                  <Settings size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("settings")}</span>
                </Link>
              )}
              {isSuperAdmin && (
                <Link href="/superadmin" onClick={close} className={itemClass}>
                  <Shield size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("superAdmin")}</span>
                </Link>
              )}
            </div>

            {/* Preferences: intro + theme + language */}
            <div className="my-1 border-t border-border" />
            <div className="px-1">
              <IntroSidebarItem onOpened={close} className={itemClass} />

              {!isClient && (
                <Link href="/pricing" onClick={close} className={itemClass}>
                  <Tag size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("pricing")}</span>
                </Link>
              )}

              <button onClick={toggleTheme} className={itemClass}>
                {isDark ? (
                  <Sun size={iconInline} strokeWidth={1.5} className="shrink-0" />
                ) : (
                  <Moon size={iconInline} strokeWidth={1.5} className="shrink-0" />
                )}
                <span className="flex-1">{t("theme")}</span>
                <span className="text-micro text-text-muted">
                  {isDark ? t("themeDark") : t("themeLight")}
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setSub((s) => (s === "lang" ? null : "lang"))}
                  className={itemClass}
                >
                  <Globe size={iconInline} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1">{t("language")}</span>
                  <span className="text-micro text-text-muted">{tLocale(locale)}</span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className={`shrink-0 transition-transform ${sub === "lang" ? "rotate-90" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {sub === "lang" && (
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute bottom-0 left-full z-50 ml-1 max-h-[60vh] w-44 overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-lg"
                    >
                      {routing.locales.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => switchLocale(loc)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors hover:bg-raised ${
                            loc === locale ? "font-medium text-accent" : ""
                          }`}
                        >
                          <span className="flex-1">{tLocale(loc)}</span>
                          {loc === locale && (
                            <Check size={14} strokeWidth={2} className="shrink-0 text-accent" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Auth action */}
            <div className="my-1 border-t border-border" />
            <div className="px-1">
              <button
                onClick={() => {
                  logout();
                  close();
                }}
                className={`${itemClass} text-text-secondary`}
              >
                <LogOut size={iconInline} strokeWidth={1.5} className="shrink-0" />
                <span className="flex-1">{t("logout")}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powered by — always visible below the trigger (Client only) */}
      {isClient && !collapsed && (
        <div className="mt-3 flex justify-center border-t border-sidebar-border pt-3">
          <PoweredBy />
        </div>
      )}
    </div>
  );
}
