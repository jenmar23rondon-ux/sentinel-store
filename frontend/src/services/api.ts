import type { MemoryItem, Message, ProviderName, SearchResult, TaskItem, VisionItem } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Error de API");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  bootstrap: () => request<{
    conversations: unknown[];
    messages: Message[];
    memory: MemoryItem[];
    tasks: TaskItem[];
    vision: VisionItem[];
    providers: Record<string, boolean>;
    integrations: Record<string, { configured: boolean; label: string; fallback?: string; next?: boolean }>;
  }>("/api/bootstrap"),

  chat: (message: string, provider: ProviderName, conversationId?: string) =>
    request<{ conversation: { id: string; title: string }; messages: Message[] }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, provider, conversationId })
    }),

  addMemory: (content: string, tags: string[], importance: number) =>
    request<MemoryItem>("/api/memory", {
      method: "POST",
      body: JSON.stringify({ content, tags, importance })
    }),

  deleteMemory: (id: string) => request<void>(`/api/memory/${id}`, { method: "DELETE" }),

  addTask: (title: string, priority: TaskItem["priority"], dueAt?: string) =>
    request<TaskItem>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, priority, dueAt })
    }),

  updateTask: (id: string, patch: Partial<TaskItem>) =>
    request<TaskItem>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),

  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  search: (query: string) =>
    request<SearchResult[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query })
    }),

  analyzeVision: (prompt: string, imageData: string, provider: ProviderName) =>
    request<VisionItem>("/api/vision/analyze", {
      method: "POST",
      body: JSON.stringify({ prompt, imageData, provider })
    }),

  deleteVision: (id: string) => request<void>(`/api/vision/${id}`, { method: "DELETE" })
};
