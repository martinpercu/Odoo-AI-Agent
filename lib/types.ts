// Message metadata types for structured responses
export interface ActionSuccessMetadata {
  type: "action_success";
  action: string;
  recordId: string | number;
  recordName?: string;
  model?: string;
  odooUrl?: string;
  actionType?: "method_call" | "crud";
  actionMessage?: string;
}

export interface ValidationErrorMetadata {
  type: "validation_error";
  action: string;
  missingFields: string[];
  providedData?: Record<string, unknown>;
}

export interface ActionPromptMetadata {
  type: "action_prompt";
  action: string;
  actionLabel: string;
  action_btn?: string;
  recordId?: string | number;
  context?: Record<string, unknown>;
}

// Backend action proposal format (from SSE)
export interface ActionContext {
  action: "create" | "update" | "method_call" | "report";
  model: string;
  vals: Record<string, unknown>;
  target_ids: number[] | null;
  method: string | null;
  canonical_verb: string | null;
  status: "pending_confirmation";
}

export interface ActionLabels {
  confirm_btn: string;
  cancel_btn: string;
  action_btn: string;
  cancelled_msg: string;
}

export interface ActionProposalMetadata {
  type: "action_proposal";
  action: ActionContext;
  labels: ActionLabels;
}

// Selection prompt for ambiguity resolution (from SSE)
export interface SelectionOption {
  index: number;
  id: number;
  name: string;
}

export interface SelectionPromptMetadata {
  type: "selection_prompt";
  field: string;
  searchValue: string;
  options: SelectionOption[];
}

// File attachment for PDF reports (from action response)
export interface FileAttachmentMetadata {
  type: "file_attachment";
  file_url: string;
  filename: string;
}

// Action response result types
export type ActionResult =
  | { action: "create"; model: string; id: number }
  | { action: "update"; model: string; ids: number[]; success: boolean }
  | { action: "method_call"; model: string; method: string; ids: number[]; method_result: unknown }
  | { action: "report"; model: string; ids: number[]; file_url: string; filename: string };

export interface ExcelExportMetadata {
  type: "excel_export";
  export_url: string;
  filename: string;
}

export interface NoCredentialsMetadata {
  type: "no_credentials";
  config_id: string;
}

export type MessageMetadata =
  | ActionSuccessMetadata
  | ValidationErrorMetadata
  | ActionPromptMetadata
  | ActionProposalMetadata
  | SelectionPromptMetadata
  | FileAttachmentMetadata
  | ExcelExportMetadata
  | NoCredentialsMetadata;

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  charts?: ChartSSEEvent[];
  imageUrl?: string;
  /** Whether to show "Powered by The Odoo Agent" watermark. Undefined = show (safe default). */
  watermark?: boolean;
}

