"use client";

import { useSession } from "@/hooks/use-session";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders a document number.
 *
 * - Client (CLIENT_USER): wrapped in `.docnum` — Roboto Mono, soft warm-raised pill, the ONLY mono surface the Client sees.
 * - Builder (ADMIN/SUPERADMIN): plain `.font-technical` — mono everywhere is already the norm, no pill.
 */
export function DocNum({ children, className = "" }: Props) {
  const { meData } = useSession();
  const isClient = meData?.user?.role === "CLIENT_USER" || !meData?.user;
  const cls = isClient ? "docnum" : "font-technical";
  return <span className={`${cls} ${className}`.trim()}>{children}</span>;
}
