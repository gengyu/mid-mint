import { Injectable } from '@nestjs/common';

import { ProjectStorageService } from '../storage/project-storage.service';
import { AnalyzeContentStep } from './steps/analyze-content.step';
import { GenerateAssetsStep } from './steps/generate-assets.step';
import { ParseDocumentStep } from './steps/parse-document.step';
import { PlanDeckStep } from './steps/plan-deck.step';
import { RenderPptxStep } from './steps/render-pptx.step';
import { WriteSlidesStep } from './steps/write-slides.step';
import { PipelineResult } from './pipeline.types';

@Injectable()
export class PipelineService {
  constructor(
    private readonly parseDocumentStep: ParseDocumentStep,
    private readonly analyzeContentStep: AnalyzeContentStep,
    private readonly planDeckStep: PlanDeckStep,
    private readonly writeSlidesStep: WriteSlidesStep,
    private readonly generateAssetsStep: GenerateAssetsStep,
    private readonly renderPptxStep: RenderPptxStep,
    private readonly projectStorageService: ProjectStorageService,
  ) {}

  async generateProjectPpt(
    projectId: string,
    options: { requestedSlides?: number },
  ): Promise<PipelineResult> {
    const input = await this.projectStorageService.readInput(projectId);
    const parsedDocument = this.parseDocumentStep.run(input.content, input.sourceType);
    await this.projectStorageService.writeArtifact(projectId, 'parsed-document.json', parsedDocument);

    const analysis = await this.analyzeContentStep.run(parsedDocument);
    await this.projectStorageService.writeArtifact(projectId, 'content-analysis.json', analysis);

    const deckPlan = await this.planDeckStep.run(parsedDocument, analysis, options.requestedSlides);
    await this.projectStorageService.writeArtifact(projectId, 'deck-plan.json', deckPlan);

    const slideSpecs = this.writeSlidesStep.run(parsedDocument, analysis, deckPlan);
    const slidesWithAssets = await this.generateAssetsStep.run(projectId, slideSpecs);
    await this.projectStorageService.writeArtifact(projectId, 'slide-specs.json', slidesWithAssets);

    const outputFile = await this.renderPptxStep.run(projectId, deckPlan.title, slidesWithAssets);
    await this.projectStorageService.updateGeneratedProject(projectId, outputFile);

    return {
      projectId,
      title: deckPlan.title,
      deckPlan,
      slideSpecs: slidesWithAssets,
      outputFile,
    };
  }
}
