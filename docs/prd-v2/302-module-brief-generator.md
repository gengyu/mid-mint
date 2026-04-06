# Module Spec V2: brief-generator

## Goal

Use LLM planning to produce a stronger Xiaohongshu-oriented `ContentBrief`.

## Input

* `ParsedSource`
* `targetAudience`
* `contentGoal`
* `preferredStyle`

## Output

* `ContentBrief`

## LLM Responsibility

The LLM should:

* choose exactly one `angle`
* rewrite the narrative for the target audience
* produce stronger and more specific takeaways
* identify must-include facts
* identify styles or phrases to avoid

## Deterministic Responsibility

The module must still:

* validate the upstream parsed source
* validate the final `ContentBrief`
* reject invalid enum values
* reject invalid takeaway counts

## Rules

* `narrative` must remain exactly one paragraph
* `keyTakeaways` must contain 3 to 5 items
* `mustInclude` must preserve critical facts from upstream
* `avoid` must be concrete enough to influence downstream generation
* output must optimize for Xiaohongshu readability and distinctiveness

## Failure

* parsed source is invalid
* model output parse fails
* model output schema validation fails
* generated brief fails business validation

## Error Codes

* `BRIEF_INPUT_INVALID`
* `BRIEF_TOPIC_EMPTY`
* `BRIEF_AUDIENCE_EMPTY`
* `BRIEF_NARRATIVE_EMPTY`
* `BRIEF_KEY_TAKEAWAYS_INVALID`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`

## Acceptance

* output angle is one allowed enum value
* output is materially stronger than direct source summary
* output passes schema validation and business validation
