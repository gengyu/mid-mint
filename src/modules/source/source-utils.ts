import { normalizeText, smartSplit, truncateText } from "@/lib/utils/text";
import type { SourceInput } from "@/modules/domain/types";

function splitLines(value: string) {
  return normalizeText(value)
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);
}

function splitSentences(value: string) {
  return normalizeText(value)
    .split(/[。！？!?；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function pickTitleSeed(input: SourceInput, content: string) {
  const candidates = [
    ...splitLines(input.rawText),
    ...splitLines(input.notes),
    ...splitSentences(content)
  ];

  const meaningful = candidates.find((item) => item.length >= 6) ?? candidates[0] ?? "";
  if (meaningful) {
    return truncateText(meaningful, 24);
  }

  if (input.urls.length > 0) {
    return truncateText(input.urls[0], 24);
  }

  return "资料整理";
}

function extractQuotedPhrases(value: string) {
  const results = [
    ...value.matchAll(/["“](.+?)["”]/g),
    ...value.matchAll(/『(.+?)』/g)
  ].map((match) => match[1]?.trim() ?? "");

  return dedupe(results.filter(Boolean)).slice(0, 10);
}

function looksRisky(value: string) {
  return /可能|疑似|传闻|未证实|待核实|风险|争议|不确定|尚未|暂未|预测/i.test(value);
}

export function parseSourceInput(input: SourceInput) {
  const combined = normalizeText(
    [input.targetAudience, input.contentGoal, input.preferredStyle, input.rawText, input.notes]
      .filter(Boolean)
      .join("\n\n")
  );

  const lines = dedupe([...splitLines(input.rawText), ...splitLines(input.notes)]);
  const sentences = dedupe(splitSentences([input.rawText, input.notes].filter(Boolean).join("\n")));
  const keyFacts = dedupe([
    ...lines.slice(0, 8),
    ...sentences.slice(0, 8)
  ]).slice(0, 20);

  const keyPoints = dedupe(
    sentences
      .filter((item) => item.length >= 8)
      .map((item) => item.replace(/[：:]\s*/g, " - "))
      .slice(0, 20)
  );

  const summaryPieces = [
    input.contentGoal?.trim(),
    input.targetAudience?.trim(),
    input.preferredStyle?.trim(),
    keyPoints[0] ?? keyFacts[0] ?? "整理成结构化内容"
  ]
    .filter(Boolean)
    .map((item) => item?.replace(/\s+/g, " ").trim())
    .slice(0, 4);

  const riskFlags = dedupe([
    ...(input.urls.length > 0 && !combined ? ["url_passthrough_only"] : []),
    ...(looksRisky(combined) ? ["contains_unverified_or_risky_claims"] : []),
    ...(input.urls.length > 0 ? ["urls_preserved_without_fetching"] : [])
  ]).slice(0, 10);

  return {
    title: pickTitleSeed(input, combined),
    summary: truncateText(summaryPieces.join("，") || "将原始资料整理为适合发布的小红书内容。", 120),
    keyFacts: keyFacts.length > 0 ? keyFacts : [truncateText(combined || "未提取到具体事实，需人工补充。", 48)],
    keyPoints: keyPoints.length > 0 ? keyPoints : [truncateText(combined || "未提取到足够要点。", 48)],
    quotes: extractQuotedPhrases([input.rawText, input.notes].filter(Boolean).join("\n")),
    sourceUrls: dedupe(input.urls),
    publishTime: null,
    riskFlags
  };
}

export function buildFallbackFacts(seed: string, minimum = 3) {
  const chunks = smartSplit(seed);
  return dedupe(chunks).slice(0, Math.max(minimum, 3));
}

function stripHtml(value: string) {
  return normalizeText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? truncateText(stripHtml(match[1]), 40) : "";
}

function extractMetaDescription(html: string) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    ?? html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  return match ? truncateText(stripHtml(match[1]), 120) : "";
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer);
    }
  };
}

export async function fetchUrlSupport(input: SourceInput) {
  const fetched: Array<{ url: string; title: string; summary: string }> = [];
  const failures: string[] = [];

  for (const url of dedupe(input.urls).slice(0, 3)) {
    const { signal, clear } = timeoutSignal(5000);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal,
        headers: {
          "user-agent": "mid-mint/0.1 (+stage-source-parser)"
        }
      });
      const html = await response.text();
      const title = extractTitle(html);
      const summary = extractMetaDescription(html) || truncateText(stripHtml(html).slice(0, 220), 120);
      fetched.push({
        url,
        title: title || truncateText(url, 40),
        summary: summary || "URL fetched but no clear summary extracted."
      });
    } catch {
      failures.push(url);
    } finally {
      clear();
    }
  }

  return {
    fetched,
    failures
  };
}
