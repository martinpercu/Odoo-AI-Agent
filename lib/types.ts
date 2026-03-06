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

export type MessageMetadata =
  | ActionSuccessMetadata
  | ValidationErrorMetadata
  | ActionPromptMetadata
  | ActionProposalMetadata
  | SelectionPromptMetadata
  | FileAttachmentMetadata
  | ExcelExportMetadata;

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  charts?: ChartSSEEvent[];
  imageUrl?: string;
}

export interface Chat {
  id: string;
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
  group_by: string;
  model: string;
  period: string | null;
  total: number;
}

export interface ChartSSEEvent {
  type: "chart";
  chart_type: "bar" | "pie" | "line";
  title: string;
  data: ChartDataPoint[];
  meta: ChartMeta;
  export_url?: string;
}

export interface ExportSSEEvent {
  type: "export";
  export_url: string;
  filename: string;
}

export type ConnectionStatus = "idle" | "loading" | "success" | "error";

// ---- Pinned Insights ----

export interface PinnedChart {
  kind: "chart";
  id: string;
  pinnedAt: string;
  chatId: string;
  messageId: string;
  chartIndex: number;
  chart: ChartSSEEvent;
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
