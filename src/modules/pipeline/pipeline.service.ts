import { Injectable } from '@nestjs/common';

import { LlmJsonService } from '../llm/llm-json.service';
import { ParserService } from '../parser/parser.service';
import { PptxRendererService } from '../renderer/pptx-renderer.service';
import { SlideSpecService } from '../slides/slide-spec.service';
import { SlideSpec } from '../slides/slide.types';
import { ProjectStorageService } from '../storage/project-storage.service';
import { SvgGeneratorService } from '../visuals/svg-generator.service';
import { VisualPlan } from '../visuals/visual.types';
import { PipelineResult } from './pipeline.types';

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
    options: { requestedSlides?: number },
  ): Promise<PipelineResult> {
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

    const visualPlan = this.svgGeneratorService.createVisualPlan(deckPlan, analysis);
    await this.projectStorageService.writeArtifact(projectId, 'visual-plan.json', visualPlan);

    const slideSpecs = this.slideSpecService.createSlides(
      parsedDocument,
      analysis,
      deckPlan,
      visualPlan,
    );
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
    };
  }

  private async attachAssets(
    projectId: string,
    slides: SlideSpec[],
    visualPlan: VisualPlan,
  ): Promise<SlideSpec[]> {
    const generatedAssets = this.svgGeneratorService.generate(slides, visualPlan);
    const assetPathBySlide = new Map<number, string>();

    for (const asset of generatedAssets) {
      const filePath = await this.projectStorageService.writeAsset(projectId, asset.fileName, asset.svg);
      assetPathBySlide.set(asset.slideNumber, filePath);
    }

    return slides.map((slide) => ({
      ...slide,
      assetPath: assetPathBySlide.get(slide.slideNumber),
    }));
  }
}
