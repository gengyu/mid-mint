import { z } from "zod";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import {
  assertContentBrief,
  assertDeckPlan,
  assertParsedSource,
  assertRenderResult,
  assertReviewResult,
  assertVisualSpec
} from "@/core/domain/validation";
import type {
  ContentBrief,
  DeckPlan,
  ParsedSource,
  RenderResult,
  ReviewResult,
  ReviewStageScores,
  VisualSpec
} from "@/core/domain/types";
import {
  type StageRunResult,
  type StructuredLlmProvider,
  runLlmStage
} from "@/application/workflows/stage-execution";

const reviewObservationSchema = z.object({
  category: z.enum([
    "cover_hook",
    "slide_repetition",
    "density_overload",
    "visual_mismatch",
    "factual_risk",
    "generic_phrasing",
    "news_repost_feel"
  ]),
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(),
  suggestedFix: z.string().nullable().default(null),
  blocking: z.boolean().default(false)
});

const reviewResponseSchema = z.object({
  observations: z.array(reviewObservationSchema).default([]),
  strengths: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  blockingIssues: z.array(z.string()).default([]),
  suggestedFixes: z.array(z.string()).default([])
});

const REVIEW_CATEGORIES = [
  "cover_hook",
  "slide_repetition",
  "density_overload",
  "visual_mismatch",
  "factual_risk",
  "generic_phrasing",
  "news_repost_feel"
] as const;
const REVIEW_SEVERITIES = ["low", "medium", "high"] as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function repeatedTitles(deckPlan: DeckPlan) {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const slide of deckPlan.slides) {
    const normalized = slide.title.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.push(slide.title);
    }
    seen.add(normalized);
  }

  return duplicates;
}

function weakHook(title: string) {
  return title.length < 8 || !/[？!！:：]|看懂|为什么|怎么|别再|一图/.test(title);
}

function genericPhraseCount(deckPlan: DeckPlan) {
  const genericPatterns = ["值得关注", "不容忽视", "带来变化", "新的机会", "需要重视"];
  return deckPlan.slides.reduce((count, slide) => {
    return count + genericPatterns.filter((pattern) => slide.body.includes(pattern) || slide.title.includes(pattern)).length;
  }, 0);
}

function factualRiskCount(parsedSource: ParsedSource) {
  return parsedSource.riskFlags.length;
}

function decide(score: number, blockingIssues: string[]) {
  if (score < 50 || blockingIssues.length > 0) {
    return "block" as const;
  }
  if (score < 80) {
    return "rewrite" as const;
  }
  return "approve" as const;
}

function pickRewriteStage(issues: string[]) {
  if (issues.some((issue) => issue.includes("事实") || issue.includes("来源") || issue.includes("核实"))) {
    return "source-parse" as const;
  }
  if (issues.some((issue) => issue.includes("叙事") || issue.includes("受众") || issue.includes("角度"))) {
    return "brief" as const;
  }
  if (issues.some((issue) => issue.includes("封面") || issue.includes("重复") || issue.includes("页") || issue.includes("文案"))) {
    return "deck" as const;
  }
  if (issues.some((issue) => issue.includes("视觉") || issue.includes("溢出") || issue.includes("模板"))) {
    return "visual" as const;
  }

  return "deck" as const;
}

function scorePenalty(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return 18;
  }
  if (severity === "medium") {
    return 10;
  }
  return 4;
}

function buildDeterministicReview(input: {
  parsedSource: ParsedSource;
  contentBrief: ContentBrief;
  deckPlan: DeckPlan;
  visualSpec: VisualSpec;
  renderResult: RenderResult;
}) {
  const issues: string[] = [];
  const blockingIssues: string[] = [];
  const strengths: string[] = [];
  const suggestedFixes: string[] = [];

  const cover = input.deckPlan.slides[0];
  const duplicates = repeatedTitles(input.deckPlan);
  const overflowCount = input.renderResult.assets.filter((asset) => asset.overflowDetected).length;
  const genericCount = genericPhraseCount(input.deckPlan);
  const factRiskCount = factualRiskCount(input.parsedSource);

  if (weakHook(cover?.title || "")) {
    issues.push("封面钩子偏弱");
    suggestedFixes.push("强化封面标题的结论感或问题感");
  } else {
    strengths.push("封面标题具备基本钩子");
  }

  if (duplicates.length > 0) {
    issues.push("中间页标题存在重复");
    suggestedFixes.push("让每页承担不同信息目标，避免重复表达");
  } else {
    strengths.push("页间主题分工清晰");
  }

  if (overflowCount > 0) {
    issues.push(`有 ${overflowCount} 页存在溢出风险`);
    suggestedFixes.push("压缩单页文案长度或切换更宽松模板");
  } else {
    strengths.push("当前模板承载量基本合理");
  }

  if (input.visualSpec.warnings.length > 0) {
    issues.push("视觉匹配阶段发出了密度或模板风险警告");
  }

  if (genericCount >= 2) {
    issues.push("文案存在泛化表达，像新闻搬运");
    suggestedFixes.push("用更具体的场景和动作替代空泛判断");
  } else {
    strengths.push("文案相对具体，没有明显空话堆积");
  }

  if (factRiskCount > 0) {
    issues.push("解析阶段标记了事实风险");
    suggestedFixes.push("在 parse 和 brief 阶段补齐来源、时间和限定表达");
  }

  if (input.contentBrief.keyTakeaways.length < 3) {
    blockingIssues.push("关键信息不足，无法支撑完整 deck");
  }
  if (factRiskCount >= 3) {
    blockingIssues.push("事实风险过高");
  }

  return {
    issues,
    blockingIssues,
    strengths,
    suggestedFixes,
    duplicates,
    overflowCount,
    genericCount,
    factRiskCount,
    weakCoverHook: weakHook(cover?.title || "")
  };
}

