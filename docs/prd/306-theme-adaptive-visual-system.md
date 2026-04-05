# PRD: Theme-Adaptive Visual System

## Status

* proposed
* this document refines the existing `visual-match` stage only
* this document does not add a new workflow stage
* this document should not replace current v1 specs until approved
* the Phase 1 contract below is written to be implementation-ready and is mirrored in linked domain, module, API, and frontend specs

## Goal

Build a theme-adaptive but constrained visual system for Xiaohongshu image-post decks.

The system must make different topics look meaningfully different in preview, while keeping output readable, explainable, and compatible with the current template-render pipeline.

## Direction Decision

The product direction is fixed as follows:

* do not treat model fine-tuning as the first solution
* do not let the model generate arbitrary free-form layouts for every job
* do not replace the current stage-based workflow
* keep `visual-match` as the single stage responsible for visual routing
* let the model understand content and produce structured visual decisions
* let the template system own final layout stability and renderability

This means the product is not a fully generative design tool.

This product is a structured content-to-visual routing system.

## Product Outcome

The target product must feel like this to the user:

* AI news, method guides, case stories, comparison analysis, and brand launch content should not look like the same template deck with different text
* the system should choose a deck-level visual route first, then choose per-slide templates under that route
* the user should be able to understand why a route was selected
* the user should be able to override the route or a single slide template in a later frontend milestone
* repeated runs with the same input should be mostly stable unless the user changes style preference or source content

The visual difference must come from controlled variation:

* template family
* density handling
* color tokens
* typography emphasis
* decoration level
* page rhythm

The visual difference must not depend on unconstrained SVG generation.

## Problem

Current implementation has these gaps:

* `preferredStyle` is free text and is only used as a light hint
* `visual-match` mainly routes by `pageType` and text density
* existing template assets such as `feature-compare` and `team-delivery` are not fully participating in the main visual routing path
* the system can render templates reliably, but it cannot yet express a clear deck-level visual strategy
* the user cannot inspect a structured reason for visual decisions

Result:

* different content themes can still converge to similar-looking outputs
* template choice is explainable only at a very shallow level
* future “微调” would have no stable label space to learn from

## Non-Goal

This direction explicitly does not include:

* per-request pixel-level layout invention
* training a model to directly output final SVG
* adding a new workflow stage before render
* supporting unlimited visual styles in the first milestone
* solving brand design systems for every enterprise use case in the first milestone

## Required Product Shape

The system must evolve into three layers.

### Layer 1: Content Signal Understanding

The system must derive structured signals from:

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `preferredStyle`

The system must derive at least:

* `themeCategory`
* `tone`
* `densityLevel`
* `contentIntent`
* `audienceMode`

Approved controlled values for Phase 1:

```ts
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
```

These values must be closed enums inside the routing logic even if user input remains free text.

### Layer 2: Deck-Level Visual Route

The system must choose one visual route for the whole deck before choosing per-slide templates.

Approved controlled values:

```ts
type VisualFamily =
  | "signal-tech"
  | "clean-method"
  | "proof-compare"
  | "warm-story"
  | "brand-campaign";
```

Each `VisualFamily` must define:

* preferred palette direction
* typography emphasis
* decoration level
* preferred page rhythm
* preferred template subsets
* density tolerance

Example direction:

* `signal-tech`: high contrast, sharp headings, suitable for AI news and trend alerts
* `clean-method`: clean hierarchy, low decoration, suitable for tutorials and method breakdown
* `proof-compare`: strong comparison structure, suitable for comparison and decision content
* `warm-story`: narrative rhythm, softer contrast, suitable for cases and experience stories
* `brand-campaign`: stronger emotion and CTA emphasis, suitable for launch and campaign content

### Layer 3: Slide-Level Template Routing

After deck-level route is fixed, each slide must be resolved by:

* `pageType`
* `themeCategory`
* `VisualFamily`
* `densityLevel`
* slot constraints
* overflow risk

Template choice must be constrained by metadata rather than open-ended prompt guessing.

## Template System Requirement

Current template metadata is not enough for theme-aware routing.

Each template must expose structured routing metadata.

Required metadata addition:

```ts
type TemplateRouteMeta = {
  supportedPageTypes: DeckPageType[];
  supportedFamilies: VisualFamily[];
  supportedThemes: ThemeCategory[];
  densitySupport: DensityLevel[];
  emphasis: "low" | "medium" | "high";
  usagePriority: number;
  phase1Status: "enabled" | "excluded";
};
```

Requirements:

* every template must declare compatible `pageType`
* every template must declare compatible `VisualFamily`
* every template must declare supported density range
* every template must declare routing priority for tie-break
* templates already in assets but not used by main routing must be classified and either enabled or explicitly excluded

