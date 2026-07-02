import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { env } from "./env.js";
import type { Store } from "./types.js";

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required to migrate JSON data to PostgreSQL.");
}

const filePath = path.resolve(env.dataFile);
const raw = await fs.readFile(filePath, "utf8");
const store = JSON.parse(raw) as Store;
const client = new pg.Client({ connectionString: env.databaseUrl });

await client.connect();

try {
  await client.query("BEGIN");

  for (const item of store.conversations ?? []) {
    await client.query(
      `INSERT INTO conversations (id, title, created_at, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at`,
      [item.id, item.title, item.createdAt, item.updatedAt]
    );
  }

  for (const item of store.messages ?? []) {
    await client.query(
      `INSERT INTO messages (id, conversation_id, role, content, provider, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [item.id, item.conversationId, item.role, item.content, item.provider ?? null, item.createdAt]
    );
  }

  for (const item of store.memory ?? []) {
    await client.query(
      `INSERT INTO memory_items (id, content, tags, importance, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, tags = EXCLUDED.tags, importance = EXCLUDED.importance`,
      [item.id, item.content, item.tags, item.importance, item.createdAt]
    );
  }

  for (const item of store.tasks ?? []) {
    await client.query(
      `INSERT INTO tasks (id, title, notes, priority, status, due_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
      [item.id, item.title, item.notes ?? null, item.priority, item.status, item.dueAt ?? null, item.createdAt, item.updatedAt]
    );
  }

  for (const item of store.career ?? []) {
    await client.query(
      `INSERT INTO job_applications
       (id, company, role, application_date, url, status, notes, recruiter_name, recruiter_email, salary_expectation, next_action_reminder, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.company,
        item.role,
        item.date,
        item.url ?? null,
        item.status,
        item.notes ?? null,
        item.recruiterName ?? null,
        item.recruiterEmail ?? null,
        item.salaryExpectation ?? null,
        item.nextActionReminder ?? null,
        item.createdAt,
        item.updatedAt
      ]
    );
  }

  await client.query("COMMIT");
  console.log("JSON data migrated to PostgreSQL.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
