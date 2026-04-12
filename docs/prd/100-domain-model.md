# mid-mint 领域模型

## 枚举定义

```ts
type JobStatus =
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

type RewriteStage = "source-parse" | "brief" | "deck" | "visual";

type DeckPageType =
  | "cover"
  | "summary"
  | "detail"
  | "comparison"
  | "checklist"
  | "cta";

type ContentAngle =
  | "quick_view"
  | "key_points"
  | "industry_impact"
  | "practitioner_view"
  | "product_opportunity"
  | "tool_summary"
  | "pitfall_alert"
  | "experience_breakdown"
  | "method_summary";

type DensityLevel = "low" | "medium" | "high";

type ThemeCategory =
  | "news_flash"
  | "knowledge_explainer"
  | "comparison_analysis"
  | "case_story"
  | "method_guide"
  | "campaign_launch";

type ToneMode = "professional" | "sharp" | "warm" | "practical" | "energetic";
type ContentIntent = "inform" | "explain" | "compare" | "convince" | "convert";
type AudienceMode = "broad_consumer" | "operator" | "professional" | "founder_team";
type VisualFamily = "signal-tech" | "clean-method" | "proof-compare" | "warm-story" | "brand-campaign";
type LayoutMode = "airy" | "balanced" | "compact";
type DecorationLevel = "low" | "medium" | "high";
type ImageStrategy = "none" | "abstract" | "editorial";

type RouteReasonCode =
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

type ReviewDecision = "approve" | "rewrite" | "block";
```

## 核心类型

```ts
type SourceInput = {
  urls: string[];
  rawText: string;
  notes: string;
  targetAudience: string;
  contentGoal: string;
  preferredStyle: string;
};

type ParsedSource = {
  title: string;
  summary: string;
  keyFacts: string[];
  keyPoints: string[];
  quotes: string[];
  sourceUrls: string[];
  publishTime: string | null;
  riskFlags: string[];
};

type ContentBrief = {
  topic: string;
  angle: ContentAngle;
  audience: string;
  narrative: string;
  keyTakeaways: string[];
  mustInclude: string[];
  avoid: string[];
};

type DeckSlide = {
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

type DeckPlan = {
  summary: string;
  slides: DeckSlide[];
  cta: string;
};

type ContentSignals = {
  themeCategory: ThemeCategory;
  tone: ToneMode;
  densityLevel: DensityLevel;
  contentIntent: ContentIntent;
  audienceMode: AudienceMode;
};

type TemplateRouteMeta = {
  supportedPageTypes: DeckPageType[];
  supportedFamilies: VisualFamily[];
  supportedThemes: ThemeCategory[];
  densitySupport: DensityLevel[];
  emphasis: DecorationLevel;
  usagePriority: number;
  phase1Status: "enabled" | "excluded";
};

type VisualSpec = {
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

type RenderedAsset = {
  slideIndex: number;
  pngUrl: string;
  svgUrl: string;
  htmlFragment: string;
  overflowDetected: boolean;
};

type RenderResult = {
  assets: RenderedAsset[];
  htmlPreviewUrl: string;
  pngUrls: string[];
  svgUrls: string[];
};

type ReviewStageScores = {
  xiaohongshuFit: number;
  hookStrength: number;
  readability: number;
  densityControl: number;
  factualSafety: number;
  originality: number;
  visualFit: number;
};

type ReviewResult = {
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
```

## 建模要求

* 所有枚举必须保持闭集
* `DeckPlan.slides[].templateId` 是模板选择的事实来源
* `VisualSpec` 描述的是整套 Deck 的视觉策略
* `ReviewResult` 必须同时表达分数、问题、决策与重写目标
