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

const systemPrompt = `Eres Aether, un asistente personal privado para productividad, aprendizaje, carrera, automatizacion y seguridad. Responde en espanol claro. Si detectas una preferencia, meta o dato importante del usuario, sugiere guardarlo como memoria. Si una accion requiere credenciales externas, explica que integracion falta.`;

export function providerStatus() {
  return {
    openai: hasUsableKey(env.openaiApiKey),
    claude: hasUsableKey(env.anthropicApiKey),
    gemini: hasUsableKey(env.geminiApiKey),
    deepseek: hasUsableKey(env.deepseekApiKey),
    ollama: Boolean(env.ollamaBaseUrl),
    local: true
  };
}

export async function generateAssistantReply(input: GenerateInput) {
  const messages = [
    { role: "system", content: buildSystem(input.memoryContext, input.taskContext, input.webContext) },
    ...input.messages.map((item) => ({ role: item.role, content: item.content }))
  ];
  const providerOrder = resolveProviderOrder(input.provider);
  const failures: string[] = [];

  for (const selected of providerOrder) {
    try {
      if (selected === "openai") return { provider: selected, content: await openai(messages) };
      if (selected === "claude") return { provider: selected, content: await claude(messages) };
      if (selected === "gemini") return { provider: selected, content: await gemini(messages) };
      if (selected === "deepseek") return { provider: selected, content: await deepseek(messages) };
      if (selected === "ollama") return { provider: selected, content: await ollama(messages) };
    } catch (error) {
      failures.push(friendlyProviderFailure(selected, error));
    }
  }

  const localContent = localReply(withWebContext(input.messages.at(-1)?.content ?? "", input.webContext), input.memoryContext, input.taskContext);
  const visibleFailure = input.provider === "auto" ? "" : failures.find((item) => item.includes("API key")) ?? failures[0] ?? "";
  return {
    provider: "local",
    content: visibleFailure ? `${localContent}\n\nNota: ${visibleFailure}` : localContent
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
  return resolveProviderOrder(provider)[0] ?? "local";
}

function resolveProviderOrder(provider: ProviderName): ProviderName[] {
  const configured: ProviderName[] = [];
  if (hasUsableKey(env.openaiApiKey)) configured.push("openai");
  if (hasUsableKey(env.anthropicApiKey)) configured.push("claude");
  if (hasUsableKey(env.geminiApiKey)) configured.push("gemini");
  if (hasUsableKey(env.deepseekApiKey)) configured.push("deepseek");
  if (env.ollamaBaseUrl) configured.push("ollama");

  if (provider === "auto") return configured;
  if (provider === "local") return [];
  return [provider, ...configured.filter((item) => item !== provider)];
}

export function hasUsableKey(value?: string): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 20
    && !normalized.includes("tu_")
    && !normalized.includes("your_")
    && !normalized.includes("example")
    && !normalized.includes("xxxx")
    && !normalized.includes("****");
}

function friendlyProviderFailure(provider: ProviderName, error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (/invalid[_ -]?api[_ -]?key|incorrect api key|unauthorized|401/i.test(detail)) {
    return `no pude usar ${provider} porque la API key no es valida. Revísala en Railway/backend .env o cambia el modelo a Auto/Local mientras tanto.`;
  }
  if (/no esta configurada|not configured/i.test(detail)) {
    return `${provider} no esta configurado todavia.`;
  }
  return `no pude usar ${provider} en este momento, asi que respondi con busqueda web y modo local.`;
}

function buildSystem(memoryContext: string, taskContext: string, webContext?: string) {
  return `${systemPrompt}\n\nMemoria relevante:\n${memoryContext || "Sin memoria guardada."}\n\nTareas abiertas:\n${taskContext || "Sin tareas abiertas."}\n\nResultados web recientes:\n${webContext || "Sin resultados web para esta pregunta."}`;
}

function withWebContext(message: string, webContext?: string) {
  return webContext ? `${message}\n\n[WEB_CONTEXT]\n${webContext}` : message;
}

