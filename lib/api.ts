import type {
  OdooConfig,
  ActionContext,
  ActionResult,
  PinnedInsight,
  ChartSSEEvent,
  AppNotification,
  NotificationSettings,
  Message,
  EntitySearchResult,
  MeResponse,
  ServerConversation,
  OdooConfigItem,
  OrgUser,
  Invitation,
  UserRole,
  OrgType,
} from "@/lib/types";
import { getAccessToken } from "@/lib/supabase";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/** Sentinel value for network errors — consumers should map this to an i18n key. */
export const NETWORK_ERROR = "__NETWORK_ERROR__";

/** Thrown (not returned) when the backend returns 402. Caught by callers to show the limit modal. */
export class LimitReachedError extends Error {
  constructor() {
    super("LIMIT_REACHED");
    this.name = "LimitReachedError";
  }
}

/**
 * Centralized fetch wrapper.
 * - Adds Authorization header when a Supabase token is available.
 * - 401 → clears auth state (via window event) and redirects to /login.
 * - 402 → throws LimitReachedError (non-crashing, caught by callers).
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Signal the auth context to clear session and redirect
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 402) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:limit_reached"));
    }
    throw new LimitReachedError();
  }

  return res;
}

/** Maps frontend OdooConfig fields to the backend's expected format. */
export function toBackendConfig(config: OdooConfig) {
  return {
    url: config.url,
    db: config.db,
    username: config.login,
    api_key: config.apiKey,
  };
}

// ---- /me endpoints ----

export interface FetchMeResult {
  success: boolean;
  data?: MeResponse;
  error?: string;
}

