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

export type ActionType = "schedule" | "message" | "email" | "reminder" | "automation";
export type ActionStatus = "pending" | "approved" | "done" | "cancelled";

export interface ActionItem {
  id: string;
  type: ActionType;
  title: string;
  target?: string;
  draft?: string;
  scheduledFor?: string;
  status: ActionStatus;
  source: "chat" | "manual";
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = "applied" | "screening" | "interview" | "offer" | "rejected";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  date: string;
  url?: string;
  status: JobStatus;
  notes?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  salaryExpectation?: string;
  nextActionReminder?: string;
  synced?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  type: "location" | "app_usage" | "notification" | "activity";
  title: string;
  detail?: string;
  latitude?: number;
  longitude?: number;
  durationMinutes?: number;
  appName?: string;
  occurredAt: string;
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  activityAlerts: boolean;
  careerReminders: boolean;
  locationInsights: boolean;
}

export type ChartKind = "bar" | "line" | "pie" | "table";

export interface CustomChart {
  id: string;
  title: string;
  description?: string;
  kind: ChartKind;
  labels: string[];
  values: number[];
  unit?: string;
  sourcePrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  output: unknown;
  createdAt: string;
}

export interface MessageFeedback {
  id: string;
  messageId: string;
  rating: "up" | "down";
  note?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: "free" | "pro";
  connections: {
    gmail?: boolean;
    calendar?: boolean;
    github?: boolean;
    microsoft365?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export interface Store {
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
  toolCalls: ToolCall[];
  feedback: MessageFeedback[];
  users: UserProfile[];
  sessions: AuthSession[];
  verificationCodes: VerificationCode[];
}