async function openai(messages: { role: string; content: string }[]) {
  if (!hasUsableKey(env.openaiApiKey)) throw new Error("OPENAI_API_KEY no esta configurada");
  const apiKey = env.openaiApiKey;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
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
  if (!hasUsableKey(env.anthropicApiKey)) throw new Error("ANTHROPIC_API_KEY no esta configurada");
  const apiKey = env.anthropicApiKey;
  const system = messages.find((item) => item.role === "system")?.content ?? systemPrompt;
  const userMessages = messages.filter((item) => item.role !== "system");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
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
  if (!hasUsableKey(env.geminiApiKey)) throw new Error("GEMINI_API_KEY no esta configurada");
  const apiKey = env.geminiApiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${apiKey}`;
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

async function deepseek(messages: { role: string; content: string }[]) {
  if (!hasUsableKey(env.deepseekApiKey)) throw new Error("DEEPSEEK_API_KEY no esta configurada");
  const apiKey = env.deepseekApiKey;
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.deepseekModel,
      messages,
      temperature: 0.4
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "No recibi respuesta de DeepSeek.";
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
  if (!hasUsableKey(env.openaiApiKey)) throw new Error("OPENAI_API_KEY no esta configurada");
  const apiKey = env.openaiApiKey;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
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
  if (!hasUsableKey(env.anthropicApiKey)) throw new Error("ANTHROPIC_API_KEY no esta configurada");
  const apiKey = env.anthropicApiKey;
  const mediaType = input.mimeType === "image/png" ? "image/png" : input.mimeType === "image/gif" ? "image/gif" : "image/jpeg";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
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
  if (!hasUsableKey(env.geminiApiKey)) throw new Error("GEMINI_API_KEY no esta configurada");
  const apiKey = env.geminiApiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${apiKey}`;
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
    return webGroundedReply(lastUserMessage, webContext);
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
      "6. Al terminar, registra cuanto avanzaste para que Aether pueda crear graficas de progreso.",
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
      `Puedo ayudarte con ${topic}. No encontre una fuente web clara en este momento, asi que te doy una base general:`,
      "",
      "1. Definicion: dime el contexto exacto y puedo aterrizarlo mejor.",
      "2. Idea principal: lo importante es entender para que sirve, donde se usa y que problema resuelve.",
      "3. Ejemplo: puedo explicarlo con una analogia sencilla o con un caso practico.",
      "4. Siguiente paso: si quieres, pideme una version corta, una version profunda o una comparacion con otro tema.",
      "",
      `Prueba tambien: "busca en internet ${topic}" para forzar una respuesta con fuentes.`
    ].join("\n");
  }
  if (/(qu[eé] es|explica|como|c[oó]mo|ayuda|mejor|plan|recomienda|dime)/i.test(lower)) {
    return [
      "Te respondo con una guia practica:",
      "",
      "1. Define exactamente que quieres lograr.",
      "2. Divide el problema en pasos pequenos.",
      "3. Guarda lo importante como memoria, tarea, nota o grafica.",
      "4. Revisa el progreso con datos, no solo con sensacion.",
      "",
      "En Aether puedo ayudarte a convertir tu pregunta en tareas, planes, mensajes, graficas, notas o acciones pendientes. Para informacion actual, intento usar busqueda web desde el backend; para razonamiento mas fuerte, conecta OpenAI, Gemini o Claude.",
      "",
      `Contexto que tengo ahora:\n${memoryContext || "- Sin memoria guardada"}\n${taskContext || "- Sin tareas abiertas"}`,
      "",
      "Para afinar la respuesta, dime el objetivo, el tiempo disponible y el resultado que quieres obtener."
    ].join("\n");
  }
  return `Estoy listo en modo local. Puedo responder guias practicas, crear tareas, memorias, acciones y graficas. Para respuestas con IA avanzada conecta OPENAI_API_KEY, GEMINI_API_KEY o ANTHROPIC_API_KEY en Railway.\n\nContexto actual:\n${memoryContext || "- Sin memoria guardada"}\n${taskContext || "- Sin tareas abiertas"}`;
}

