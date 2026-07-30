import type { LucideIcon } from "lucide-react";

/**
 * Icon + short label + short body, rendered as a list item.
 * Shared by the intro drawer and the implementer manual page.
 */
export function FactRow({
  icon: Icon,
  label,
  body,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-accent-subtle text-accent">
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-medium text-foreground">{label}</p>
        <p className="text-small text-text-secondary">{body}</p>
      </div>
    </li>
  );
}
