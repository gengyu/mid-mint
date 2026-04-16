import type { ZodTypeAny } from "zod";
import {
  AppValidationError,
  createAppError,
  type AppError
} from "@/shared/errors/app-error";
import {
  contentBriefSchema,
  contentSignalsSchema,
  deckPlanSchema,
  jobSchema,
  jobVersionSchema,
  parsedSourceSchema,
  renderResultSchema,
  reviewResultSchema,
  rewriteRequestSchema,
  sourceInputSchema,
  templateRouteMetaSchema,
  visualSpecSchema
} from "./schemas";
import type {
  ContentBrief,
  ContentSignals,
  DeckPlan,
  Job,
  JobVersion,
  ParsedSource,
  RenderResult,
  ReviewResult,
  RewriteRequest,
  SourceInput,
  TemplateRouteMeta,
  VisualSpec
} from "./types";

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: AppError };

function fromUnknownError(code: string, fallbackMessage: string, error: unknown, details?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return createAppError(code, message, details);
}

function safeParseWithError<T>(schema: ZodTypeAny, input: unknown, error: AppError): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, error };
}

export function validateSourceInput(input: unknown): ValidationResult<SourceInput> {
  const parsed = safeParseWithError<SourceInput>(
    sourceInputSchema,
    input,
    createAppError("SOURCE_INPUT_EMPTY", "Source input is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  const { urls, rawText, notes } = parsed.data;
  if (!urls.length && !rawText.trim() && !notes.trim()) {
    return { success: false, error: createAppError("SOURCE_INPUT_EMPTY", "At least one source field is required.") };
  }

  return parsed;
}

export function assertSourceInput(input: unknown): SourceInput {
  const result = validateSourceInput(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateParsedSource(input: unknown): ValidationResult<ParsedSource> {
  const parsed = safeParseWithError<ParsedSource>(
    parsedSourceSchema,
    input,
    createAppError("PARSED_SOURCE_SUMMARY_EMPTY", "Parsed source is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  const { summary, keyFacts, keyPoints } = parsed.data;
  if (!summary.trim()) {
    return { success: false, error: createAppError("PARSED_SOURCE_SUMMARY_EMPTY", "Summary is required.") };
  }
  if (keyFacts.length < 1 || keyFacts.length > 20) {
    return { success: false, error: createAppError("PARSED_SOURCE_KEY_FACTS_EMPTY", "Key facts are invalid.") };
  }
  if (keyPoints.length < 1 || keyPoints.length > 20) {
    return { success: false, error: createAppError("PARSED_SOURCE_KEY_POINTS_EMPTY", "Key points are invalid.") };
  }

  return parsed;
}

export function assertParsedSource(input: unknown): ParsedSource {
  const result = validateParsedSource(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateContentBrief(input: unknown): ValidationResult<ContentBrief> {
  const parsed = safeParseWithError<ContentBrief>(
    contentBriefSchema,
    input,
    createAppError("BRIEF_INPUT_INVALID", "Content brief is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  const { topic, audience, narrative, keyTakeaways } = parsed.data;
  if (!topic.trim()) {
    return { success: false, error: createAppError("BRIEF_TOPIC_EMPTY", "Topic is required.") };
  }
  if (!audience.trim()) {
    return { success: false, error: createAppError("BRIEF_AUDIENCE_EMPTY", "Audience is required.") };
  }
  if (!narrative.trim()) {
    return { success: false, error: createAppError("BRIEF_NARRATIVE_EMPTY", "Narrative is required.") };
  }
  if (keyTakeaways.length < 3 || keyTakeaways.length > 5) {
    return { success: false, error: createAppError("BRIEF_KEY_TAKEAWAYS_INVALID", "Key takeaways are invalid.") };
  }

  return parsed;
}

export function assertContentBrief(input: unknown): ContentBrief {
  const result = validateContentBrief(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateDeckPlan(input: unknown): ValidationResult<DeckPlan> {
  const parsed = safeParseWithError<DeckPlan>(
    deckPlanSchema,
    input,
    createAppError("DECK_INPUT_INVALID", "Deck plan is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  const { slides, cta } = parsed.data;
  if (slides.length < 4 || slides.length > 5) {
    return { success: false, error: createAppError("DECK_SLIDE_COUNT_INVALID", "Deck slide count is invalid.") };
  }

  const coverCount = slides.filter((slide) => slide.pageType === "cover").length;
  const ctaCount = slides.filter((slide) => slide.pageType === "cta").length;
  if (coverCount !== 1) {
    return { success: false, error: createAppError("DECK_COVER_MISSING", "Cover slide is required.") };
  }
  if (ctaCount !== 1) {
    return { success: false, error: createAppError("DECK_CTA_MISSING", "CTA slide is required.") };
  }
  if (!cta.trim()) {
    return { success: false, error: createAppError("DECK_CTA_MISSING", "CTA content is required.") };
  }

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    if (slide.index !== index + 1) {
      return { success: false, error: createAppError("DECK_SLIDE_INDEX_INVALID", "Slide indexes must be continuous.") };
    }
    if (!slide.title.trim()) {
      return { success: false, error: createAppError("DECK_SLIDE_TITLE_EMPTY", "Slide title is required.") };
    }
    if (!slide.body.trim()) {
      return { success: false, error: createAppError("DECK_SLIDE_BODY_EMPTY", "Slide body is required.") };
    }
    if (!slide.templateId.trim()) {
      return { success: false, error: createAppError("DECK_TEMPLATE_ID_EMPTY", "Slide templateId is required.") };
    }
  }

  return parsed;
}

export function assertDeckPlan(input: unknown): DeckPlan {
  const result = validateDeckPlan(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateContentSignals(input: unknown): ValidationResult<ContentSignals> {
  return safeParseWithError<ContentSignals>(
    contentSignalsSchema,
    input,
    createAppError("VISUAL_SIGNAL_INVALID", "Derived visual signals are invalid.")
  );
}

export function assertContentSignals(input: unknown): ContentSignals {
  const result = validateContentSignals(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateTemplateRouteMeta(input: unknown): ValidationResult<TemplateRouteMeta> {
  return safeParseWithError<TemplateRouteMeta>(
    templateRouteMetaSchema,
    input,
    createAppError("VISUAL_TEMPLATE_META_INVALID", "Template routing metadata is invalid.")
  );
}

export function assertTemplateRouteMeta(input: unknown): TemplateRouteMeta {
  const result = validateTemplateRouteMeta(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateVisualSpec(input: unknown): ValidationResult<VisualSpec> {
  const parsed = safeParseWithError<VisualSpec>(
    visualSpecSchema,
    input,
    createAppError("VISUAL_SPEC_INVALID", "Visual spec is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  if (!/^vf-[a-z-]+-[a-z_]+-(low|medium|high)$/.test(parsed.data.routeId)) {
    return { success: false, error: createAppError("VISUAL_SPEC_INVALID", "Visual routeId is invalid.") };
  }
  if (!parsed.data.routeReasons.includes("angle_selected_base_route")) {
    return { success: false, error: createAppError("VISUAL_SPEC_INVALID", "Visual route reasons are incomplete.") };
  }
  if (new Set(parsed.data.routeReasons).size !== parsed.data.routeReasons.length) {
    return { success: false, error: createAppError("VISUAL_SPEC_INVALID", "Visual route reasons must be unique.") };
  }

  return parsed;
}

export function assertVisualSpec(input: unknown): VisualSpec {
  const result = validateVisualSpec(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateRenderResult(input: unknown, expectedSlideCount: number): ValidationResult<RenderResult> {
  const parsed = safeParseWithError<RenderResult>(
    renderResultSchema,
    input,
    createAppError("RENDER_INPUT_INVALID", "Render result is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  if (parsed.data.assets.length !== expectedSlideCount) {
    return { success: false, error: createAppError("RENDER_ASSET_COUNT_INVALID", "Render asset count is invalid.") };
  }
  if (!parsed.data.htmlPreviewUrl.trim()) {
    return { success: false, error: createAppError("RENDER_HTML_PREVIEW_MISSING", "HTML preview is required.") };
  }
  if (parsed.data.assets.some((asset) => !asset.pngUrl.trim())) {
    return { success: false, error: createAppError("RENDER_PNG_MISSING", "PNG output is required.") };
  }
  if (parsed.data.assets.some((asset) => !asset.svgUrl.trim())) {
    return { success: false, error: createAppError("RENDER_SVG_MISSING", "SVG output is required.") };
  }

  return parsed;
}

export function assertRenderResult(input: unknown, expectedSlideCount: number): RenderResult {
  const result = validateRenderResult(input, expectedSlideCount);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateReviewResult(input: unknown): ValidationResult<ReviewResult> {
  const parsed = safeParseWithError<ReviewResult>(
    reviewResultSchema,
    input,
    createAppError("REVIEW_INPUT_INVALID", "Review result is invalid.")
  );
  if (!parsed.success) {
    return parsed;
  }

  const { score, stageScores, decision, rewriteStage } = parsed.data;
  const numericValues = [score, ...Object.values(stageScores)];
  if (numericValues.some((value) => Number.isNaN(value) || value < 0 || value > 100)) {
    return { success: false, error: createAppError("REVIEW_SCORE_INVALID", "Review score is invalid.") };
  }
  if (decision === "rewrite" && rewriteStage === null) {
    return { success: false, error: createAppError("REVIEW_DECISION_INVALID", "Rewrite decision requires rewrite stage.") };
  }
  if (decision === "approve" && rewriteStage !== null) {
    return { success: false, error: createAppError("REVIEW_DECISION_INVALID", "Approve decision must not include rewrite stage.") };
  }

  return parsed;
}

export function assertReviewResult(input: unknown): ReviewResult {
  const result = validateReviewResult(input);
  if (!result.success) {
    throw new AppValidationError(result.error);
  }

  return result.data;
}

export function validateJob(input: unknown): ValidationResult<Job> {
  return safeParseWithError<Job>(jobSchema, input, createAppError("UNKNOWN_ERROR", "Job is invalid."));
}

export function validateJobVersion(input: unknown): ValidationResult<JobVersion> {
  return safeParseWithError<JobVersion>(jobVersionSchema, input, createAppError("UNKNOWN_ERROR", "Job version is invalid."));
}

export function validateRewriteRequest(input: unknown): ValidationResult<RewriteRequest> {
  return safeParseWithError<RewriteRequest>(
    rewriteRequestSchema,
    input,
    createAppError("REWRITE_STAGE_INVALID", "Rewrite request is invalid.")
  );
}

export function describeValidationError(error: unknown, fallbackCode: string, fallbackMessage: string): AppError {
  if (error instanceof AppValidationError) {
    return error.error;
  }

  return fromUnknownError(fallbackCode, fallbackMessage, error);
}
