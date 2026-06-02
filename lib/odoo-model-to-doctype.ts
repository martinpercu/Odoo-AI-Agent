/**
 * Maps Odoo model names (`account.move`, `sale.order`, etc.) to user-facing
 * document categories used to pick natural-language copy in Client voice.
 *
 * Builder voice uses the raw model name directly — this lookup is only
 * consumed when rendering for CLIENT_USER (and anonymous, which defaults to Client).
 *
 * Extend `MODEL_TO_DOCTYPE` as new Odoo models start appearing in metadata.
 * For any unmapped model the helper returns `"generic"`, which all i18n
 * namespaces must support as a fallback.
 */

export const MODEL_TO_DOCTYPE = {
  "account.move": "invoice",
  "account.payment": "payment",
  "sale.order": "order",
  "purchase.order": "purchase",
  "stock.picking": "delivery",
  "res.partner": "contact",
  "product.product": "product",
  "product.template": "product",
} as const;

export type DocType =
  | (typeof MODEL_TO_DOCTYPE)[keyof typeof MODEL_TO_DOCTYPE]
  | "generic";

export function modelToDocType(model: string | undefined | null): DocType {
  if (!model) return "generic";
  return (MODEL_TO_DOCTYPE as Record<string, DocType>)[model] ?? "generic";
}
