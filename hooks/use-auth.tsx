"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, IS_AUTH_ENABLED, normalizeEmailLang } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

/** Stub user for DEV MODE (no Supabase configured). */
const DEV_USER: User = {
  id: "dev-user",
  email: "dev@localhost",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<{ error?: string }>;
  register(
    email: string,
    password: string,
    lang?: string,
  ): Promise<{ error?: string; accessToken?: string }>;
  logout(): void;
  /** Step 1 of password recovery: email the user a 6-digit OTP. */
  requestPasswordReset(email: string): Promise<{ error?: string; rateLimited?: boolean }>;
  /** Step 2a: verify the recovery OTP — on success Supabase opens a session. */
  verifyRecoveryCode(email: string, code: string): Promise<{ error?: string }>;
  /** Step 2b: set a new password for the OTP-authenticated user. */
  updatePassword(newPassword: string): Promise<{ error?: string }>;
  /** Best-effort: persist the user's UI language in metadata (localizes emails). */
  updateUserLang(lang: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // DEV MODE: skip all Supabase logic
  if (!IS_AUTH_ENABLED) {
    const devValue: AuthContextValue = {
      user: DEV_USER,
      isLoading: false,
      login: async () => ({}),
      register: async () => ({}),
      logout: () => {},
      requestPasswordReset: async () => ({}),
      verifyRecoveryCode: async () => ({}),
      updatePassword: async () => ({}),
      updateUserLang: async () => {},
    };
    return <AuthContext.Provider value={devValue}>{children}</AuthContext.Provider>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [user, setUser] = useState<User | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLoading, setIsLoading] = useState(true);

  const getLocale = useCallback(() => {
    return pathname?.split("/")[1] || "en";
  }, [pathname]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // Restore session on mount
    supabase!.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Handle 401 events dispatched by authFetch
    const handle401 = () => {
      // If there's no active session, the 401 is expected (unauthenticated user
      // hitting a protected endpoint) — don't redirect to login.
      supabase!.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        const currentPath = window.location.pathname;
        const publicPaths = [
          "/login",
          "/register",
          "/invite",
          "/onboarding",
          "/forgot-password",
          "/reset-password",
        ];
        const withoutLocale = "/" + currentPath.split("/").slice(2).join("/");
        if (publicPaths.some((p) => withoutLocale.startsWith(p))) return;
        setUser(null);
        supabase!.auth.signOut();
        const locale = getLocale();
        router.push(`/${locale}/login`);
      });
    };

    window.addEventListener("auth:unauthorized", handle401);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("auth:unauthorized", handle401);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const register = useCallback(async (email: string, password: string, lang?: string) => {
    const emailLang = normalizeEmailLang(lang);
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      // Persist the chosen language so transactional emails arrive localized.
      // Unsupported locales are dropped → email falls back to bilingual EN/ES.
      options: emailLang ? { data: { lang: emailLang } } : undefined,
    });
    if (error) return { error: error.message };
    return { accessToken: data.session?.access_token };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const requestPasswordReset = useCallback(async (email: string) => {
    // OTP flow: do NOT pass { redirectTo } — that's for magic links.
    const { error } = await supabase!.auth.resetPasswordForEmail(email);
    if (error) {
      // Anti-enumeration: a non-existent email does NOT error. Only surface
      // real failures (rate limit). The caller always advances to step 2.
      if (error.status === 429) return { error: error.message, rateLimited: true };
      return { error: error.message };
    }
    return {};
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const verifyRecoveryCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase!.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateUserLang = useCallback(async (lang: string) => {
    const emailLang = normalizeEmailLang(lang);
    if (!emailLang) return; // unsupported locale → leave metadata untouched
    try {
      await supabase!.auth.updateUser({ data: { lang: emailLang } });
    } catch {
      // Best-effort — never block the UI on a metadata sync.
    }
  }, []);

  const logout = useCallback(() => {
    supabase!.auth.signOut();
    setUser(null);
    const locale = getLocale();
    router.push(`/${locale}/login`);
  }, [getLocale, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        verifyRecoveryCode,
        updatePassword,
        updateUserLang,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
