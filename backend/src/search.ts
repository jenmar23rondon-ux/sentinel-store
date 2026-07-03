import { env } from "./env.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (env.serperApiKey) {
    try {
      const results = await serperSearch(query);
      if (results.length) return results;
    } catch {
      // Fall through to free fallback sources if the configured provider fails.
    }
  }
  return fallbackSearch(query);
}

async function fallbackSearch(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const curated = curatedSearch(query);
  if (curated.length) results.push(...curated);

  try {
    results.push(...await wikipediaSearch(query));
  } catch {
    // Keep the local assistant useful even when one fallback source is down.
  }

  try {
    results.push(...await duckDuckGoSearch(query));
  } catch {
    // DuckDuckGo sometimes returns empty or unavailable responses.
  }

  const seen = new Set<string>();
  return results.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 8);
}

function curatedSearch(query: string): SearchResult[] {
  if (/(concentraci[oó]n|concentracion|enfocar|focus|productividad)/i.test(query)) {
    return [{
      title: "Atencion y concentracion",
      url: "https://es.wikipedia.org/wiki/Atenci%C3%B3n",
      snippet: "La atencion es el proceso cognitivo que permite seleccionar informacion relevante y sostener el foco mental. Para mejorarla suelen ayudar reducir distractores, organizar el trabajo en bloques, descansar y medir el progreso."
    }];
  }
  if (/(cielo.*azul|azul.*cielo|rayleigh)/i.test(query)) {
    return [{
      title: "Por que el cielo es azul",
      url: "https://es.wikipedia.org/wiki/Dispersi%C3%B3n_de_Rayleigh",
      snippet: "El cielo se ve azul principalmente por la dispersion de Rayleigh: las moleculas de la atmosfera dispersan mas la luz azul que otros colores de longitud de onda mayor."
    }];
  }
  return [];
}

async function serperSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.serperApiKey ?? ""
    },
    body: JSON.stringify({ q: query, num: 8 })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { organic?: { title: string; link: string; snippet?: string }[] };
  return (data.organic ?? []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet ?? ""
  }));
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const response = await fetch(url, { headers: webHeaders() });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as {
    Heading?: string;
    AbstractURL?: string;
    AbstractText?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };

  const results: SearchResult[] = [];
  if (data.Heading && data.AbstractURL) {
    results.push({
      title: data.Heading,
      url: data.AbstractURL,
      snippet: data.AbstractText ?? ""
    });
  }

  for (const item of data.RelatedTopics ?? []) {
    if (item.Text && item.FirstURL) {
      results.push({
        title: item.Text.split(" - ")[0],
        url: item.FirstURL,
        snippet: item.Text
      });
    }
  }

  return results.slice(0, 8);
}

async function wikipediaSearch(query: string): Promise<SearchResult[]> {
  const topic = extractTopic(query);
  if (!topic) return [];

  const languages = ["es", "en"];
  for (const language of languages) {
    const result = await wikipediaSummary(language, topic);
    if (result) return [result];

    const discoveredTopic = await wikipediaTopicSearch(language, topic);
    if (discoveredTopic) {
      const discoveredResult = await wikipediaSummary(language, discoveredTopic);
      if (discoveredResult) return [discoveredResult];
    }
  }

  return [];
}

async function wikipediaTopicSearch(language: string, query: string): Promise<string | null> {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, { headers: webHeaders() });
  if (!response.ok) return null;
  const data = await response.json() as [string, string[]?, string[]?, string[]?];
  return data[1]?.[0] ?? null;
}

async function wikipediaSummary(language: string, topic: string): Promise<SearchResult | null> {
  const response = await fetch(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { headers: webHeaders() });
  if (!response.ok) return null;

  const data = await response.json() as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  if (!data.title || !data.extract) return null;
  return {
    title: data.title,
    url: data.content_urls?.desktop?.page ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
    snippet: data.extract
  };
}

function webHeaders() {
  return {
    "User-Agent": "Aether/0.1 (personal-ai-assistant; contact: local)",
    "Accept": "application/json,text/plain,*/*"
  };
}

function extractTopic(query: string) {
  let topic = query
    .replace(/[¿?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(en internet|por internet|en la web|online)\b/gi, "")
    .trim();

  if (/(concentraci[oó]n|concentracion|enfocar|focus|productividad)/i.test(topic)) return "atencion";
  if (/(cielo.*azul|azul.*cielo)/i.test(topic)) return "dispersion de Rayleigh";
  if (/(programaci[oó]n|lenguajes?|idiomas? de programaci[oó]n)/i.test(topic)) return "lenguaje de programacion";
  if (/(ciberseguridad|seguridad inform[aá]tica|cybersecurity)/i.test(topic)) return "seguridad informatica";

  const prefixPattern = /^(busca|buscar|noticia sobre|noticias sobre|actualidad de|que es|qu\u00e9 es|cual es|cu[aá]l es|cuales son|cu[aá]les son|quien es|qui[eé]n es|quien fue|qui[eé]n fue|por que|por qu[eé]|para que sirve|para qu[eé] sirve|explica|explicame|expl[ií]came|dime|dime sobre|hablame de|h[aá]blame de|me puedes decirme que es|me puedes decir que es|me puedes decir sobre|como funciona|c\u00f3mo funciona)\s+/i;
  for (let index = 0; index < 3; index += 1) {
    const next = topic.replace(prefixPattern, "").trim();
    if (next === topic) break;
    topic = next;
  }

  return topic.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, "").trim();
}
