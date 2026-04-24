#!/usr/bin/env node

require('dotenv/config');

const fs = require('node:fs');
const path = require('node:path');
const { NestFactory } = require('@nestjs/core');

function ensureLlmConfigured() {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_MODEL) {
    throw new Error(
      'LLM is not configured. Set LLM_BASE_URL and LLM_MODEL before running smoke generation.',
    );
  }
}

function inferSourceType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
    case '.markdown':
      return 'markdown';
    case '.txt':
      return 'txt';
    case '.html':
    case '.htm':
      return 'html';
    default:
      throw new Error(
        `Unsupported input file extension "${ext || '(none)'}". Use .md, .markdown, .txt, .html, or .htm.`,
      );
  }
}

function createSingleRunFromFile(fileArg) {
  const absolutePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const sourceType = inferSourceType(absolutePath);
  const fileName = path.basename(absolutePath, path.extname(absolutePath));

  return [
    {
      title: fileName,
      content: fs.readFileSync(absolutePath, 'utf-8'),
      sourceType,
      inputFile: absolutePath,
    },
  ];
}

function createDefaultRuns() {
  return [
    {
      title: 'Smoke Sample Deck Markdown',
      content: fs.readFileSync(path.join(process.cwd(), 'examples/sample.md'), 'utf-8'),
      sourceType: 'markdown',
    },
    {
      title: 'Smoke Sample Deck Txt',
      content: [
        'AI Delivery Playbook',
        '',
        'Why this matters',
        '- Faster iteration reduces risk',
        '- Clear artifacts help teams align',
        '',
        'Execution model',
        '- Parse source content',
        '- Build a deck plan',
        '- Render presentation output',
        '',
        'Practical advice',
        'Keep the workflow observable and simple.',
      ].join('\n'),
      sourceType: 'txt',
    },
    {
      title: 'Smoke Mermaid Deck',
      content: [
        '# Release Workflow',
        '',
        '## Operating Flow',
        '```mermaid',
        'flowchart LR',
        '  Plan --> Build --> Review --> Ship',
        '```',
        '',
        '- Plan the milestone',
        '- Build the release candidate',
        '- Review risk and quality',
        '- Ship with rollback ready',
        '',
        '## Delivery Notes',
        '- Keep ownership explicit',
        '- Prefer short feedback loops',
      ].join('\n'),
      sourceType: 'markdown',
    },
    {
      title: 'Smoke Table Deck',
      content: [
        '# Platform Options',
        '',
        '## Vendor Comparison',
        '| Option | Strength | Risk |',
        '| --- | --- | --- |',
        '| Build | Flexibility | Longer setup |',
        '| Buy | Faster launch | Less control |',
        '',
        '## Recommendation',
        'Choose the path that keeps switching costs visible.',
      ].join('\n'),
      sourceType: 'markdown',
    },
    {
      title: 'Smoke Code Deck',
      content: [
        '# API Delivery',
        '',
        '## Example Endpoint',
        '```ts',
        'export async function createProject(input: CreateProjectDto) {',
        '  return projectsService.createProject(input);',
        '}',
        '```',
        '',
        '## Why It Matters',
        '- Keep handlers thin',
        '- Move logic into services',
      ].join('\n'),
      sourceType: 'markdown',
    },
    {
      title: 'Smoke Formula Deck',
      content: [
        '# Optimization Notes',
        '',
        '## Core Objective',
        '$$L = \\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2$$',
        '',
        '## Why It Matters',
        'A clear objective lets the audience remember the tradeoff.',
      ].join('\n'),
      sourceType: 'markdown',
    },
    {
      title: 'Smoke Divider Deck',
      content: [
        '# Platform Strategy',
        '',
        '## Context',
        '- Market shifted',
        '- Team focus is limited',
        '',
        '## Current Friction',
        '- Decisions are slow',
        '- Ownership is blurry',
        '',
        '## Operating Model',
        '- Align goals',
        '- Define owners',
        '- Review weekly',
        '',
        '## Delivery Flow',
        '- Intake',
        '- Prioritize',
        '- Build',
        '- Measure',
        '',
        '## Final Move',
        'Act with fewer bets and clearer feedback loops.',
      ].join('\n'),
      sourceType: 'markdown',
    },
  ];
}

async function main() {
  require('ts-node/register/transpile-only');
  require('tsconfig-paths/register');
  ensureLlmConfigured();

  const { AppModule } = require('../src/app.module');
  const { ProjectsService } = require('../src/modules/projects/projects.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const projectsService = app.get(ProjectsService);
    const fileArg = process.argv[2];
    const runs = fileArg ? createSingleRunFromFile(fileArg) : createDefaultRuns();

    const results = [];

    for (const run of runs) {
      const project = await projectsService.createProject(run);
      const result = await projectsService.generate(project.id, {
        refinementRounds: 4,
      });
      results.push({
        title: run.title,
        sourceType: run.sourceType,
        inputFile: run.inputFile,
        projectId: project.id,
        outputFile: result.outputFile,
        totalSlides: result.pptDsl.slides.length,
        themeName: result.pptDsl.design.intent,
        layoutCompositions: result.pptDsl.slides.map((slide) => slide.layout.composition),
        roles: result.pptDsl.slides.map((slide) => slide.role),
        elementKinds: result.pptDsl.slides.map((slide) => [
          slide.id,
          slide.elements.map((element) => element.kind),
        ]),
        outputFiles: result.outputFiles,
        iterations: result.iterations.map((iteration) => ({
          round: iteration.round,
          stage: iteration.stage,
          objective: iteration.objective,
          dslSlides: iteration.pptDsl.slides.length,
          outputFile: iteration.outputFile,
        })),
      });
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