export interface Chat {
  id: string;
  /** DB conversation ID — needed for DELETE and other endpoints that use the real DB id, not thread_id */
  conversationId?: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatGroup {
  label: string;
  chats: Chat[];
}

export interface Plan {
  id: string;
  name: string;
  price: number | null;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

export interface OdooConfig {
  url: string;
  db: string;
  login: string;
  apiKey: string;
}

// Chart types for analytics visualization (from SSE)
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartMeta {
  value_label: string;
  value_format: "currency" | "number" | "integer" | "decimal";
  currency_symbol: string;
  currency_iso: string | null;
  no_decimals: boolean;
  group_by: string;
  model: string;
  period: string | null;
  total: number;
}

export type PinVolatility = "variable" | "static";

export interface PinQueryContext {
  primary_model?: string;
  dynamic_domain?: unknown[];
  date_filter?: { start?: string; end?: string };
  groupby_fields?: string[];
  classified_areas?: string[];
  volatility?: PinVolatility;
}

export interface ChartSSEEvent {
  type: "chart";
  chart_type: "bar" | "pie" | "line";
  title: string;
  data: ChartDataPoint[];
  meta: ChartMeta;
  export_url?: string;
  query_context?: PinQueryContext;
}

export interface ExportSSEEvent {
  type: "export";
  export_url: string;
  filename: string;
}

export type ConnectionStatus = "idle" | "loading" | "success" | "error";

// Entity search result for autocomplete (from name_search)
export interface EntitySearchResult {
  id: number;
  name: string;
}

// ---- Pinned Insights ----

export interface PinnedChart {
  kind: "chart";
  id: string;
  pinnedAt: string;
  chatId: string;
  messageId: string;
  chartIndex: number;
  chart: ChartSSEEvent;
  query_context?: PinQueryContext;
}

export interface PinnedFile {
  kind: "file";
  id: string;
  pinnedAt: string;
  chatId: string;
  messageId: string;
  metadata: FileAttachmentMetadata;
}

export interface PinnedExcel {
  kind: "excel";
  id: string;
  pinnedAt: string;
  chatId: string;
  messageId: string;
  metadata: ExcelExportMetadata;
}

export type PinnedInsight = PinnedChart | PinnedFile | PinnedExcel;

// ---- Notifications ----

export type NotificationSeverity = "critical" | "warning" | "info" | "success";
export type NotificationCategory = "sales" | "stock" | "invoices" | "general";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
  chatPrompt: string;
}

export interface NotificationSettings {
  salesAlerts: boolean;
  stockAlerts: boolean;
  invoiceAlerts: boolean;
  dailySummary: boolean;
}

// ---- Multi-Tenancy & Auth ----

export type UserRole = "ADMIN" | "CLIENT_USER" | "SUPERADMIN";
export type OrgType = "PARTNER" | "SOLITARY";

/**
 * Lifecycle of a user's Odoo Connection (per instance), spec §4.
 * - `unset`: row exists (user assigned to the instance) but no valid apikey yet → blocking.
 * - `active`: apikey validated against Odoo OK.
 * - `invalid`: a query failed by auth → backend marks it (isolated per user).
 */
export type OdooConnectionStatus = "unset" | "active" | "invalid";
export type SeatType = "paid" | "free";
export type InvitationMode = "invite_only" | "precreds";
export type InvitationStatus = "pending" | "accepted" | "cancelled";
export type SubscriptionTier =
  | "FREE"
  | "STARTER"
  | "IMPLEMENTOR_S"
  | "IMPLEMENTOR_M"
  | "IMPLEMENTOR_L"
  | "IMPLEMENTOR_XL"
  | "IMPLEMENTOR_XXL";

export interface MeUser {
  id: string;
  email: string;
  role: UserRole;
  is_free_license: boolean;
  allow_feedback: boolean;
}

export interface MeOrg {
  id: string;
  name: string;
  slug: string;
  /** Capability axis — gates invites & client management (PARTNER only). */
  type: OrgType;
  /**
   * Identity axis — whether this org joined as a founding partner (Fase 0).
   * Convenience mirror of `/billing/state`; pricing's source of truth stays
   * `getBillingState()`. Stamped at org creation from the global phase, then
   * immutable. Absent on older payloads → treated as founder during beta.
   */
  is_founding_partner?: boolean;
  /** Mirror of `BillingState.founder_rate_locked` (set true at graduation). */
  founder_rate_locked?: boolean;
}

export interface MeSubscription {
  tier: SubscriptionTier;
  show_watermark: boolean;
  paid_slots_limit: number;
  free_slots_limit: number;
  is_active: boolean;
}

export interface SlotsUsed {
  paid: number;
  free: number;
}

/** Per-instance status counts (spec §2.3 / §6 InstanceHealthSummary). */
export interface InstanceCounts {
  active: number;
  unset: number;
  invalid: number;
  pending: number;
}

/** Org-level seat usage, surfaced alongside instances. */
export interface InstanceSeats {
  paid_used: number;
  paid_total: number;
  free_used: number;
  free_total: number;
}

export interface OdooConfigSummary {
  id: string;
  label: string;
  url: string;
  db_name: string;
  is_active: boolean;
  has_credentials?: boolean;
  // Instance metadata captured on validation (spec §2.1/§2.3).
  company_name?: string | null;
  odoo_version?: string | null;
  // Status of the *caller's own* Connection on this instance (null = no Connection).
  my_connection_status?: OdooConnectionStatus | null;
  // CLIENT_USER variant of /me exposes connection_status directly.
  connection_status?: OdooConnectionStatus | null;
  // Present on the instance-list endpoint for ADMIN.
  counts?: InstanceCounts;
  seats?: InstanceSeats;
}

export interface UserOdooCredential {
  id: string;
  user_id: string;
  odoo_config_id: string;
  odoo_username: string;
  created_at: string;
  updated_at: string;
  status?: OdooConnectionStatus;
  last_validated_at?: string | null;
}

/** Returned by GET /me/odoo-credentials — one entry per config that has credentials */
export interface OdooCredentialSummary {
  config_id: string;
  odoo_username: string;
  status?: OdooConnectionStatus;
  last_validated_at?: string | null;
}

/** Returned by GET /admin/orgs/{orgId}/users/{userId}/odoo-credentials */
export interface AdminUserCredential {
  id: string;
  user_id: string;
  odoo_config_id: string;
  odoo_username: string;
  created_at: string;
  updated_at: string;
  config_label?: string;
  config_url?: string;
  status?: OdooConnectionStatus;
  last_validated_at?: string | null;
}

export interface OdooConfigSummaryWithCreds extends OdooConfigSummary {
  hasCredentials: boolean;
  odoo_username?: string;
  connectionStatus?: OdooConnectionStatus | null;
}

// ---- Instance validation (spec §7) ----

export type ValidateErrorCode = "unreachable" | "db_not_found" | "auth_failed";

export type ValidateResult =
  | { ok: true; company_name: string | null; odoo_version: string | null }
  | { ok: false; error_code: ValidateErrorCode; field_errors?: Record<string, string> };

// ---- Instance detail (spec §2.4 — GET /admin/orgs/{id}/configs/{id}) ----

/** A user as seen from an instance's detail (users ∩ this instance). */
export interface InstanceUser {
  user_id: string;
  email: string;
  role: UserRole;
  seat_type: SeatType;
  connection_status: OdooConnectionStatus;
  odoo_username: string | null;
  last_validated_at: string | null;
}

/** A pending invitation scoped to an instance. */
export interface InstanceInvitation {
  id: string;
  email: string;
  seat_type: SeatType;
  mode: InvitationMode;
  status: InvitationStatus;
  expires_at: string;
}

export interface InstanceDetail {
  id: string;
  label: string;
  url: string;
  db_name: string;
  company_name: string | null;
  odoo_version: string | null;
  counts: InstanceCounts;
  seats?: InstanceSeats;
  users: InstanceUser[];
  invitations: InstanceInvitation[];
}

export interface MeResponse {
  user: MeUser;
  org: MeOrg | null;
  subscription: MeSubscription | null;
  slots_used: SlotsUsed | null;
  odoo_configs: OdooConfigSummary[];
  demo_available?: boolean;
}

// ---- Billing state (Fase 0 — Founding Partners, spec §5/§6) ----

/**
 * Lifecycle phase of the product's commercial model.
 * - `beta_founder`: current — everyone is a founding partner, free during beta.
 * - `scale`: post-graduation — paid tiers active (founder rate locked in).
 * Kept open-ended so the backend can introduce new phases without a front release.
 */
export type BillingPhase = "beta_founder" | "scale" | (string & {});

/**
 * Render-only billing context (Surface I). The front renders these values; it
 * never computes pricing. Source of truth is `GET /billing/state`. When the
 * endpoint is unavailable, the front falls back to `BETA_BILLING_DEFAULTS`.
 */
export interface BillingState {
  phase: BillingPhase;
  /** List/anchor price per user (e.g. 7). */
  price_anchor: number;
  /** Locked-in founder rate per user (e.g. 1.40). */
  founder_rate: number;
  /** True during beta — usage is $0. */
  beta_free: boolean;
  /** Whether the founder rate is already locked for this org. */
  founder_rate_locked?: boolean;
  /** Active billable seats (render-only). `null` in dev / when there's no org yet. */
  active_seats?: number | null;
  seat_limit?: number | null;
  payment_status?: string;
}

export interface ServerConversation {
  id: string;
  thread_id: string;
  title: string | null;
  last_message_at: string;
}

export interface OdooConfigItem {
  id: string;
  label: string;
  url: string;
  db_name: string;
  is_active: boolean;
}

export interface OrgUser {
  id: string;
  email: string;
  role: UserRole;
  is_free_license: boolean;
  allow_feedback: boolean;
  created_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  // Tenant refactor (spec §2.8): which instance, seat and mode the invite carries.
  instance_id?: string | null;
  seat_type?: SeatType;
  mode?: InvitationMode;
  status?: InvitationStatus;
}

// ---- SuperAdmin ----

export interface SuperAdminSubscription {
  tier: string;
  paid_slots_limit: number;
  free_slots_limit: number;
  show_watermark: boolean;
  is_active: boolean;
}

export interface SuperAdminOrg {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  is_active: boolean;
  created_at: string;
  subscription: SuperAdminSubscription;
  user_count: number;
}

export interface SuperAdminOrgsResponse {
  orgs: SuperAdminOrg[];
  count: number;
}

export interface SuperAdminOrgDetail extends SuperAdminOrg {
  slots: {
    paid_used: number;
    free_used: number;
  };
  odoo_configs?: OdooConfigItem[];
}

export interface SuperAdminUser {
  id: string;
  email: string;
  role: UserRole;
  is_free_license: boolean;
  allow_feedback: boolean;
  is_active: boolean;
  created_at: string;
  org: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface SuperAdminUsersResponse {
  users: SuperAdminUser[];
  count: number;
}

// ---- Feedback ----

export type FeedbackCategory = "wrong_answer" | "crash" | "misunderstood" | "other";
export type FeedbackStatus = "pending" | "reviewed" | "test_alpha" | "test_beta" | "resolved";

export interface FeedbackReport {
  // Identity
  id: string;
  thread_id: string;
  org_id: string | null;
  supabase_user_id: string | null;
  reported_at: string;
  resolved_at: string | null;

