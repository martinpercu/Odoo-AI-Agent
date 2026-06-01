"use client";

import { Lockup } from "@/components/AgentMark";

/**
 * "Powered by TheOdooAgent" — discreto footer.
 * Pensado para mostrarse SÓLO al Client (white-label parcial:
 * el implementador prevalece visualmente, TheOdooAgent queda como crédito chico).
 */
export function PoweredBy() {
  return (
    <div className="flex items-center gap-1.5 text-micro text-text-muted">
      <span>Powered by</span>
      <Lockup size={12} wordColor="currentColor" />
    </div>
  );
}
