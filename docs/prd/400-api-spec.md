# mid-mint API Spec

## POST `/jobs`

### Goal

Create a new job.

### Request

```json
{
  "urls": [],
  "rawText": "",
  "notes": "",
  "targetAudience": "",
  "contentGoal": "",
  "preferredStyle": ""
}
```

### Response

```json
{
  "jobId": "string",
  "status": "INPUT_RECEIVED",
  "activeVersion": 1
}
```

### Errors

* `SOURCE_INPUT_EMPTY`

## POST `/jobs/:jobId/run`

### Goal

Start workflow for an existing job.

### Request

No body required.

### Response

```json
{
  "jobId": "string",
  "status": "PARSED | BRIEFED | DECK_GENERATED | VISUAL_MATCHED | RENDERED | REVIEWED | APPROVED | FAILED | REWRITE_PENDING"
}
```

### Rules

* this endpoint starts or resumes workflow
* if job already approved, return current state without rerun

## GET `/jobs/:jobId`

### Goal

Fetch job summary.

### Response

```json
{
  "jobId": "string",
  "status": "string",
  "rewriteCount": 0,
  "activeVersion": 1,
  "createdAt": "string",
  "updatedAt": "string"
}
```

## GET `/jobs/:jobId/versions/:version`

### Goal

Fetch all stage outputs for one version.

### Response

```json
{
  "job": {},
  "sourceInput": {},
  "parsedSource": {},
  "contentBrief": {},
  "deckPlan": {},
  "visualSpec": {},
  "renderResult": {},
  "reviewResult": {}
}
```

## POST `/jobs/:jobId/rewrite`

### Goal

Request partial rewrite.

### Request

```json
{
  "targetStage": "brief",
  "reason": "cover hook too weak"
}
```

### Rules

* `targetStage` must be one of allowed rewrite stages
* must fail if job is not in `REVIEWED`, `REWRITE_PENDING`, or `FAILED`
* must fail if rewrite count >= 3

### Response

```json
{
  "jobId": "string",
  "status": "REWRITE_PENDING",
  "nextVersion": 2,
  "targetStage": "brief"
}
```

### Errors

* `REWRITE_STAGE_INVALID`
* `REWRITE_LIMIT_REACHED`
* `REWRITE_JOB_STATE_INVALID`

## GET `/jobs/:jobId/preview`

### Goal

Fetch active preview result.

### Response

```json
{
  "jobId": "string",
  "activeVersion": 1,
  "htmlPreviewUrl": "string",
  "pngUrls": ["string"],
  "svgUrls": ["string"]
}
```

## POST `/jobs/:jobId/export`

### Goal

Export active version.

### Request

```json
{
  "format": "png"
}
```

### Rules

Allowed export formats:

* `png`
* `svg`
* `html`

### Response

```json
{
  "jobId": "string",
  "activeVersion": 1,
  "format": "png",
  "downloadUrl": "string"
}
```