function buildPrompt(input: {
  parsedSource: ParsedSource;
  contentBrief: ContentBrief;
  deckPlan: DeckPlan;
  visualSpec: VisualSpec;
  renderResult: RenderResult;
}) {
  const promptInput = {
    parsedSource: {
      title: input.parsedSource.title,
      summary: input.parsedSource.summary,
      keyFacts: input.parsedSource.keyFacts.slice(0, 5),
      keyPoints: input.parsedSource.keyPoints.slice(0, 5),
      riskFlags: input.parsedSource.riskFlags
    },
    contentBrief: {
      topic: input.contentBrief.topic,
      angle: input.contentBrief.angle,
      audience: input.contentBrief.audience,
      narrative: input.contentBrief.narrative,
      keyTakeaways: input.contentBrief.keyTakeaways,
      mustInclude: input.contentBrief.mustInclude,
      avoid: input.contentBrief.avoid
    },
    deckPlan: {
      summary: input.deckPlan.summary,
      cta: input.deckPlan.cta,
      slides: input.deckPlan.slides.map((slide) => ({
        index: slide.index,
        pageType: slide.pageType,
        goal: slide.goal,
        title: slide.title,
        body: slide.body,
        highlights: slide.highlights,
        templateId: slide.templateId,
        charCountTitle: slide.charCountTitle,
        charCountBody: slide.charCountBody
      }))
    },
    visualSpec: {
      routeId: input.visualSpec.routeId,
      visualFamily: input.visualSpec.visualFamily,
      themeCategory: input.visualSpec.themeCategory,
      tone: input.visualSpec.tone,
      densityLevel: input.visualSpec.densityLevel,
      layoutMode: input.visualSpec.layoutMode,
      routeReasons: input.visualSpec.routeReasons,
      warnings: input.visualSpec.warnings
    },
    renderSummary: {
      overflowCount: input.renderResult.assets.filter((asset) => asset.overflowDetected).length,
      assets: input.renderResult.assets.map((asset) => ({
        slideIndex: asset.slideIndex,
        overflowDetected: asset.overflowDetected
      }))
    }
  };

  return [
    "You are the reviewer stage for mid-mint v2.",
    "Return JSON only.",
    "Task: provide structured critique and suggested fixes for Xiaohongshu deck quality.",
    "Focus on: cover hook strength, slide repetition, density overload, visual mismatch, factual risk, generic phrasing, news搬运感.",
    "Do not decide the final score threshold. Deterministic logic will do that.",
    "",
    "JSON shape:",
    JSON.stringify({
      observations: [
        {
          category: "enum",
          severity: "low|medium|high",
          message: "string",
          suggestedFix: "string|null",
          blocking: false
        }
      ],
      strengths: ["string"],
      issues: ["string"],
      blockingIssues: ["string"],
      suggestedFixes: ["string"]
    }),
    "",
    "Input:",
    JSON.stringify(promptInput, null, 2)
  ].join("\n");
}

export class Reviewer {
  constructor(private readonly provider: StructuredLlmProvider = new OpenAiProvider()) {}

