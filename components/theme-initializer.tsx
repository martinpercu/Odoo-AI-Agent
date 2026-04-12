"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ThemeInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, [pathname]);

  return null;
}
