import type { SeatType, InstanceSeats } from "@/lib/types";

/**
 * Derive which seat types are actually available given the current seat counts.
 *
 * Cases:
 *   both available  → show selector (paid default)
 *   only paid       → hide selector, auto-select paid
 *   only free       → hide selector, auto-select free
 *   none available  → disable form, show warning
 *   no seats data   → show selector (backwards-compatible, paid default)
 */
export function deriveSeatState(seats: InstanceSeats | undefined) {
  if (!seats) return { hasPaid: true, hasFree: true, showSelector: true, noSeats: false, autoType: "paid" as SeatType };

  const hasPaid = seats.paid_total > 0 && seats.paid_used < seats.paid_total;
  const hasFree = seats.free_total > 0 && seats.free_used < seats.free_total;
  const showSelector = hasPaid && hasFree;
  const noSeats = !hasPaid && !hasFree;
  const autoType: SeatType = !hasPaid && hasFree ? "free" : "paid";

  return { hasPaid, hasFree, showSelector, noSeats, autoType };
}
