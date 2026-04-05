# mid-mint Frontend Spec

## Required Pages

The frontend must implement exactly these pages in v1:

* job creation page
* job workspace page
* preview page
* export panel

## Job Creation Page

### Required Fields

* URLs input
* raw text input
* notes input
* target audience input
* content goal input
* preferred style input

### Required Actions

* create job
* validate at least one source field is filled

## Job Workspace Page

### Required Sections

* job summary
* current status
* stage progress
* version list
* visual route summary
* stage output viewer
* review result panel
* rewrite action panel

### Required Behavior

* show current active version
* allow switching between versions
* show stage output JSON or formatted view
* show `themeCategory`, `visualFamily`, `tone`, `densityLevel`, and `layoutMode`
* show `routeReasons` and `warnings`
* show resolved `templateId` for every slide
* show review scores and issues
* allow rewrite requests when eligible

The workspace may satisfy these requirements with a compact formatted card plus raw JSON.

## Preview Page

### Required Sections

* deck route label
* slide list
* per-slide preview
* html preview link
* overflow indicator
* template info
* deck warnings

### Required Behavior

* show all slide PNG previews
* show selected `visualFamily` for the deck
* show `templateId` for each rendered slide
* show overflow warning per slide when present

## Phase 1 Frontend Scope Lock

Phase 1 frontend must:

* display visual route information as read-only data
* reuse existing job version payload for `visualSpec` and slide template labels

Phase 1 frontend must not:

* implement route override controls
* implement per-slide template override controls
* require a new workflow stage

## Export Panel

### Required Actions

* export PNG
* export SVG
* export HTML

### Required Behavior

* export only active version
* show export status
* show download link

## Frontend Acceptance

Frontend implementation is acceptable only if:

* all required pages exist
* user can inspect stage outputs
* user can inspect deck-level route information
* user can inspect per-slide template selection
* user can inspect review results
* user can trigger rewrite
* user can preview assets
* user can export assets
