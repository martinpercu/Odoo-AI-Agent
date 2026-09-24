"use client";

import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAudienceT } from "@/hooks/use-audience-translations";
import type { ActionContext } from "@/lib/types";

/**
 * Los `action` que ESCRIBEN en Odoo — espejo de `_WRITE_ACTIONS` en el backend
 * (`main.py`). Los `report*` leen y arman un archivo: esos sí puede el visitante.
 */
const WRITE_ACTIONS: ReadonlySet<ActionContext["action"] | "write"> = new Set([
  "create",
  "update",
  "write",
  "method_call",
]);

export function isWriteAction(action: string): boolean {
  return WRITE_ACTIONS.has(action as ActionContext["action"]);
}

/**
 * ¿El llamador tiene prohibido escribir? **Sin cuenta no se escribe** (backend,
 * `_write_requires_account`, 2026-09-22).
 *
 * ⚠️ Se decide por SESIÓN, igual que el backend, y nunca por audiencia: el visitante del
 * demo es `builder` (D16), y la vista previa "ver como cliente" cambia la audiencia sin
 * cambiar lo que se puede. Tampoco hace falta mirar `isDemoMode`: un llamador sin cuenta
 * sólo puede resolver instancias de demo, así que "sin sesión" ya es "visitante del demo".
 *
 * Mientras la sesión se restaura devuelve `false`: un usuario logueado no tiene por qué
 * ver el botón bloqueado un instante. Si el visitante llega a tocarlo en ese hueco, el
 * 403 `account_required` lo ataja igual.
 */
export function useWriteRequiresAccount(): boolean {
  const { user, isLoading } = useAuth();
  return !isLoading && !user;
}

/**
 * Qué pasa y qué hacer, debajo de una acción de escritura que el visitante no puede
 * ejecutar. Tiene que dejar claro que CONSULTAR sí se puede: el riesgo no es que no pueda
 * escribir, es que lea "no tenés permiso" y crea que el demo no anda.
 *
 * `detail` es el texto que manda el backend con el 403 (ya localizado); sin él, el copy
 * propio del front — que es el caso normal, porque el botón ya viene bloqueado.
 */
export function AccountRequiredNote({ detail }: { detail?: string }) {
  const t = useAudienceT("WriteGate");

  return (
    <div
      role="note"
      className="mt-3 flex items-start gap-2 rounded-btn border border-border bg-raised px-3 py-2 text-small text-text-secondary"
    >
      <Lock size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
      <p className="min-w-0">
        <span>{detail || t("note")}</span>{" "}
        <Link
          href="/register"
          className="font-medium text-accent underline underline-offset-2 hover:no-underline"
        >
          {t("cta")}
        </Link>
      </p>
    </div>
  );
}
