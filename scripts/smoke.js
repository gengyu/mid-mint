#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { NestFactory } = require('@nestjs/core');

async function main() {
  const { AppModule } = require('../dist/app.module');
  const { ProjectsService } = require('../dist/modules/projects/projects.service');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const projectsService = app.get(ProjectsService);
    const runs = [
      {
        title: 'Smoke Sample Deck Markdown',
        content: fs.readFileSync(path.join(process.cwd(), 'examples/sample.md'), 'utf-8'),
        sourceType: 'markdown',
        requestedSlides: 6,
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
        requestedSlides: 6,
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
        requestedSlides: 5,
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
        requestedSlides: 5,
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
        requestedSlides: 5,
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
        requestedSlides: 5,
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
        requestedSlides: 7,
      },
    ];

    const results = [];

    for (const run of runs) {
      const project = await projectsService.createProject(run);
      const result = await projectsService.generate(project.id, {
        requestedSlides: run.requestedSlides ?? 6,
        refinementRounds: 2,
      });
      results.push({
        sourceType: run.sourceType,
        projectId: project.id,
        outputFile: result.outputFile,
        totalSlides: result.slideSpecs.length,
        layouts: result.slideSpecs.map((slide) => slide.layout),
        iterations: result.iterations.map((iteration) => iteration.objective),
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
