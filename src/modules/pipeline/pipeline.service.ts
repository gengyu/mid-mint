import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { LlmJsonService } from '../llm/llm-json.service';
import { LlmService } from '../llm/llm.service';
import { ParserService } from '../parser/parser.service';
import { PptxRendererService } from '../renderer/pptx-renderer.service';
import { SlideSpecService } from '../slides/slide-spec.service';
import { SlideSpec } from '../slides/slide.types';
import { ProjectStorageService } from '../storage/project-storage.service';
import { SvgGeneratorService } from '../visuals/svg-generator.service';
import { VisualPlan } from '../visuals/visual.types';
import {
  GeneratePipelineOptions,
  PipelineEnhancementStage,
  PipelineIteration,
  PipelineResult,
} from './pipeline.types';

@Injectable()
export class PipelineService {
  constructor(
    private readonly parserService: ParserService,
    private readonly llmService: LlmService,
    private readonly llmJsonService: LlmJsonService,
    private readonly slideSpecService: SlideSpecService,
    private readonly svgGeneratorService: SvgGeneratorService,
    private readonly pptxRendererService: PptxRendererService,
    private readonly projectStorageService: ProjectStorageService,
  ) {}

  async generateProjectPpt(
    projectId: string,
    options: GeneratePipelineOptions,
  ): Promise<PipelineResult> {
    if (!this.llmService.isConfigured()) {
      throw new ServiceUnavailableException(
        'LLM is not configured. Set LLM_BASE_URL and LLM_MODEL before generating PPT.',
      );
    }

    const refinementRounds = Math.max(1, Math.min(options.refinementRounds ?? 2, 4)) as 1 | 2 | 3 | 4;
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
    const outputFiles: string[] = [];

    for (let round = 1; round <= refinementRounds; round += 1) {
      const stage = this.getIterationStage(round);
      const roundVisualPlan = this.limitVisualPlanToCompletedRounds(visualPlan, round);

      slideSpecs = await this.llmJsonService.polishSlides(
        slideSpecs,
        analysis,
        round,
        refinementRounds,
        stage,
      );

      const roundSlidesWithAssets = await this.attachAssets(
        projectId,
        slideSpecs,
        roundVisualPlan,
        round,
      );
      const objective = this.getIterationObjective(stage);
      const roundOutputFile = this.projectStorageService.getIterationOutputPptxPath(
        projectId,
        round,
        stage,
      );
      await this.pptxRendererService.render(roundOutputFile, deckPlan.title, roundSlidesWithAssets);

      iterations.push({
        round,
        stage,
        objective,
        visualPlan: roundVisualPlan,
        slideSpecs: roundSlidesWithAssets,
        outputFile: roundOutputFile,
      });
      outputFiles.push(roundOutputFile);

      await this.projectStorageService.writeIterationArtifact(
        projectId,
        round,
        'slide-specs.json',
        roundSlidesWithAssets,
      );
      await this.projectStorageService.writeIterationArtifact(projectId, round, 'objective.json', {
        round,
        stage,
        objective,
      });
      await this.projectStorageService.writeIterationArtifact(
        projectId,
        round,
        'visual-plan.json',
        roundVisualPlan,
      );
    }

    const slidesWithAssets = await this.attachAssets(
      projectId,
      slideSpecs,
      visualPlan,
      refinementRounds,
    );
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
      outputFiles,
      iterations,
    };
  }

  private async attachAssets(
    projectId: string,
    slides: SlideSpec[],
    visualPlan: VisualPlan,
    completedRounds: number,
  ): Promise<SlideSpec[]> {
    const generatedAssets = await this.svgGeneratorService.generate(
      slides,
      this.limitVisualPlanToCompletedRounds(visualPlan, completedRounds),
    );
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

  private limitVisualPlanToCompletedRounds(
    visualPlan: VisualPlan,
    completedRounds: number,
  ): VisualPlan {
    return {
      ...visualPlan,
      slides: visualPlan.slides.map((slide) => ({
        ...slide,
        requiresAsset:
          slide.requiresAsset && slide.recommendedEnhancementRound <= completedRounds,
        assetFile:
          slide.requiresAsset && slide.recommendedEnhancementRound <= completedRounds
            ? slide.assetFile
            : undefined,
      })),
    };
  }

  private getIterationStage(round: number): PipelineEnhancementStage {
    switch (round) {
      case 1:
        return 'structure';
      case 2:
        return 'foundation-visuals';
      case 3:
        return 'key-assets';
      case 4:
      default:
        return 'specialized-polish';
    }
  }

  private getIterationObjective(stage: PipelineEnhancementStage): string {
    switch (stage) {
      case 'structure':
        return 'Lock the storyline, slide roles, and speaking structure.';
      case 'foundation-visuals':
        return 'Strengthen hierarchy and low-cost visuals without reshaping the deck.';
      case 'key-assets':
        return 'Upgrade high-value slides with stronger hero visuals and assets.';
      case 'specialized-polish':
      default:
        return 'Polish specialized slides and unify the final delivery quality.';
    }
  }
}
