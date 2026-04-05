import { z } from "zod";
import type {
  ContentBrief,
  DeckPlan,
  DeckSlide,
  Job,
  JobVersion,
  ParsedSource,
  RenderResult,
  RenderedAsset,
  ReviewResult,
  ReviewStageScores,
  RewriteRequest,
  SourceInput,
  VisualSpec
} from "./types";

export const jobStatusSchema = z.enum([
  "INPUT_RECEIVED",
  "PARSED",
  "BRIEFED",
  "DECK_GENERATED",
  "VISUAL_MATCHED",
  "RENDERED",
  "REVIEWED",
  "APPROVED",
  "REWRITE_PENDING",
  "FAILED"
]);

export const rewriteStageSchema = z.enum(["source-parse", "brief", "deck", "visual"]);
export const deckPageTypeSchema = z.enum(["cover", "summary", "detail", "comparison", "checklist", "cta"]);
export const contentAngleSchema = z.enum([
  "quick_view",
  "key_points",
  "industry_impact",
  "practitioner_view",
  "product_opportunity",
  "tool_summary",
  "pitfall_alert",
  "experience_breakdown",
  "method_summary"
]);
export const densityLevelSchema = z.enum(["low", "medium", "high"]);
export const reviewDecisionSchema = z.enum(["approve", "rewrite", "block"]);

export const sourceInputSchema = z.object({
  urls: z.array(z.string()),
  rawText: z.string(),
  notes: z.string(),
  targetAudience: z.string(),
  contentGoal: z.string(),
  preferredStyle: z.string()
}) satisfies z.ZodType<SourceInput>;

export const parsedSourceSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyFacts: z.array(z.string()),
  keyPoints: z.array(z.string()),
  quotes: z.array(z.string()),
  sourceUrls: z.array(z.string()),
  publishTime: z.string().nullable(),
  riskFlags: z.array(z.string())
}) satisfies z.ZodType<ParsedSource>;

export const contentBriefSchema = z.object({
  topic: z.string(),
  angle: contentAngleSchema,
  audience: z.string(),
  narrative: z.string(),
  keyTakeaways: z.array(z.string()),
  mustInclude: z.array(z.string()),
  avoid: z.array(z.string()),
  contentGoal: z.string().optional()
}) satisfies z.ZodType<ContentBrief>;

export const deckSlideSchema = z.object({
  index: z.number().int(),
  pageType: deckPageTypeSchema,
  goal: z.string(),
  title: z.string(),
  body: z.string(),
  highlights: z.array(z.string()),
  templateId: z.string(),
  values: z.record(z.string()),
  charCountTitle: z.number().int().nonnegative(),
  charCountBody: z.number().int().nonnegative()
}) satisfies z.ZodType<DeckSlide>;

export const deckPlanSchema = z.object({
  summary: z.string(),
  slides: z.array(deckSlideSchema),
  cta: z.string()
}) satisfies z.ZodType<DeckPlan>;

export const visualSpecSchema = z.object({
  styleName: z.string(),
  layoutMode: z.string(),
  tone: z.string(),
  densityLevel: densityLevelSchema,
  warnings: z.array(z.string())
}) satisfies z.ZodType<VisualSpec>;

export const renderedAssetSchema = z.object({
  slideIndex: z.number().int(),
  pngUrl: z.string(),
  svgUrl: z.string(),
  htmlFragment: z.string(),
  overflowDetected: z.boolean()
}) satisfies z.ZodType<RenderedAsset>;

export const renderResultSchema = z.object({
  assets: z.array(renderedAssetSchema),
  htmlPreviewUrl: z.string(),
  pngUrls: z.array(z.string()),
  svgUrls: z.array(z.string())
}) satisfies z.ZodType<RenderResult>;

export const reviewStageScoresSchema = z.object({
  xiaohongshuFit: z.number(),
  hookStrength: z.number(),
  readability: z.number(),
  densityControl: z.number(),
  factualSafety: z.number(),
  originality: z.number(),
  visualFit: z.number()
}) satisfies z.ZodType<ReviewStageScores>;

export const reviewResultSchema = z.object({
  score: z.number(),
  stageScores: reviewStageScoresSchema,
  issues: z.array(z.string()),
  strengths: z.array(z.string()),
  blockingIssues: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
  decision: reviewDecisionSchema,
  shouldRewrite: z.boolean(),
  rewriteStage: rewriteStageSchema.nullable()
}) satisfies z.ZodType<ReviewResult>;

export const jobSchema = z.object({
  id: z.string(),
  status: jobStatusSchema,
  rewriteCount: z.number().int().nonnegative(),
  activeVersion: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string()
}) satisfies z.ZodType<Job>;

export const jobVersionSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  versionNumber: z.number().int().positive(),
  trigger: z.enum(["initial", "rewrite"]),
  rewriteStage: rewriteStageSchema.nullable(),
  createdAt: z.string()
}) satisfies z.ZodType<JobVersion>;

export const rewriteRequestSchema = z.object({
  jobId: z.string(),
  targetStage: rewriteStageSchema,
  reason: z.string()
}) satisfies z.ZodType<RewriteRequest>;
