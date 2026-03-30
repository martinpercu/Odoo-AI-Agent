"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { MeResponse } from "@/lib/types";
import { fetchMe } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";

interface SessionContextValue {
  meData: MeResponse | null;
  isLoading: boolean;
  isError: boolean;
  reload(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const getLocale = useCallback(() => {
    return pathname?.split("/")[1] || "en";
  }, [pathname]);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await fetchMe();
      if (result.success && result.data) {
        setMeData(result.data);
        // Guard: if user has no org, redirect to onboarding
        if (
          result.data.org === null &&
          !pathname?.includes("/onboarding") &&
          !pathname?.includes("/login") &&
          !pathname?.includes("/register") &&
          !pathname?.includes("/invite")
        ) {
          const locale = getLocale();
          router.push(`/${locale}/onboarding`);
        }
      } else {
        setIsError(true);
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, pathname, getLocale, router]);

  // Load session whenever user becomes available
  useEffect(() => {
    if (user) {
      load();
    } else {
      setMeData(null);
      setIsError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SessionContext.Provider value={{ meData, isLoading, isError, reload: load }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
