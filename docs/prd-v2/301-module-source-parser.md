# Module Spec V2: source-parser

## Goal

Use LLM extraction to convert mixed source material into a valid `ParsedSource`.

## Input

* `SourceInput`
* optional fetched URL support content

## Output

* `ParsedSource`

## LLM Responsibility

The LLM should:

* infer a concise title
* summarize the source in one paragraph
* extract concrete key facts
* normalize key points
* extract direct quotes when present
* identify factual or verification risks

## Deterministic Responsibility

The module must still:

* validate source input before prompt assembly
* deduplicate URLs
* limit extracted list sizes
* validate the final `ParsedSource`
* use fallback extraction if LLM fails and fallback is enabled

## Rules

* current version must support `rawText`, `notes`, and URLs
* `summary` must not be empty
* `keyFacts` must contain concrete facts, not vague commentary
* `keyPoints` must be normalized for downstream use
* `riskFlags` must be explicit and stable
* if publish time cannot be extracted, return `null`

## Failure

* source input validation fails
* LLM request fails and no valid fallback result exists
* model output parse fails
* model output schema validation fails
* no usable content can be extracted

## Error Codes

* `SOURCE_INPUT_EMPTY`
* `SOURCE_PARSE_NO_USABLE_CONTENT`
* `PARSED_SOURCE_SUMMARY_EMPTY`
* `PARSED_SOURCE_KEY_FACTS_EMPTY`
* `PARSED_SOURCE_KEY_POINTS_EMPTY`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`

## Acceptance

* noisy mixed input still returns valid `ParsedSource`
* URL context can influence summary and key facts
* invalid model output cannot be persisted
* fallback behavior is explicit in stage logs
