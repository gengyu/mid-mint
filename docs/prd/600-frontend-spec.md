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
* stage output viewer
* review result panel
* rewrite action panel

### Required Behavior

* show current active version
* allow switching between versions
* show stage output JSON or formatted view
* show review scores and issues
* allow rewrite requests when eligible

## Preview Page

### Required Sections

* slide list
* per-slide preview
* html preview link
* overflow indicator
* template info

### Required Behavior

* show all slide PNG previews
* show overflow warning per slide when present

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
* user can inspect review results
* user can trigger rewrite
* user can preview assets
* user can export assets
