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
  "job": {
    "jobId": "string",
    "status": "string",
    "rewriteCount": 0,
    "activeVersion": 1,
    "createdAt": "string",
    "updatedAt": "string"
  },
  "sourceInput": {
    "urls": [],
    "rawText": "",
    "notes": "",
    "targetAudience": "",
    "contentGoal": "",
    "preferredStyle": ""
  },
  "parsedSource": {},
  "contentBrief": {
    "topic": "string",
    "angle": "quick_view",
    "audience": "string",
    "narrative": "string",
    "keyTakeaways": ["string"],
    "mustInclude": [],
    "avoid": []
  },
  "deckPlan": {
    "summary": "string",
    "slides": [
      {
        "index": 1,
        "pageType": "cover",
        "goal": "string",
        "title": "string",
        "body": "string",
        "highlights": ["string"],
        "templateId": "cover-hero",
        "values": {},
        "charCountTitle": 0,
        "charCountBody": 0
      }
    ],
    "cta": "string"
  },
  "visualSpec": {
    "routeId": "vf-signal-tech-news_flash-medium",
    "themeCategory": "news_flash",
    "visualFamily": "signal-tech",
    "tone": "sharp",
    "densityLevel": "medium",
    "layoutMode": "balanced",
    "paletteKey": "tech-emerald",
    "typographyMode": "display-sharp",
    "decorationLevel": "medium",
    "imageStrategy": "abstract",
    "routeReasons": [
      "angle_selected_base_route",
      "audience_mode_professional",
      "density_medium_layout_balanced"
    ],
    "warnings": []
  },
  "renderResult": {},
  "reviewResult": {}
}
```

### Rules

* `visualSpec` in this response must follow the domain model exactly
* `deckPlan.slides[].templateId` is the source of truth for workspace and preview template labels
* frontend may combine this response with `GET /jobs/:jobId/preview` to render route summary and assets

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