This is required to make existing assets first-class routing options.

## Visual Output Contract

The current `VisualSpec` is too small to support explainable theme routing.

Approved output shape for Phase 1:

```ts
type VisualSpec = {
  routeId: string;
  themeCategory: ThemeCategory;
  visualFamily: VisualFamily;
  tone: ToneMode;
  densityLevel: DensityLevel;
  layoutMode: "airy" | "balanced" | "compact";
  paletteKey: string;
  typographyMode: string;
  decorationLevel: "low" | "medium" | "high";
  imageStrategy: "none" | "abstract" | "editorial";
  routeReasons: RouteReasonCode[];
  warnings: string[];
};
```

Requirements:

* `VisualSpec` must describe deck-level visual strategy, not only style labels
* output must include machine-readable reasons for route selection
* reasons must be short and stable enough for frontend display and analytics
* warnings must continue to capture density and overflow risk

## Phase 1 Implementation Contract

Phase 1 is the minimum scope that must be implemented before any later LLM-assisted classification work.

Phase 1 must:

* update the existing `visual-match` stage only
* keep render pipeline and workflow stages unchanged
* work without any LLM dependency
* emit the approved `VisualSpec` shape
* expose read-only route information in workspace and preview

Phase 1 must not:

* implement route override UI
* implement per-slide template override UI
* invent new slide data structures for custom layouts
* enable templates whose slot shape cannot be filled from current `DeckSlide`

### Phase 1 Input Contract

The `visual-match` stage must consume:

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `preferredStyle`
* template catalog metadata

### Phase 1 Deterministic Signal Rules

`densityLevel` must be derived from average per-slide character count:

* `high` when average chars per slide >= 140
* `medium` when average chars per slide >= 85 and < 140
* `low` when average chars per slide < 85

`layoutMode` must be derived only from `densityLevel`:

* `low` -> `airy`
* `medium` -> `balanced`
* `high` -> `compact`

`audienceMode` must be derived from `ContentBrief.audience` using deterministic keyword rules:

* map to `founder_team` when audience text contains `创始人`, `founder`, `团队`, or `team`
* map to `operator` when audience text contains `运营`, `增长`, `operator`, or `growth`
* map to `professional` when audience text contains `专业`, `研究`, `engineer`, `research`, `开发`, or `product`
* otherwise map to `broad_consumer`

### Phase 1 Base Route Mapping

The base route must be derived from `ContentBrief.angle` before any style hint is considered:

| `ContentAngle` | `themeCategory` | `contentIntent` | `visualFamily` |
| --- | --- | --- | --- |
| `quick_view` | `news_flash` | `inform` | `signal-tech` |
| `key_points` | `knowledge_explainer` | `explain` | `clean-method` |
| `industry_impact` | `news_flash` | `explain` | `signal-tech` |
| `practitioner_view` | `case_story` | `convince` | `warm-story` |
| `product_opportunity` | `campaign_launch` | `convert` | `brand-campaign` |
| `tool_summary` | `comparison_analysis` | `compare` | `proof-compare` |
| `pitfall_alert` | `news_flash` | `convince` | `signal-tech` |
| `experience_breakdown` | `case_story` | `explain` | `warm-story` |
| `method_summary` | `method_guide` | `explain` | `clean-method` |

### Phase 1 Preferred Style Hint Rules

`preferredStyle` remains a hint only.

The system may map `preferredStyle` keywords to a target family:

* `科技`, `tech`, `未来`, `signal` -> `signal-tech`
* `极简`, `clean`, `minimal`, `方法` -> `clean-method`
* `对比`, `compare`, `理性`, `proof` -> `proof-compare`
* `温和`, `故事`, `warm`, `narrative` -> `warm-story`
* `品牌`, `campaign`, `发布`, `emotional` -> `brand-campaign`

The style hint may override the base family only when all conditions are true:

* the hint maps to one approved `VisualFamily`
* the hinted family has at least one compatible Phase 1 enabled template for every slide `pageType` in the deck
* the hinted family does not increase overflow risk compared with the base family

When any of these conditions is false, the system must keep the base family and emit a route reason indicating the hint was ignored.

### Phase 1 Visual Token Contract

Deck-level visual tokens are fixed by `VisualFamily`:

| `VisualFamily` | `tone` | `paletteKey` | `typographyMode` | `decorationLevel` | `imageStrategy` |
| --- | --- | --- | --- | --- | --- |
| `signal-tech` | `sharp` | `tech-emerald` | `display-sharp` | `medium` | `abstract` |
| `clean-method` | `practical` | `paper-slate` | `sans-clean` | `low` | `none` |
| `proof-compare` | `professional` | `contrast-copper` | `sans-compact` | `medium` | `abstract` |
| `warm-story` | `warm` | `sunset-ink` | `serif-warm` | `medium` | `editorial` |
| `brand-campaign` | `energetic` | `brand-pop` | `display-bold` | `high` | `editorial` |

