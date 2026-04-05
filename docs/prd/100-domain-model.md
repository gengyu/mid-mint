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

type VisualSpec = {
  styleName: string;
  layoutMode: string;
  tone: string;
  densityLevel: DensityLevel;
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