  async review(input: {
    parsedSource: ParsedSource;
    contentBrief: ContentBrief;
    deckPlan: DeckPlan;
    visualSpec: VisualSpec;
    renderResult: RenderResult;
  }): Promise<StageRunResult<ReviewResult>> {
    assertParsedSource(input.parsedSource);
    assertContentBrief(input.contentBrief);
    assertDeckPlan(input.deckPlan);
    assertVisualSpec(input.visualSpec);
    assertRenderResult(input.renderResult, input.deckPlan.slides.length);

    return runLlmStage({
      stageName: "REVIEWED",
      input,
      prompt: buildPrompt(input),
      provider: this.provider,
      responseSchema: reviewResponseSchema,
      timeoutMs: 25000,
      maxAttempts: 1,
      mapParsed: (parsed, currentInput) => {
        const deterministic = buildDeterministicReview(currentInput);
        const observations = parsed.observations ?? [];
        const llmIssues = dedupe([
          ...(parsed.issues ?? []),
          ...observations.map((observation) => observation.message)
        ]);
        const llmBlocking = dedupe([
          ...(parsed.blockingIssues ?? []),
          ...observations.filter((observation) => observation.blocking).map((observation) => observation.message)
        ]);
        const llmFixes = dedupe([
          ...(parsed.suggestedFixes ?? []),
          ...(observations.map((observation) => observation.suggestedFix).filter(Boolean) as string[])
        ]);
        const severityPenalty = observations.reduce((sum, observation) => sum + scorePenalty(observation.severity), 0);
        const stageScores: ReviewStageScores = {
          xiaohongshuFit: clampScore(88 - deterministic.genericCount * 8 - severityPenalty * 0.2),
          hookStrength: clampScore(92 - (deterministic.weakCoverHook ? 28 : 6) - severityPenalty * 0.15),
          readability: clampScore(88 - deterministic.overflowCount * 14 - severityPenalty * 0.1),
          densityControl: clampScore(
            86 - deterministic.overflowCount * 18 - (currentInput.visualSpec.densityLevel === "high" ? 10 : 0) - severityPenalty * 0.15
          ),
          factualSafety: clampScore(92 - deterministic.factRiskCount * 18 - severityPenalty * 0.2),
          originality: clampScore(84 - deterministic.genericCount * 12 - severityPenalty * 0.15),
          visualFit: clampScore(86 - currentInput.visualSpec.warnings.length * 10 - severityPenalty * 0.1)
        };

        const score = clampScore(
          Object.values(stageScores).reduce((sum, value) => sum + value, 0) / Object.values(stageScores).length
        );
        const blockingIssues = dedupe([...deterministic.blockingIssues, ...llmBlocking]);
        const issues = dedupe([...deterministic.issues, ...llmIssues]);
        const strengths = dedupe([...deterministic.strengths, ...(parsed.strengths ?? [])]);
        const suggestedFixes = dedupe([...deterministic.suggestedFixes, ...llmFixes]);
        const decision = decide(score, blockingIssues);
        const rewriteStage = decision === "rewrite" ? pickRewriteStage(issues) : null;

        if (blockingIssues.length === 0 && score >= 80) {
          strengths.push("整体达到可继续预览和导出的质量线");
        }

        return assertReviewResult({
          score,
          stageScores,
          issues,
          strengths,
          blockingIssues,
          suggestedFixes,
          decision,
          shouldRewrite: decision === "rewrite",
          rewriteStage
        });
      },
      validateOutput: (output) => assertReviewResult(output),
      repairParsed: (raw) => {
        if (!raw || typeof raw !== "object") {
          return null;
        }

        const value = raw as Record<string, unknown>;
        return {
          observations: Array.isArray(value.observations)
            ? value.observations.map((observation) => {
                const current = observation && typeof observation === "object"
                  ? (observation as Record<string, unknown>)
                  : {};
                return {
                  category:
                    typeof current.category === "string" && REVIEW_CATEGORIES.includes(current.category as (typeof REVIEW_CATEGORIES)[number])
                      ? (current.category as (typeof REVIEW_CATEGORIES)[number])
                      : "generic_phrasing",
                  severity:
                    typeof current.severity === "string" && REVIEW_SEVERITIES.includes(current.severity as (typeof REVIEW_SEVERITIES)[number])
                      ? (current.severity as (typeof REVIEW_SEVERITIES)[number])
                      : "low",
                  message: String(current.message ?? ""),
                  suggestedFix: current.suggestedFix == null ? null : String(current.suggestedFix),
                  blocking: Boolean(current.blocking)
                };
              })
            : [],
          strengths: Array.isArray(value.strengths) ? value.strengths.map(String) : [],
          issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
          blockingIssues: Array.isArray(value.blockingIssues) ? value.blockingIssues.map(String) : [],
          suggestedFixes: Array.isArray(value.suggestedFixes) ? value.suggestedFixes.map(String) : []
        };
      },
      fallback: (currentInput) => {
        const deterministic = buildDeterministicReview(currentInput);
        const stageScores: ReviewStageScores = {
          xiaohongshuFit: clampScore(88 - deterministic.genericCount * 10 - (deterministic.weakCoverHook ? 12 : 0)),
          hookStrength: clampScore(92 - (deterministic.weakCoverHook ? 28 : 6)),
          readability: clampScore(88 - deterministic.overflowCount * 14),
          densityControl: clampScore(
            86 - deterministic.overflowCount * 18 - (currentInput.visualSpec.densityLevel === "high" ? 10 : 0)
          ),
          factualSafety: clampScore(92 - deterministic.factRiskCount * 18),
          originality: clampScore(84 - deterministic.genericCount * 12),
          visualFit: clampScore(86 - currentInput.visualSpec.warnings.length * 10)
        };
        const score = clampScore(
          Object.values(stageScores).reduce((sum, value) => sum + value, 0) / Object.values(stageScores).length
        );
        const decision = decide(score, deterministic.blockingIssues);
        return assertReviewResult({
          score,
          stageScores,
          issues: deterministic.issues,
          strengths: deterministic.strengths,
          blockingIssues: deterministic.blockingIssues,
          suggestedFixes: deterministic.suggestedFixes,
          decision,
          shouldRewrite: decision === "rewrite",
          rewriteStage: decision === "rewrite" ? pickRewriteStage(deterministic.issues) : null
        });
      }
    });
  }
}
