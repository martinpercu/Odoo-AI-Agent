import type {
  OdooConfig,
  ActionContext,
  ActionResult,
  PinnedInsight,
  ChartSSEEvent,
  FileAttachmentMetadata,
  ExcelExportMetadata,
  AppNotification,
  NotificationSettings,
  Message,
  EntitySearchResult,
  MeResponse,
  ServerConversation,
  OdooConfigItem,
  OdooConfigSummary,
  OrgUser,
  Invitation,
  UserRole,
  OrgType,
  UserOdooCredential,
  OdooCredentialSummary,
  AdminUserCredential,
  SubscriptionTier,
  BillingState,
  SuperAdminOrgsResponse,
  SuperAdminUsersResponse,
  SuperAdminOrgDetail,
  FeedbackReport,
  FeedbackListResponse,
  FeedbackStats,
  FeedbackCategory,
  FeedbackStatus,
  AnalyticsEventsListResponse,
  AnalyticsEventsStats,
  ValidateResult,
  ValidateErrorCode,
  InstanceDetail,
  SeatType,
  InvitationMode,
  OdooConnectionStatus,
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

/** Normalizes FastAPI `detail` which can be a string or a 422 array of validation objects. */
function extractError(detail: unknown, fallback: string): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (typeof e === "object" && e !== null && "msg" in e ? String((e as Record<string, unknown>).msg) : String(e))).join(", ");
  }
  return fallback;
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

