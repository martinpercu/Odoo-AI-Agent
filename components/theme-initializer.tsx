"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";

export function ThemeInitializer() {
  const { meData } = useSession();

  // Tema: sincronizar dark/light desde localStorage al montar
  useEffect(() => {
    const h = document.documentElement;
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      h.classList.add("dark");
    } else {
      h.classList.remove("dark");
    }
  }, []);

  // Audience: aplicar builder/client según role cuando /me responde
  useEffect(() => {
    if (meData === null) return;
    const h = document.documentElement;
    const role = meData.user?.role;
    if (role === "ADMIN" || role === "SUPERADMIN") {
      h.classList.remove("client");
      h.classList.add("builder");
      localStorage.setItem("audience", "builder");
    } else {
      h.classList.remove("builder");
      h.classList.add("client");
      localStorage.setItem("audience", "client");
    }
  }, [meData]);

  return null;
}
