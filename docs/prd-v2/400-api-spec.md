# mid-mint V2 API Spec

## Goal

Expose enough workflow metadata for v2 LLM-backed stages without changing the basic API shape.

## Compatibility Rule

All existing v1 endpoints remain valid in v2.

V2 may extend response bodies with additional metadata fields.

## Required Additions

The API should support exposing per-stage execution metadata for the active version or requested version.

Recommended response additions:

* `stageMeta`
* `stageMeta[].stageName`
* `stageMeta[].usedLlm`
* `stageMeta[].model`
* `stageMeta[].usedFallback`
* `stageMeta[].durationMs`
* `stageMeta[].errorCode`

## GET `/jobs/:jobId/versions/:version`

### V2 Rule

This response should include enough information for frontend inspection of:

* whether each stage used LLM
* whether fallback occurred
* which model generated the accepted output

## Errors

V2 endpoints must surface typed error codes for:

* rewrite eligibility failures
* LLM request failures
* LLM output parse failures
* LLM output schema validation failures
