# PRD: Theme-Adaptive Visual System

## Status

* proposed
* this document refines the existing `visual-match` stage only
* this document does not add a new workflow stage
* this document should not replace current v1 specs until approved

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

Suggested controlled values for the first milestone:

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

Suggested controlled values:

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
};
```

Requirements:

* every template must declare compatible `pageType`
* every template must declare compatible `VisualFamily`
* every template must declare supported density range
* every template must declare routing priority for tie-break
* templates already in assets but not used by main routing must be classified and either enabled or explicitly deprecated

This is required to make existing assets first-class routing options.

## Visual Output Contract

The current `VisualSpec` is too small to support explainable theme routing.

Target output shape:

```ts
type VisualSpecV2 = {
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
  routeReasons: string[];
  warnings: string[];
};
```

Requirements:

* `VisualSpec` must describe deck-level visual strategy, not only style labels
* output must include machine-readable reasons for route selection
* reasons must be short and stable enough for frontend display and analytics
* warnings must continue to capture density and overflow risk

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
* `feature-compare` and `team-delivery` are either routed in valid scenarios or explicitly excluded by spec
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
