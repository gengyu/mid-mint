# mid-mint Storage Spec

## Required Tables

The system must use these logical tables or collections:

* `jobs`
* `job_versions`
* `source_inputs`
* `parsed_sources`
* `content_briefs`
* `deck_plans`
* `visual_specs`
* `render_results`
* `review_results`
* `stage_logs`
* `rewrite_logs`

No additional persistence model should be introduced in v1 unless necessary.

## jobs

Required fields:

* `id`
* `status`
* `rewrite_count`
* `active_version`
* `created_at`
* `updated_at`

## job_versions

Required fields:

* `id`
* `job_id`
* `version_number`
* `trigger`
* `rewrite_stage`
* `created_at`

## Stage Artifact Tables

Each artifact table must include:

* `id`
* `job_id`
* `version_number`
* `payload_json`
* `created_at`

Applies to:

* `source_inputs`
* `parsed_sources`
* `content_briefs`
* `deck_plans`
* `visual_specs`
* `render_results`
* `review_results`

## stage_logs

Required fields:

* `id`
* `job_id`
* `version_number`
* `stage_name`
* `started_at`
* `finished_at`
* `status`
* `error_code`
* `error_message`

## rewrite_logs

Required fields:

* `id`
* `job_id`
* `from_version`
* `to_version`
* `target_stage`
* `reason`
* `created_at`

## Error Model

### Error Shape

All typed errors must follow this shape:

```ts
type AppError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

### Required Error Codes

* `SOURCE_INPUT_EMPTY`
* `SOURCE_PARSE_NO_USABLE_CONTENT`
* `PARSED_SOURCE_SUMMARY_EMPTY`
* `PARSED_SOURCE_KEY_FACTS_EMPTY`
* `PARSED_SOURCE_KEY_POINTS_EMPTY`
* `BRIEF_INPUT_INVALID`
* `BRIEF_TOPIC_EMPTY`
* `BRIEF_AUDIENCE_EMPTY`
* `BRIEF_NARRATIVE_EMPTY`
* `BRIEF_KEY_TAKEAWAYS_INVALID`
* `DECK_INPUT_INVALID`
* `DECK_SLIDE_COUNT_INVALID`
* `DECK_COVER_MISSING`
* `DECK_CTA_MISSING`
* `DECK_SLIDE_INDEX_INVALID`
* `DECK_SLIDE_TITLE_EMPTY`
* `DECK_SLIDE_BODY_EMPTY`
* `DECK_TEMPLATE_ID_EMPTY`
* `VISUAL_INPUT_INVALID`
* `VISUAL_TEMPLATE_NOT_FOUND`
* `VISUAL_SPEC_INVALID`
* `RENDER_INPUT_INVALID`
* `RENDER_TEMPLATE_MISSING`
* `RENDER_ASSET_COUNT_INVALID`
* `RENDER_PNG_MISSING`
* `RENDER_SVG_MISSING`
* `RENDER_HTML_PREVIEW_MISSING`
* `REVIEW_INPUT_INVALID`
* `REVIEW_SCORE_INVALID`
* `REVIEW_DECISION_INVALID`
* `REWRITE_STAGE_INVALID`
* `REWRITE_LIMIT_REACHED`
* `REWRITE_JOB_STATE_INVALID`
