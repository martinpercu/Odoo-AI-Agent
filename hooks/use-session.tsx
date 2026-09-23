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
import { fetchMe, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";
import { ensureDemoVisitor } from "@/lib/demo-visitor";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";

interface SessionContextValue {
  meData: MeResponse | null;
  isLoading: boolean;
  isError: boolean;
  reload(): Promise<MeResponse | null>;
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

  const load = useCallback(async (): Promise<MeResponse | null> => {
    // Don't guard on `user` state here — authFetch reads the token fresh from
    // Supabase storage, so this works even if the React state hasn't updated yet
    // (e.g. called immediately after signInWithPassword before onAuthStateChange fires)
    setIsLoading(true);
    setIsError(false);
    try {
      // DI-11 — sin sesión de Supabase, el visitante del demo necesita una identidad
      // efímera ANTES del primer `/me`: es lo que hace que sus conversaciones se
      // guarden y que el sidebar deje de estar vacío. Idempotente (con una guardada
      // no llama al servidor) y nunca lanza: si falla, el visitante chatea igual,
      // sin historial, que es el comportamiento de antes de DI-11.
      //
      // Se lee el token de Supabase directo y no el `user` de React por la misma
      // razón que explica el comentario de arriba: el estado puede ir atrasado.
      const token = await getAccessToken();
      if (!token) await ensureDemoVisitor(API_BASE);

      const result = await fetchMe();
      if (result.success && result.data) {
        setMeData(result.data);
        // Guard: if real authenticated user has no org, redirect to onboarding
        // (skip for demo/unauthenticated stubs)
        if (
          user &&
          result.data.org === null &&
          result.data.user?.role !== "SUPERADMIN" &&
          !pathname?.includes("/onboarding") &&
          !pathname?.includes("/login") &&
          !pathname?.includes("/register") &&
          !pathname?.includes("/invite")
        ) {
          const locale = getLocale();
          router.push(`/${locale}/onboarding`);
        }
        return result.data;
      } else {
        setIsError(true);
        return null;
      }
    } catch {
      setIsError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, pathname, getLocale, router]);

  // Always load /me — works without JWT (returns demo stub when unauthenticated)
  useEffect(() => {
    load();
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
