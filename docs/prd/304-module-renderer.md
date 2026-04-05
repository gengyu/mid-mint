# Module Spec: renderer

## Goal

Render `DeckPlan` plus `VisualSpec` into exportable assets.

## Input

* `DeckPlan`
* `VisualSpec`
* template definitions

## Output

* `RenderResult`

## Rules

* render one asset set per slide
* output PNG and SVG for every slide
* output one HTML preview URL per job version
* detect overflow at slide level
* do not silently drop content
* if overflow exists, mark asset `overflowDetected = true`
* rendered asset count must equal slide count

## Failure

Return typed error when:

* template definition missing
* render asset count mismatches slide count
* one or more required output files missing

## Error Codes

* `RENDER_INPUT_INVALID`
* `RENDER_TEMPLATE_MISSING`
* `RENDER_ASSET_COUNT_INVALID`
* `RENDER_PNG_MISSING`
* `RENDER_SVG_MISSING`
* `RENDER_HTML_PREVIEW_MISSING`

## Side Effects

* persist render result
* create stage log
* update job status to `RENDERED`

## Acceptance

* all slides have PNG and SVG
* html preview exists
* overflow is explicitly marked, not ignored
