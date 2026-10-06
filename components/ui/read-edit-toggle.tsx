"use client";

import { useId } from "react";
import { Pencil, Lock } from "lucide-react";

interface ReadEditToggleProps {
  /** true = modo edición. */
  editing: boolean;
  onChange: (editing: boolean) => void;
  /** El texto del switch ("Editar"). */
  label: string;
  /** Sin permiso de escritura: el switch se dibuja apagado y deshabilitado, con el
   *  motivo al lado. Sin motivo y sin permiso, no hay que dibujar el switch. */
  blockedText?: string | null;
  disabled?: boolean;
}

/**
 * El interruptor "sólo lectura ↔ edición" de una tarjeta.
 *
 * ⭐ **Patrón de producto (Martin, 2026-10-05): las tarjetas NACEN de sólo lectura.** El
 * usuario casi siempre quiere ver el dato, no cambiarlo, así que editar es un gesto
 * explícito y reversible, no el estado por defecto. Es genérico a propósito: la tarjeta
 * de un registro es el primer consumidor, no el único.
 *
 * Mismo criterio que el switch de la vista previa de audiencia: el `<label>` activa el
 * switch y el estado vive en el riel (`role="switch"`).
 */
export function ReadEditToggle({
  editing,
  onChange,
  label,
  blockedText,
  disabled = false,
}: ReadEditToggleProps) {
  const id = useId();
  const blocked = Boolean(blockedText);
  const off = blocked || disabled;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label
        htmlFor={id}
        className={`flex items-center gap-1.5 text-small font-medium ${
          off ? "cursor-not-allowed text-text-muted" : "cursor-pointer text-text-secondary"
        }`}
      >
        {blocked ? (
          <Lock size={13} strokeWidth={1.5} aria-hidden />
        ) : (
          <Pencil size={13} strokeWidth={1.5} aria-hidden />
        )}
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={editing && !blocked}
        aria-disabled={off}
        disabled={off}
        title={blockedText ?? undefined}
        onClick={() => !off && onChange(!editing)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          editing && !blocked ? "bg-accent" : "bg-border"
        } ${off ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            editing && !blocked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
      {blocked && (
        <span className="min-w-0 text-micro text-text-muted">{blockedText}</span>
      )}
    </div>
  );
}
