# Module Spec: visual-match

## Goal

Assign templates and visual rules to the generated deck.

## Input

* `DeckPlan`
* `preferredStyle`
* template metadata

## Output

* updated `DeckPlan`
* `VisualSpec`

## Rules

* each slide must have a resolved templateId
* template selection must consider `pageType`
* template selection must consider content density
* system must flag probable overflow
* system must flag overly dense layouts
* visual spec must include `styleName`, `layoutMode`, `tone`, `densityLevel`
* template matching may replace provisional templateId values

## Failure

Return typed error when:

* no template is available for a page type
* deck input invalid
* visual spec invalid

## Error Codes

* `VISUAL_INPUT_INVALID`
* `VISUAL_TEMPLATE_NOT_FOUND`
* `VISUAL_SPEC_INVALID`

## Side Effects

* persist visual result
* create stage log
* update job status to `VISUAL_MATCHED`

## Acceptance

* every slide has resolved templateId
* visual spec is valid
* warnings are emitted for dense or overflow-prone slides
