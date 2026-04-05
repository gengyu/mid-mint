# Module Spec: brief-generator

## Goal

Generate `ContentBrief` from `ParsedSource` and user preferences.

## Input

* `ParsedSource`
* `targetAudience`
* `contentGoal`
* `preferredStyle`

## Output

* `ContentBrief`

## Rules

* must return exactly one `angle`
* `audience` must not be empty
* `narrative` must be exactly one paragraph
* `keyTakeaways` must contain 3 to 5 items
* `mustInclude` must include critical facts when present
* `avoid` must include styles or expressions to avoid when necessary
* brief must optimize for Xiaohongshu readability, not source fidelity alone

## Failure

Return typed error when:

* parsed source summary is empty
* parsed source has zero key facts
* generated brief fails validation

## Error Codes

* `BRIEF_INPUT_INVALID`
* `BRIEF_TOPIC_EMPTY`
* `BRIEF_AUDIENCE_EMPTY`
* `BRIEF_NARRATIVE_EMPTY`
* `BRIEF_KEY_TAKEAWAYS_INVALID`

## Side Effects

* persist brief result
* create stage log
* update job status to `BRIEFED`

## Acceptance

* valid parsed source returns valid `ContentBrief`
* output angle is one of allowed enum values
* output passes schema validation
