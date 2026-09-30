import {
  Package,
  FileText,
  Users,
  Receipt,
  BarChart3,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  UserCheck,
  CalendarDays,
  FileUp,
  FileBarChart,
  Clock,
  ListTodo,
  Warehouse,
  PackagePlus,
  Target,
} from "lucide-react";

import type { InstanceUsageInfo } from "@/lib/api";
import { parseLocalDate } from "@/lib/data-until";

/**
 * F-15 — el período RELATIVO que nombra el texto de una sugerencia ("este mes", "el mes
 * pasado", "este año"). Sólo las relativas lo declaran: una fecha fija ("en 2024") no
 * se mueve con el calendario.
 */
export type SuggestionPeriod = "this_month" | "last_month" | "this_year";

export interface Suggestion {
  key: string;
  icon: React.ElementType;
  color: string;
  disabled?: boolean;
  /**
   * El modelo de Odoo que esta sugerencia consulta (quick-wins §7).
   *
   * Sirve para no ofrecerle "oportunidades por etapa" a un tenant que no usa CRM:
   * la respuesta sería **"no hay registros"**, el peor primer resultado posible y
   * justo en el momento donde se decide si el producto sirve.
   */
  model?: string;
  /** F-15 — ver `SuggestionPeriod`. */
  period?: SuggestionPeriod;
}

// Active suggestions — shown in the rotating carousel.
//
// X-06 — cada una declara el modelo que REALMENTE consulta (el inventario es
// `stock.quant`, no `product.product`: una agencia sin depósito tiene productos y cero
// stock) y no hay dos que pregunten casi lo mismo — el carrusel muestra 4 y un par
// gemelo desperdicia una de las cuatro. Hay de cada negocio del parque: comercial (CRM),
// servicios (proyectos, tareas, horas) y retail (stock, depósitos, reposición).
//
// X-08 — `restock` declara las REGLAS de reposición, no el stock: "¿qué tengo que
// reponer?" se contesta contra el mínimo de cada regla, y una instancia con stock y sin
// reglas (D21) contestaba "no hay nada para reponer". Un back que todavía no cuenta
// `stock.warehouse.orderpoint` deja el modelo sin medir, y sin medir se muestra.
export const ACTIVE_SUGGESTIONS: Suggestion[] = [
  { key: "inventory",            icon: Package,      color: "text-info",           model: "stock.quant" },
  { key: "stockByWarehouse",     icon: Warehouse,    color: "text-success-solid",  model: "stock.quant" },
  { key: "restock",              icon: PackagePlus,  color: "text-warning-solid",  model: "stock.warehouse.orderpoint" },
  { key: "invoices",             icon: FileText,     color: "text-warning-solid",  model: "account.move" },
  { key: "employees",            icon: Users,        color: "text-success-solid",  model: "hr.employee" },
  { key: "billingByClient",      icon: Receipt,      color: "text-accent",         model: "account.move" },
  { key: "topProducts",          icon: TrendingUp,   color: "text-accent",         model: "sale.order" },
  { key: "salesByClientMonth",   icon: DollarSign,   color: "text-info",           model: "sale.order" },
  { key: "purchasesBySupplier",  icon: ShoppingCart, color: "text-warning-solid",  model: "purchase.order" },
  { key: "paymentsByClientJan",  icon: CalendarDays, color: "text-info",           model: "account.payment" },
  { key: "salesBySellerYear",    icon: UserCheck,    color: "text-accent",         model: "sale.order", period: "this_year" },
  { key: "opportunitiesByStage", icon: Target,       color: "text-info",           model: "crm.lead" },
  { key: "hoursByProject",       icon: Clock,        color: "text-accent",         model: "account.analytic.line", period: "this_month" },
  { key: "overdueTasks",         icon: ListTodo,     color: "text-warning-solid",  model: "project.task" },
];