export async function fetchMe(): Promise<FetchMeResult> {
  try {
    const res = await authFetch(`${API_BASE}/me`);
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to fetch session" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface FetchConversationsResult {
  success: boolean;
  conversations?: ServerConversation[];
  count?: number;
  error?: string;
}

export async function fetchMyConversations(
  limit = 50,
  offset = 0
): Promise<FetchConversationsResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/me/conversations?limit=${limit}&offset=${offset}`
    );
    const data = await res.json();
    if (res.ok)
      return {
        success: true,
        conversations: data.conversations ?? data,
        count: data.count,
      };
    return { success: false, error: data.detail || "Failed to fetch conversations" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Admin: Org ----

export interface OrgResult {
  success: boolean;
  org?: MeResponse["org"];
  error?: string;
}

export async function createOrg(
  name: string,
  slug: string,
  type: OrgType = "SOLITARY"
): Promise<OrgResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, type }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, org: data };
    return { success: false, error: data.detail || "Failed to create org" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function updateOrg(
  orgId: string,
  payload: { name?: string; slug?: string; type?: OrgType }
): Promise<OrgResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, org: data };
    return { success: false, error: data.detail || "Failed to update org" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Admin: Odoo Configs ----

export interface OdooConfigsResult {
  success: boolean;
  configs?: OdooConfigItem[];
  error?: string;
}

export interface OdooConfigResult {
  success: boolean;
  config?: OdooConfigItem;
  error?: string;
}

export async function listOdooConfigs(orgId: string): Promise<OdooConfigsResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/configs`);
    const data = await res.json();
    if (res.ok) return { success: true, configs: data.configs ?? data };
    return { success: false, error: data.detail || "Failed to list configs" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function createOdooConfig(
  orgId: string,
  payload: { label: string; url: string; db_name: string; api_key: string }
): Promise<OdooConfigResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, config: data };
    return { success: false, error: data.detail || "Failed to create config" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function updateOdooConfig(
  orgId: string,
  configId: string,
  payload: Partial<{ label: string; url: string; db_name: string; api_key: string }>
): Promise<OdooConfigResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/configs/${configId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (res.ok) return { success: true, config: data };
    return { success: false, error: data.detail || "Failed to update config" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface BasicResult {
  success: boolean;
  error?: string;
}

export async function deleteOdooConfig(
  orgId: string,
  configId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/configs/${configId}`,
      { method: "DELETE" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete config" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Admin: Users ----

export interface OrgUsersResult {
  success: boolean;
  users?: OrgUser[];
  error?: string;
}

export async function listOrgUsers(orgId: string): Promise<OrgUsersResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/users`);
    const data = await res.json();
    if (res.ok) return { success: true, users: data.users ?? data };
    return { success: false, error: data.detail || "Failed to list users" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function updateOrgUser(
  orgId: string,
  userId: string,
  payload: { role?: UserRole; is_free_license?: boolean }
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to update user" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function removeOrgUser(
  orgId: string,
  userId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to remove user" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Admin: Invitations ----

export interface InvitationsResult {
  success: boolean;
  invitations?: Invitation[];
  error?: string;
}

export interface InvitationResult {
  success: boolean;
  invitation?: Invitation;
  error?: string;
}

export async function createInvitation(
  orgId: string,
  email: string,
  role: UserRole = "CLIENT_USER"
): Promise<InvitationResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      }
    );
    const data = await res.json();
    if (res.ok) return { success: true, invitation: data };
    return { success: false, error: data.detail || "Failed to create invitation" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function listInvitations(orgId: string): Promise<InvitationsResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations`
    );
    const data = await res.json();
    if (res.ok) return { success: true, invitations: data.invitations ?? data };
    return { success: false, error: data.detail || "Failed to list invitations" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface AcceptInvitationResult {
  success: boolean;
  status?: number;
  error?: string;
}

export async function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  try {
    const authToken = await getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/admin/invitations/accept`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (res.ok) return { success: true };
    return { success: false, status: res.status };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Connection Test ----

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
    const res = await authFetch(`${API_BASE}/test-connection`, {
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

    const detail = data.detail || data.msg;
    return {
      success: false,
      error: detail ? (typeof detail === "object" ? JSON.stringify(detail) : detail) : undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
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
    const res = await authFetch(`${API_BASE}/inspect-instance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(config) }),
    });

    const data = await res.json();

    if (res.ok && data.modules) {
      return { success: true, modules: data.modules };
    }

    return {
      success: false,
      error: data.detail || data.error || undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface ExecuteActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
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
    const res = await authFetch(`${API_BASE}/chat/${chatId}/action`, {
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

    let errorMessage = data.detail || data.message || "Action failed";

    if (res.status === 400) {
      errorMessage = `Validation error: ${errorMessage}`;
    } else if (res.status === 422) {
      const fieldErrors: Record<string, string> | undefined =
        data.errors && typeof data.errors === "object" ? data.errors : undefined;
      return { success: false, error: errorMessage, fieldErrors };
    } else if (res.status === 500) {
      errorMessage = `Execution error: ${errorMessage}`;
    }

    return { success: false, error: errorMessage };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
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
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pins`);
    const data = await res.json();
    if (res.ok) return { success: true, pins: data.pins ?? data };
    return { success: false, error: data.detail || "Failed to fetch pins" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
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
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, pin: data.pin ?? data };
    return { success: false, error: data.detail || "Failed to create pin" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export interface DeletePinResult {
  success: boolean;
  error?: string;
}

export async function deletePin(chatId: string, pinId: string): Promise<DeletePinResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pin/${pinId}`, {
      method: "DELETE",
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete pin" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function deleteAllPins(chatId: string): Promise<DeletePinResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pins`, {
      method: "DELETE",
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to clear pins" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

// ---- Image Upload API ----

export interface UploadImageResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export async function uploadImage(
  chatId: string,
  file: File,
  odooConfig: OdooConfig,
  locale: string
): Promise<UploadImageResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("odoo_config", JSON.stringify(toBackendConfig(odooConfig)));
    formData.append("language", locale);

    // Use authFetch but let it build headers naturally (no Content-Type for FormData)
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/chat/${chatId}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined")
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      throw new Error("UNAUTHORIZED");
    }
    if (res.status === 402) {
      if (typeof window !== "undefined")
        window.dispatchEvent(new CustomEvent("auth:limit_reached"));
      throw new LimitReachedError();
    }

    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Upload failed" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

// ---- Refresh Pin API ----

export interface RefreshPinResult {
  success: boolean;
  new_payload?: ChartSSEEvent;
  refreshed_at?: string;
  error?: string;
}

export async function refreshPin(
  chatId: string,
  pinId: string
): Promise<RefreshPinResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pin/${pinId}/refresh`, {
      method: "POST",
    });

    const data = await res.json();

    if (res.ok && data.status === "ok") {
      return {
        success: true,
        new_payload: data.new_payload,
        refreshed_at: data.refreshed_at,
      };
    }

    return { success: false, error: data.detail || "Refresh failed" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

// ---- Notifications API ----

export interface FetchNotificationsResult {
  success: boolean;
  notifications?: AppNotification[];
  error?: string;
}

export async function fetchNotifications(
  odooConfig: OdooConfig
): Promise<FetchNotificationsResult> {
  try {
    const res = await authFetch(`${API_BASE}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(odooConfig) }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, notifications: data.notifications ?? data };
    return { success: false, error: data.detail || "Failed to fetch notifications" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export interface MarkReadResult {
  success: boolean;
  error?: string;
}

export async function markNotificationRead(notificationId: string): Promise<MarkReadResult> {
  try {
    const res = await authFetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to mark as read" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export interface FetchNotificationSettingsResult {
  success: boolean;
  settings?: NotificationSettings;
  error?: string;
}

export async function fetchNotificationSettings(
  odooConfig: OdooConfig
): Promise<FetchNotificationSettingsResult> {
  try {
    const res = await authFetch(`${API_BASE}/notification-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(odooConfig) }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, settings: data.settings ?? data };
    return { success: false, error: data.detail || "Failed to fetch settings" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function updateNotificationSettings(
  odooConfig: OdooConfig,
  settings: NotificationSettings
): Promise<MarkReadResult> {
  try {
    const res = await authFetch(`${API_BASE}/notification-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odoo_config: toBackendConfig(odooConfig), settings }),
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to update settings" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

// ---- Chat History API ----

export interface FetchChatHistoryResult {
  success: boolean;
  messages?: Message[];
  error?: string;
}

export async function fetchChatHistory(
  chatId: string,
  odooConfig: OdooConfig
): Promise<FetchChatHistoryResult> {
  try {
    const params = new URLSearchParams({
      odoo_url: odooConfig.url,
      odoo_db: odooConfig.db,
      odoo_username: odooConfig.login,
      odoo_api_key: odooConfig.apiKey,
    });
    const res = await authFetch(`${API_BASE}/chat/${chatId}/history?${params}`);
    const data = await res.json();
    if (res.ok) {
      const messages: Message[] = (data.messages ?? data).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp ?? m.created_at ?? Date.now()),
        })
      );
      return { success: true, messages };
    }
    return { success: false, error: data.detail || "Failed to fetch chat history" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Audit History API ----

export interface AuditEntry {
  id: string;
  action: string;
  model: string;
  record_id: number | null;
  vals: Record<string, unknown>;
  user_edits: Record<string, unknown> | null;
  status: "success" | "error";
  error_message?: string;
  created_at: string;
}

export interface FetchAuditResult {
  success: boolean;
  entries?: AuditEntry[];
  error?: string;
}

export async function fetchAuditHistory(
  chatId: string
): Promise<FetchAuditResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/audit`);
    const data = await res.json();
    if (res.ok) return { success: true, entries: data.entries ?? data };
    return { success: false, error: data.detail || "Failed to fetch audit history" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Entity Search API (Odoo name_search) ----

export interface SearchEntitiesResult {
  success: boolean;
  results?: EntitySearchResult[];
  error?: string;
}

export async function searchEntities(
  chatId: string,
  model: string,
  query: string,
  odooConfig: OdooConfig
): Promise<SearchEntitiesResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        query,
        odoo_config: toBackendConfig(odooConfig),
      }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, results: data.results ?? data };
    return { success: false, error: data.detail || "Search failed" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}
