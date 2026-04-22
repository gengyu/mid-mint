import { Injectable } from '@nestjs/common';

import { ProjectStorageService } from '../storage/project-storage.service';
import { AnalyzeContentStep } from './steps/analyze-content.step';
import { GenerateAssetsStep } from './steps/generate-assets.step';
import { ParseDocumentStep } from './steps/parse-document.step';
import { PlanDeckStep } from './steps/plan-deck.step';
import { RenderPptxStep } from './steps/render-pptx.step';
import { WriteSlidesStep } from './steps/write-slides.step';
import { PipelineIteration, PipelineResult } from './pipeline.types';
import { LlmJsonService } from '../llm/llm-json.service';

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
    private readonly llmJsonService: LlmJsonService,
  ) {}

  async generateProjectPpt(
    projectId: string,
    options: { requestedSlides?: number; refinementRounds?: number },
  ): Promise<PipelineResult> {
    const refinementRounds = Math.max(1, Math.min(options.refinementRounds ?? 2, 3));
    const input = await this.projectStorageService.readInput(projectId);
    const parsedDocument = this.parseDocumentStep.run(input.content, input.sourceType);
    await this.projectStorageService.writeArtifact(projectId, 'parsed-document.json', parsedDocument);

    const analysis = await this.analyzeContentStep.run(parsedDocument);
    await this.projectStorageService.writeArtifact(projectId, 'content-analysis.json', analysis);

    const deckPlan = await this.planDeckStep.run(parsedDocument, analysis, options.requestedSlides);
    await this.projectStorageService.writeArtifact(projectId, 'deck-plan.json', deckPlan);

    let slideSpecs = this.writeSlidesStep.run(parsedDocument, analysis, deckPlan);
    const iterations: PipelineIteration[] = [];

    for (let round = 1; round <= refinementRounds; round += 1) {
      slideSpecs = await this.llmJsonService.polishSlides(
        slideSpecs,
        analysis,
        round,
        refinementRounds,
      );

      const objective = this.getIterationObjective(round, refinementRounds);
      iterations.push({
        round,
        objective,
        slideSpecs,
      });

      await this.projectStorageService.writeIterationArtifact(projectId, round, 'slide-specs.json', slideSpecs);
      await this.projectStorageService.writeIterationArtifact(projectId, round, 'objective.json', {
        round,
        objective,
      });
    }

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
      iterations,
    };
  }

  private getIterationObjective(round: number, totalRounds: number): string {
    if (totalRounds === 1) {
      return 'Create a clean first-pass deck.';
    }

    if (round === 1) {
      return 'Build a coherent presentation storyline.';
    }

    if (round === totalRounds) {
      return 'Polish the slides for delivery and emphasis.';
    }

    return 'Differentiate layouts and improve speaking flow.';
  }
}