// Reserved — disabled until the agent supports them
export const RESERVED_SUGGESTIONS: Suggestion[] = [
  { key: "salesReport",   icon: BarChart3,    color: "text-text-muted", disabled: true },
  { key: "uploadInvoice", icon: FileUp,       color: "text-text-muted", disabled: true },
  { key: "pdfReport",     icon: FileBarChart, color: "text-text-muted", disabled: true },
];

/**
 * Las sugerencias que ESTA instancia puede contestar con datos (quick-wins §7).
 *
 * ⚠️ **Sin medición NO se filtra nada.** `usage` vacío o ausente devuelve el pool
 * completo: esconder sugerencias por falta de datos es peor que mostrar una que
 * quizás salga vacía — el usuario no tiene forma de enterarse de lo que le
 * escondimos. Misma regla que el gating del catálogo (B6): "no lo sabemos" ≠
 * "está vacío".
 *
 * Y si el filtro deja MENOS de `min` sugerencias, se devuelve el pool completo:
 * un carrusel con una sola tarjeta se ve roto, y peor que una sugerencia que
 * quizás no traiga nada es una pantalla vacía.
 */
/**
 * ¿Una pregunta sobre `model` tiene con qué responder en esta instancia?
 *
 * La misma regla que el carrusel, para los chips sueltos de los paneles y del modal
 * (X-06): sin medición, o sin modelo declarado, se muestra; sólo se esconde lo que se
 * MIDIÓ en cero. "No lo sabemos" ≠ "está vacío".
 *
 * F-15 — y lo mismo con el período: una sugerencia que dice "este mes" no se ofrece si
 * los datos de la instancia terminan antes de que empiece este mes. El cartel "Datos
 * hasta" lo explica, pero ofrecer una pregunta cuya respuesta sabemos vacía es lo que
 * el filtro existe para evitar. Sin `dataUntil` se muestra.
 */
export function isUsableFor(
  item: { model?: string; period?: SuggestionPeriod },
  info: InstanceUsageInfo | null | undefined,
  today: Date = new Date()
): boolean {
  if (!info) return true;
  if (item.model) {
    const count = info.usage[item.model];
    if (count !== undefined && count <= 0) return false;
  }
  return coversPeriod(item.period, info.dataUntil, today);
}

/** ¿Hay datos dentro de `period`? Sin período o sin fecha de corte, sí. */
function coversPeriod(
  period: SuggestionPeriod | undefined,
  dataUntil: string | null,
  today: Date
): boolean {
  if (!period || !dataUntil) return true;
  const until = parseLocalDate(dataUntil);
  if (!until) return true;
  const y = today.getFullYear();
  const m = today.getMonth();
  const start =
    period === "this_year"
      ? new Date(y, 0, 1)
      : period === "this_month"
        ? new Date(y, m, 1)
        : new Date(y, m - 1, 1);
  return until >= start;
}

/**
 * Las sugerencias que ESTA instancia puede contestar con datos (quick-wins §7).
 *
 * ⚠️ **Sin medición NO se filtra nada.** `info` ausente devuelve el pool completo:
 * esconder sugerencias por falta de datos es peor que mostrar una que quizás salga
 * vacía — el usuario no tiene forma de enterarse de lo que le escondimos. Misma regla
 * que el gating del catálogo (B6): "no lo sabemos" ≠ "está vacío".
 *
 * Y si el filtro deja MENOS de `min` sugerencias, se devuelve el pool completo:
 * un carrusel con una sola tarjeta se ve roto, y peor que una sugerencia que
 * quizás no traiga nada es una pantalla vacía.
 */
export function suggestionsForInstance(
  info: InstanceUsageInfo | null | undefined,
  pool: Suggestion[] = ACTIVE_SUGGESTIONS,
  min = 4
): Suggestion[] {
  if (!info) return pool;
  const usable = pool.filter((s) => isUsableFor(s, info));
  return usable.length >= min ? usable : pool;
}

export function getRandomSuggestions(count = 4, pool = ACTIVE_SUGGESTIONS): Suggestion[] {
  const remaining = [...pool];
  const result: Suggestion[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    result.push(remaining.splice(idx, 1)[0]);
  }
  return result;
}
