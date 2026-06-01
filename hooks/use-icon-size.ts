"use client";

import { useSession } from "@/hooks/use-session";

type IconSlot = "inline" | "button" | "heading";

const SIZES: Record<"builder" | "client", Record<IconSlot, number>> = {
  builder: { inline: 16, button: 20, heading: 24 },
  client:  { inline: 18, button: 22, heading: 28 },
};

export function useIconSize(slot: IconSlot = "inline"): number {
  const { meData } = useSession();
  const role = meData?.user?.role;
  const audience = role === "ADMIN" || role === "SUPERADMIN" ? "builder" : "client";
  return SIZES[audience][slot];
}