export async function deleteChat(chatId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}`, { method: "DELETE" });
    if (res.ok) return { success: true };
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.detail || "Failed to delete chat" };
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
    return { success: false, error: extractError(data.detail, "Failed to create org") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface OnboardingPayload {
  org_name: string;
  org_slug: string;
  odoo_url: string;
  odoo_db: string;
  odoo_username: string;
  odoo_api_key: string;
  odoo_label?: string;
}

export interface OnboardingResult {
  success: boolean;
  error?: string;
  slugConflict?: boolean;
}

export async function submitOnboarding(
  payload: OnboardingPayload
): Promise<OnboardingResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true };
    if (res.status === 409) {
      return {
        success: false,
        error: data.detail || "Conflict",
        slugConflict: typeof data.detail === "string" && data.detail.toLowerCase().includes("slug"),
      };
    }
    return { success: false, error: extractError(data.detail, "Failed to complete onboarding") };
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
  /** Enriched on the instances-list endpoint (company_name, counts, seats, my_connection_status). */
  configs?: OdooConfigSummary[];
  error?: string;
}

export interface OdooConfigResult {
  success: boolean;
  config?: OdooConfigItem;
  error?: string;
  /** Discriminated validation failure (422) when creating against Odoo. */
  errorCode?: ValidateErrorCode;
  /** True when a SOLITARY org tried to add a 2nd instance (409). */
  solitaryBlocked?: boolean;
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
  payload: {
    label?: string;
    url: string;
    db_name: string;
    // Optional creator credentials (spec §2.2). Required on the 1st instance, optional from the 2nd.
    odoo_username?: string;
    odoo_apikey?: string;
  }
): Promise<OdooConfigResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, config: data };
    // 422 → validation failed against Odoo (error_code discriminated). 409 → SOLITARY rejects instance N.
    return {
      success: false,
      error: extractError(data.detail, "Failed to create config"),
      errorCode: (data.error_code ?? data.detail?.error_code) as ValidateErrorCode | undefined,
      solitaryBlocked: res.status === 409,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface InstanceDetailResult {
  success: boolean;
  detail?: InstanceDetail;
  error?: string;
}

/** Instance detail with its users ∩ this instance + pending invitations (spec §2.4). */
export async function fetchInstanceDetail(
  orgId: string,
  configId: string
): Promise<InstanceDetailResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/configs/${configId}`);
    const data = await res.json();
    if (res.ok) {
      // Backend may omit empty collections — guarantee the arrays/counts so the UI never hits undefined.
      const detail: InstanceDetail = {
        ...data,
        users: data.users ?? [],
        invitations: data.invitations ?? [],
        counts: data.counts ?? { active: 0, unset: 0, invalid: 0, pending: 0 },
      };
      return { success: true, detail };
    }
    return { success: false, error: extractError(data.detail, "Failed to load instance") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function updateOdooConfig(
  orgId: string,
  configId: string,
  payload: Partial<{ label: string; url: string; db_name: string; is_active: boolean }>
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
    return { success: false, error: extractError(data.detail, "Failed to update config") };
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
  payload: { role?: UserRole; is_free_license?: boolean; allow_feedback?: boolean }
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
    return { success: false, error: extractError(data.detail, "Failed to update user") };
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

// ---- Credentials: User manages own ----

export interface CredentialResult {
  success: boolean;
  credential?: UserOdooCredential;
  error?: string;
  notFound?: boolean;
  /** Set when the save was rejected by Odoo validation (422). Usually "auth_failed". */
  errorCode?: ValidateErrorCode;
}

export interface AllCredentialsResult {
  success: boolean;
  credentials?: OdooCredentialSummary[];
  error?: string;
}

export async function fetchAllMyCredentials(): Promise<AllCredentialsResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/odoo-credentials`);
    const data = await res.json();
    if (res.ok) return { success: true, credentials: data };
    return { success: false, error: data.detail || "Failed to fetch credentials" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function fetchMyCredential(configId: string): Promise<CredentialResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/odoo-credentials/${configId}`);
    if (res.status === 404) return { success: false, notFound: true };
    const data = await res.json();
    if (res.ok) return { success: true, credential: data };
    return { success: false, error: data.detail || "Failed to fetch credential" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function saveMyCredential(
  configId: string,
  payload: { odoo_username: string; odoo_api_key: string }
): Promise<CredentialResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/odoo-credentials/${configId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, credential: data.credential ?? data };
    return {
      success: false,
      error: extractError(data.detail, "Failed to save credential"),
      errorCode: (data.error_code ?? data.detail?.error_code) as ValidateErrorCode | undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

/** Re-validate the current user's stored credential for a config (spec §2.6). */
export async function revalidateMyCredential(configId: string): Promise<CredentialResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/odoo-credentials/${configId}/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    if (res.ok) return { success: true, credential: data.credential ?? data };
    return {
      success: false,
      error: extractError(data.detail, "Failed to revalidate"),
      errorCode: (data.error_code ?? data.detail?.error_code) as ValidateErrorCode | undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Credentials: Admin manages any user ----

export async function fetchUserCredential(
  orgId: string,
  userId: string,
  configId: string
): Promise<CredentialResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials/${configId}`
    );
    if (res.status === 404) return { success: false, notFound: true };
    const data = await res.json();
    if (res.ok) return { success: true, credential: data };
    return { success: false, error: data.detail || "Failed to fetch credential" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function assignUserInstance(
  orgId: string,
  userId: string,
  configId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials/${configId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ odoo_username: "", odoo_api_key: "" }),
      }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to assign instance") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function saveUserCredential(
  orgId: string,
  userId: string,
  configId: string,
  payload: { odoo_username: string; odoo_api_key: string }
): Promise<CredentialResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials/${configId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (res.ok) return { success: true, credential: data.credential ?? data };
    return {
      success: false,
      error: extractError(data.detail, "Failed to save credential"),
      errorCode: (data.error_code ?? data.detail?.error_code) as ValidateErrorCode | undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

/** Admin: re-validate a user's stored credential for a config (spec §2.6). */
export async function revalidateUserCredential(
  orgId: string,
  userId: string,
  configId: string
): Promise<CredentialResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials/${configId}/revalidate`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const data = await res.json();
    if (res.ok) return { success: true, credential: data.credential ?? data };
    return {
      success: false,
      error: extractError(data.detail, "Failed to revalidate"),
      errorCode: (data.error_code ?? data.detail?.error_code) as ValidateErrorCode | undefined,
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function deleteUserCredential(
  orgId: string,
  userId: string,
  configId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials/${configId}`,
      { method: "DELETE" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete credential" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface AllUserCredentialsResult {
  success: boolean;
  credentials?: AdminUserCredential[];
  error?: string;
}

export async function fetchAllUserCredentials(
  orgId: string,
  userId: string
): Promise<AllUserCredentialsResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/users/${userId}/odoo-credentials`
    );
    const data = await res.json();
    if (res.ok) return { success: true, credentials: data };
    return { success: false, error: data.detail || "Failed to fetch credentials" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Admin: Pending credentials for invitations ----

export interface PendingCredential {
  odoo_config_id: string;
  odoo_username: string;
  created_at: string;
  config_label?: string | null;
  config_url?: string | null;
}

export interface PendingCredentialsResult {
  success: boolean;
  pending_credentials?: PendingCredential[];
  error?: string;
}

export interface SavePendingCredentialResult {
  success: boolean;
  pending_credential?: PendingCredential;
  error?: string;
}

export async function fetchPendingCredentials(
  orgId: string,
  invitationId: string
): Promise<PendingCredentialsResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations/${invitationId}/pending-credentials`
    );
    const data = await res.json();
    if (res.ok) return { success: true, pending_credentials: data.pending_credentials };
    return { success: false, error: data.detail || "Failed to fetch pending credentials" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function savePendingCredential(
  orgId: string,
  invitationId: string,
  configId: string,
  payload: { odoo_username: string; odoo_api_key: string }
): Promise<SavePendingCredentialResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations/${invitationId}/pending-credentials/${configId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (res.ok) return { success: true, pending_credential: data.pending_credential };
    return { success: false, error: data.detail || "Failed to save pending credential" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function deletePendingCredential(
  orgId: string,
  invitationId: string,
  configId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations/${invitationId}/pending-credentials/${configId}`,
      { method: "DELETE" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete pending credential" };
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
  /** 409 + error_code "seatLimitReached" — no free seat of the chosen type. */
  seatLimitReached?: boolean;
  /** 409 + error_code "email_has_account" — the email already belongs to a user (spec §2.8, blocked). */
  emailHasAccount?: boolean;
}

export interface CreateInvitationOptions {
  role?: UserRole;
  /** Instance the invitee is assigned to (spec §2.8). Required when the org has >1 instance. */
  instance_id?: string;
  seat_type?: SeatType;
  mode?: InvitationMode;
  /** Only for mode = "precreds" — admin pre-loads the invitee's Odoo credentials. */
  prefilled_username?: string;
  prefilled_apikey?: string;
}

export async function createInvitation(
  orgId: string,
  email: string,
  roleOrOptions: UserRole | CreateInvitationOptions = "CLIENT_USER"
): Promise<InvitationResult> {
  const opts: CreateInvitationOptions =
    typeof roleOrOptions === "string" ? { role: roleOrOptions } : roleOrOptions;
  const body: Record<string, unknown> = {
    email,
    role: opts.role ?? "CLIENT_USER",
    seat_type: opts.seat_type ?? "paid",
    mode: opts.mode ?? "invite_only",
  };
  if (opts.instance_id) body.instance_id = opts.instance_id;
  if (opts.prefilled_username) body.prefilled_username = opts.prefilled_username;
  if (opts.prefilled_apikey) body.prefilled_apikey = opts.prefilled_apikey;

  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (res.ok) return { success: true, invitation: data.invitation ?? data };
    const code = (data.error_code ?? data.detail?.error_code) as string | undefined;
    return {
      success: false,
      seatLimitReached: code === "seatLimitReached" || (res.status === 409 && code !== "email_has_account"),
      emailHasAccount: code === "email_has_account",
      error: extractError(data.detail, "Failed to create invitation"),
    };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface SendInvitationEmailParams {
  token: string;
  email: string;
  orgName: string;
  role?: UserRole;
  lang?: string;
  expiresAt?: string;
}

/**
 * Sends the localized invitation email via the Next.js route handler
 * (app/api/send-invitation), which talks to Zoho SMTP server-side.
 * Best-effort: the invitation already exists on the backend, so a failed
 * email is non-fatal — the admin can still copy the link manually.
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<BasicResult> {
  try {
    const authToken = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`/api/send-invitation`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    if (res.ok) return { success: true };
    const data = await res.json().catch(() => ({}));
    return { success: false, error: extractError(data.error, "Failed to send invitation email") };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function cancelInvitation(
  orgId: string,
  invitationId: string
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/invitations/${invitationId}`,
      { method: "DELETE" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to cancel invitation") };
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

export interface InvitationInfoResult {
  success: boolean;
  email?: string;
  org_name?: string;
  role?: string;
  expires_at?: string;
  status?: number;
  error?: string;
}

export async function fetchInvitationInfo(token: string): Promise<InvitationInfoResult> {
  try {
    const res = await fetch(`${API_BASE}/admin/invitations/${token}/preview`);
    const data = await res.json();
    if (res.ok) return { success: true, ...data };
    return { success: false, status: res.status };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface AcceptInvitationResult {
  success: boolean;
  status?: number;
  error?: string;
  /** The instance the new user was assigned to (spec §2.9). */
  instanceId?: string | null;
  /** Connection status after accept: "active" (precreds) or "unset" (invite_only). */
  connectionStatus?: OdooConnectionStatus | null;
}

export async function acceptInvitation(
  token: string,
  accessToken?: string
): Promise<AcceptInvitationResult> {
  try {
    const authToken = accessToken ?? await getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/admin/invitations/accept`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        instanceId: data.instance_id ?? null,
        connectionStatus: (data.connection_status ?? null) as OdooConnectionStatus | null,
      };
    }
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
      body: JSON.stringify(toBackendConfig(config)),
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

/**
 * Discriminated connection validation (spec §7).
 * - Without credentials → only checks the instance exists (reachable URL + DB found).
 * - With credentials → also validates auth; `auth_failed` when the apikey is wrong.
 * Backend accepts both field schemes (db/db_name, username/odoo_username, api_key/odoo_apikey).
 */
export async function validateConnection(payload: {
  url: string;
  db_name: string;
  odoo_username?: string;
  odoo_apikey?: string;
}): Promise<ValidateResult> {
  try {
    const res = await authFetch(`${API_BASE}/test-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: payload.url,
        db_name: payload.db_name,
        odoo_username: payload.odoo_username || undefined,
        odoo_apikey: payload.odoo_apikey || undefined,
      }),
    });
    const data = await res.json();
    // New shape: { ok, company_name, odoo_version, error_code, field_errors }.
    // Fall back to legacy keys (status/company/version) for resilience.
    const ok = data.ok ?? data.status === "ok";
    if (res.ok && ok) {
      return {
        ok: true,
        company_name: data.company_name ?? data.company ?? null,
        odoo_version: data.odoo_version ?? data.version ?? null,
      };
    }
    const error_code = (data.error_code ?? "unreachable") as ValidateErrorCode;
    return { ok: false, error_code, field_errors: data.field_errors };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { ok: false, error_code: "unreachable" };
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
      body: JSON.stringify(toBackendConfig(config)),
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

export async function testSavedOdooConfig(
  orgId: string,
  configId: string
): Promise<TestConnectionResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/configs/${configId}/test-connection`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const data = await res.json();
    if (res.ok && data.status === "ok") {
      return { success: true, company: data.company, version: data.version, uid: data.uid };
    }
    return { success: false, error: data.detail || data.error || undefined };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function inspectSavedOdooConfig(
  orgId: string,
  configId: string
): Promise<InspectInstanceResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/orgs/${orgId}/configs/${configId}/inspect`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const data = await res.json();
    if (res.ok && data.modules) {
      return { success: true, modules: data.modules };
    }
    return { success: false, error: data.detail || data.error || undefined };
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
  configId: string,
  locale: string
): Promise<ExecuteActionResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_id: configId,
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

/**
 * Backend stores pins in a raw shape (content_type, timestamp, payload, chat_id, ...).
 * Normalize to the discriminated-union `PinnedInsight` the rest of the app consumes.
 * Backward-compatible: if the row already arrives in the parsed shape (has `kind`), it's returned as-is.
 * Defensive: rows that don't match any known content_type are dropped (returns null → filtered).
 *
 * `fallbackChatId` lets callers inject the chatId for endpoints where it's omitted in the response
 * (e.g. `/chat/{chatId}/pins` — the backend skips it because the URL already carries it).
 */
function normalizePin(raw: unknown, fallbackChatId?: string): PinnedInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Already in the parsed shape — pass through.
  if (typeof r.kind === "string") return raw as PinnedInsight;

  const contentType = r.content_type as string | undefined;
  const id = r.id as string | undefined;
  const chatId =
    (r.chat_id as string | undefined) ?? (r.chatId as string | undefined) ?? fallbackChatId;
  const messageId = (r.message_id as string | undefined) ?? (r.messageId as string | undefined);
  const pinnedAt =
    (r.timestamp as string | undefined) ??
    (r.pinnedAt as string | undefined) ??
    new Date().toISOString();

  if (!id || !chatId || !messageId || !contentType) return null;

  const payload = r.payload;

  if (contentType === "chart") {
    if (!payload) return null;
    const chartIndex =
      (r.chart_index as number | undefined) ?? (r.chartIndex as number | undefined) ?? 0;
    const queryContext = r.query_context as import("@/lib/types").PinQueryContext | undefined;
    return {
      kind: "chart",
      id,
      pinnedAt,
      chatId,
      messageId,
      chartIndex,
      chart: payload as ChartSSEEvent,
      ...(queryContext && { query_context: queryContext }),
    };
  }

  if (contentType === "file") {
    if (!payload) return null;
    return {
      kind: "file",
      id,
      pinnedAt,
      chatId,
      messageId,
      metadata: payload as FileAttachmentMetadata,
    };
  }

  if (contentType === "excel") {
    if (!payload) return null;
    return {
      kind: "excel",
      id,
      pinnedAt,
      chatId,
      messageId,
      metadata: payload as ExcelExportMetadata,
    };
  }

  return null;
}

function normalizePinList(raw: unknown, fallbackChatId?: string): PinnedInsight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizePin(item, fallbackChatId))
    .filter((p): p is PinnedInsight => p !== null);
}

