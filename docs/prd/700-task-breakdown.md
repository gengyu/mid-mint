# mid-mint Implementation Guide

## Suggested v1 File Structure

```text
src/
  modules/
    source/
      source-parser.ts
      source.types.ts
      source.schema.ts
      source.repository.ts
    brief/
      brief-generator.ts
      brief.types.ts
      brief.schema.ts
      brief.repository.ts
    deck/
      deck-generator.ts
      deck.types.ts
      deck.schema.ts
      deck.repository.ts
    visual/
      visual-match.ts
      visual.types.ts
      visual.schema.ts
      visual.repository.ts
    render/
      renderer.ts
      render.types.ts
      render.schema.ts
      render.repository.ts
    review/
      reviewer.ts
      review.types.ts
      review.schema.ts
      review.repository.ts
    workflow/
      orchestrator.ts
      workflow.types.ts
      workflow.service.ts
  api/
    jobs.controller.ts
    jobs.routes.ts
    dto/
  storage/
    db.ts
    migrations/
  shared/
    errors/
    logger/
    utils/
```

Rules:

* do not merge all modules into one file
* each module must own schema, types, service, repository
* orchestrator must live under `modules/workflow`

## v1 Implementation Order

Implement in this exact order:

1. domain types and schemas
2. storage tables and repositories
3. source-parser
4. brief-generator
5. deck-generator
6. visual-match
7. renderer
8. reviewer
9. orchestrator
10. API routes
11. frontend pages
12. export actions

Do not change implementation order unless blocked by dependency issues.

## Constraints For AI Coding Tools

When using this spec with an AI coding tool, enforce these constraints:

* do not add new stages
* do not rename existing types
* do not invent new enum values
* do not skip persistence
* do not skip validation
* do not skip typed errors
* do not skip versioning
* do not replace stage modules with a single monolithic service
* do not add extra abstraction layers unless explicitly requested
* do not implement features outside this spec in the same task

## First Task Block

Implement:

* all enums
* all core types
* all zod schemas
* validation functions
* typed error model
* storage table definitions for `jobs`
* storage table definitions for `job_versions`
* storage table definitions for `source_inputs`
* storage table definitions for `parsed_sources`
* storage table definitions for `content_briefs`
* storage table definitions for `deck_plans`
* storage table definitions for `visual_specs`
* storage table definitions for `render_results`
* storage table definitions for `review_results`
* storage table definitions for `stage_logs`
* storage table definitions for `rewrite_logs`

Constraints:

* do not implement URL fetching yet
* do not implement frontend yet
* do not implement controllers yet
* do not add new business fields
* do not add new statuses

Acceptance:

* types compile
* schemas validate sample payloads
* invalid payloads return typed error codes
* storage layer can save and read stage artifacts by `jobId` and `versionNumber`
