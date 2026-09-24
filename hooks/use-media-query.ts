"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `true` mientras la media query coincide. Reactivo (rotar el teléfono o achicar la
 * ventana actualiza) y con un snapshot de SSR fijo en `false`, así el primer render
 * del servidor y el del cliente coinciden y no hay error de hidratación.
 *
 * Para lo que CSS no puede resolver — un atributo como `placeholder` no tiene
 * variantes responsive. Para estilos, usá los breakpoints de Tailwind.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
