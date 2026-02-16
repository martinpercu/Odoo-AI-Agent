// Message metadata types for structured responses
export interface ActionSuccessMetadata {
  type: "action_success";
  action: string;
  recordId: string | number;
  recordName?: string;
  model?: string;
  odooUrl?: string;
}

export interface ValidationErrorMetadata {
  type: "validation_error";
  action: string;
  missingFields: string[];
  providedData?: Record<string, any>;
}

export interface ActionPromptMetadata {
  type: "action_prompt";
  action: string;
  actionLabel: string;
  recordId?: string | number;
  context?: Record<string, any>;
}

// Backend action proposal format (from SSE)
export interface ActionProposalMetadata {
  type: "action_proposal";
  action: {
    action: "create" | "write" | "unlink";
    model: string;
    vals?: Record<string, any>;
    target_ids?: number[];
    status: "pending_confirmation" | "confirmed" | "rejected";
  };
  labels: {
    action_btn: string;
    confirm_btn: string;
    cancel_btn: string;
    cancelled_msg: string;
  };
}

export type MessageMetadata =
  | ActionSuccessMetadata
  | ValidationErrorMetadata
  | ActionPromptMetadata
  | ActionProposalMetadata;

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
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

export type ConnectionStatus = "idle" | "loading" | "success" | "error";
