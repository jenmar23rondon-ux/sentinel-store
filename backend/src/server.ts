import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { env } from "./env.js";
import { analyzeImage, generateAssistantReply, providerStatus } from "./providers.js";
import { webSearch } from "./search.js";
import { db } from "./store.js";
import type { ActionItem, ActionType, ProviderName } from "./types.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "16mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "Sentinel AI", time: new Date().toISOString() });
});

app.get("/api/bootstrap", async (_req, res) => {
  const store = await db.snapshot();
  res.json({
    conversations: store.conversations,
    messages: store.messages,
    memory: store.memory,
    tasks: store.tasks,
    vision: store.vision,
    actions: store.actions,
    career: store.career,
    activity: store.activity,
    notificationSettings: store.notificationSettings,
    providers: providerStatus(),
    integrations: integrationStatus()
  });
});

app.post("/api/chat", async (req, res, next) => {
  try {
    const body = z.object({
      message: z.string().min(1),
      conversationId: z.string().optional(),
      provider: z.enum(["auto", "openai", "claude", "gemini", "ollama", "local"]).default("auto")
    }).parse(req.body);

    const conversation = await db.upsertConversation(
      body.conversationId,
      body.message.slice(0, 54) || "Nueva conversacion"
    );
    const userMessage = await db.addMessage({
      conversationId: conversation.id,
      role: "user",
      content: body.message
    });

    await autoCaptureMemory(body.message);
    await autoCaptureTask(body.message);
    const plannedAction = await autoCreateAction(body.message);

    const store = await db.snapshot();
    const recentMessages = store.messages
      .filter((item) => item.conversationId === conversation.id)
      .slice(-12);
    const memoryContext = store.memory
      .slice(0, 8)
      .map((item) => `- ${item.content} (${item.tags.join(", ") || "general"})`)
      .join("\n");
    const taskContext = store.tasks
      .filter((item) => item.status === "open")
      .slice(0, 8)
      .map((item) => `- [${item.priority}] ${item.title}${item.dueAt ? ` vence ${item.dueAt}` : ""}`)
      .join("\n");

    const reply = await generateAssistantReply({
      provider: body.provider as ProviderName,
      messages: recentMessages,
      memoryContext,
      taskContext
    });

    const actionNote = plannedAction
      ? `\n\nAccion preparada: ${plannedAction.title}. Queda pendiente de aprobacion en Action Center antes de ejecutarla.`
      : "";

    const assistantMessage = await db.addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: `${reply.content}${actionNote}`,
      provider: reply.provider
    });

    res.json({ conversation, messages: [userMessage, assistantMessage] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/memory", async (_req, res) => {
  res.json((await db.snapshot()).memory);
});

app.post("/api/memory", async (req, res, next) => {
  try {
    const body = z.object({
      content: z.string().min(1),
      tags: z.array(z.string()).optional(),
      importance: z.number().min(1).max(5).optional()
    }).parse(req.body);
    res.status(201).json(await db.addMemory(body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/memory/:id", async (req, res) => {
  await db.deleteMemory(req.params.id);
  res.status(204).send();
});

app.get("/api/tasks", async (_req, res) => {
  res.json((await db.snapshot()).tasks);
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1),
      notes: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      dueAt: z.string().optional()
    }).parse(req.body);
    res.status(201).json(await db.createTask(body));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  const task = await db.updateTask(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.delete("/api/tasks/:id", async (req, res) => {
  await db.deleteTask(req.params.id);
  res.status(204).send();
});

app.post("/api/search", async (req, res, next) => {
  try {
    const body = z.object({ query: z.string().min(2) }).parse(req.body);
    const results = await webSearch(body.query);
    await db.addToolCall({ name: "web_search", input: body, output: results });
    res.json(results);
  } catch (error) {
    next(error);
  }
});

app.get("/api/vision", async (_req, res) => {
  res.json((await db.snapshot()).vision);
});

app.post("/api/vision/analyze", async (req, res, next) => {
  try {
    const body = z.object({
      prompt: z.string().default("Analiza esta imagen."),
      imageData: z.string().min(20),
      provider: z.enum(["auto", "openai", "claude", "gemini", "ollama", "local"]).default("auto"),
      tags: z.array(z.string()).optional()
    }).parse(req.body);

    const parsed = parseDataUrl(body.imageData);
    const extension = parsed.mimeType === "image/png" ? "png" : parsed.mimeType === "image/webp" ? "webp" : "jpg";
    const imageDir = path.resolve("data/images");
    await fs.mkdir(imageDir, { recursive: true });
    const fileName = `${nanoid()}.${extension}`;
    const imagePath = path.join(imageDir, fileName);
    await fs.writeFile(imagePath, Buffer.from(parsed.base64, "base64"));

    const analysis = await analyzeImage({
      provider: body.provider,
      prompt: body.prompt,
      imageBase64: parsed.base64,
      mimeType: parsed.mimeType
    });

    const item = await db.addVision({
      prompt: body.prompt,
      analysis: analysis.content,
      provider: analysis.provider,
      imagePath,
      imageMimeType: parsed.mimeType,
      tags: body.tags ?? ["vision"]
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/vision/:id", async (req, res) => {
  await db.deleteVision(req.params.id);
  res.status(204).send();
});

app.get("/api/actions", async (_req, res) => {
  res.json((await db.snapshot()).actions);
});

app.post("/api/actions", async (req, res, next) => {
  try {
    const body = actionSchema.parse(req.body);
    res.status(201).json(await db.createAction({ ...body, source: "manual", requiresApproval: true, status: "pending" }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/actions/:id", async (req, res) => {
  const action = await db.updateAction(req.params.id, req.body);
  if (!action) return res.status(404).json({ error: "Action not found" });
  res.json(action);
});

app.delete("/api/actions/:id", async (req, res) => {
  await db.deleteAction(req.params.id);
  res.status(204).send();
});

app.get("/api/career/applications", async (_req, res) => {
  res.json((await db.snapshot()).career);
});

app.post("/api/career/applications", async (req, res, next) => {
  try {
    const body = jobApplicationSchema.parse(req.body);
    const item = await db.createJobApplication({ ...body, synced: true });
    broadcast({ type: "career:created", payload: item });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.post("/api/career/sync", async (req, res, next) => {
  try {
    const body = z.object({ applications: z.array(jobApplicationSchema.extend({ id: z.string().optional() })) }).parse(req.body);
    const saved = [];
    for (const application of body.applications) {
      const existing = (await db.snapshot()).career.find((item) => item.id === application.id);
      if (existing && application.id) {
        saved.push(await db.updateJobApplication(application.id, application));
      } else {
        saved.push(await db.createJobApplication({ ...application, synced: true }));
      }
    }
    broadcast({ type: "career:synced", payload: saved });
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/career/applications/:id", async (req, res) => {
  const item = await db.updateJobApplication(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "Application not found" });
  broadcast({ type: "career:updated", payload: item });
  res.json(item);
});

app.delete("/api/career/applications/:id", async (req, res) => {
  await db.deleteJobApplication(req.params.id);
  broadcast({ type: "career:deleted", payload: { id: req.params.id } });
  res.status(204).send();
});

app.post("/api/career/ai", async (req, res, next) => {
  try {
    const body = z.object({
      prompt: z.string().min(2),
      provider: z.enum(["auto", "openai", "claude", "gemini", "ollama", "local"]).default("auto")
    }).parse(req.body);
    const store = await db.snapshot();
    const careerContext = store.career.slice(0, 8).map((item) => `${item.company} - ${item.role} (${item.status})`).join("\n");
    const reply = await generateAssistantReply({
      provider: body.provider as ProviderName,
      messages: [{ role: "user", content: `${body.prompt}\n\nCareer tracker:\n${careerContext}` }],
      memoryContext: store.memory.map((item) => `- ${item.content}`).join("\n"),
      taskContext: store.tasks.filter((item) => item.status === "open").map((item) => `- ${item.title}`).join("\n")
    });
    res.json(reply);
  } catch (error) {
    next(error);
  }
});

app.get("/api/activity", async (_req, res) => {
  res.json({
    activity: (await db.snapshot()).activity,
    notificationSettings: (await db.snapshot()).notificationSettings
  });
});

app.post("/api/activity", async (req, res, next) => {
  try {
    const body = activitySchema.parse(req.body);
    const item = await db.addActivity(body);
    broadcast({ type: "activity:created", payload: item });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/notifications/settings", async (req, res) => {
  const settings = await db.updateNotificationSettings(req.body);
  broadcast({ type: "notifications:settings", payload: settings });
  res.json(settings);
});

app.get("/api/integrations", (_req, res) => {
  res.json(integrationStatus());
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(400).json({ error: message });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "connected", payload: { time: new Date().toISOString() } }));
});

server.listen(env.port, () => {
  console.log(`Sentinel AI backend running on http://localhost:${env.port}`);
});

function broadcast(message: unknown) {
  const raw = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(raw);
  }
}

function integrationStatus() {
  return {
    openai: { configured: Boolean(env.openaiApiKey), label: "OpenAI" },
    claude: { configured: Boolean(env.anthropicApiKey), label: "Claude" },
    gemini: { configured: Boolean(env.geminiApiKey), label: "Gemini" },
    ollama: { configured: Boolean(env.ollamaBaseUrl), label: "Ollama local" },
    webSearch: { configured: Boolean(env.serperApiKey), label: "Serper web search", fallback: "DuckDuckGo Instant Answer" },
    github: { configured: false, label: "GitHub OAuth", next: true },
    gmail: { configured: false, label: "Gmail OAuth", next: true },
    calendar: { configured: false, label: "Google Calendar OAuth", next: true },
    microsoft365: { configured: false, label: "Microsoft 365 Graph", next: true }
  };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) throw new Error("Formato de imagen no soportado. Usa PNG, JPG o WEBP.");
  return {
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2]
  };
}

const actionSchema = z.object({
  type: z.enum(["schedule", "message", "email", "reminder", "automation"]),
  title: z.string().min(1),
  target: z.string().optional(),
  draft: z.string().optional(),
  scheduledFor: z.string().optional()
});

const jobApplicationSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  date: z.string().min(1),
  url: z.string().optional(),
  status: z.enum(["applied", "screening", "interview", "offer", "rejected"]).default("applied"),
  notes: z.string().optional(),
  recruiterName: z.string().optional(),
  recruiterEmail: z.string().optional(),
  salaryExpectation: z.string().optional(),
  nextActionReminder: z.string().optional()
});

const activitySchema = z.object({
  type: z.enum(["location", "app_usage", "notification", "activity"]),
  title: z.string().min(1),
  detail: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  durationMinutes: z.number().optional(),
  appName: z.string().optional(),
  occurredAt: z.string().default(() => new Date().toISOString())
});

async function autoCaptureMemory(message: string) {
  const normalized = message.trim();
  const match = normalized.match(/^(recuerda que|recuerda:|memory:)\s*(.+)$/i);
  if (!match) return;
  await db.addMemory({
    content: match[2],
    tags: ["capturado-chat"],
    importance: 4
  });
}

async function autoCaptureTask(message: string) {
  const normalized = message.trim();
  const match = normalized.match(/^(tarea:|pendiente:|recu[eé]rdame)\s*(.+)$/i);
  if (!match) return;
  await db.createTask({
    title: match[2],
    priority: "medium",
    notes: "Creada desde el chat"
  });
}

async function autoCreateAction(message: string): Promise<ActionItem | null> {
  const plan = detectActionIntent(message);
  if (!plan) return null;
  return db.createAction({
    ...plan,
    status: "pending",
    source: "chat",
    requiresApproval: true
  });
}

function detectActionIntent(message: string): Omit<ActionItem, "id" | "status" | "source" | "requiresApproval" | "createdAt" | "updatedAt"> | null {
  const text = message.trim();
  const lower = text.toLowerCase();
  const target = extractTarget(text);
  const draft = extractDraft(text);
  const scheduledFor = extractSchedule(text);

  if (/(agenda|agendar|calendario|calendar|programa|programar|schedule)/i.test(lower)) {
    return {
      type: "schedule",
      title: summarizeAction("Agendar", text),
      target,
      draft,
      scheduledFor
    };
  }

  if (/(envia|enviar|mandale|m[áa]ndale|mensaje|whatsapp|telegram|discord|sms)/i.test(lower)) {
    return {
      type: "message",
      title: summarizeAction("Enviar mensaje", text),
      target,
      draft: draft ?? text,
      scheduledFor
    };
  }

  if (/(correo|email|gmail|mail)/i.test(lower)) {
    return {
      type: "email",
      title: summarizeAction("Preparar correo", text),
      target,
      draft: draft ?? text,
      scheduledFor
    };
  }

  if (/(recordatorio|recuerdame|recu[ée]rdame|reminder)/i.test(lower)) {
    return {
      type: "reminder",
      title: summarizeAction("Crear recordatorio", text),
      target,
      draft,
      scheduledFor
    };
  }

  if (/(automatiza|automatizar|workflow|si .* entonces|cuando .* haz)/i.test(lower)) {
    return {
      type: "automation",
      title: summarizeAction("Crear automatizacion", text),
      target,
      draft: text,
      scheduledFor
    };
  }

  return null;
}

function summarizeAction(prefix: string, text: string) {
  return `${prefix}: ${text.replace(/\s+/g, " ").slice(0, 90)}`;
}

function extractTarget(text: string) {
  const match = text.match(/\b(?:a|para|to)\s+([A-Za-z0-9_.@+\-\s]{2,40})(?:\s+(?:que|diciendo|sobre|el|la|los|las|mañana|hoy)|$)/i);
  return match?.[1]?.trim();
}

function extractDraft(text: string) {
  const quoted = text.match(/["“](.+?)["”]/);
  if (quoted) return quoted[1].trim();
  const match = text.match(/\b(?:dice|dile|diciendo|mensaje|asunto|body|contenido)\s*:?\s*(.+)$/i);
  return match?.[1]?.trim();
}

function extractSchedule(text: string) {
  const match = text.match(/\b(hoy|mañana|manana|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b.*$/i);
  return match?.[0]?.trim();
}
