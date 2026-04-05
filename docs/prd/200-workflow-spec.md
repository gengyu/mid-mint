# mid-mint Workflow Spec

## Stage List

The workflow must contain exactly these stages:

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

No additional stage may be introduced in v1 without updating this spec.

## Stage Order

```text
INPUT_RECEIVED
-> PARSED
-> BRIEFED
-> DECK_GENERATED
-> VISUAL_MATCHED
-> RENDERED
-> REVIEWED
-> APPROVED
```

If review fails and rewrite is allowed:

```text
REVIEWED
-> REWRITE_PENDING
-> rerun target stage
-> rerun all downstream stages
-> REVIEWED
```

## Rewrite Rules

The system must support rewrite at these target stages only:

* `source-parse`
* `brief`
* `deck`
* `visual`

Rewrite behavior:

* rewrite always targets exactly one stage
* rewriting one stage must rerun that stage and all downstream stages
* upstream stages must remain unchanged
* each rewrite must create a new version set
* maximum rewrite rounds per job: `3`

## Stop Rules

Generation must stop when one of these is true:

* review score reaches approval threshold
* rewrite count reaches 3
* blocking risk is detected
* two consecutive review rounds improve by less than 3 points
* required stage output is invalid

## Orchestrator

### Goal

Run stages in fixed order and manage rewrite loops.

### Responsibilities

The orchestrator must:

* create initial version
* call each stage in order
* validate each stage output
* persist each stage output
* update job status after each stage
* stop on failure
* read review result
* decide whether to stop or rewrite
* enforce rewrite limit

### Workflow Logic

```text
1. validate SourceInput
2. run source-parser
3. run brief-generator
4. run deck-generator
5. run visual-match
6. run renderer
7. run reviewer
8. if decision = approve -> end
9. if decision = block -> end
10. if decision = rewrite and rewriteCount < 3 -> create new version and rerun target stage + downstream
11. else -> end
```

### Constraints

* orchestrator must not perform content generation logic itself
* orchestrator only coordinates modules
* orchestrator must not mutate persisted outputs from older versions
* orchestrator must record run time per stage
* orchestrator must record errors per stage

## Acceptance Criteria

### Workflow Acceptance

The implementation is acceptable only if all conditions are true:

* a user can create a job with valid source input
* the system can run the full stage pipeline
* the system persists every stage output
* the system can return current job status
* the system can fetch any stored version
* the system can request partial rewrite
* the system reruns only target stage plus downstream
* the system blocks rewrite after 3 rounds
* the system can export active version assets

### Stage Acceptance

Each stage is acceptable only if:

* input validation exists
* output validation exists
* typed error codes exist
* persistence exists
* stage log exists
* status update exists

### Review Acceptance

Review implementation is acceptable only if:

* score is 0 to 100
* decision is one of allowed values
* approve and rewrite rules follow threshold contract
* block decision is returned when blocking issue exists