  // User input
  message_id: string | null;
  user_comment: string | null;
  category: FeedbackCategory | null;
  expected_response: string | null;

  // Admin workflow
  status: FeedbackStatus;
  is_hidden: boolean;
  admin_notes: string | null;
  tenant_notes: string | null;

  // Conversation snapshot
  last_messages: Array<{ role: "human" | "ai"; content: string; id: string | null }>;
  user_query: string | null;
  agent_response: string | null;

  // Classification snapshot
  language: string | null;
  primary_model: string | null;
  classified_areas: string[] | null;
  query_type: string | null;
  keyword_classification_done: boolean | null;
  needs_llm_classification: boolean | null;
  keyword_hints: string[] | null;

  // Domain snapshot
  dynamic_domain: unknown[] | null;
  date_filter: Record<string, unknown> | null;
  entity_filter: Record<string, unknown> | null;

  // Execution context
  odoo_total_count: number | null;
  odoo_was_truncated: boolean | null;
  is_followup_query: boolean | null;
  formatted_for_llm: string | null;

  // Errors
  odoo_error: string | null;
  write_error: string | null;

  // Write operation snapshot
  is_write_operation: boolean | null;
  write_vals: Record<string, unknown> | null;
  pending_action: Record<string, unknown> | null;

  // Clarification snapshot
  needs_clarification: boolean | null;
  clarification_question: string | null;

  // Raw data
  odoo_raw_data: unknown[] | null;
}

export interface FeedbackListResponse {
  reports: FeedbackReport[];
  total: number;
}

export interface FeedbackStats {
  total: number;
  last_24h: number;
  last_7d: number;
  by_status: Record<FeedbackStatus, number>;
  by_category: Record<string, number>;
  top_orgs: Array<{ org_id: string; count: number }>;
}

// ---- Analytics events (landing funnel — superadmin view) ----

export interface AnalyticsEvent {
  id: string;
  event: string;
  props: Record<string, unknown>;
  session_id: string | null;
  user_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  user_agent: string | null;
  client_ts: string | null;
  received_at: string;
}

export interface AnalyticsEventsListResponse {
  items: AnalyticsEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AnalyticsEventsStats {
  total: number;
  last_24h: number;
  last_7d: number;
  unique_sessions: number;
  by_event: Record<string, number>;
  funnel: Record<string, number>;
  by_utm_source: Array<{ source: string; count: number }>;
  by_utm_campaign: Array<{ campaign: string; count: number }>;
  top_example_prompts: Array<{ prompt_id: string; count: number }>;
  dismissals_by_reason: Record<string, number>;
}
