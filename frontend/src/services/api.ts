import type { ActionItem, ActionType, ActivityEvent, ChartKind, Conversation, CustomChart, JobApplication, MemoryItem, Message, NotificationSettings, ProviderName, SearchResult, TaskItem, UserProfile, VisionItem, WorldPulse } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...requestInit } = init ?? {};
  const authToken = token ?? localStorage.getItem("aether-auth-token") ?? "";
  const response = await fetch(`${API_URL}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(requestInit.headers ?? {})
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
    conversations: Conversation[];
    messages: Message[];
    memory: MemoryItem[];
    tasks: TaskItem[];
    vision: VisionItem[];
    actions: ActionItem[];
    career: JobApplication[];
    activity: ActivityEvent[];
    charts: CustomChart[];
    notificationSettings: NotificationSettings;
    providers: Record<string, boolean>;
    integrations: Record<string, { configured: boolean; label: string; env?: string; fallback?: string; next?: boolean }>;
  }>("/api/bootstrap"),

  chat: (message: string, provider: ProviderName, conversationId?: string, imageData?: string) =>
    request<{ conversation: { id: string; title: string }; messages: Message[] }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, provider, conversationId, imageData })
    }),

  transcribeAudio: (audioData: string, mimeType: string, language: string) =>
    request<{ text: string; provider: string }>("/api/audio/transcribe", {
      method: "POST",
      body: JSON.stringify({ audioData, mimeType, language })
    }),

  deleteConversation: (id: string) => request<void>(`/api/conversations/${id}`, { method: "DELETE" }),

  requestLoginCode: (email: string) =>
    request<{ ok: boolean; delivery: "email" | "dev"; devCode?: string }>("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email })
    }),

  verifyLoginCode: (email: string, code: string) =>
    request<{ token: string; user: UserProfile }>("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code })
    }),

  loginWithPassword: (email: string, password: string) =>
    request<{ token: string; user: UserProfile }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  me: (token: string) => request<{ user: UserProfile | null }>("/api/auth/me", { token }),

  logout: (token: string) => request<void>("/api/auth/logout", { method: "POST", token }),

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

  deleteVision: (id: string) => request<void>(`/api/vision/${id}`, { method: "DELETE" }),

  addAction: (input: { type: ActionType; title: string; target?: string; draft?: string; scheduledFor?: string }) =>
    request<ActionItem>("/api/actions", {
      method: "POST",
      body: JSON.stringify(input)
    }),

  updateAction: (id: string, patch: Partial<ActionItem>) =>
    request<ActionItem>(`/api/actions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),

  deleteAction: (id: string) => request<void>(`/api/actions/${id}`, { method: "DELETE" })
  ,
  addCareerApplication: (input: Omit<JobApplication, "id" | "createdAt" | "updatedAt" | "synced">) =>
    request<JobApplication>("/api/career/applications", {
      method: "POST",
      body: JSON.stringify(input)
    }),

  syncCareer: (applications: JobApplication[]) =>
    request<JobApplication[]>("/api/career/sync", {
      method: "POST",
      body: JSON.stringify({ applications })
    }),

  careerAi: (prompt: string, provider: ProviderName) =>
    request<{ provider: string; content: string }>("/api/career/ai", {
      method: "POST",
      body: JSON.stringify({ prompt, provider })
    }),

  addActivity: (input: Omit<ActivityEvent, "id" | "createdAt">) =>
    request<ActivityEvent>("/api/activity", {
      method: "POST",
      body: JSON.stringify(input)
    }),

  updateNotificationSettings: (patch: Partial<NotificationSettings>) =>
    request<NotificationSettings>("/api/notifications/settings", {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),

  createChart: (prompt: string, input?: { title?: string; kind?: ChartKind }) =>
    request<CustomChart>("/api/charts", {
      method: "POST",
      body: JSON.stringify({ prompt, ...input })
    }),

  deleteChart: (id: string) => request<void>(`/api/charts/${id}`, { method: "DELETE" }),

  sendFeedback: (messageId: string, rating: "up" | "down", note?: string) =>
    request<void>("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ messageId, rating, note })
    }),

  worldPulse: (lang = "es") => request<WorldPulse>(`/api/world-pulse?lang=${encodeURIComponent(lang)}&t=${Date.now()}`),

  analyzeVideo: (input: { question: string; youtubeUrl?: string; videoData?: string; mimeType?: string }) =>
    request<{ provider: string; content: string }>("/api/video/analyze", {
      method: "POST",
      body: JSON.stringify(input)
    }),

  downloadPdf: async (input: { title: string; content: string; rows?: Record<string, string | number | boolean | null>[] }) => {
    const response = await fetch(`${API_URL}/api/reports/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) throw new Error("Could not generate PDF");
    return response.blob();
  }
};
