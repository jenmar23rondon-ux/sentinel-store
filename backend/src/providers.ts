import { env } from "./env.js";
import type { Message, ProviderName } from "./types.js";

interface GenerateInput {
  provider: ProviderName;
  messages: Pick<Message, "role" | "content">[];
  memoryContext: string;
  taskContext: string;
}

interface VisionInput {
  provider: ProviderName;
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

const systemPrompt = `Eres Sentinel AI, un asistente personal privado para productividad, aprendizaje, carrera, automatizacion y seguridad. Responde en espanol claro. Si detectas una preferencia, meta o dato importante del usuario, sugiere guardarlo como memoria. Si una accion requiere credenciales externas, explica que integracion falta.`;

export function providerStatus() {
  return {
    openai: Boolean(env.openaiApiKey),
    claude: Boolean(env.anthropicApiKey),
    gemini: Boolean(env.geminiApiKey),
    ollama: Boolean(env.ollamaBaseUrl),
    local: true
  };
}

export async function generateAssistantReply(input: GenerateInput) {
  const selected = resolveProvider(input.provider);
  const messages = [
    { role: "system", content: buildSystem(input.memoryContext, input.taskContext) },
    ...input.messages.map((item) => ({ role: item.role, content: item.content }))
  ];

  try {
    if (selected === "openai") return { provider: selected, content: await openai(messages) };
    if (selected === "claude") return { provider: selected, content: await claude(messages) };
    if (selected === "gemini") return { provider: selected, content: await gemini(messages) };
    if (selected === "ollama") return { provider: selected, content: await ollama(messages) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    return {
      provider: "local",
      content: `${localReply(input.messages.at(-1)?.content ?? "", input.memoryContext, input.taskContext)}\n\nNota: intente usar ${selected}, pero fallo: ${detail}`
    };
  }

  return {
    provider: "local",
    content: localReply(input.messages.at(-1)?.content ?? "", input.memoryContext, input.taskContext)
  };
}

export async function analyzeImage(input: VisionInput) {
  const selected = resolveProvider(input.provider);

  try {
    if (selected === "openai") return { provider: selected, content: await openaiVision(input) };
    if (selected === "claude") return { provider: selected, content: await claudeVision(input) };
    if (selected === "gemini") return { provider: selected, content: await geminiVision(input) };
    if (selected === "ollama") return { provider: selected, content: await ollamaVision(input) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    return {
      provider: "local",
      content: `${localVisionReply(input.prompt, input.mimeType)}\n\nNota: intente analizar la imagen con ${selected}, pero fallo: ${detail}`
    };
  }

  return {
    provider: "local",
    content: localVisionReply(input.prompt, input.mimeType)
  };
}

function resolveProvider(provider: ProviderName): ProviderName {
  if (provider !== "auto") return provider;
  if (env.openaiApiKey) return "openai";
  if (env.anthropicApiKey) return "claude";
  if (env.geminiApiKey) return "gemini";
  return "local";
}

function buildSystem(memoryContext: string, taskContext: string) {
  return `${systemPrompt}\n\nMemoria relevante:\n${memoryContext || "Sin memoria guardada."}\n\nTareas abiertas:\n${taskContext || "Sin tareas abiertas."}`;
}

async function openai(messages: { role: string; content: string }[]) {
  if (!env.openaiApiKey) throw new Error("OPENAI_API_KEY no esta configurada");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages,
      temperature: 0.4
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message.content ?? "No recibi respuesta de OpenAI.";
}

async function claude(messages: { role: string; content: string }[]) {
  if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY no esta configurada");
  const system = messages.find((item) => item.role === "system")?.content ?? systemPrompt;
  const userMessages = messages.filter((item) => item.role !== "system");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 1200,
      system,
      messages: userMessages.map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content
      }))
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { content: { text: string }[] };
  return data.content.map((item) => item.text).join("\n");
}

async function gemini(messages: { role: string; content: string }[]) {
  if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY no esta configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      }))
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") || "No recibi respuesta de Gemini.";
}

async function ollama(messages: { role: string; content: string }[]) {
  const response = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.ollamaModel,
      messages,
      stream: false
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { message?: { content?: string } };
  return data.message?.content ?? "No recibi respuesta de Ollama.";
}

async function openaiVision(input: VisionInput) {
  if (!env.openaiApiKey) throw new Error("OPENAI_API_KEY no esta configurada");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt(input.prompt) },
            { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } }
          ]
        }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message.content ?? "No recibi analisis de OpenAI.";
}

async function claudeVision(input: VisionInput) {
  if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY no esta configurada");
  const mediaType = input.mimeType === "image/png" ? "image/png" : input.mimeType === "image/gif" ? "image/gif" : "image/jpeg";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt(input.prompt) },
            { type: "image", source: { type: "base64", media_type: mediaType, data: input.imageBase64 } }
          ]
        }
      ]
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { content: { text: string }[] };
  return data.content.map((item) => item.text).join("\n");
}

async function geminiVision(input: VisionInput) {
  if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY no esta configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: visionPrompt(input.prompt) },
            { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } }
          ]
        }
      ]
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") || "No recibi analisis de Gemini.";
}

async function ollamaVision(input: VisionInput) {
  const response = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.ollamaModel,
      messages: [
        {
          role: "user",
          content: visionPrompt(input.prompt),
          images: [input.imageBase64]
        }
      ],
      stream: false
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { message?: { content?: string } };
  return data.message?.content ?? "No recibi analisis de Ollama.";
}

function localReply(lastUserMessage: string, memoryContext: string, taskContext: string) {
  const lower = lastUserMessage.toLowerCase();
  if (lower.includes("recuerda") || lower.includes("memoria")) {
    return "Puedo ayudarte a convertir eso en memoria persistente. Usa el panel Memoria o escribe la idea completa y la guardamos como dato importante para tus proximas conversaciones.";
  }
  if (lower.includes("tarea") || lower.includes("record")) {
    return "Puedo ayudarte a organizarlo como tarea con prioridad y fecha. En este MVP ya puedes crearla desde Tareas; la siguiente fase seria activar recordatorios reales con Calendar o automatizaciones.";
  }
  return `Estoy funcionando en modo local. Ya puedo usar tu contexto guardado, tareas y busqueda web; para respuestas mas potentes conecta OpenAI, Claude, Gemini u Ollama en el archivo backend/.env.\n\nContexto actual:\n${memoryContext || "- Sin memoria guardada"}\n${taskContext || "- Sin tareas abiertas"}`;
}

function visionPrompt(prompt: string) {
  return `${prompt || "Analiza esta imagen o captura."}\n\nResponde con: observaciones, texto visible importante, posibles problemas, acciones recomendadas y, si aplica, riesgos de seguridad.`;
}

function localVisionReply(prompt: string, mimeType: string) {
  return `Imagen recibida (${mimeType}). Modo local no puede ver pixeles ni hacer OCR real, pero ya guarde la imagen en Vision Memory. Para analisis visual completo conecta OpenAI, Claude, Gemini u Ollama con un modelo multimodal.\n\nSolicitud: ${prompt || "Analizar imagen"}\n\nSiguiente paso recomendado: agrega una clave de IA multimodal en backend/.env y vuelve a ejecutar el analisis.`;
}
