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
import { supabase, IS_AUTH_ENABLED } from "@/lib/supabase";
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
  register(email: string, password: string): Promise<{ error?: string; accessToken?: string }>;
  logout(): void;
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
        const publicPaths = ["/login", "/register", "/invite", "/onboarding"];
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

  const register = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { accessToken: data.session?.access_token };
  }, []);

  const logout = useCallback(() => {
    supabase!.auth.signOut();
    setUser(null);
    const locale = getLocale();
    router.push(`/${locale}/login`);
  }, [getLocale, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
