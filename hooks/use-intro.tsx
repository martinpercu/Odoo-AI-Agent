"use client";

/**
 * Shared state for the landing surfaces:
 *  - Surface A: welcome modal (auto-opens once on first demo visit).
 *  - Surface B: info panel (drawer), reachable from the sidebar any time.
 *
 * Dismissal is persisted in localStorage (`toa_intro_dismissed`). Per the spec
 * decision (D3), any close of the modal persists the dismissal by default, so it
 * won't auto-reappear on later visits. The "no mostrar de nuevo" checkbox is the
 * explicit reinforcement; unchecking it before closing keeps it session-only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DISMISS_KEY = "toa_intro_dismissed";

interface IntroContextValue {
  isModalOpen: boolean;
  isPanelOpen: boolean;
  /** Whether the modal has been permanently dismissed (persisted). */
  dismissed: boolean;
  /** True once localStorage has been read — gates auto-open to avoid a flash. */
  ready: boolean;
  openModal: () => void;
  /** Close the modal. `persist` (default true) writes the permanent dismissal flag. */
  closeModal: (persist?: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
}

const IntroContext = createContext<IntroContextValue | null>(null);

export function useIntro(): IntroContextValue {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(false);
  // Default `true` until we read storage → prevents auto-open flash before hydration.
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isDismissed = false;
    try {
      isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      isDismissed = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from localStorage (browser-only)
    setDismissed(isDismissed);
    setReady(true);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);

  const closeModal = useCallback((persist = true) => {
    setModalOpen(false);
    if (persist) {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      setDismissed(true);
    }
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <IntroContext.Provider
      value={{
        isModalOpen,
        isPanelOpen,
        dismissed,
        ready,
        openModal,
        closeModal,
        openPanel,
        closePanel,
      }}
    >
      {children}
    </IntroContext.Provider>
  );
}
