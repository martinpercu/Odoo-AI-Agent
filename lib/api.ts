import type { OdooConfig, ActionContext, ActionResult, PinnedInsight } from "@/lib/types";

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

export interface OdooModule {
  name: string;
  state: string;
  installed_version?: string;
  display_name?: string;
}

export interface InspectInstanceResult {
  success: boolean;
  modules?: OdooModule[];
  error?: string;
}

export async function inspectInstance(
  config: OdooConfig
): Promise<InspectInstanceResult> {
  try {
    const res = await fetch(`${API_BASE}/inspect-instance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(config) }),
    });

    const data = await res.json();

    if (res.ok && data.modules) {
      return {
        success: true,
        modules: data.modules,
      };
    }

    return {
      success: false,
      error: data.detail || data.error || "Failed to inspect instance",
    };
  } catch {
    return {
      success: false,
      error: "No se pudo conectar con el servidor backend.",
    };
  }
}

export interface ExecuteActionResult {
  success: boolean;
  message?: string;
  error?: string;
  result?: ActionResult;
  queue_next?: { text: string };
}

export async function executeAction(
  chatId: string,
  actionContext: ActionContext,
  odooConfig: OdooConfig,
  locale: string
): Promise<ExecuteActionResult> {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        odoo_config: toBackendConfig(odooConfig),
        action: "confirm_action",
        context: actionContext,
        language: locale,
      }),
    });

    const data = await res.json();

    if (data.status === "ok") {
      return {
        success: true,
        message: data.message,
        result: data.result,
        queue_next: data.queue_next,
      };
    }

    // Error handling based on HTTP status codes
    let errorMessage = data.detail || data.message || "Action failed";

    if (res.status === 400) {
      errorMessage = `Validation error: ${errorMessage}`;
    } else if (res.status === 401) {
      errorMessage = `Authentication failed: ${errorMessage}`;
    } else if (res.status === 422) {
      errorMessage = errorMessage; // Odoo business error, use as-is
    } else if (res.status === 500) {
      errorMessage = `Execution error: ${errorMessage}`;
    }

    return { success: false, error: errorMessage };
  } catch {
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

// ---- Pinned Insights API ----

export interface FetchPinsResult {
  success: boolean;
  pins?: PinnedInsight[];
  error?: string;
}

export async function fetchPins(chatId: string): Promise<FetchPinsResult> {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/pins`);
    const data = await res.json();
    if (res.ok) {
      return { success: true, pins: data.pins ?? data };
    }
    return { success: false, error: data.detail || "Failed to fetch pins" };
  } catch {
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export interface CreatePinResult {
  success: boolean;
  pin?: PinnedInsight;
  error?: string;
}

export async function createPin(
  chatId: string,
  payload: Record<string, unknown>
): Promise<CreatePinResult> {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, pin: data.pin ?? data };
    }
    return { success: false, error: data.detail || "Failed to create pin" };
  } catch {
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export interface DeletePinResult {
  success: boolean;
  error?: string;
}

export async function deletePin(chatId: string, pinId: string): Promise<DeletePinResult> {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/pin/${pinId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      return { success: true };
    }
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete pin" };
  } catch {
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function deleteAllPins(chatId: string): Promise<DeletePinResult> {
  try {
    const res = await fetch(`${API_BASE}/chat/${chatId}/pins`, {
      method: "DELETE",
    });
    if (res.ok) {
      return { success: true };
    }
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to clear pins" };
  } catch {
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}
