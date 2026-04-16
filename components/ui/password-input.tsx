"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  readOnly?: boolean;
  className?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  required,
  minLength,
  readOnly,
  className,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        readOnly={readOnly}
        className={
          className ??
          "w-full rounded-md border border-border bg-base px-3 py-2 pr-10 text-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-foreground transition-colors"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff size={16} strokeWidth={1.5} />
        ) : (
          <Eye size={16} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
