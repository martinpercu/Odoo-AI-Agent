import {
  Compass,
  Coins,
  Gauge,
  Medal,
  Package,
  Search,
  Stethoscope,
  Target,
  TrendingUp,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/** Nombres Lucide que puede traer `Routine.icon` hoy (catálogo del sistema). */
const ROUTINE_ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  Stethoscope,
  Medal,
  Search,
  Coins,
  Gauge,
  Package,
  Compass,
  Target,
};

/**
 * Resuelve `Routine.icon` (nombre Lucide) a un componente.
 *
 * Fallback a `ClipboardList` para cualquier valor que no matchee — cubre Rutinas de
 * usuario ya guardadas en Postgres con el emoji viejo (`"🧭"`), vacío, o un nombre
 * inventado. El backend no valida `icon` contra esta lista (es un string libre), así
 * que el fallback acá es la única red de contención.
 */
export function RoutineIcon({
  name,
  size = 22,
  className,
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = (name && ROUTINE_ICONS[name]) || ClipboardList;
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden />;
}
