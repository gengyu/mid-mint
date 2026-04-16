import { z } from "zod";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import { assertParsedSource, assertSourceInput } from "@/core/domain/validation";
import type { ParsedSource, SourceInput } from "@/core/domain/types";
import { createAppError } from "@/shared/errors/app-error";
import {
  type StageRunResult,
  type StructuredLlmProvider,
  StageExecutionError,
  runLlmStage
} from "@/features/jobs/stage-execution";
import { fetchUrlSupport, parseSourceInput } from "./source-utils";

const sourceParserResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyFacts: z.array(z.string()),
  keyPoints: z.array(z.string()),
  quotes: z.array(z.string()).default([]),
  publishTime: z.string().nullable().default(null),
  riskFlags: z.array(z.string()).default([])
});

function dedupeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateMergedSummary(base: string, additions: string[]) {
  const merged = dedupeList([base, ...additions]).join(" ");
  return merged.length > 120 ? `${merged.slice(0, 119)}…` : merged;
}

function buildDeterministicParsedSource(
  input: SourceInput,
  urlSupport: Awaited<ReturnType<typeof fetchUrlSupport>>
): ParsedSource {
  const parsed = parseSourceInput(input);
  if (urlSupport.fetched.length === 0) {
    return assertParsedSource(parsed);
  }

  return assertParsedSource({
    ...parsed,
    title: parsed.title === "资料整理" ? urlSupport.fetched[0].title : parsed.title,
    summary: truncateMergedSummary(parsed.summary, urlSupport.fetched.map((item) => item.summary)),
    keyFacts: dedupeList([...parsed.keyFacts, ...urlSupport.fetched.map((item) => `${item.title}：${item.summary}`)]).slice(0, 20),
    keyPoints: dedupeList([...parsed.keyPoints, ...urlSupport.fetched.map((item) => item.summary)]).slice(0, 20),
    riskFlags: dedupeList([
      ...parsed.riskFlags,
      ...(urlSupport.failures.length > 0 ? ["partial_url_fetch_failed"] : [])
    ]).slice(0, 10)
  });
}

function buildPrompt(input: SourceInput, urlSupport: Awaited<ReturnType<typeof fetchUrlSupport>>) {
  return [
    "You are the source-parser stage for mid-mint v2.",
    "Return JSON only.",
    "Task: convert mixed source material into a valid ParsedSource.",
    "Rules:",
    "- summary must be one concise paragraph and not empty",
    "- keyFacts must contain concrete facts",
    "- keyPoints must be normalized downstream-friendly points",
    "- quotes must only contain direct quotes present in the source",
    "- riskFlags must be explicit stable codes or concise stable phrases",
    "- publishTime must be an ISO string when explicit, otherwise null",
    "- do not include markdown fences",
    "",
    "JSON shape:",
    JSON.stringify({
      title: "string",
      summary: "string",
      keyFacts: ["string"],
      keyPoints: ["string"],
      quotes: ["string"],
      publishTime: "string | null",
      riskFlags: ["string"]
    }),
    "",
    "Source input:",
    JSON.stringify(input, null, 2),
    "",
    "Fetched URL support:",
    JSON.stringify(urlSupport, null, 2)
  ].join("\n");
}

export class SourceParser {
  constructor(private readonly provider: StructuredLlmProvider = new OpenAiProvider()) {}

  async run(input: SourceInput): Promise<StageRunResult<ParsedSource>> {
    const validatedInput = assertSourceInput(input);
    const urlSupport = await fetchUrlSupport(validatedInput);
    const deterministicFallback = () => {
      const fallback = buildDeterministicParsedSource(validatedInput, urlSupport);
      if (!fallback.summary.trim()) {
        throw new StageExecutionError(
          createAppError("SOURCE_PARSE_NO_USABLE_CONTENT", "No usable content could be extracted from source input."),
          {
            stageName: "PARSED",
            usedLlm: true,
            llmAttempted: true,
            model: this.provider.getDefaultModel(),
            usedFallback: true,
            retryOccurred: false,
            durationMs: 0,
            errorCode: "SOURCE_PARSE_NO_USABLE_CONTENT"
          }
        );
      }
      return fallback;
    };

    return runLlmStage({
      stageName: "PARSED",
      input: validatedInput,
      validateInput: (value) => {
        const hasUsableContent = Boolean(
          value.rawText.trim() || value.notes.trim() || value.urls.some((url) => url.trim())
        );
        if (!hasUsableContent) {
          throw new StageExecutionError(createAppError("SOURCE_PARSE_NO_USABLE_CONTENT", "No usable source content found."), {
            stageName: "PARSED",
            usedLlm: false,
            llmAttempted: false,
            model: null,
            usedFallback: false,
            retryOccurred: false,
            durationMs: 0,
            errorCode: "SOURCE_PARSE_NO_USABLE_CONTENT"
          });
        }
      },
      prompt: buildPrompt(validatedInput, urlSupport),
      provider: this.provider,
      responseSchema: sourceParserResponseSchema,
      mapParsed: (parsed, currentInput) =>
        assertParsedSource({
          title: parsed.title.trim(),
          summary: parsed.summary.trim(),
          keyFacts: dedupeList(parsed.keyFacts ?? []).slice(0, 20),
          keyPoints: dedupeList(parsed.keyPoints ?? []).slice(0, 20),
          quotes: dedupeList(parsed.quotes ?? []).slice(0, 10),
          sourceUrls: dedupeList(currentInput.urls),
          publishTime: parsed.publishTime,
          riskFlags: dedupeList([
            ...(parsed.riskFlags ?? []),
            ...(urlSupport.failures.length > 0 ? ["partial_url_fetch_failed"] : [])
          ]).slice(0, 10)
        }),
      validateOutput: (output) => assertParsedSource(output),
      repairParsed: (raw) => {
        if (!raw || typeof raw !== "object") {
          return null;
        }

        const value = raw as Record<string, unknown>;
        return {
          title: String(value.title ?? ""),
          summary: String(value.summary ?? ""),
          keyFacts: Array.isArray(value.keyFacts) ? value.keyFacts.map(String) : [],
          keyPoints: Array.isArray(value.keyPoints) ? value.keyPoints.map(String) : [],
          quotes: Array.isArray(value.quotes) ? value.quotes.map(String) : [],
          publishTime: value.publishTime === null || typeof value.publishTime === "string" ? value.publishTime : null,
          riskFlags: Array.isArray(value.riskFlags) ? value.riskFlags.map(String) : []
        };
      },
      fallback: deterministicFallback
    });
  }
}
