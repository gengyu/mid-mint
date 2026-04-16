import { z } from "zod";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import { assertContentBrief, assertDeckPlan, assertParsedSource } from "@/core/domain/validation";
import type { ContentBrief, DeckPageType, DeckPlan, DeckSlide, ParsedSource } from "@/core/domain/types";
import {
  type StageRunResult,
  type StructuredLlmProvider,
  runLlmStage
} from "@/application/jobs/stage-execution";
import { buildDeckPlan } from "./deck-utils";

const deckResponseSchema = z.object({
  summary: z.string(),
  cta: z.string(),
  slides: z.array(
    z.object({
      goal: z.string(),
      title: z.string(),
      body: z.string(),
      highlights: z.array(z.string()).default([]),
      templateId: z.string().optional()
    })
  )
});

const DEFAULT_TEMPLATE_BY_PAGE_TYPE: Record<DeckPageType, string> = {
  cover: "cover-hero",
  summary: "step-list",
  detail: "triple-cards",
  comparison: "story-split",
  checklist: "step-list",
  cta: "quote-cta"
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function pageTypesForCount(count: number): DeckPageType[] {
  return count === 4 ? ["cover", "summary", "detail", "cta"] : ["cover", "summary", "detail", "comparison", "cta"];
}

function buildSlide(
  index: number,
  pageType: DeckPageType,
  slide: {
    goal: string;
    title: string;
    body: string;
    highlights?: string[];
    templateId?: string;
  }
): DeckSlide {
  const title = truncateText(slide.title, pageType === "cover" ? 28 : 24);
  const body = truncateText(slide.body, pageType === "cover" ? 88 : 110);
  const highlights = dedupe(slide.highlights ?? []).slice(0, 3);
  const templateId = normalizeText(slide.templateId ?? "") || DEFAULT_TEMPLATE_BY_PAGE_TYPE[pageType];

  return {
    index,
    pageType,
    goal: normalizeText(slide.goal),
    title,
    body,
    highlights,
    templateId,
    values: {},
    charCountTitle: title.length,
    charCountBody: body.length
  };
}

function buildPrompt(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }) {
  return [
    "You are the deck-generator stage for mid-mint v2.",
    "Return JSON only.",
    "Task: generate a higher-quality DeckPlan while preserving fixed deck constraints.",
    "Rules:",
    "- generate 4 or 5 slides",
    "- slide 1 must behave like a cover hook",
    "- last slide must behave like a CTA",
    "- middle slides must not repeat the same point with shallow paraphrase",
    "- title and body should remain concise and template-safe",
    "- templateId can be provisional",
    "",
    "JSON shape:",
    JSON.stringify({
      summary: "string",
      cta: "string",
      slides: [
        {
          goal: "string",
          title: "string",
          body: "string",
          highlights: ["string"],
          templateId: "string optional"
        }
      ]
    }),
    "",
    "Input:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export class DeckGenerator {
  constructor(private readonly provider: StructuredLlmProvider = new OpenAiProvider()) {}

  async run(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }): Promise<StageRunResult<DeckPlan>> {
    assertParsedSource(input.parsedSource);
    assertContentBrief(input.contentBrief);

    return runLlmStage({
      stageName: "DECK_GENERATED",
      input,
      prompt: buildPrompt(input),
      provider: this.provider,
      responseSchema: deckResponseSchema,
      mapParsed: (parsed) => {
        const slideCount = Math.min(5, Math.max(4, parsed.slides.length || 5));
        const pageTypes = pageTypesForCount(slideCount);
        const usableSlides = parsed.slides.slice(0, slideCount);
        const slides = pageTypes.map((pageType, index) =>
          buildSlide(index + 1, pageType, usableSlides[index] ?? usableSlides[usableSlides.length - 1] ?? {
            goal: index === 0 ? "先抛结论和钩子" : pageType === "cta" ? "把下一步收住" : "展开核心观点",
            title: index === 0 ? "先看这个结论" : pageType === "cta" ? "你会怎么做？" : "继续往下看",
            body: parsed.summary,
            highlights: [] as string[],
            templateId: DEFAULT_TEMPLATE_BY_PAGE_TYPE[pageType]
          })
        );

        return assertDeckPlan({
          summary: truncateText(parsed.summary, 120),
          slides,
          cta: normalizeText(parsed.cta)
        });
      },
      validateOutput: (output) => assertDeckPlan(output),
      repairParsed: (raw) => {
        if (!raw || typeof raw !== "object") {
          return null;
        }

        const value = raw as Record<string, unknown>;
        const rawSlides = Array.isArray(value.slides) ? value.slides : [];
        return {
          summary: String(value.summary ?? ""),
          cta: String(value.cta ?? ""),
          slides: rawSlides.map((slide) => {
            const current = slide && typeof slide === "object" ? (slide as Record<string, unknown>) : {};
            return {
              goal: String(current.goal ?? ""),
              title: String(current.title ?? ""),
              body: String(current.body ?? ""),
              highlights: Array.isArray(current.highlights) ? current.highlights.map(String) : [],
              templateId: typeof current.templateId === "string" ? current.templateId : undefined
            };
          })
        };
      },
      fallback: (currentInput) => buildDeckPlan(currentInput.parsedSource, currentInput.contentBrief)
    });
  }
}
