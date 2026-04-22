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
    ];

    const results = [];

    for (const run of runs) {
      const project = await projectsService.createProject(run);
      const result = await projectsService.generate(project.id, {
        requestedSlides: 6,
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