export async function fetchPins(chatId: string): Promise<FetchPinsResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pins`);
    const data = await res.json();
    // Backend omits chat_id in per-chat response (already in the URL) — inject it here.
    if (res.ok) return { success: true, pins: normalizePinList(data.pins ?? data, chatId) };
    return { success: false, error: extractError(data.detail, "Failed to fetch pins") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function fetchAllMyPins(): Promise<FetchPinsResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/pins`);
    const data = await res.json();
    if (res.ok) return { success: true, pins: normalizePinList(data.pins ?? data) };
    return { success: false, error: extractError(data.detail, "Failed to fetch pins") };
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
    return { success: false, error: extractError(data.detail, "Failed to create pin") };
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
    // 404 = pin already gone (or stale pin from previous schema). End state is what we wanted.
    if (res.ok || res.status === 404) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to delete pin") };
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
    return { success: false, error: extractError(data.detail, "Failed to clear pins") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function deleteAllMyPins(): Promise<DeletePinResult> {
  try {
    const res = await authFetch(`${API_BASE}/me/pins`, {
      method: "DELETE",
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to clear all pins") };
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
  configId: string,
  locale: string
): Promise<UploadImageResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("config_id", configId);
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
  pinId: string,
  configId: string,
  language: string
): Promise<RefreshPinResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/pin/${pinId}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config_id: configId, language }),
    });

    const data = await res.json();

    if (res.ok && data.status === "ok") {
      return {
        success: true,
        new_payload: data.new_payload,
        refreshed_at: data.refreshed_at,
      };
    }

    return { success: false, error: extractError(data.detail, "Refresh failed") };
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
  chatId: string,
  params?: { unreadOnly?: boolean; since?: string; limit?: number }
): Promise<FetchNotificationsResult> {
  try {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.set("unread_only", "true");
    if (params?.since) query.set("since", params.since);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${API_BASE}/chat/${chatId}/notifications${qs}`);
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

export async function markNotificationRead(
  chatId: string,
  notificationId: string
): Promise<MarkReadResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/chat/${chatId}/notifications/${notificationId}/read`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to mark as read" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: "Network error: Could not connect to backend" };
  }
}

