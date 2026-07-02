import { api } from "./api";
import { offlineDb, type SyncQueueItem } from "./offlineDb";
import type { JobApplication, Message, TaskItem } from "../types";

export async function cacheBootstrap(data: { tasks: TaskItem[]; career: JobApplication[]; messages: Message[] }) {
  await offlineDb.transaction("rw", offlineDb.tasks, offlineDb.career, offlineDb.messages, async () => {
    await offlineDb.tasks.bulkPut(data.tasks);
    await offlineDb.career.bulkPut(data.career);
    await offlineDb.messages.bulkPut(data.messages);
  });
}

export async function loadOfflineSnapshot() {
  const [tasks, career, messages] = await Promise.all([
    offlineDb.tasks.toArray(),
    offlineDb.career.toArray(),
    offlineDb.messages.toArray()
  ]);
  return { tasks, career, messages };
}

export async function syncWhenOnline() {
  if (!navigator.onLine) return;
  const queued = await offlineDb.syncQueue.orderBy("createdAt").toArray();
  const careerCreates = queued.filter((item: SyncQueueItem) => item.entity === "career" && item.operation === "create");

  if (careerCreates.length > 0) {
    const applications = careerCreates.map((item: SyncQueueItem) => item.payload as JobApplication);
    const saved = await api.syncCareer(applications);
    await offlineDb.career.bulkPut(saved);
    await offlineDb.syncQueue.bulkDelete(careerCreates.map((item: SyncQueueItem) => item.id!).filter(Boolean));
  }
}
