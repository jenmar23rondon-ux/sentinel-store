export type Role = "user" | "assistant" | "system";

export type ProviderName = "auto" | "openai" | "claude" | "gemini" | "ollama" | "local";

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  provider?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  importance: number;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "done";
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisionItem {
  id: string;
  prompt: string;
  analysis: string;
  provider: string;
  imagePath: string;
  imageMimeType: string;
  tags: string[];
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  output: unknown;
  createdAt: string;
}

export interface Store {
  conversations: Conversation[];
  messages: Message[];
  memory: MemoryItem[];
  tasks: TaskItem[];
  vision: VisionItem[];
  toolCalls: ToolCall[];
}
