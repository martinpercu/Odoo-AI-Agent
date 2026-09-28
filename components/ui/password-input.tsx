"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  readOnly?: boolean;
  className?: string;
  /** F-07 — para asociarlo a su `<label htmlFor>`. */
  id?: string;
  autoComplete?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  required,
  minLength,
  readOnly,
  className,
  id,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("Auth");

  return (
    <div className="relative">
      <input
        id={id}
        autoComplete={autoComplete}
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
        aria-label={visible ? t("hidePassword") : t("showPassword")}
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
