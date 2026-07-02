import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "./env.js";
import type { ActionItem, ActivityEvent, Conversation, CustomChart, JobApplication, MemoryItem, Message, MessageFeedback, NotificationSettings, Store, TaskItem, ToolCall, VisionItem } from "./types.js";

const initialStore: Store = {
  conversations: [],
  messages: [],
  memory: [],
  tasks: [],
  vision: [],
  actions: [],
  career: [],
  activity: [],
  charts: [],
  notificationSettings: {
    enabled: true,
    activityAlerts: true,
    careerReminders: true,
    locationInsights: true
  },
  toolCalls: [],
  feedback: []
};

let cache: Store | null = null;

async function ensureStore(): Promise<Store> {
  if (cache) return cache;

  const filePath = path.resolve(env.dataFile);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await fs.readFile(filePath, "utf8");
    cache = JSON.parse(raw) as Store;
    cache.conversations ??= [];
    cache.messages ??= [];
    cache.memory ??= [];
    cache.tasks ??= [];
    cache.vision ??= [];
    cache.actions ??= [];
    cache.career ??= [];
    cache.activity ??= [];
    cache.charts ??= [];
    cache.notificationSettings ??= structuredClone(initialStore.notificationSettings);
    cache.toolCalls ??= [];
    cache.feedback ??= [];
  } catch {
    cache = structuredClone(initialStore);
    await persist();
  }

  return cache;
}

async function persist() {
  const filePath = path.resolve(env.dataFile);
  await fs.writeFile(filePath, JSON.stringify(cache ?? initialStore, null, 2));
}

export const db = {
  async snapshot() {
    return ensureStore();
  },

  async upsertConversation(id?: string, title?: string): Promise<Conversation> {
    const store = await ensureStore();
    const now = new Date().toISOString();
    const existing = id ? store.conversations.find((item) => item.id === id) : undefined;

    if (existing) {
      existing.updatedAt = now;
      if (title) existing.title = title;
      await persist();
      return existing;
    }

    const conversation: Conversation = {
      id: id ?? nanoid(),
      title: title ?? "Nueva conversacion",
      createdAt: now,
      updatedAt: now
    };
    store.conversations.unshift(conversation);
    await persist();
    return conversation;
  },

  async addMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const store = await ensureStore();
    const created: Message = {
      ...message,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };
    store.messages.push(created);
    const conversation = store.conversations.find((item) => item.id === message.conversationId);
    if (conversation) conversation.updatedAt = created.createdAt;
    await persist();
    return created;
  },

  async addMemory(input: Pick<MemoryItem, "content"> & Partial<Pick<MemoryItem, "tags" | "importance">>) {
    const store = await ensureStore();
    const item: MemoryItem = {
      id: nanoid(),
      content: input.content,
      tags: input.tags ?? [],
      importance: input.importance ?? 3,
      createdAt: new Date().toISOString()
    };
    store.memory.unshift(item);
    await persist();
    return item;
  },

  async deleteMemory(id: string) {
    const store = await ensureStore();
    store.memory = store.memory.filter((item) => item.id !== id);
    await persist();
  },

  async createTask(input: Pick<TaskItem, "title"> & Partial<Omit<TaskItem, "id" | "title" | "createdAt" | "updatedAt">>) {
    const store = await ensureStore();
    const now = new Date().toISOString();
    const task: TaskItem = {
      id: nanoid(),
      title: input.title,
      notes: input.notes,
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now
    };
    store.tasks.unshift(task);
    await persist();
    return task;
  },

  async updateTask(id: string, patch: Partial<TaskItem>) {
    const store = await ensureStore();
    const task = store.tasks.find((item) => item.id === id);
    if (!task) return null;
    Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    await persist();
    return task;
  },

  async deleteTask(id: string) {
    const store = await ensureStore();
    store.tasks = store.tasks.filter((item) => item.id !== id);
    await persist();
  },

  async addVision(input: Omit<VisionItem, "id" | "createdAt">) {
    const store = await ensureStore();
    const item: VisionItem = {
      ...input,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };
    store.vision.unshift(item);
    await persist();
    return item;
  },

  async deleteVision(id: string) {
    const store = await ensureStore();
    store.vision = store.vision.filter((item) => item.id !== id);
    await persist();
  },

  async createAction(input: Omit<ActionItem, "id" | "createdAt" | "updatedAt">) {
    const store = await ensureStore();
    const now = new Date().toISOString();
    const action: ActionItem = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now
    };
    store.actions.unshift(action);
    await persist();
    return action;
  },

  async updateAction(id: string, patch: Partial<ActionItem>) {
    const store = await ensureStore();
    const action = store.actions.find((item) => item.id === id);
    if (!action) return null;
    Object.assign(action, patch, { updatedAt: new Date().toISOString() });
    await persist();
    return action;
  },

  async deleteAction(id: string) {
    const store = await ensureStore();
    store.actions = store.actions.filter((item) => item.id !== id);
    await persist();
  },

  async createJobApplication(input: Omit<JobApplication, "id" | "createdAt" | "updatedAt" | "synced"> & { id?: string; synced?: boolean }) {
    const store = await ensureStore();
    const now = new Date().toISOString();
    const item: JobApplication = {
      ...input,
      id: input.id ?? nanoid(),
      synced: input.synced ?? true,
      createdAt: now,
      updatedAt: now
    };
    store.career.unshift(item);
    await persist();
    return item;
  },

  async updateJobApplication(id: string, patch: Partial<JobApplication>) {
    const store = await ensureStore();
    const item = store.career.find((entry) => entry.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString(), synced: true });
    await persist();
    return item;
  },

  async deleteJobApplication(id: string) {
    const store = await ensureStore();
    store.career = store.career.filter((item) => item.id !== id);
    await persist();
  },

  async addActivity(input: Omit<ActivityEvent, "id" | "createdAt">) {
    const store = await ensureStore();
    const item: ActivityEvent = {
      ...input,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };
    store.activity.unshift(item);
    await persist();
    return item;
  },

  async updateNotificationSettings(patch: Partial<NotificationSettings>) {
    const store = await ensureStore();
    store.notificationSettings = { ...store.notificationSettings, ...patch };
    await persist();
    return store.notificationSettings;
  },

  async createChart(input: Omit<CustomChart, "id" | "createdAt" | "updatedAt">) {
    const store = await ensureStore();
    const now = new Date().toISOString();
    const item: CustomChart = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now
    };
    store.charts.unshift(item);
    await persist();
    return item;
  },

  async deleteChart(id: string) {
    const store = await ensureStore();
    store.charts = store.charts.filter((item) => item.id !== id);
    await persist();
  },

  async addToolCall(call: Omit<ToolCall, "id" | "createdAt">) {
    const store = await ensureStore();
    const item = { ...call, id: nanoid(), createdAt: new Date().toISOString() };
    store.toolCalls.unshift(item);
    await persist();
    return item;
  },

  async addFeedback(input: Omit<MessageFeedback, "id" | "createdAt">) {
    const store = await ensureStore();
    const item: MessageFeedback = {
      ...input,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };
    store.feedback.unshift(item);
    await persist();
    return item;
  }
};
