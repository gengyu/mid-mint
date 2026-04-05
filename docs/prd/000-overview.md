# mid-mint Overview

## Assessment

`mid-mint PRD V1.md` is strong on implementation rigor but weak on document boundaries.

What works:

* the workflow is explicit instead of agent-black-box
* every stage has typed input, output, validation, persistence, and errors
* rewrite, versioning, and review rules are concrete enough to implement

What needed to change:

* product scope, architecture, API, storage, frontend, and AI task instructions were mixed in one file
* the file was too large to maintain safely as a single source
* implementation sequencing and module contracts were hard to reference independently

This split keeps the original v1 contract but separates it by concern.

## Purpose

These files define the implementation contract for `mid-mint`.

Use this spec set as the source of truth for:

* backend implementation
* frontend implementation
* workflow orchestration
* schema design
* API design
* storage design
* task breakdown

## Writing Rules

All future docs derived from this set must follow these rules:

* use explicit requirements
* use typed input and output
* use fixed enum values
* use concrete failure rules
* use concrete acceptance criteria
* avoid product storytelling
* avoid motivational explanation
* avoid introducing modules not already defined in this spec set unless the spec set is updated first

## Project Definition

### Goal

Build a stage-based content generation system that converts user-provided source material into a 4-5 page Xiaohongshu image-post deck.

### Required Outcome

```text
source input
-> source parse
-> brief generate
-> deck generate
-> visual match
-> render
-> review
-> approve or rewrite
```

The system must produce:

* structured intermediate outputs at every stage
* renderable 4-5 page deck assets
* review scores and issue lists
* versioned artifacts
* partial rewrite support

### Primary Constraint

The system must not behave as one opaque agent call.

The system must implement explicit stages. Each stage must:

* accept typed input
* return typed output
* persist result
* update job status
* emit stage log

## System Scope

### Supported Input Types

The system must accept:

* one URL
* multiple URLs
* long text
* bullet notes
* mixed input: topic + URLs + notes
* target audience
* content goal
* preferred style

### Supported Output Types

The system must produce:

* structured parsed source
* structured content brief
* 4-5 page deck plan
* template mapping
* rendered assets
* review result
* exportable PNG assets
* exportable SVG assets
* exportable HTML preview bundle

### Supported User Actions

The system must allow the user to:

* create a job
* submit source material
* start generation
* inspect stage outputs
* inspect review results
* request partial rewrite
* compare versions
* export final assets
