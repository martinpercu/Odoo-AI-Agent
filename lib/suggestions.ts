import {
  Package,
  PackageSearch,
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
} from "lucide-react";

export interface Suggestion {
  key: string;
  icon: React.ElementType;
  color: string;
  disabled?: boolean;
}

// Active suggestions — shown in the rotating carousel
export const ACTIVE_SUGGESTIONS: Suggestion[] = [
  { key: "inventory",           icon: Package,       color: "text-info" },
  { key: "inventoryCheck",      icon: PackageSearch, color: "text-success-solid" },
  { key: "invoices",            icon: FileText,      color: "text-warning-solid" },
  { key: "employees",           icon: Users,        color: "text-success-solid" },
  { key: "billingByClient",     icon: Receipt,      color: "text-accent" },
  { key: "topProducts",         icon: TrendingUp,   color: "text-accent" },
  { key: "salesByClientMonth",  icon: DollarSign,   color: "text-info" },
  { key: "purchasesBySupplier", icon: ShoppingCart, color: "text-warning-solid" },
  { key: "paymentsByClientNov", icon: CalendarDays, color: "text-success-solid" },
  { key: "paymentsByClientJan", icon: CalendarDays, color: "text-info" },
  { key: "salesBySellerYear",   icon: UserCheck,    color: "text-accent" },
  { key: "salesBySeller2024",   icon: BarChart3,    color: "text-warning-solid" },
];

// Reserved — disabled until the agent supports them
export const RESERVED_SUGGESTIONS: Suggestion[] = [
  { key: "salesReport",   icon: BarChart3,    color: "text-text-muted", disabled: true },
  { key: "uploadInvoice", icon: FileUp,       color: "text-text-muted", disabled: true },
  { key: "pdfReport",     icon: FileBarChart, color: "text-text-muted", disabled: true },
];

export function getRandomSuggestions(count = 4): Suggestion[] {
  const pool = [...ACTIVE_SUGGESTIONS];
  const result: Suggestion[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
