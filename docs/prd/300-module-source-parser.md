# Module Spec: source-parser

## Goal

Convert `SourceInput` into `ParsedSource`.

## Input

* `SourceInput`

## Output

* `ParsedSource`

## Rules

* parse raw text first
* if URLs exist, URL fetch support may be implemented later
* current version must support `rawText` and `notes`
* title may be inferred
* summary must describe the source in one paragraph
* keyFacts must contain concrete facts
* keyPoints must contain extractive or normalized points
* quotes must contain direct phrases when available
* riskFlags must contain explicit risk hints

## Failure

Return typed error when:

* source input validation fails
* parsed output validation fails
* no usable content can be extracted

## Error Codes

* `SOURCE_INPUT_EMPTY`
* `SOURCE_PARSE_NO_USABLE_CONTENT`
* `PARSED_SOURCE_SUMMARY_EMPTY`
* `PARSED_SOURCE_KEY_FACTS_EMPTY`
* `PARSED_SOURCE_KEY_POINTS_EMPTY`

## Side Effects

* persist parsed result
* create stage log
* update job status to `PARSED`

## Acceptance

* valid source input returns valid `ParsedSource`
* invalid empty input returns typed error
* parsed result is persisted under current version
