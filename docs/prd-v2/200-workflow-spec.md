# mid-mint V2 Workflow Spec

## Stage List

V2 must keep exactly the same workflow stages as v1:

1. `INPUT_RECEIVED`
2. `PARSED`
3. `BRIEFED`
4. `DECK_GENERATED`
5. `VISUAL_MATCHED`
6. `RENDERED`
7. `REVIEWED`
8. `APPROVED`
9. `REWRITE_PENDING`
10. `FAILED`

V2 must not add a new stage for LLM calls.

## V2 Workflow Rule

The orchestrator must continue to coordinate stages only.

The orchestrator must not contain prompt logic or content generation logic.

## Per-Stage Execution Model

For LLM-backed stages, the workflow must execute:

```text
1. validate typed input
2. assemble prompt payload
3. call LLM
4. parse structured result
5. validate structured result
6. if allowed, repair or fallback
7. persist final valid output
8. update job status
9. create stage log
```

## Rewrite Rule

Rewrite behavior stays the same as v1.

When a rewritten stage is LLM-backed:

* the new version must store the new validated stage output only
* upstream validated outputs must remain unchanged
* downstream stages must rerun using the new version artifacts

## Stop Rules

V2 keeps all v1 stop rules and adds:

* stop when LLM output remains invalid after allowed retry and fallback
* stop when required LLM-backed stage cannot produce a valid typed output

## Acceptance Criteria

V2 workflow is acceptable only if:

* LLM-backed stages still produce typed stored artifacts
* invalid LLM outputs never bypass schema validation
* stage logs capture model usage and fallback behavior
* rewrite behavior remains version-safe
* renderer and export continue to work with v2 artifacts