function webGroundedReply(message: string, webContext: string) {
  const question = message.split("\n\n[WEB_CONTEXT]")[0].replace(/[¿?]/g, "").trim();
  const sources = extractSources(webContext);
  const compactContext = extractWebSnippets(webContext)
    .join("\n")
    .replace(/\s+/g, " ")
    .slice(0, 1200);
  const intro = pickForQuestion(question, [
    `Esto encontre para "${question}":`,
    `Buena pregunta. La respuesta corta para "${question}" es esta:`,
    `Te lo resumo sin hacerlo largo:`,
    `Segun las fuentes disponibles, el punto central es este:`,
    `Voy directo a lo importante:`
  ]);
  const closer = pickForQuestion(`${question}:close`, [
    "Puedo convertir esto en una nota, tabla o grafica si quieres verlo mas claro.",
    "Si quieres, tambien puedo compararlo por pais, fecha o importancia.",
    "Tambien puedo dejarte una version corta para estudiar o compartir.",
    "Si necesitas mas precision, puedo buscar fuentes mas especificas.",
    "Puedo seguir con una explicacion simple, tecnica o en formato de lista."
  ]);

  return [
    intro,
    "",
    buildPracticalAnswer(question, compactContext),
    "",
    closer,
    "",
    sources.length ? "Referencias:" : "",
    ...sources.map((source, index) => `${index + 1}. ${source}`)
  ].filter(Boolean).join("\n");
}

function pickForQuestion(question: string, options: string[]) {
  let hash = 0;
  for (let index = 0; index < question.length; index += 1) {
    hash = (hash * 31 + question.charCodeAt(index)) >>> 0;
  }
  return options[hash % options.length];
}

function extractWebSnippets(webContext: string) {
  const snippets: string[] = [];
  const lines = webContext.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!/^\d+\.\s+/.test(line)) continue;
    const snippet = lines[index + 1]?.trim();
    if (snippet && !snippet.startsWith("Fuente:")) snippets.push(snippet);
  }
  return snippets;
}

function buildPracticalAnswer(question: string, context: string) {
  const lower = question.toLowerCase();
  const cleanContext = cleanWebContext(context);

  if (/(concentracion|concentración|enfocar|focus|productividad|estudiar|aprender)/i.test(lower)) {
    return [
      "La forma mas efectiva de mejorar la concentracion suele ser combinar menos distracciones, bloques de trabajo medibles y descanso real.",
      "",
      "1. Define una sola tarea antes de empezar; si hay varias, escoge la primera accion de 10 minutos.",
      "2. Usa bloques de 25, 45 o 50 minutos segun tu energia. No todos rinden igual con Pomodoro estricto.",
      "3. Quita notificaciones, deja el telefono lejos y usa pantalla completa para la herramienta principal.",
      "4. Descansa con movimiento, agua o respiracion; evita cambiar a redes sociales porque no descansa la mente.",
      "5. Registra tiempo enfocado vs. tiempo distraido. Aether puede convertir eso en graficas para ver progreso.",
      "",
      "Plan rapido para hoy: 2 bloques de 45 minutos, una sola meta por bloque, y al final anota que funciono y que te distrajo."
    ].join("\n");
  }

  if (/(mejor|recomienda|como|cómo|plan|ayuda)/i.test(lower)) {
    return [
      "Mi respuesta practica seria:",
      "",
      "1. Empieza por la opcion con mayor impacto y menor friccion.",
      "2. Divide la decision en criterios: tiempo, costo, dificultad, beneficio y riesgo.",
      "3. Haz una prueba pequena antes de comprometerte por completo.",
      "4. Guarda el resultado como nota, tarea o grafica para medir si realmente funciono.",
      "",
      `Contexto encontrado: ${cleanContext || "no encontre un resumen amplio, pero puedo ayudarte a estructurarlo."}`
    ].join("\n");
  }

  if (/(por que|por qué|porque|causa|razon|razón)/i.test(lower)) {
    return [
      cleanContext || "La causa depende del tema exacto, pero puedo ayudarte a separarla en factores principales.",
      "",
      "Respuesta corta:",
      makeKeyPoints(cleanContext)[0] ?? "1. La causa principal se entiende mejor revisando el contexto y los factores que intervienen.",
      "",
      "Si quieres, puedo explicarlo en modo muy simple, tecnico o con una analogia."
    ].join("\n");
  }
  if (/(qué es|que es|cual es|cuál es|quien es|quién es|explica|dime|hablame|háblame)/i.test(lower)) {
    return [
      cleanContext || "No encontre una fuente suficientemente clara, pero puedo darte una explicacion general.",
      "",
      "Puntos clave:",
      ...makeKeyPoints(cleanContext),
      "",
      "En pocas palabras: si quieres, puedo explicartelo tambien con un ejemplo simple, una analogia o un plan para aprenderlo."
    ].join("\n");
  }

  return [
    cleanContext || "No encontre suficiente contexto en la busqueda, pero puedo ayudarte a desglosarlo.",
    "",
    "Mi lectura rapida:",
    "1. Identifica la idea principal del tema.",
    "2. Mira que parte aplica a tu pregunta concreta.",
    "3. Si quieres actuar sobre esto, conviertelo en tarea, nota o grafica dentro de Aether."
  ].join("\n");
}

