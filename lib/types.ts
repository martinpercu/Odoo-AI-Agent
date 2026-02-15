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

export type MessageMetadata =
  | ActionSuccessMetadata
  | ValidationErrorMetadata
  | ActionPromptMetadata;

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
