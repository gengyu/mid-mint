# Module Spec: deck-generator

## Goal

Generate a 4-5 slide `DeckPlan` from `ParsedSource` and `ContentBrief`.

## Input

* `ParsedSource`
* `ContentBrief`

## Output

* `DeckPlan`

## Rules

* slide count must be 4 or 5
* first slide must be `cover`
* last slide must be `cta`
* each slide must have a clear page goal
* cover slide must contain a hook-like title
* middle slides must not duplicate the same point
* body text should be concise
* slide templateId may be provisional before visual match
* `charCountTitle` and `charCountBody` must be calculated
* `cta` must be aligned with content goal

## Failure

Return typed error when:

* input parsed source invalid
* input brief invalid
* generated deck fails validation

## Error Codes

* `DECK_INPUT_INVALID`
* `DECK_SLIDE_COUNT_INVALID`
* `DECK_COVER_MISSING`
* `DECK_CTA_MISSING`
* `DECK_SLIDE_TITLE_EMPTY`
* `DECK_SLIDE_BODY_EMPTY`
* `DECK_TEMPLATE_ID_EMPTY`

## Side Effects

* persist deck result
* create stage log
* update job status to `DECK_GENERATED`

## Acceptance

* output slide count is 4 or 5
* output contains one cover and one cta
* every slide has title, body, templateId
* output passes schema validation
