# Module Spec V2: deck-generator

## Goal

Use LLM generation to produce a higher-quality `DeckPlan` while preserving fixed deck constraints.

## Input

* `ParsedSource`
* `ContentBrief`

## Output

* `DeckPlan`

## LLM Responsibility

The LLM should:

* generate 4 or 5 slides
* assign a clear goal per slide
* produce stronger cover hooks
* reduce repetition across middle slides
* keep body text concise
* align CTA with the content goal

## Deterministic Responsibility

The module must still:

* enforce slide count
* enforce first slide `cover`
* enforce last slide `cta`
* calculate `charCountTitle`
* calculate `charCountBody`
* ensure every slide has `templateId`
* validate final `DeckPlan`

## Rules

* `templateId` may be provisional before `visual-match`
* the generated deck must be suitable for template routing
* middle slides must not repeat the same point with shallow paraphrase
* cover title must be hook-oriented, not generic summary text

## Failure

* input parsed source invalid
* input brief invalid
* model output parse fails
* model output schema validation fails
* generated deck fails validation

## Error Codes

* `DECK_INPUT_INVALID`
* `DECK_SLIDE_COUNT_INVALID`
* `DECK_COVER_MISSING`
* `DECK_CTA_MISSING`
* `DECK_SLIDE_INDEX_INVALID`
* `DECK_SLIDE_TITLE_EMPTY`
* `DECK_SLIDE_BODY_EMPTY`
* `DECK_TEMPLATE_ID_EMPTY`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`

## Acceptance

* output still passes all v1 deck constraints
* cover quality is improved versus deterministic-only generation
* slide repetition is reduced
* every slide remains render-safe after downstream routing