`preferredStyle` may override `tone` only when it matches one approved tone keyword:

* `专业`, `professional` -> `professional`
* `锐利`, `sharp` -> `sharp`
* `温和`, `warm` -> `warm`
* `务实`, `practical` -> `practical`
* `活力`, `energetic` -> `energetic`

When no tone keyword matches, use the family default tone.

### Phase 1 Route Id And Reason Codes

`routeId` must use this format:

```text
vf-{visualFamily}-{themeCategory}-{densityLevel}
```

`routeReasons` must only use approved codes:

* `angle_selected_base_route`
* `preferred_style_hint_applied`
* `preferred_style_hint_ignored`
* `audience_mode_broad_consumer`
* `audience_mode_operator`
* `audience_mode_professional`
* `audience_mode_founder_team`
* `density_low_layout_airy`
* `density_medium_layout_balanced`
* `density_high_layout_compact`

The emitted reason list must contain:

* exactly one base-route reason: `angle_selected_base_route`
* exactly one audience reason
* exactly one density/layout reason
* zero or one style-hint reason

### Phase 1 Template Classification

The approved Phase 1 template routing table is:

| templateId | supportedPageTypes | supportedFamilies | supportedThemes | densitySupport | emphasis | usagePriority | phase1Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cover-hero` | `cover` | `signal-tech`, `warm-story`, `brand-campaign`, `clean-method`, `proof-compare` | `news_flash`, `knowledge_explainer`, `comparison_analysis`, `case_story`, `method_guide`, `campaign_launch` | `low`, `medium` | `high` | `100` | `enabled` |
| `step-list` | `summary`, `detail`, `checklist` | `clean-method`, `signal-tech` | `knowledge_explainer`, `method_guide`, `news_flash` | `medium`, `high` | `medium` | `84` | `enabled` |
| `triple-cards` | `summary`, `detail`, `comparison` | `signal-tech`, `clean-method`, `brand-campaign`, `proof-compare` | `knowledge_explainer`, `comparison_analysis`, `campaign_launch`, `news_flash` | `low`, `medium` | `medium` | `78` | `enabled` |
| `story-split` | `summary`, `detail`, `comparison` | `warm-story`, `proof-compare`, `clean-method`, `signal-tech` | `case_story`, `comparison_analysis`, `knowledge_explainer`, `method_guide`, `news_flash` | `low`, `medium` | `medium` | `82` | `enabled` |
| `quote-cta` | `cta` | `signal-tech`, `clean-method`, `proof-compare`, `warm-story`, `brand-campaign` | `news_flash`, `knowledge_explainer`, `comparison_analysis`, `case_story`, `method_guide`, `campaign_launch` | `low`, `medium`, `high` | `high` | `100` | `enabled` |
| `team-delivery` | `summary`, `detail` | `signal-tech`, `clean-method` | `knowledge_explainer`, `method_guide`, `campaign_launch` | `medium` | `medium` | `80` | `enabled` |
| `feature-compare` | `comparison` | `proof-compare`, `signal-tech` | `comparison_analysis`, `knowledge_explainer` | `medium`, `high` | `high` | `95` | `excluded` |

`feature-compare` is explicitly excluded in Phase 1 because current `DeckSlide` does not contain left-side and right-side comparison fields required for stable slot filling.

`team-delivery` is approved for Phase 1 and must use this slot-filling contract:

* `eyebrow` = `0{slide.index}`
* `title` = `slide.title`
* `subtitle` = truncated `slide.body`
* `cardA`, `cardB`, `cardC` = `slide.highlights[0..2]` with fixed fallbacks
* `cardALine1..3`, `cardBLine1..3`, `cardCLine1..3` = sequential short body lines
* `lead` = truncated `slide.goal`
* `bullet1..3` = remaining short body lines with fixed fallbacks
* `footer` = truncated `deckPlan.cta` when present, otherwise truncated `slide.goal`

### Phase 1 Template Selection Algorithm

For each slide, the system must:

1. collect templates with `phase1Status = enabled` and matching `supportedPageTypes`
2. filter by `supportedFamilies`
3. filter by `supportedThemes`
4. filter by `densitySupport`
5. sort by `usagePriority` descending, then `templateId` ascending
6. choose the first remaining template

Fallback order must be:

1. drop family filter and emit warning `template_family_fallback`
2. drop theme filter and emit warning `template_theme_fallback`
3. drop density filter and emit warning `template_density_fallback`
4. if still empty, return `VISUAL_TEMPLATE_NOT_FOUND`

## User Experience Requirement

The final product direction must support these user-visible behaviors.

### Create Page

The user may still provide free-text `preferredStyle`.

The system must treat it as a preference hint, not as the only routing input.

### Workspace Page

The workspace should eventually show:

* detected theme category
* selected visual family
* density judgment
* route reasons
* template choices per slide

### Preview Page

The preview should eventually support:

* route label for the whole deck
* per-slide template label
* overflow warning
* later milestone: switch to another route or another template candidate

This makes the system feel controllable rather than magical.

## Routing Logic Requirement

The required routing sequence is:

```text
ParsedSource + ContentBrief + DeckPlan + preferredStyle
-> derive content signals
-> choose one deck-level visual family
-> choose per-slide candidate templates
-> apply density and overflow constraints
-> output resolved templateId + VisualSpec
-> render
```

Rules:

* routing must be deterministic under the same structured inputs and same template catalog version
* routing may use an LLM for classification, but final choice must still pass rules and constraints
* if classification confidence is low, system must fall back to rule-based family selection
* if no family-compatible template exists for a slide, system must fall back by `pageType` and emit a warning
* routing must prefer readable output over theme expressiveness

## Fine-Tuning Decision

Fine-tuning is allowed only after the system has a stable routing label space.

Fine-tuning is not a first-milestone requirement.

Fine-tuning, when used later, should target one of these narrower tasks:

* classify `themeCategory`
* rank `VisualFamily`
* rank template candidates for a slide
* generate structured visual parameters under fixed enums

Fine-tuning should not target:

* direct SVG generation
* unconstrained template invention
* pixel-level visual composition

Prerequisite for fine-tuning:

* enough approved jobs with stable labels
* logged user overrides
* logged review scores
* logged final selected route and template decisions

Before these prerequisites exist, prompt + rules + metadata is the correct path.

## Implementation Path

Implementation must happen in phases.

### Phase 1: Route Existing Templates Better

Scope:

* keep current workflow stages unchanged
* keep current render pipeline unchanged
* expand template metadata
* introduce deck-level `VisualFamily`
* route current templates by family, theme, and density
* produce richer `VisualSpec`

Required outcome:

* the same 7 templates behave like multiple visual families instead of a flat list
* `team-delivery` is routed in valid scenarios
* `feature-compare` is explicitly excluded by spec until deck structure supports side-specific comparison fields
* preview difference between major content themes becomes obvious

### Phase 2: Add Structured Classification

Scope:

* use LLM or stronger rules to derive `themeCategory`, `tone`, and `contentIntent`
* keep output in fixed enum space
* log route reasons and confidence

Required outcome:

* free-text `preferredStyle` is no longer the main decision source
* content structure contributes more to visual choice than user wording tricks

### Phase 3: Add User Override and Feedback Loop

Scope:

* allow route override
* allow per-slide template override
* persist override actions
* compare auto-selection and final selection

Required outcome:

* the system starts collecting supervised data for future optimization
* product learns which auto-routes are acceptable and which are frequently corrected

### Phase 4: Consider Fine-Tuning

Scope:

* fine-tune only a classifier or ranker
* keep templates and rendering deterministic

Required outcome:

* route precision improves without losing stability

## Acceptance Criteria

This direction is acceptable only if all conditions are true:

* different major content themes produce visibly different visual routes
* the system remains within approved template assets
* the same input produces stable routing decisions under the same catalog version
* every slide still resolves to a valid renderable template
* overflow rate does not increase as a side effect of more diverse routing
* route choice is explainable with structured reasons
* user override can be added later without redesigning the whole pipeline
* future fine-tuning can reuse logged routing labels instead of inventing a new label space

## Failure Conditions

This direction should be considered failed if one of these happens:

* visual routes become so numerous that they are not operationally maintainable
* theme difference exists in labels but not in actual preview output
* LLM classification introduces unstable routing across similar runs
* template metadata becomes inconsistent and causes hidden fallback behavior
* the system claims “auto theme adaptation” but most decks still resolve to the same 2 templates

## Explicit Recommendation

The recommended product direction is:

* first make theme-aware template routing a productized capability
* then make its decisions visible to the user
* then collect feedback
* only after that evaluate fine-tuning

The clear implementation priority is:

1. define controlled visual label space
2. enrich template metadata
3. build deck-level route selection
4. build slide-level constrained routing
5. expose reasons in workspace and preview
6. collect overrides and review outcomes
7. decide whether fine-tuning is worth the cost

This is the shortest path to a system that looks smarter, stays controllable, and has a real learning loop later.
