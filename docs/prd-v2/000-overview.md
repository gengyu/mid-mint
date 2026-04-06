# mid-mint V2 Overview

## Purpose

This spec set defines the v2 contract for `mid-mint`.

V2 keeps the v1 stage-based workflow and persistence model, but upgrades the core generation stages to use LLM-backed structured outputs.

This spec set is the source of truth for:

* LLM integration boundaries
* v2 workflow behavior
* changed module contracts
* changed API behavior
* implementation order for v2

## Scope

V2 must improve output quality by using LLMs in the main workflow stages.

V2 must not replace the explicit stage pipeline with one opaque agent call.

V2 must preserve:

* fixed stage order
* typed inputs and outputs
* schema validation
* persistence per stage
* stage logs
* versioning and rewrite support
* deterministic render and export

## V2 Change Summary

V2 changes these stages:

* `source-parser`
* `brief-generator`
* `deck-generator`
* `visual-match`
* `reviewer`

V2 does not change the responsibility of:

* `renderer`
* orchestrator stage order
* storage versioning model
* export formats

## Writing Rules

All v2 docs must follow these rules:

* use explicit requirements
* use typed input and output
* define which logic is LLM-driven and which logic is deterministic
* define fallback behavior
* define validation and failure rules
* avoid adding new stages unless explicitly specified
* avoid vague language such as "smart", "better", or "optimize" without acceptance criteria

## Compatibility Rule

Any contract not explicitly changed by `docs/prd-v2` inherits from `docs/prd`.
