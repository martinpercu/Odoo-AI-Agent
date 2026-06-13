"use client";

import { useState, useCallback } from "react";
import { validateConnection } from "@/lib/api";
import type { ValidateErrorCode } from "@/lib/types";

export interface ValidatorState {
  status: "idle" | "validating" | "ok" | "error";
  companyName: string | null;
  odooVersion: string | null;
  errorCode: ValidateErrorCode | null;
  fieldErrors: Record<string, string>;
}

const INITIAL: ValidatorState = {
  status: "idle",
  companyName: null,
  odooVersion: null,
  errorCode: null,
  fieldErrors: {},
};

/**
 * Wraps `validateConnection` (spec §7) with UI state — exposes the OK confirmation
 * (company + version) or the discriminated `error_code` + per-field errors.
 * Used by onboarding, InstanceCreateForm and CredentialForm.
 */
export function useConnectionValidator() {
  const [state, setState] = useState<ValidatorState>(INITIAL);

  const reset = useCallback(() => setState(INITIAL), []);

  const validate = useCallback(
    async (payload: { url: string; db_name: string; odoo_username?: string; odoo_apikey?: string }) => {
      setState({ ...INITIAL, status: "validating" });
      const result = await validateConnection(payload);
      if (result.ok) {
        const next: ValidatorState = {
          status: "ok",
          companyName: result.company_name,
          odooVersion: result.odoo_version,
          errorCode: null,
          fieldErrors: {},
        };
        setState(next);
        return next;
      }
      const next: ValidatorState = {
        status: "error",
        companyName: null,
        odooVersion: null,
        errorCode: result.error_code,
        fieldErrors: result.field_errors ?? {},
      };
      setState(next);
      return next;
    },
    []
  );

  return { ...state, validate, reset };
}
