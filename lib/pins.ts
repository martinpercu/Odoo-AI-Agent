import type { PinnedInsight } from "@/lib/types";

/**
 * ¿Esta tarjeta se puede volver a consultar? (X-01)
 *
 * `refreshable` lo decide el backend; `undefined` (pins que llegaron por un endpoint que
 * no lo manda) cae a "refrescable si es en vivo". Ya **no** depende de la instancia
 * activa ni de estar en demo: el backend refresca cada pin contra la SUYA, así que lo
 * único que lo impide es no saber cuál es (`odoo_config_id: null`). `undefined` es un pin
 * recién fijado que todavía no volvió de `/me/pins`: se deja intentar y decide el backend.
 */
export function isPinRefreshable(pin: PinnedInsight): boolean {
  if (pin.kind !== "chart" || pin.odoo_config_id === null) return false;
  return pin.refreshable ?? (pin.query_context?.volatility ?? "variable") === "variable";
}