export async function markAllNotificationsRead(chatId: string): Promise<MarkReadResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/chat/${chatId}/notifications/read-all`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to mark all as read" };
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
  configId: string
): Promise<FetchChatHistoryResult> {
  try {
    const params = new URLSearchParams({ config_id: configId });
    const res = await authFetch(`${API_BASE}/chat/${chatId}/history?${params}`);
    const data = await res.json();
    if (res.ok) {
      const messages: Message[] = (data.messages ?? data).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => ({
          ...m,
          role: m.role === "human" ? "user" : m.role === "ai" ? "assistant" : m.role,
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
  configId: string
): Promise<SearchEntitiesResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        query,
        config_id: configId,
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

// ---- Billing API ----

export interface BillingCheckoutResult {
  success: boolean;
  checkout_url?: string;
  error?: string;
}

export async function createBillingCheckout(
  tier: Exclude<SubscriptionTier, "FREE">
): Promise<BillingCheckoutResult> {
  try {
    const res = await authFetch(`${API_BASE}/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, checkout_url: data.checkout_url ?? data.url };
    return { success: false, error: extractError(data.detail, "Failed to create checkout session") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

/**
 * Beta defaults for the Founding Partners phase (spec §0). Used as a fallback
 * when `GET /billing/state` is unavailable so the front degrades gracefully —
 * the numbers still come from a single source, never sprinkled across the UI.
 */
export const BETA_BILLING_DEFAULTS: BillingState = {
  phase: "beta_founder",
  price_anchor: 7,
  founder_rate: 1.4,
  beta_free: true,
  founder_rate_locked: false,
};

/**
 * Render-only billing/founder context (Surface I, spec §5/§6). Returns the
 * backend state, or `BETA_BILLING_DEFAULTS` if the endpoint is missing/errors —
 * during beta everyone is a founding partner, so a safe default is correct.
 */
export async function getBillingState(): Promise<BillingState> {
  try {
    const res = await authFetch(`${API_BASE}/billing/state`);
    if (!res.ok) return BETA_BILLING_DEFAULTS;
    const data = await res.json();
    return { ...BETA_BILLING_DEFAULTS, ...data } as BillingState;
  } catch {
    return BETA_BILLING_DEFAULTS;
  }
}

export interface BillingPortalResult {
  success: boolean;
  portal_url?: string;
  error?: string;
}

export async function createBillingPortalSession(): Promise<BillingPortalResult> {
  try {
    const res = await authFetch(`${API_BASE}/billing/portal`, { method: "POST" });
    const data = await res.json();
    if (res.ok) return { success: true, portal_url: data.portal_url ?? data.url };
    return { success: false, error: extractError(data.detail, "Failed to open billing portal") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- SuperAdmin API ----

export interface SuperAdminOrgsResult {
  success: boolean;
  data?: SuperAdminOrgsResponse;
  error?: string;
}

export async function superadminListOrgs(
  limit = 100,
  offset = 0
): Promise<SuperAdminOrgsResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/orgs?limit=${limit}&offset=${offset}`
    );
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to list orgs" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface SuperAdminUsersResult {
  success: boolean;
  data?: SuperAdminUsersResponse;
  error?: string;
}

export async function superadminListUsers(
  limit = 100,
  offset = 0
): Promise<SuperAdminUsersResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users?limit=${limit}&offset=${offset}`
    );
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to list users" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface SuperAdminOrgDetailResult {
  success: boolean;
  org?: SuperAdminOrgDetail;
  error?: string;
}

export async function superadminGetOrg(orgId: string): Promise<SuperAdminOrgDetailResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}`);
    const data = await res.json();
    if (res.ok) return { success: true, org: data };
    return { success: false, error: data.detail || "Org not found" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminSuspendOrg(orgId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/orgs/${orgId}/suspend`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to suspend org" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminActivateOrg(orgId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/orgs/${orgId}/activate`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to activate org" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface UpdateOrgSubscriptionPayload {
  tier?: string;
  paid_slots_limit?: number;
  free_slots_limit?: number;
  show_watermark?: boolean;
}

export async function superadminUpdateSubscription(
  orgId: string,
  payload: UpdateOrgSubscriptionPayload
): Promise<BasicResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to update subscription") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminSuspendUser(userId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users/${userId}/suspend`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to suspend user" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminActivateUser(userId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users/${userId}/activate`,
      { method: "PATCH" }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to activate user" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminUpdateUser(
  userId: string,
  payload: { role?: UserRole; is_free_license?: boolean; allow_feedback?: boolean }
): Promise<BasicResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to update user") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface PromoteUserResult {
  success: boolean;
  data?: { org_id: string; role: UserRole };
  error?: string;
}

export async function superadminPromoteUser(userId: string): Promise<PromoteUserResult> {
  try {
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users/${userId}/promote`,
      { method: "POST" }
    );
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: extractError(data.detail, "Failed to promote user") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface DeleteUserResult {
  status: "ok";
  user_id: string;
  email: string | null;
  tenant_existed: boolean;
  deleted: {
    tenant_user: boolean;
    conversations: number;
    user_odoo_credentials: number;
    pinned_insights: number;
    notifications: number;
    audit_logs: number;
    checkpoints: number;
    feedback_reports: number;
    analytics_events: number;
  };
  org_deleted: string | null;
  supabase_auth: "deleted" | "not_found" | "skipped_not_configured" | "failed";
  supabase_error: string | null;
}

export async function superadminDeleteUser(
  userId: string,
  opts: { deleteEmptyOrg?: boolean } = {}
): Promise<{ success: boolean; data?: DeleteUserResult; error?: string }> {
  try {
    const qs = opts.deleteEmptyOrg ? "?delete_empty_org=true" : "";
    const res = await authFetch(
      `${API_BASE}/admin/superadmin/users/${userId}${qs}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, data: data as DeleteUserResult };
    return { success: false, error: extractError(data.detail, "Failed to delete user") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function superadminUpdateOrgType(
  orgId: string,
  type: OrgType
): Promise<BasicResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/orgs/${orgId}/type`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: extractError(data.detail, "Failed to update org type") };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Feedback API ----

export interface SubmitFeedbackPayload {
  config_id: string;
  message_id?: string;
  user_comment?: string;
  category?: FeedbackCategory;
  expected_response?: string;
}

export interface SubmitFeedbackResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function submitFeedback(
  chatId: string,
  payload: SubmitFeedbackPayload
): Promise<SubmitFeedbackResult> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, id: data.id };
    return { success: false, error: data.detail || "Failed to submit feedback" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface FetchFeedbackParams {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  org_id?: string;
  include_hidden?: boolean;
  limit?: number;
  offset?: number;
}

export interface FetchFeedbackResult {
  success: boolean;
  data?: FeedbackListResponse;
  error?: string;
}

export async function fetchAdminFeedback(
  params?: FetchFeedbackParams
): Promise<FetchFeedbackResult> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.org_id) query.set("org_id", params.org_id);
    if (params?.include_hidden) query.set("include_hidden", "true");
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${API_BASE}/admin/feedback${qs}`);
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to fetch feedback" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface UpdateFeedbackPayload {
  status?: FeedbackStatus;
  admin_notes?: string;
  is_hidden?: boolean;
}

export interface UpdateFeedbackResult {
  success: boolean;
  report?: FeedbackReport;
  error?: string;
}

export async function updateFeedbackReport(
  reportId: string,
  payload: UpdateFeedbackPayload
): Promise<UpdateFeedbackResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/feedback/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { success: true, report: data.report };
    return { success: false, error: data.detail || "Failed to update report" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function deleteFeedbackReport(reportId: string): Promise<BasicResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/feedback/${reportId}`, {
      method: "DELETE",
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to delete report" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface FetchFeedbackStatsResult {
  success: boolean;
  data?: FeedbackStats;
  error?: string;
}

export async function fetchFeedbackStats(orgId?: string): Promise<FetchFeedbackStatsResult> {
  try {
    const query = new URLSearchParams();
    if (orgId) query.set("org_id", orgId);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${API_BASE}/admin/feedback/stats${qs}`);
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to fetch stats" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

// ---- Analytics events (superadmin) ----

export interface FetchEventsParams {
  event?: string;
  session_id?: string;
  utm_source?: string;
  utm_campaign?: string;
  date_from?: string;
  date_to?: string;
  has_user?: boolean;
  limit?: number;
  offset?: number;
}

export interface FetchEventsListResult {
  success: boolean;
  data?: AnalyticsEventsListResponse;
  error?: string;
}

export async function fetchAdminEvents(
  params?: FetchEventsParams
): Promise<FetchEventsListResult> {
  try {
    const query = new URLSearchParams();
    if (params?.event) query.set("event", params.event);
    if (params?.session_id) query.set("session_id", params.session_id);
    if (params?.utm_source) query.set("utm_source", params.utm_source);
    if (params?.utm_campaign) query.set("utm_campaign", params.utm_campaign);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    if (params?.has_user != null) query.set("has_user", String(params.has_user));
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${API_BASE}/admin/events${qs}`);
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to fetch events" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface FetchEventsStatsParams {
  date_from?: string;
  date_to?: string;
  utm_source?: string;
  utm_campaign?: string;
}

export interface FetchEventsStatsResult {
  success: boolean;
  data?: AnalyticsEventsStats;
  error?: string;
}

export async function fetchEventsStats(
  params?: FetchEventsStatsParams
): Promise<FetchEventsStatsResult> {
  try {
    const query = new URLSearchParams();
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    if (params?.utm_source) query.set("utm_source", params.utm_source);
    if (params?.utm_campaign) query.set("utm_campaign", params.utm_campaign);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${API_BASE}/admin/events/stats${qs}`);
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, error: data.detail || "Failed to fetch event stats" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export interface FetchFeedbackReportResult {
  success: boolean;
  report?: FeedbackReport;
  error?: string;
}

export async function updateTenantNotes(
  chatId: string,
  feedbackId: string,
  tenantNotes: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/chat/${chatId}/feedback/${feedbackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_notes: tenantNotes }),
    });
    if (res.ok) return { success: true };
    const data = await res.json();
    return { success: false, error: data.detail || "Failed to save note" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}

export async function fetchFeedbackReport(reportId: string): Promise<FetchFeedbackReportResult> {
  try {
    const res = await authFetch(`${API_BASE}/admin/feedback/${reportId}`);
    const data = await res.json();
    if (res.ok) return { success: true, report: data.report };
    return { success: false, error: data.detail || "Failed to fetch report" };
  } catch (err) {
    if (err instanceof LimitReachedError) throw err;
    return { success: false, error: NETWORK_ERROR };
  }
}
