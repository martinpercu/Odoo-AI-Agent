import type { OdooConfig } from "@/lib/types";

export const API_BASE = "http://localhost:8000";

/** Maps frontend OdooConfig fields to the backend's expected format. */
export function toBackendConfig(config: OdooConfig) {
  return {
    url: config.url,
    db: config.db,
    username: config.login,
    api_key: config.apiKey,
  };
}

export interface TestConnectionResult {
  success: boolean;
  company?: string;
  version?: string;
  uid?: number;
  error?: string;
}

export async function testOdooConnection(
  config: OdooConfig
): Promise<TestConnectionResult> {
  try {
    const res = await fetch(`${API_BASE}/test-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(config) }),
    });

    const data = await res.json();

    if (res.ok && data.status === "ok") {
      return {
        success: true,
        company: data.company,
        version: data.version,
        uid: data.uid,
      };
    }

    const detail = data.detail || data.msg || "Error en las credenciales";
    return {
      success: false,
      error: typeof detail === "object" ? JSON.stringify(detail) : detail,
    };
  } catch {
    return {
      success: false,
      error: "No se pudo conectar con el servidor backend.",
    };
  }
}
