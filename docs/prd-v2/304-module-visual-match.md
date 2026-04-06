# Module Spec V2: visual-match

## Goal

Use LLM classification to improve visual understanding while keeping deterministic template routing.

## Input

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `preferredStyle`
* template metadata

## Output

* updated `DeckPlan`
* `VisualSpec`

## LLM Responsibility

The LLM may classify:

* `themeCategory`
* `tone`
* `densityLevel`
* `contentIntent`
* `audienceMode`

The LLM may also produce short structured route reasoning candidates.

## Deterministic Responsibility

The module must still:

* choose exactly one deck-level `VisualFamily`
* resolve every slide `templateId`
* enforce template metadata compatibility
* apply deterministic tie-break rules
* apply fallback order when no compatible template exists
* validate the final `VisualSpec`

## Rules

* final route and template choice must remain deterministic under the same structured stage outputs and template catalog version
* model classification must not directly pick an excluded template
* route reasons must still use approved stable codes only
* warnings must still be generated deterministically

## Failure

* deck input invalid
* model classification output parse fails
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
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`

## Acceptance

* every slide still has resolved templateId
* final template routing remains deterministic
* visual classification quality is improved without sacrificing stability
* route reasons and warnings remain explicit and inspectable
