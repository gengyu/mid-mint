# mid-mint Domain Model

## Enums

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

type RewriteStage =
  | "source-parse"
  | "brief"
  | "deck"
  | "visual";

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

type ToneMode =
  | "professional"
  | "sharp"
  | "warm"
  | "practical"
  | "energetic";

type ContentIntent =
  | "inform"
  | "explain"
  | "compare"
  | "convince"
  | "convert";

type AudienceMode =
  | "broad_consumer"
  | "operator"
  | "professional"
  | "founder_team";

type VisualFamily =
  | "signal-tech"
  | "clean-method"
  | "proof-compare"
  | "warm-story"
  | "brand-campaign";

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

type ReviewDecision =
  | "approve"
  | "rewrite"
  | "block";
```

## Core Types

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

type Job = {
  id: string;
  status: JobStatus;
  rewriteCount: number;
  activeVersion: number;
  createdAt: string;
  updatedAt: string;
};

type JobVersion = {
  id: string;
  jobId: string;
  versionNumber: number;
  trigger: "initial" | "rewrite";
  rewriteStage: RewriteStage | null;
  createdAt: string;
};

type RewriteRequest = {
  jobId: string;
  targetStage: RewriteStage;
  reason: string;
};
```

## Validation Rules

### SourceInput

The system must enforce:

* `urls` may be empty
* `rawText` may be empty
* `notes` may be empty
* at least one of `urls`, `rawText`, `notes` must be non-empty
* `targetAudience` may be empty
* `contentGoal` may be empty
* `preferredStyle` may be empty

Validation failure code:

* `SOURCE_INPUT_EMPTY`

### ParsedSource

The system must enforce:

* `summary` must be non-empty
* `keyFacts.length` must be between 1 and 20
* `keyPoints.length` must be between 1 and 20
* `quotes.length` must be between 0 and 10
* `riskFlags.length` must be between 0 and 10

Validation failure codes:

* `PARSED_SOURCE_SUMMARY_EMPTY`
* `PARSED_SOURCE_KEY_FACTS_EMPTY`
* `PARSED_SOURCE_KEY_POINTS_EMPTY`

### ContentBrief

The system must enforce:

* `topic` must be non-empty
* `angle` must be one of `ContentAngle`
* `audience` must be non-empty
* `narrative` must be non-empty
* `keyTakeaways.length` must be between 3 and 5
* `mustInclude.length` must be between 0 and 5
* `avoid.length` must be between 0 and 5

Validation failure codes:

* `BRIEF_TOPIC_EMPTY`
* `BRIEF_AUDIENCE_EMPTY`
* `BRIEF_NARRATIVE_EMPTY`
* `BRIEF_KEY_TAKEAWAYS_INVALID`

### DeckPlan

The system must enforce:

* `slides.length` must be 4 or 5
* exactly one slide must have `pageType = cover`
* exactly one slide must have `pageType = cta`
* slide index must start from 1 and be continuous
* each slide title must be non-empty
* each slide body must be non-empty
* each slide must have `templateId`
* `cta` must be non-empty

Validation failure codes:

* `DECK_SLIDE_COUNT_INVALID`
* `DECK_COVER_MISSING`
* `DECK_CTA_MISSING`
* `DECK_SLIDE_INDEX_INVALID`
* `DECK_SLIDE_TITLE_EMPTY`
* `DECK_SLIDE_BODY_EMPTY`
* `DECK_TEMPLATE_ID_EMPTY`

### ContentSignals

The system must enforce:

* every field must use the approved enum space only

Validation failure code:

* `VISUAL_SIGNAL_INVALID`

### TemplateRouteMeta

The system must enforce:

* every template must declare at least one `supportedPageTypes`
* every template must declare at least one `supportedFamilies`
* every template must declare at least one `supportedThemes`
* every template must declare at least one `densitySupport`
* `usagePriority` must be an integer between 0 and 100
* `phase1Status` must be either `enabled` or `excluded`

Validation failure code:

* `VISUAL_TEMPLATE_META_INVALID`

### VisualSpec

The system must enforce:

* `routeId` must be non-empty
* `themeCategory` must be one of `ThemeCategory`
* `visualFamily` must be one of `VisualFamily`
* `tone` must be one of `ToneMode`
* `densityLevel` must be one of `DensityLevel`
* `layoutMode` must be one of `LayoutMode`
* `paletteKey` must be non-empty
* `typographyMode` must be non-empty
* `decorationLevel` must be one of `DecorationLevel`
* `imageStrategy` must be one of `ImageStrategy`
* `routeReasons.length` must be between 3 and 4
* every route reason must be one of `RouteReasonCode`
* `warnings` may be empty

Validation failure code:

* `VISUAL_SPEC_INVALID`

### RenderResult

The system must enforce:

* `assets.length` must equal `slides.length`
* every asset must contain `pngUrl`
* every asset must contain `svgUrl`
* `htmlPreviewUrl` must be non-empty

Validation failure codes:

* `RENDER_ASSET_COUNT_INVALID`
* `RENDER_PNG_MISSING`
* `RENDER_SVG_MISSING`
* `RENDER_HTML_PREVIEW_MISSING`
