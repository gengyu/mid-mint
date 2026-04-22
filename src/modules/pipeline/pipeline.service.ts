import { Injectable } from '@nestjs/common';

import { LlmJsonService } from '../llm/llm-json.service';
import { ParserService } from '../parser/parser.service';
import { PptxRendererService } from '../renderer/pptx-renderer.service';
import { SlideSpecService } from '../slides/slide-spec.service';
import { SlideSpec } from '../slides/slide.types';
import { ProjectStorageService } from '../storage/project-storage.service';
import { SvgGeneratorService } from '../visuals/svg-generator.service';
import { VisualPlan } from '../visuals/visual.types';
import { PipelineIteration, PipelineResult } from './pipeline.types';

@Injectable()
export class PipelineService {
  constructor(
    private readonly parserService: ParserService,
    private readonly llmJsonService: LlmJsonService,
    private readonly slideSpecService: SlideSpecService,
    private readonly svgGeneratorService: SvgGeneratorService,
    private readonly pptxRendererService: PptxRendererService,
    private readonly projectStorageService: ProjectStorageService,
  ) {}

  async generateProjectPpt(
    projectId: string,
    options: { requestedSlides?: number; refinementRounds?: number },
  ): Promise<PipelineResult> {
    const refinementRounds = Math.max(1, Math.min(options.refinementRounds ?? 2, 3));
    const input = await this.projectStorageService.readInput(projectId);
    const parsedDocument = await this.parserService.parse(input.content, input.sourceType);
    await this.projectStorageService.writeArtifact(projectId, 'parsed-document.json', parsedDocument);

    const analysis = await this.llmJsonService.analyzeDocument(parsedDocument);
    await this.projectStorageService.writeArtifact(projectId, 'content-analysis.json', analysis);

    const deckPlan = await this.llmJsonService.planDeck(
      parsedDocument,
      analysis,
      options.requestedSlides,
    );
    await this.projectStorageService.writeArtifact(projectId, 'deck-plan.json', deckPlan);

    const visualPlan = this.svgGeneratorService.createVisualPlan(deckPlan, analysis, parsedDocument);
    await this.projectStorageService.writeArtifact(projectId, 'visual-plan.json', visualPlan);

    let slideSpecs = this.slideSpecService.createSlides(
      parsedDocument,
      analysis,
      deckPlan,
      visualPlan,
    );
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

      await this.projectStorageService.writeIterationArtifact(
        projectId,
        round,
        'slide-specs.json',
        slideSpecs,
      );
      await this.projectStorageService.writeIterationArtifact(projectId, round, 'objective.json', {
        round,
        objective,
      });
    }

    const slidesWithAssets = await this.attachAssets(projectId, slideSpecs, visualPlan);
    await this.projectStorageService.writeArtifact(projectId, 'slide-specs.json', slidesWithAssets);

    const outputFile = this.projectStorageService.getOutputPptxPath(projectId, deckPlan.title);
    await this.pptxRendererService.render(outputFile, deckPlan.title, slidesWithAssets);
    await this.projectStorageService.updateGeneratedProject(projectId, outputFile);

    return {
      projectId,
      title: deckPlan.title,
      deckPlan,
      visualPlan,
      slideSpecs: slidesWithAssets,
      outputFile,
      iterations,
    };
  }

  private async attachAssets(
    projectId: string,
    slides: SlideSpec[],
    visualPlan: VisualPlan,
  ): Promise<SlideSpec[]> {
    const generatedAssets = await this.svgGeneratorService.generate(slides, visualPlan);
    const assetPathBySlide = new Map<number, string>();

    for (const asset of generatedAssets) {
      const filePath = await this.projectStorageService.writeAsset(
        projectId,
        asset.fileName,
        asset.svg,
      );
      assetPathBySlide.set(asset.slideNumber, filePath);
    }

    return slides.map((slide) => ({
      ...slide,
      assetPath: assetPathBySlide.get(slide.slideNumber),
    }));
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
