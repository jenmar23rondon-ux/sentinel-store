import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { nanoid } from "nanoid";
import PDFDocument from "pdfkit";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { env } from "./env.js";
import { analyzeImage, generateAssistantReply, providerStatus } from "./providers.js";
import { webSearch } from "./search.js";
import { db } from "./store.js";
import type { ActionItem, ActionType, ChartKind, CustomChart, ProviderName } from "./types.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "80mb" }));

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
    charts: store.charts,
    feedback: store.feedback,
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
    const plannedChart = await autoCreateChart(body.message);

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
    const webContext = await maybeBuildWebContext(body.message);

    const reply = await generateAssistantReply({
      provider: body.provider as ProviderName,
      messages: recentMessages,
      memoryContext,
      taskContext,
      webContext
    });

    const actionNote = plannedAction
      ? `\n\nAccion preparada: ${plannedAction.title}. Queda pendiente de aprobacion en Action Center antes de ejecutarla.`
      : "";
    const chartNote = plannedChart
      ? `\n\nGrafica creada: ${plannedChart.title}. La puedes ver en Estadisticas.`
      : "";

    const assistantMessage = await db.addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: `${reply.content}${actionNote}${chartNote}`,
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

app.get("/api/world-pulse", async (req, res) => {
  const lang = z.enum(["es", "en", "pt", "fr"]).catch("es").parse(req.query.lang);
  const [news, currencies, gold] = await Promise.all([
    fetchWorldNews(lang).catch(() => fallbackNews()),
    fetchCurrencies().catch(() => fallbackCurrencies()),
    fetchGold().catch(() => ({ label: "Gold futures USD/oz", value: "Unavailable", change: "Yahoo Finance fallback failed" }))
  ]);
  const bitcoin = await fetchBitcoin().catch(() => ({ code: "BTC", label: "Bitcoin USD", value: "Unavailable" }));

  res.json({
    updatedAt: new Date().toISOString(),
    news,
    currencies,
    gold,
    bitcoin,
    economies: economyRanking()
  });
});

