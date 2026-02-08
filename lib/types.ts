export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
