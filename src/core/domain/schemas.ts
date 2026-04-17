import { z } from "zod";
import type {
  ContentBrief,
  ContentSignals,
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
  TemplateRouteMeta,
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
export const themeCategorySchema = z.enum([
  "news_flash",
  "knowledge_explainer",
  "comparison_analysis",
  "case_story",
  "method_guide",
  "campaign_launch"
]);
export const toneModeSchema = z.enum(["professional", "sharp", "warm", "practical", "energetic"]);
export const contentIntentSchema = z.enum(["inform", "explain", "compare", "convince", "convert"]);
export const audienceModeSchema = z.enum(["broad_consumer", "operator", "professional", "founder_team"]);
export const visualFamilySchema = z.enum([
  "signal-tech",
  "clean-method",
  "proof-compare",
  "warm-story",
  "brand-campaign"
]);
export const layoutModeSchema = z.enum(["airy", "balanced", "compact"]);
export const decorationLevelSchema = z.enum(["low", "medium", "high"]);
export const imageStrategySchema = z.enum(["none", "abstract", "editorial"]);
export const routeReasonCodeSchema = z.enum([
  "angle_selected_base_route",
  "preferred_style_hint_applied",
  "preferred_style_hint_ignored",
  "audience_mode_broad_consumer",
  "audience_mode_operator",
  "audience_mode_professional",
  "audience_mode_founder_team",
  "density_low_layout_airy",
  "density_medium_layout_balanced",
  "density_high_layout_compact"
]);
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

export const contentSignalsSchema = z.object({
  themeCategory: themeCategorySchema,
  tone: toneModeSchema,
  densityLevel: densityLevelSchema,
  contentIntent: contentIntentSchema,
  audienceMode: audienceModeSchema
}) satisfies z.ZodType<ContentSignals>;

export const templateRouteMetaSchema = z.object({
  supportedPageTypes: z.array(deckPageTypeSchema).min(1),
  supportedFamilies: z.array(visualFamilySchema).min(1),
  supportedThemes: z.array(themeCategorySchema).min(1),
  densitySupport: z.array(densityLevelSchema).min(1),
  emphasis: decorationLevelSchema,
  usagePriority: z.number().int().nonnegative(),
  phase1Status: z.enum(["enabled", "excluded"])
}) satisfies z.ZodType<TemplateRouteMeta>;

export const visualSpecSchema = z.object({
  routeId: z.string(),
  themeCategory: themeCategorySchema,
  visualFamily: visualFamilySchema,
  tone: toneModeSchema,
  densityLevel: densityLevelSchema,
  layoutMode: layoutModeSchema,
  paletteKey: z.string(),
  typographyMode: z.string(),
  decorationLevel: decorationLevelSchema,
  imageStrategy: imageStrategySchema,
  routeReasons: z.array(routeReasonCodeSchema),
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
