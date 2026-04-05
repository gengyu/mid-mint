# Module Spec: visual-match

## Goal

Assign templates and visual rules to the generated deck.

## Input

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `preferredStyle`
* template metadata

## Output

* updated `DeckPlan`
* `VisualSpec`

## Rules

* system must derive `themeCategory`, `tone`, `densityLevel`, `contentIntent`, and `audienceMode` in fixed enum space
* system must choose exactly one deck-level `VisualFamily` before selecting slide templates
* each slide must have a resolved templateId
* template selection must consider `pageType`
* template selection must consider `themeCategory`
* template selection must consider `VisualFamily`
* template selection must consider content density
* template selection must use template metadata and deterministic tie-break rules
* system must flag probable overflow
* system must flag overly dense layouts
* visual spec must include `routeId`, `themeCategory`, `visualFamily`, `tone`, `densityLevel`, `layoutMode`, `paletteKey`, `typographyMode`, `decorationLevel`, `imageStrategy`, `routeReasons`, and `warnings`
* route reasons must use approved stable codes only
* template matching may replace provisional templateId values
* routing must be deterministic under the same structured inputs and template catalog version
* Phase 1 implementation must work without LLM classification
* later phases may use LLM classification, but final route and template choice must still pass deterministic rules
* when no family-compatible template exists, system must fall back in this order: drop family, then theme, then density
* excluded templates must never be selected

## Phase 1 Contract

Phase 1 must implement these concrete behaviors:

* derive base route from `ContentBrief.angle`
* treat `preferredStyle` as a hint only
* emit `routeId` using `vf-{visualFamily}-{themeCategory}-{densityLevel}`
* route `team-delivery` in valid `summary` and `detail` cases
* explicitly exclude `feature-compare` until deck generator exposes stable left-side and right-side comparison fields
* keep workspace and preview display read-only

## Failure

Return typed error when:

* no template is available for a page type
* deck input invalid
* derived signals invalid
* template metadata invalid
* route cannot be resolved
* visual spec invalid

## Error Codes

* `VISUAL_INPUT_INVALID`
* `VISUAL_TEMPLATE_NOT_FOUND`
* `VISUAL_SIGNAL_INVALID`
* `VISUAL_TEMPLATE_META_INVALID`
* `VISUAL_ROUTE_UNRESOLVED`
* `VISUAL_SPEC_INVALID`

## Side Effects

* persist visual result
* create stage log
* update job status to `VISUAL_MATCHED`

## Acceptance

* every slide has resolved templateId
* visual spec is valid
* one deck-level `VisualFamily` is selected
* route reasons are emitted using approved codes
* `team-delivery` can be selected in Phase 1 valid scenarios
* `feature-compare` is not selected in Phase 1
* warnings are emitted for dense or overflow-prone slides
* same structured input and same template catalog version produce the same output
