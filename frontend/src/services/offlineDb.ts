import Dexie, { type Table } from "dexie";
import type { JobApplication, Message, TaskItem } from "../types";

export interface SyncQueueItem {
  id?: number;
  entity: "task" | "career" | "message";
  operation: "create" | "update" | "delete";
  payload: unknown;
  createdAt: string;
}

class SentinelOfflineDb extends Dexie {
  tasks!: Table<TaskItem, string>;
  career!: Table<JobApplication, string>;
  messages!: Table<Message, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("sentinel-ai-offline");
    this.version(1).stores({
      tasks: "id, status, updatedAt",
      career: "id, company, role, status, date, updatedAt, synced",
      messages: "id, conversationId, createdAt",
      syncQueue: "++id, entity, operation, createdAt"
    });
  }
}

export const offlineDb = new SentinelOfflineDb();

export async function queueSync(item: Omit<SyncQueueItem, "createdAt">) {
  await offlineDb.syncQueue.add({
    ...item,
    createdAt: new Date().toISOString()
  });
}
