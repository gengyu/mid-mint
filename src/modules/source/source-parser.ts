import type { ParsedSource, SourceInput } from "@/modules/domain/types";
import { fetchUrlSupport, parseSourceInput } from "./source-utils";

export class SourceParser {
  async run(input: SourceInput): Promise<ParsedSource> {
    const parsed = parseSourceInput(input);
    if (input.urls.length === 0) {
      return parsed;
    }

    const urlSupport = await fetchUrlSupport(input);
    if (urlSupport.fetched.length === 0) {
      return parsed;
    }

    return {
      ...parsed,
      title: parsed.title === "资料整理" ? urlSupport.fetched[0].title : parsed.title,
      summary: truncateMergedSummary(parsed.summary, urlSupport.fetched.map((item) => item.summary)),
      keyFacts: dedupeList([...parsed.keyFacts, ...urlSupport.fetched.map((item) => `${item.title}：${item.summary}`)]).slice(0, 20),
      keyPoints: dedupeList([...parsed.keyPoints, ...urlSupport.fetched.map((item) => item.summary)]).slice(0, 20),
      riskFlags: dedupeList([
        ...parsed.riskFlags,
        ...(urlSupport.failures.length > 0 ? ["partial_url_fetch_failed"] : [])
      ]).slice(0, 10)
    };
  }
}

function dedupeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateMergedSummary(base: string, additions: string[]) {
  const merged = dedupeList([base, ...additions]).join(" ");
  return merged.length > 120 ? `${merged.slice(0, 119)}…` : merged;
}
