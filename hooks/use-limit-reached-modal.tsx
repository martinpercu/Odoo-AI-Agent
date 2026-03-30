"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface LimitReachedModalContextValue {
  isOpen: boolean;
  showLimitModal(): void;
  hideLimitModal(): void;
}

const LimitReachedModalContext = createContext<LimitReachedModalContextValue | null>(null);

export function LimitReachedModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const showLimitModal = useCallback(() => setIsOpen(true), []);
  const hideLimitModal = useCallback(() => setIsOpen(false), []);

  // Listen for 402 events dispatched by authFetch
  useEffect(() => {
    const handle402 = () => showLimitModal();
    window.addEventListener("auth:limit_reached", handle402);
    return () => window.removeEventListener("auth:limit_reached", handle402);
  }, [showLimitModal]);

  return (
    <LimitReachedModalContext.Provider value={{ isOpen, showLimitModal, hideLimitModal }}>
      {children}
    </LimitReachedModalContext.Provider>
  );
}

export function useLimitReachedModal(): LimitReachedModalContextValue {
  const ctx = useContext(LimitReachedModalContext);
  if (!ctx) throw new Error("useLimitReachedModal must be used within LimitReachedModalProvider");
  return ctx;
}
