import { XMLParser } from "fast-xml-parser";
import { MidMintError } from "@/lib/utils/errors";

export type NewsArticle = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildQuery(topic: string) {
  const normalized = topic.trim() || "AI";
  const withWindow = /(今日|今天|最新|latest|news)/i.test(normalized)
    ? `${normalized} when:1d`
    : `${normalized} AI when:7d`;
  return encodeURIComponent(withWindow);
}

function asArray<T>(value: T | T[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export async function fetchLatestNews(topic: string, limit = 6, timeoutMs = 8000): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${buildQuery(topic)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "mid-mint/0.1"
    }
  });

  if (!response.ok) {
    throw new MidMintError(`News fetch failed with ${response.status}.`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as {
    rss?: {
      channel?: {
        item?: Array<{
          title?: string;
          link?: string;
          pubDate?: string;
          description?: string;
          source?: { "#text"?: string } | string;
        }>;
      };
    };
  };

  const items = asArray(parsed.rss?.channel?.item)
    .map((item) => ({
      title: stripHtml(item.title || ""),
      link: item.link || "",
      source:
        typeof item.source === "string"
          ? stripHtml(item.source)
          : stripHtml(item.source?.["#text"] || "Google News"),
      publishedAt: item.pubDate || "",
      snippet: stripHtml(item.description || "")
    }))
    .filter((item) => item.title && item.link)
    .slice(0, limit);

  if (items.length === 0) {
    throw new MidMintError("No news articles found for this topic.");
  }

  return items;
}