app.post("/api/video/analyze", async (req, res, next) => {
  try {
    const body = z.object({
      question: z.string().min(1),
      youtubeUrl: z.string().optional(),
      videoData: z.string().optional(),
      mimeType: z.string().optional()
    }).parse(req.body);

    const content = await analyzeVideoWithGemini(body.question, body.youtubeUrl, body.videoData, body.mimeType);
    res.json({ provider: env.geminiApiKey ? "gemini-1.5-pro" : "local", content });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reports/pdf", (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional()
    }).parse(req.body);

    const doc = new PDFDocument({ margin: 48, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${slugify(body.title)}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text(body.title, { underline: true });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666").text(`Generated by Sentinel AI OS - ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(12).fillColor("#111").text(body.content, { lineGap: 4 });

    if (body.rows?.length) {
      doc.moveDown();
      doc.fontSize(14).text("Data");
      doc.moveDown(0.5);
      for (const row of body.rows.slice(0, 80)) {
        doc.fontSize(10).fillColor("#111").text(Object.entries(row).map(([key, value]) => `${key}: ${value ?? ""}`).join(" | "));
        doc.moveDown(0.25);
      }
    }

    doc.end();
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

app.get("/api/charts", async (_req, res) => {
  res.json((await db.snapshot()).charts);
});

app.post("/api/charts", async (req, res, next) => {
  try {
    const body = z.object({
      prompt: z.string().min(2),
      title: z.string().optional(),
      kind: z.enum(["bar", "line", "pie", "table"]).optional()
    }).parse(req.body);
    const chart = buildChartFromPrompt(body.prompt, { title: body.title, kind: body.kind });
    const item = await db.createChart(chart);
    broadcast({ type: "charts:created", payload: item });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/charts/:id", async (req, res) => {
  await db.deleteChart(req.params.id);
  broadcast({ type: "charts:deleted", payload: { id: req.params.id } });
  res.status(204).send();
});

app.get("/api/integrations", (_req, res) => {
  res.json(integrationStatus());
});

app.post("/api/feedback", async (req, res, next) => {
  try {
    const body = z.object({
      messageId: z.string().min(1),
      rating: z.enum(["up", "down"]),
      note: z.string().optional()
    }).parse(req.body);
    const item = await db.addFeedback(body);
    broadcast({ type: "feedback:created", payload: item });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
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

async function maybeBuildWebContext(message: string) {
  if (!shouldUseWebSearch(message)) return "";
  try {
    const results = await webSearch(message);
    await db.addToolCall({ name: "chat_web_search", input: { message }, output: results });
    if (results.length === 0) return "";
    return results
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${item.title}\n   ${item.snippet || "Sin resumen disponible"}\n   Fuente: ${item.url}`)
      .join("\n");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    await db.addToolCall({ name: "chat_web_search_error", input: { message }, output: { error: detail } });
    return "";
  }
}

function shouldUseWebSearch(message: string) {
  const lower = message.toLowerCase();
  if (/(crea una grafica|gr[aá]fica|tarea:|pendiente:|recuerda que|recuerda:|envia|enviar|agenda|agendar)/i.test(lower)) return false;
  return /(internet|web|busca|buscar|noticia|noticias|actual|hoy|ahora|precio|valor|bitcoin|oro|dolar|d[oó]lar|clima|quien|qu[eé] es|c[oó]mo funciona|me puedes decir|dime sobre|explica|mejor para|beneficios|riesgos|ultim[oa]s?|latest|news|today|current|\?)/i.test(message);
}

async function fetchWorldNews(lang: "es" | "en" | "pt" | "fr") {
  const feedLocale = {
    es: { hl: "es-419", ceidLang: "es-419" },
    en: { hl: "en", ceidLang: "en" },
    pt: { hl: "pt-BR", ceidLang: "pt-419" },
    fr: { hl: "fr", ceidLang: "fr" }
  }[lang];
  const feeds = [
    { country: "United States", city: "New York", gl: "US", lat: 40.7128, lng: -74.006 },
    { country: "Colombia", city: "Bogota", gl: "CO", lat: 4.711, lng: -74.0721 },
    { country: "Brazil", city: "Sao Paulo", gl: "BR", lat: -23.5558, lng: -46.6396 },
    { country: "France", city: "Paris", gl: "FR", lat: 48.8566, lng: 2.3522 },
    { country: "Japan", city: "Tokyo", gl: "JP", lat: 35.6762, lng: 139.6503 },
    { country: "India", city: "New Delhi", gl: "IN", lat: 28.6139, lng: 77.209 }
  ];

  const results = [];
  for (const feed of feeds) {
    const url = `https://news.google.com/rss?hl=${feedLocale.hl}&gl=${feed.gl}&ceid=${feed.gl}:${feedLocale.ceidLang}`;
    const response = await fetch(url);
    const xml = await response.text();
    const title = decodeXml(xml.match(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? xml.match(/<item>[\s\S]*?<title>(.*?)<\/title>/)?.[1] ?? "Latest headlines");
    const link = decodeXml(xml.match(/<item>[\s\S]*?<link>(.*?)<\/link>/)?.[1] ?? url);
    results.push({ ...feed, url, title, link, impact: inferNewsImpact(title) });
  }
  return results;
}

async function fetchCurrencies() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await response.json() as { rates?: Record<string, number> };
  const rates = data.rates ?? {};
  return [
    { code: "USD", label: "US Dollar", value: 1 },
    { code: "COP", label: "Colombian Peso", value: rates.COP },
    { code: "EUR", label: "Euro", value: rates.EUR },
    { code: "GBP", label: "British Pound", value: rates.GBP },
    { code: "JPY", label: "Japanese Yen", value: rates.JPY },
    { code: "BRL", label: "Brazilian Real", value: rates.BRL },
    { code: "MXN", label: "Mexican Peso", value: rates.MXN }
  ].filter((item) => item.value);
}

async function fetchGold() {
  const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1d&interval=5m");
  const data = await response.json() as { chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number } }[] } };
  const meta = data.chart?.result?.[0]?.meta;
  const value = meta?.regularMarketPrice;
  const previous = meta?.previousClose;
  const change = value && previous ? `${(((value - previous) / previous) * 100).toFixed(2)}%` : "live futures feed";
  return { label: "Gold futures USD/oz", value: value ? value.toFixed(2) : "Unavailable", change };
}

async function fetchBitcoin() {
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cop&include_24hr_change=true");
  const data = await response.json() as { bitcoin?: { usd?: number; cop?: number; usd_24h_change?: number } };
  return {
    code: "BTC",
    label: "Bitcoin",
    value: data.bitcoin?.usd ? Number(data.bitcoin.usd.toFixed(2)) : "Unavailable",
    cop: data.bitcoin?.cop,
    change24h: data.bitcoin?.usd_24h_change ? `${data.bitcoin.usd_24h_change.toFixed(2)}%` : "n/a"
  };
}

function economyRanking() {
  return [
    { rank: 1, country: "United States", gdpUsdT: 28.8, growthProbability: 72, risk: "medium" },
    { rank: 2, country: "China", gdpUsdT: 18.5, growthProbability: 63, risk: "medium-high" },
    { rank: 3, country: "Germany", gdpUsdT: 4.6, growthProbability: 54, risk: "medium" },
    { rank: 4, country: "Japan", gdpUsdT: 4.1, growthProbability: 49, risk: "medium" },
    { rank: 5, country: "India", gdpUsdT: 3.9, growthProbability: 82, risk: "medium" },
    { rank: 6, country: "United Kingdom", gdpUsdT: 3.5, growthProbability: 57, risk: "medium" },
    { rank: 7, country: "France", gdpUsdT: 3.1, growthProbability: 55, risk: "medium" },
    { rank: 8, country: "Brazil", gdpUsdT: 2.3, growthProbability: 61, risk: "medium-high" },
    { rank: 9, country: "Italy", gdpUsdT: 2.3, growthProbability: 45, risk: "medium" },
    { rank: 10, country: "Canada", gdpUsdT: 2.2, growthProbability: 58, risk: "low-medium" },
    { rank: 42, country: "Colombia", gdpUsdT: 0.36, growthProbability: 62, risk: "medium-high" }
  ];
}

async function analyzeVideoWithGemini(question: string, youtubeUrl?: string, videoData?: string, mimeType?: string) {
  if (!env.geminiApiKey) {
    return `Video AI esta preparado, pero falta GEMINI_API_KEY en backend/.env. Pregunta recibida: ${question}${youtubeUrl ? `\nYouTube: ${youtubeUrl}` : ""}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiVideoModel}:generateContent?key=${env.geminiApiKey}`;
  const parts: unknown[] = [{ text: `${question}\n\nAnaliza el video, resume eventos, extrae puntos importantes y responde con pasos accionables.` }];
  if (youtubeUrl) parts.push({ text: `YouTube URL: ${youtubeUrl}` });
  if (videoData && mimeType) parts.push({ inlineData: { mimeType, data: videoData.replace(/^data:.*;base64,/, "") } });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }] })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") || "No recibi analisis de Gemini.";
}

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function inferNewsImpact(title: string) {
  if (/(war|attack|crisis|inflation|rate|election|earthquake|guerra|crisis|inflaci)/i.test(title)) return "high";
  if (/(market|economy|ai|security|climate|mercado|econom)/i.test(title)) return "medium";
  return "watch";
}

function fallbackNews() {
  return [
    { country: "Colombia", city: "Bogota", lat: 4.711, lng: -74.0721, title: "World news feed unavailable", link: "https://news.google.com", impact: "watch" }
  ];
}

function fallbackCurrencies() {
  return [
    { code: "USD", label: "US Dollar", value: 1 },
    { code: "COP", label: "Colombian Peso", value: 4000 }
  ];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "sentinel-report";
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

async function autoCreateChart(message: string): Promise<CustomChart | null> {
  if (!/(gr[aÃ¡]fica|grafico|chart|estad[iÃ­]stica|tabla|visualiza|visualizar|control de|seguimiento de)/i.test(message)) return null;
  const chart = buildChartFromPrompt(message);
  return db.createChart(chart);
}

function buildChartFromPrompt(message: string, override: { title?: string; kind?: ChartKind } = {}): Omit<CustomChart, "id" | "createdAt" | "updatedAt"> {
  const parsed = parseChartData(message);
  const fallback = parsed.labels.length >= 2 ? parsed : fallbackChartData(message);
  const title = override.title ?? inferChartTitle(message);
  const kind = override.kind ?? inferChartKind(message, fallback.labels.length);

  return {
    title,
    description: `Creada desde: "${message.replace(/\s+/g, " ").slice(0, 140)}"`,
    kind,
    labels: fallback.labels,
    values: fallback.values,
    unit: fallback.unit,
    sourcePrompt: message
  };
}

function parseChartData(message: string) {
  const labels: string[] = [];
  const values: number[] = [];
  let unit = "";
  const colonIndex = message.indexOf(":");
  const dataText = colonIndex > -1 && /(gr[aÃ¡]fica|grafico|chart|tabla|estad[iÃ­]stica|visualiza|visualizar)/i.test(message.slice(0, colonIndex))
    ? message.slice(colonIndex + 1)
    : message;
  const chunks = dataText
    .replace(/\n/g, ",")
    .split(/[,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const labelFirst = chunk.match(/^(.{2,42}?)(?:\:|=|\s+-\s+|\s+)\s*(-?\d+(?:[.,]\d+)?)(?:\s*([%A-Za-zÃ¡Ã©Ã­Ã³ÃºÃ±]+))?$/i);
    const numberFirst = chunk.match(/^(-?\d+(?:[.,]\d+)?)(?:\s*([%A-Za-zÃ¡Ã©Ã­Ã³ÃºÃ±]+))?\s+(?:en|de|para|for)?\s*(.{2,42})$/i);
    const match = labelFirst ?? numberFirst;
    if (!match) continue;

    const rawLabel = labelFirst ? match[1] : match[3];
    const rawValue = labelFirst ? match[2] : match[1];
    const rawUnit = labelFirst ? match[3] : match[2];
    const value = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(value)) continue;
    labels.push(cleanChartLabel(rawLabel));
    values.push(value);
    if (!unit && rawUnit) unit = rawUnit.trim();
  }

  return { labels, values, unit };
}

function fallbackChartData(message: string) {
  const lower = message.toLowerCase();
  if (/(vacante|aplicaci[oÃ³]n|carrera|empleo|trabajo|interview|entrevista)/i.test(lower)) {
    return { labels: ["Aplicadas", "Screening", "Entrevistas", "Ofertas", "Rechazadas"], values: [0, 0, 0, 0, 0], unit: "" };
  }
  if (/(tiempo|hora|estudio|gym|apps|habito|h[Ã¡a]bito)/i.test(lower)) {
    return { labels: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"], values: [0, 0, 0, 0, 0, 0, 0], unit: "h" };
  }
  return { labels: ["Dato 1", "Dato 2", "Dato 3"], values: [0, 0, 0], unit: "" };
}

function inferChartKind(message: string, count: number): ChartKind {
  if (/(tabla|table)/i.test(message)) return "table";
  if (/(torta|pastel|pie|porcentaje|distribuci[oÃ³]n)/i.test(message)) return "pie";
  if (/(linea|l[iÃ­]nea|progreso|evoluci[oÃ³]n|semana|mes|diario|daily|weekly)/i.test(message)) return "line";
  if (count <= 3 && /(%|porcentaje|distribuci[oÃ³]n)/i.test(message)) return "pie";
  return "bar";
}

function inferChartTitle(message: string) {
  const colonIndex = message.indexOf(":");
  if (colonIndex > -1) {
    const beforeColon = message.slice(0, colonIndex);
    if (/(gr[aÃ¡]fica|grafico|chart|tabla|estad[iÃ­]stica)/i.test(beforeColon)) {
      return chartTitleFromText(beforeColon);
    }
  }
  const match = message.match(/(?:gr[aÃ¡]fica|grafico|chart|tabla|estad[iÃ­]stica)s?\s+(?:de|sobre|para)?\s*(.{4,64})/i);
  const text = match?.[1] ?? message;
  return cleanChartLabel(text.replace(/[,;].*$/, "")).slice(0, 64) || "Grafica personalizada";
}

function chartTitleFromText(text: string) {
  const cleaned = cleanChartLabel(text)
    .replace(/^(?:una|un)\s+/i, "")
    .replace(/^(?:gr[aÃ¡]fica|grafico|chart|tabla|estad[iÃ­]stica)s?\s+(?:de|sobre|para)?\s*/i, "");
  return cleanChartLabel(cleaned).slice(0, 64) || "Grafica personalizada";
}

function cleanChartLabel(value: string) {
  return value
    .replace(/^(crea|crear|haz|hacer|muestra|visualiza|visualizar|una|un|de|sobre|para)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
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
