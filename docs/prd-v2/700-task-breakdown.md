# mid-mint V2 Implementation Guide

## Goal

Implement LLM-backed workflow generation without breaking the v1 explicit stage architecture.

## Required Order

Implement in this order:

1. LLM provider contract and structured output support
2. LLM error model and stage log metadata
3. source-parser v2
4. brief-generator v2
5. deck-generator v2
6. visual-match v2 classification layer
7. reviewer v2
8. API metadata updates
9. frontend inspection updates
10. quality evaluation and prompt tuning

## Constraints

* do not add new workflow stages
* do not remove schema validation
* do not let the model write directly to storage
* do not let the model decide final render output format
* do not replace deterministic routing with free-form template choice
* do not remove fallback behavior until v2 quality is proven stable

## First Task Block

Implement:

* LLM structured JSON output helper
* retry and timeout support
* v2 typed LLM error codes
* stage metadata logging for model usage
* source-parser prompt and fallback
* brief-generator prompt and fallback

Acceptance:

* invalid model JSON cannot be persisted
* typed LLM errors are observable
* stage logs show model name and fallback usage
* source-parser and brief-generator produce valid stored outputs through the workflow

## Second Task Block

Implement:

* deck-generator prompt and fallback
* visual-match classification prompt
* reviewer prompt
* API metadata exposure
* frontend LLM execution visibility

Acceptance:

* deck, visual, and review stages still satisfy all v1 output contracts
* deterministic routing remains stable
* frontend can inspect whether a result came from LLM or fallback
