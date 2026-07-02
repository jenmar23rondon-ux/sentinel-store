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

  const response = await fetch(url);
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
  }

  return [];
}

async function wikipediaSummary(language: string, topic: string): Promise<SearchResult | null> {
  const response = await fetch(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
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

function extractTopic(query: string) {
  let topic = query
    .replace(/[¿?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(en internet|por internet|en la web|online)\b/gi, "")
    .trim();

  const prefixPattern = /^(busca|buscar|noticia sobre|noticias sobre|actualidad de|que es|qu\u00e9 es|explica|dime sobre|me puedes decirme que es|me puedes decir que es|me puedes decir sobre|como funciona|c\u00f3mo funciona)\s+/i;
  for (let index = 0; index < 3; index += 1) {
    const next = topic.replace(prefixPattern, "").trim();
    if (next === topic) break;
    topic = next;
  }

  return topic;
}
