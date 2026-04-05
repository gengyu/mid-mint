export type JobStatus =
  | "INPUT_RECEIVED"
  | "PARSED"
  | "BRIEFED"
  | "DECK_GENERATED"
  | "VISUAL_MATCHED"
  | "RENDERED"
  | "REVIEWED"
  | "APPROVED"
  | "REWRITE_PENDING"
  | "FAILED";

export type RewriteStage =
  | "source-parse"
  | "brief"
  | "deck"
  | "visual";

export type DeckPageType =
  | "cover"
  | "summary"
  | "detail"
  | "comparison"
  | "checklist"
  | "cta";

export type ContentAngle =
  | "quick_view"
  | "key_points"
  | "industry_impact"
  | "practitioner_view"
  | "product_opportunity"
  | "tool_summary"
  | "pitfall_alert"
  | "experience_breakdown"
  | "method_summary";

export type DensityLevel = "low" | "medium" | "high";
export type ThemeCategory =
  | "news_flash"
  | "knowledge_explainer"
  | "comparison_analysis"
  | "case_story"
  | "method_guide"
  | "campaign_launch";

export type ToneMode =
  | "professional"
  | "sharp"
  | "warm"
  | "practical"
  | "energetic";

export type ContentIntent =
  | "inform"
  | "explain"
  | "compare"
  | "convince"
  | "convert";

export type AudienceMode =
  | "broad_consumer"
  | "operator"
  | "professional"
  | "founder_team";

export type VisualFamily =
  | "signal-tech"
  | "clean-method"
  | "proof-compare"
  | "warm-story"
  | "brand-campaign";

export type LayoutMode = "airy" | "balanced" | "compact";

export type DecorationLevel = "low" | "medium" | "high";

export type ImageStrategy = "none" | "abstract" | "editorial";

export type RouteReasonCode =
  | "angle_selected_base_route"
  | "preferred_style_hint_applied"
  | "preferred_style_hint_ignored"
  | "audience_mode_broad_consumer"
  | "audience_mode_operator"
  | "audience_mode_professional"
  | "audience_mode_founder_team"
  | "density_low_layout_airy"
  | "density_medium_layout_balanced"
  | "density_high_layout_compact";

export type ReviewDecision = "approve" | "rewrite" | "block";

export type SourceInput = {
  urls: string[];
  rawText: string;
  notes: string;
  targetAudience: string;
  contentGoal: string;
  preferredStyle: string;
};

export type ParsedSource = {
  title: string;
  summary: string;
  keyFacts: string[];
  keyPoints: string[];
  quotes: string[];
  sourceUrls: string[];
  publishTime: string | null;
  riskFlags: string[];
};

export type ContentBrief = {
  topic: string;
  angle: ContentAngle;
  audience: string;
  narrative: string;
  keyTakeaways: string[];
  mustInclude: string[];
  avoid: string[];
  contentGoal?: string;
};

export type DeckSlide = {
  index: number;
  pageType: DeckPageType;
  goal: string;
  title: string;
  body: string;
  highlights: string[];
  templateId: string;
  values: Record<string, string>;
  charCountTitle: number;
  charCountBody: number;
};

export type DeckPlan = {
  summary: string;
  slides: DeckSlide[];
  cta: string;
};

export type ContentSignals = {
  themeCategory: ThemeCategory;
  tone: ToneMode;
  densityLevel: DensityLevel;
  contentIntent: ContentIntent;
  audienceMode: AudienceMode;
};

export type TemplateRouteMeta = {
  supportedPageTypes: DeckPageType[];
  supportedFamilies: VisualFamily[];
  supportedThemes: ThemeCategory[];
  densitySupport: DensityLevel[];
  emphasis: DecorationLevel;
  usagePriority: number;
  phase1Status: "enabled" | "excluded";
};

export type VisualSpec = {
  routeId: string;
  themeCategory: ThemeCategory;
  visualFamily: VisualFamily;
  tone: ToneMode;
  densityLevel: DensityLevel;
  layoutMode: LayoutMode;
  paletteKey: string;
  typographyMode: string;
  decorationLevel: DecorationLevel;
  imageStrategy: ImageStrategy;
  routeReasons: RouteReasonCode[];
  warnings: string[];
};

export type RenderedAsset = {
  slideIndex: number;
  pngUrl: string;
  svgUrl: string;
  htmlFragment: string;
  overflowDetected: boolean;
};

export type RenderResult = {
  assets: RenderedAsset[];
  htmlPreviewUrl: string;
  pngUrls: string[];
  svgUrls: string[];
};

export type ReviewStageScores = {
  xiaohongshuFit: number;
  hookStrength: number;
  readability: number;
  densityControl: number;
  factualSafety: number;
  originality: number;
  visualFit: number;
};

export type ReviewResult = {
  score: number;
  stageScores: ReviewStageScores;
  issues: string[];
  strengths: string[];
  blockingIssues: string[];
  suggestedFixes: string[];
  decision: ReviewDecision;
  shouldRewrite: boolean;
  rewriteStage: RewriteStage | null;
};

export type Job = {
  id: string;
  status: JobStatus;
  rewriteCount: number;
  activeVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type JobVersion = {
  id: string;
  jobId: string;
  versionNumber: number;
  trigger: "initial" | "rewrite";
  rewriteStage: RewriteStage | null;
  createdAt: string;
};

export type RewriteRequest = {
  jobId: string;
  targetStage: RewriteStage;
  reason: string;
};
