# Module Spec V2: reviewer

## Goal

Use LLM review to produce stronger content critique while preserving deterministic decision thresholds.

## Input

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `VisualSpec`
* `RenderResult`

## Output

* `ReviewResult`

## LLM Responsibility

The LLM should evaluate:

* cover hook strength
* slide repetition
* density overload
* visual mismatch
* factual risk
* generic phrasing
* `news搬运感`

The LLM should return structured review observations and suggested fixes.

## Deterministic Responsibility

The module must still:

* validate score range 0 to 100
* validate stage score range 0 to 100
* enforce decision threshold rules
* enforce `decision` and `rewriteStage` consistency
* validate final `ReviewResult`

## Thresholds

V2 keeps the same threshold contract as v1:

* `approve` when score >= 80 and `blockingIssues.length = 0`
* `rewrite` when score >= 50 and score < 80 and `blockingIssues.length = 0`
* `block` when score < 50 or `blockingIssues.length > 0`

## Failure

* one or more required stage artifacts are missing
* model output parse fails
* model output schema validation fails
* score output invalid
* decision and rewriteStage conflict

## Error Codes

* `REVIEW_INPUT_INVALID`
* `REVIEW_SCORE_INVALID`
* `REVIEW_DECISION_INVALID`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`

## Acceptance

* valid stage inputs return valid `ReviewResult`
* decision still follows deterministic threshold rules
* review quality is stronger than heuristic-only checks
* rewrite decisions always include rewrite stage
