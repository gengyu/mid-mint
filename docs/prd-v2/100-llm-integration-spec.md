# mid-mint V2 LLM Integration Spec

## Goal

Use LLM capability in the main workflow without breaking the explicit stage architecture.

## Core Rule

Each LLM-backed stage must follow this pattern:

```text
typed stage input
-> prompt assembly
-> LLM call
-> structured JSON output
-> schema validation
-> deterministic repair or fallback when allowed
-> persistence
```

## Required Boundaries

The LLM may:

* extract structure from noisy source material
* infer audience-aware framing
* generate deck copy
* classify visual signals
* evaluate content quality

The LLM must not:

* bypass schema validation
* write directly to storage
* decide workflow stage order
* mutate older versions
* render final SVG or PNG directly in v2

## Required LLM Capabilities

The system must support:

* structured JSON output per stage
* per-stage timeout
* per-stage retry policy
* fallback policy per stage
* model name logging per stage
* typed error mapping when model output is invalid

## Required Error Codes

V2 adds these required error codes:

* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_EMPTY`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
* `LLM_FALLBACK_EXHAUSTED`

## Stage Logging Requirements

Each LLM-backed stage log must record:

* stage name
* model name
* whether LLM was attempted
* whether retry occurred
* whether fallback was used
* typed error code when failed
* run time

## Fallback Rules

Fallback behavior must be explicit per stage.

Allowed fallback types:

* deterministic local heuristic fallback
* deterministic repair of minor formatting issues
* fail-fast with typed error

Disallowed fallback types:

* silently accepting invalid model output
* returning partial stage output without validation
* changing output type shape to "make it work"
