import { z } from "zod";
import { OpenAiProvider } from "@/lib/llm/openai";
import { assertContentBrief, assertParsedSource } from "@/modules/domain/validation";
import type { ContentBrief, ParsedSource } from "@/modules/domain/types";
import {
  type StageRunResult,
  type StructuredLlmProvider,
  runLlmStage
} from "@/modules/workflow/stage-execution";
import { buildContentBrief } from "./brief-utils";

const briefResponseSchema = z.object({
  topic: z.string(),
  angle: z.enum([
    "quick_view",
    "key_points",
    "industry_impact",
    "practitioner_view",
    "product_opportunity",
    "tool_summary",
    "pitfall_alert",
    "experience_breakdown",
    "method_summary"
  ]),
  audience: z.string(),
  narrative: z.string(),
  keyTakeaways: z.array(z.string()),
  mustInclude: z.array(z.string()),
  avoid: z.array(z.string())
});

const CONTENT_ANGLES = [
  "quick_view",
  "key_points",
  "industry_impact",
  "practitioner_view",
  "product_opportunity",
  "tool_summary",
  "pitfall_alert",
  "experience_breakdown",
  "method_summary"
] as const;

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

type BriefInput = ParsedSource & {
  targetAudience: string;
  contentGoal: string;
  preferredStyle: string;
};

function buildPrompt(input: BriefInput) {
  return [
    "You are the brief-generator stage for mid-mint v2.",
    "Return JSON only.",
    "Task: produce a stronger Xiaohongshu-oriented ContentBrief.",
    "Rules:",
    "- choose exactly one angle from the allowed enum",
    "- narrative must be exactly one paragraph",
    "- keyTakeaways must contain 3 to 5 items",
    "- mustInclude must preserve critical upstream facts",
    "- avoid must be concrete and useful for downstream generation",
    "- optimize for readability, distinctiveness, and audience fit",
    "",
    "JSON shape:",
    JSON.stringify({
      topic: "string",
      angle: "enum",
      audience: "string",
      narrative: "string",
      keyTakeaways: ["string"],
      mustInclude: ["string"],
      avoid: ["string"]
    }),
    "",
    "Input:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export class BriefGenerator {
  constructor(private readonly provider: StructuredLlmProvider = new OpenAiProvider()) {}

  async run(input: BriefInput): Promise<StageRunResult<ContentBrief>> {
    assertParsedSource(input);

    return runLlmStage({
      stageName: "BRIEFED",
      input,
      prompt: buildPrompt(input),
      provider: this.provider,
      responseSchema: briefResponseSchema,
      mapParsed: (parsed, source) =>
        assertContentBrief({
          topic: parsed.topic.trim(),
          angle: parsed.angle,
          audience: parsed.audience.trim(),
          narrative: parsed.narrative.replace(/\n+/g, " ").trim(),
          keyTakeaways: dedupe(parsed.keyTakeaways).slice(0, 5),
          mustInclude: dedupe(parsed.mustInclude).slice(0, 5),
          avoid: dedupe(parsed.avoid).slice(0, 5),
          contentGoal: source.contentGoal.trim()
        }),
      validateOutput: (output) => assertContentBrief(output),
      repairParsed: (raw) => {
        if (!raw || typeof raw !== "object") {
          return null;
        }

        const value = raw as Record<string, unknown>;
        return {
          topic: String(value.topic ?? ""),
          angle: typeof value.angle === "string" && CONTENT_ANGLES.includes(value.angle as (typeof CONTENT_ANGLES)[number])
            ? (value.angle as (typeof CONTENT_ANGLES)[number])
            : "quick_view",
          audience: String(value.audience ?? ""),
          narrative: String(value.narrative ?? ""),
          keyTakeaways: Array.isArray(value.keyTakeaways) ? value.keyTakeaways.map(String) : [],
          mustInclude: Array.isArray(value.mustInclude) ? value.mustInclude.map(String) : [],
          avoid: Array.isArray(value.avoid) ? value.avoid.map(String) : []
        };
      },
      fallback: (currentInput) =>
        buildContentBrief(
          currentInput,
          currentInput.targetAudience,
          currentInput.contentGoal,
          currentInput.preferredStyle
        )
    });
  }
}
