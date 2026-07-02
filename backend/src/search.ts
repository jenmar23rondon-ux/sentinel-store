import { env } from "./env.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (env.serperApiKey) return serperSearch(query);
  return duckDuckGoSearch(query);
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
