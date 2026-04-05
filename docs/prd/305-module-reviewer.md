# Module Spec: reviewer

## Goal

Evaluate renderable output and decide whether to approve, rewrite, or block.

## Input

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `VisualSpec`
* `RenderResult`

## Output

* `ReviewResult`

## Rules

* return total score between 0 and 100
* return all stage scores between 0 and 100
* return one `decision`
* if decision is `rewrite`, `rewriteStage` must not be null
* if decision is `approve`, `rewriteStage` must be null
* if blocking issue exists, decision must be `block`
* review must detect weak cover hook
* review must detect slide repetition
* review must detect density overload
* review must detect visual mismatch
* review must detect factual risk
* review must detect overly generic phrasing
* review must detect `news搬运感`

## Thresholds

* `approve` when score >= 80 and `blockingIssues.length = 0`
* `rewrite` when score >= 50 and score < 80 and `blockingIssues.length = 0`
* `block` when score < 50 or `blockingIssues.length > 0`

## Failure

Return typed error when:

* one or more required stage artifacts are missing
* score output invalid
* decision and rewriteStage conflict

## Error Codes

* `REVIEW_INPUT_INVALID`
* `REVIEW_SCORE_INVALID`
* `REVIEW_DECISION_INVALID`

## Side Effects

* persist review result
* create stage log
* update job status to `REVIEWED`
* if decision is approve, update job status to `APPROVED`
* if decision is rewrite, update job status to `REWRITE_PENDING`
* if decision is block, update job status to `FAILED`

## Acceptance

* valid stage inputs return valid review result
* decision follows threshold rules
* rewrite decisions always include rewrite stage
