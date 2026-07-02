import { env } from "./env.js";
import type { Message, ProviderName } from "./types.js";

interface GenerateInput {
  provider: ProviderName;
  messages: Pick<Message, "role" | "content">[];
  memoryContext: string;
  taskContext: string;
  webContext?: string;
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
    { role: "system", content: buildSystem(input.memoryContext, input.taskContext, input.webContext) },
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
      content: `${localReply(withWebContext(input.messages.at(-1)?.content ?? "", input.webContext), input.memoryContext, input.taskContext)}\n\nNota: intente usar ${selected}, pero fallo: ${detail}`
    };
  }

  return {
    provider: "local",
    content: localReply(withWebContext(input.messages.at(-1)?.content ?? "", input.webContext), input.memoryContext, input.taskContext)
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

function buildSystem(memoryContext: string, taskContext: string, webContext?: string) {
  return `${systemPrompt}\n\nMemoria relevante:\n${memoryContext || "Sin memoria guardada."}\n\nTareas abiertas:\n${taskContext || "Sin tareas abiertas."}\n\nResultados web recientes:\n${webContext || "Sin resultados web para esta pregunta."}`;
}

function withWebContext(message: string, webContext?: string) {
  return webContext ? `${message}\n\n[WEB_CONTEXT]\n${webContext}` : message;
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
  const webContext = extractInlineWebContext(lastUserMessage);
  if (/(conectad[oa].*internet|internet.*conectad[oa]|tienes internet|estas conectado)/i.test(lower)) {
    return webContext
      ? `Si. Puedo intentar buscar en internet desde el backend. En esta respuesta ya active una busqueda web y recibi resultados.\n\n${webContext}`
      : "Puedo usar internet si el backend tiene salida a la red. Para busqueda web de mejor calidad configura SERPER_API_KEY en Railway; si no, uso una busqueda fallback.";
  }
  if (webContext) {
    return `Esto encontre en la web y lo resumo para ti:\n\n${webContext}\n\nRecomendacion: revisa las fuentes enlazadas si vas a tomar una decision importante, porque la informacion de internet puede cambiar rapido.`;
  }
  if (lower.includes("recuerda") || lower.includes("memoria")) {
    return "Puedo ayudarte a convertir eso en memoria persistente. Usa el panel Memoria o escribe la idea completa y la guardamos como dato importante para tus proximas conversaciones.";
  }
  if (lower.includes("tarea") || lower.includes("record")) {
    return "Puedo ayudarte a organizarlo como tarea con prioridad y fecha. En este MVP ya puedes crearla desde Tareas; la siguiente fase seria activar recordatorios reales con Calendar o automatizaciones.";
  }
  if (/(concentraci[oó]n|concentracion|enfocar|focus|productividad|estudiar|aprender)/i.test(lower)) {
    return [
      "Para mejorar la concentracion, lo mas efectivo suele ser combinar ambiente, bloques cortos y medicion:",
      "",
      "1. Trabaja en bloques de 25 a 50 minutos y descansa 5 a 10 minutos.",
      "2. Define una sola tarea visible antes de empezar.",
      "3. Quita notificaciones y deja el telefono lejos o en modo enfoque.",
      "4. Usa una lista pequena: objetivo, siguiente accion, tiempo estimado.",
      "5. Duerme bien, toma agua y evita estudiar con demasiadas pestanas abiertas.",
      "6. Al terminar, registra cuanto avanzaste para que Sentinel pueda crear graficas de progreso.",
      "",
      "Puedes pedirme: \"crea una grafica de horas de enfoque: lunes 2, martes 3\" o \"hazme un plan de concentracion para estudiar backend\"."
    ].join("\n");
  }
  const topicAnswer = answerKnownTopic(lower);
  if (topicAnswer) return topicAnswer;
  const explainMatch = lower.match(/(?:qu[eé]\s+es|explica|dime sobre|me puedes decir(?:me)?(?: que es| sobre)?)\s+(.{2,80})/i);
  if (explainMatch) {
    const topic = explainMatch[1].replace(/[?¿.]/g, "").trim();
    return [
      `${capitalize(topic)} es un tema que puedo ayudarte a entender y organizar.`,
      "",
      "En modo local puedo darte una explicacion general, ejemplos y pasos de estudio. Para una respuesta con fuentes actualizadas, configura SERPER_API_KEY y una IA como OPENAI_API_KEY o GEMINI_API_KEY en Railway.",
      "",
      "Formato rapido para estudiarlo:",
      "1. Definicion simple.",
      "2. Para que sirve.",
      "3. Ejemplo practico.",
      "4. Errores comunes.",
      "5. Mini proyecto para practicar.",
      "",
      `Si quieres, dime: "explicame ${topic} con ejemplo de codigo" o "crea un plan para aprender ${topic}".`
    ].join("\n");
  }
  if (/(qu[eé] es|explica|como|c[oó]mo|ayuda|mejor|plan|recomienda|dime)/i.test(lower)) {
    return [
      "Te respondo en modo local:",
      "",
      "Puedo ayudarte a organizar ideas, crear planes, convertir mensajes en tareas, generar graficas con tus datos y preparar acciones pendientes. Para preguntas complejas puedo dar una guia practica, y para informacion actual conviene activar busqueda web con SERPER_API_KEY o conectar OpenAI/Gemini/Claude.",
      "",
      `Contexto que tengo ahora:\n${memoryContext || "- Sin memoria guardada"}\n${taskContext || "- Sin tareas abiertas"}`,
      "",
      "Si quieres una respuesta mas precisa, dime el objetivo, el tiempo disponible y el resultado que esperas."
    ].join("\n");
  }
  return `Estoy listo en modo local. Puedo responder guias practicas, crear tareas, memorias, acciones y graficas. Para respuestas con IA avanzada conecta OPENAI_API_KEY, GEMINI_API_KEY o ANTHROPIC_API_KEY en Railway.\n\nContexto actual:\n${memoryContext || "- Sin memoria guardada"}\n${taskContext || "- Sin tareas abiertas"}`;
}

function answerKnownTopic(lower: string) {
  if (/\bnode(?:\.js| js)?\b/.test(lower)) {
    return [
      "Node.js es un entorno para ejecutar JavaScript fuera del navegador, normalmente en servidores.",
      "",
      "Sirve para crear APIs, backends, scripts, automatizaciones, WebSockets, herramientas CLI y servicios en tiempo real.",
      "",
      "Ejemplo simple:",
      "- Frontend: React corre en el navegador.",
      "- Backend: Node.js recibe peticiones, consulta datos y responde JSON.",
      "",
      "En tu proyecto Sentinel, el backend usa Node.js + Express para rutas como `/api/chat`, `/api/search` y `/api/charts`."
    ].join("\n");
  }
  if (/\breact\b/.test(lower)) {
    return "React es una libreria de JavaScript para crear interfaces interactivas con componentes. En Sentinel se usa para el chat, paneles, graficas, Notebook, temas claro/oscuro y PWA.";
  }
  if (/\bdocker\b/.test(lower)) {
    return "Docker permite empaquetar una app con sus dependencias en contenedores. Te ayuda a correr backend, frontend y base de datos de forma consistente en local o produccion.";
  }
  if (/\bpostgres|postgresql\b/.test(lower)) {
    return "PostgreSQL es una base de datos relacional robusta. En Sentinel sirve para guardar memoria, tareas, historiales, graficas, acciones y datos de carrera de forma persistente.";
  }
  if (/\bapi\b/.test(lower)) {
    return "Una API es una interfaz para que sistemas se comuniquen. Por ejemplo, tu frontend llama al backend con `/api/chat` para enviar preguntas y recibir respuestas.";
  }
  if (/\btypescript\b/.test(lower)) {
    return "TypeScript es JavaScript con tipos. Ayuda a detectar errores antes de ejecutar y hace mas mantenibles proyectos grandes como Sentinel AI OS.";
  }
  return "";
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function extractInlineWebContext(message: string) {
  const marker = "\n\n[WEB_CONTEXT]\n";
  const index = message.indexOf(marker);
  return index >= 0 ? message.slice(index + marker.length).trim() : "";
}

function visionPrompt(prompt: string) {
  return `${prompt || "Analiza esta imagen o captura."}\n\nResponde con: observaciones, texto visible importante, posibles problemas, acciones recomendadas y, si aplica, riesgos de seguridad.`;
}

function localVisionReply(prompt: string, mimeType: string) {
  return `Imagen recibida (${mimeType}). Modo local no puede ver pixeles ni hacer OCR real, pero ya guarde la imagen en Vision Memory. Para analisis visual completo conecta OpenAI, Claude, Gemini u Ollama con un modelo multimodal.\n\nSolicitud: ${prompt || "Analizar imagen"}\n\nSiguiente paso recomendado: agrega una clave de IA multimodal en backend/.env y vuelve a ejecutar el analisis.`;
}