function cleanWebContext(context: string) {
  return context
    .replace(/^Sin resumen disponible\.?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeKeyPoints(context: string) {
  const text = cleanWebContext(context);
  if (!text) return ["1. El tema necesita mas contexto o una fuente mejor.", "2. Puedo ayudarte a buscarlo de otra forma."];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  return sentences.map((sentence, index) => `${index + 1}. ${sentence}`);
}

function extractSources(webContext: string) {
  return webContext
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Fuente: "))
    .map((line) => line.replace("Fuente: ", ""))
    .slice(0, 4);
}

function answerKnownTopic(lower: string) {
  if (/(lenguajes?|idiomas?)\s+de\s+programaci[oó]n|programming languages|lenguajes?\s+mas\s+usados|lenguajes?\s+m[aá]s\s+usados/i.test(lower)) {
    return [
      "Los lenguajes de programacion mas usados suelen variar segun la fuente y el area, pero una lista practica seria:",
      "",
      "1. JavaScript / TypeScript: web, frontend, backend con Node.js y apps modernas.",
      "2. Python: IA, automatizacion, analisis de datos, backend y scripts.",
      "3. Java: empresas, Android, backend y sistemas grandes.",
      "4. C#: apps empresariales, videojuegos con Unity y backend .NET.",
      "5. C / C++: sistemas, rendimiento, drivers, videojuegos y software embebido.",
      "6. SQL: bases de datos; no siempre se cuenta como lenguaje general, pero es esencial.",
      "7. Go: APIs, cloud, DevOps y servicios rapidos.",
      "8. PHP: web y CMS como WordPress, todavia muy usado.",
      "9. Kotlin / Swift: desarrollo movil Android e iOS.",
      "10. Rust: sistemas seguros, rendimiento y herramientas modernas.",
      "",
      "Para tu objetivo de backend + ciberseguridad, yo priorizaria: TypeScript/Node.js, Python, SQL, Bash, algo de Go y bases de C/C++."
    ].join("\n");
  }
  if (/\b(ia|ai|inteligencia artificial|machine learning|aprendizaje automatico)\b/.test(lower)) {
    return [
      "La inteligencia artificial es una forma de hacer que un sistema analice informacion, encuentre patrones y genere respuestas o acciones utiles.",
      "",
      "Ejemplos practicos:",
      "- Un chat que responde preguntas con tu memoria y tus tareas.",
      "- Vision AI que analiza capturas, documentos o fotos.",
      "- Automatizaciones que preparan mensajes, resumen correos o crean graficas.",
      "",
      "Para tu Aether, la IA funciona mejor cuando combinas tres cosas: memoria propia, busqueda web para informacion actual y modelos externos como OpenAI, Gemini o Claude."
    ].join("\n");
  }
  if (/\bbackend\b/.test(lower)) {
    return [
      "Backend es la parte de una aplicacion que corre en el servidor.",
      "",
      "Normalmente se encarga de APIs, autenticacion, base de datos, reglas de negocio, archivos, integraciones y seguridad.",
      "",
      "En Aether, el backend con Node.js + Express recibe preguntas del chat, consulta memoria/tareas, ejecuta busqueda web y habla con proveedores de IA."
    ].join("\n");
  }
  if (/\bfrontend\b/.test(lower)) {
    return [
      "Frontend es la parte visual e interactiva que usa la persona en el navegador o telefono.",
      "",
      "En Aether es la interfaz React: chat, Notebook, Mundo actual, graficas, panel lateral, tema claro/oscuro, idiomas y modo PWA instalable."
    ].join("\n");
  }
  if (/\b(pwa|progressive web app|android|ios|instalable)\b/.test(lower)) {
    return "Una PWA es una web que se puede instalar como app, con manifest, service worker, cache offline y actualizaciones. En Android suele instalarse desde Chrome; en iOS desde Safari con Add to Home Screen.";
  }
  if (/\b(jwt|token|autenticacion|auth)\b/.test(lower)) {
    return "JWT es un token firmado que permite autenticar usuarios entre frontend y backend. El frontend lo guarda y lo envia en cada peticion; el backend valida la firma antes de permitir acciones privadas.";
  }
  if (/\b(oauth|gmail|google calendar|calendar)\b/.test(lower)) {
    return "OAuth permite conectar servicios como Gmail o Calendar sin compartir tu contrasena. El usuario autoriza permisos especificos y la app recibe tokens para leer o crear datos segun esos permisos.";
  }
  if (/\b(websocket|websockets|tiempo real|realtime)\b/.test(lower)) {
    return "WebSockets permiten comunicacion en tiempo real entre navegador y servidor. Sirven para chat en vivo, notificaciones, progreso de tareas, subtitulos o actualizaciones instantaneas del dashboard.";
  }
  if (/\b(railway|deploy|despliegue|produccion)\b/.test(lower)) {
    return "Railway despliega tu backend o frontend desde GitHub. Para que Aether funcione bien en produccion, configura variables como DATABASE_URL, JWT_SECRET, FRONTEND_URL y las claves de IA que quieras usar.";
  }
  if (/\b(github|git|repositorio|commit|push)\b/.test(lower)) {
    return "GitHub guarda el codigo del proyecto y Git registra cambios. El flujo normal es editar, probar, hacer commit y push para que Railway redepliegue la version nueva.";
  }
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
      "En tu proyecto Aether, el backend usa Node.js + Express para rutas como `/api/chat`, `/api/search` y `/api/charts`."
    ].join("\n");
  }
  if (/\breact\b/.test(lower)) {
    return "React es una libreria de JavaScript para crear interfaces interactivas con componentes. En Aether se usa para el chat, paneles, graficas, Notebook, temas claro/oscuro y PWA.";
  }
  if (/\bdocker\b/.test(lower)) {
    return "Docker permite empaquetar una app con sus dependencias en contenedores. Te ayuda a correr backend, frontend y base de datos de forma consistente en local o produccion.";
  }
  if (/\bpostgres|postgresql\b/.test(lower)) {
    return "PostgreSQL es una base de datos relacional robusta. En Aether sirve para guardar memoria, tareas, historiales, graficas, acciones y datos de carrera de forma persistente.";
  }
  if (/\bapi\b/.test(lower)) {
    return "Una API es una interfaz para que sistemas se comuniquen. Por ejemplo, tu frontend llama al backend con `/api/chat` para enviar preguntas y recibir respuestas.";
  }
  if (/\btypescript\b/.test(lower)) {
    return "TypeScript es JavaScript con tipos. Ayuda a detectar errores antes de ejecutar y hace mas mantenibles proyectos grandes como Aether.";
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

