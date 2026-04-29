import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AssetService } from '../assets/asset.service';
import { LlmJsonService } from '../llm/llm-json.service';
import { LlmService } from '../llm/llm.service';
import { ParserService } from '../parser/parser.service';
import { PptxRendererService } from '../renderer/pptx-renderer.service';
import { ProjectStorageService } from '../storage/project-storage.service';
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
    private readonly assetService: AssetService,
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

    let pptDsl = await this.llmJsonService.generatePptDsl(parsedDocument, analysis);

    const iterations: PipelineIteration[] = [];
    const outputFiles: string[] = [];

    for (let round = 1; round <= refinementRounds; round += 1) {
      const stage = this.getIterationStage(round);
      const objective = this.getIterationObjective(stage);

      pptDsl = await this.llmJsonService.refinePptDsl({
        dsl: pptDsl,
        analysis,
        round,
        totalRounds: refinementRounds,
        stage,
        objective,
      });

      const assetResults = await this.assetService.generateAssets(pptDsl);
      for (const assetResult of assetResults) {
        await this.projectStorageService.writeAsset(
          projectId,
          assetResult.fileName,
          assetResult.svg,
        );
      }
      pptDsl = this.assetService.applyAssetsToDsl(pptDsl, assetResults);

      const roundOutputFile = this.projectStorageService.getIterationOutputPptxPath(
        projectId,
        round,
        stage,
      );
      await this.pptxRendererService.renderFromDsl(roundOutputFile, pptDsl);

      iterations.push({
        round,
        stage,
        objective,
        pptDsl,
        changes: [],
        outputFile: roundOutputFile,
      });
      outputFiles.push(roundOutputFile);

      await this.projectStorageService.writeIterationArtifact(
        projectId,
        round,
        'ppt-dsl.json',
        pptDsl,
      );
      await this.projectStorageService.writeIterationArtifact(projectId, round, 'objective.json', {
        round,
        stage,
        objective,
        changes: [],
      });
    }

    await this.projectStorageService.writeArtifact(projectId, 'ppt-dsl.json', pptDsl);

    const outputFile = this.projectStorageService.getOutputPptxPath(projectId, pptDsl.deck.title);
    await this.pptxRendererService.renderFromDsl(outputFile, pptDsl);
    await this.projectStorageService.updateGeneratedProject(projectId, outputFile);

    return {
      projectId,
      title: pptDsl.deck.title,
      pptDsl,
      outputFile,
      outputFiles,
      iterations,
    };
  }

  private getIterationStage(round: number): PipelineEnhancementStage {
    switch (round) {
      case 1:
        return 'structure-dsl';
      case 2:
        return 'design-system-dsl';
      case 3:
        return 'asset-dsl';
      case 4:
      default:
        return 'polish-dsl';
    }
  }

  private getIterationObjective(stage: PipelineEnhancementStage): string {
    switch (stage) {
      case 'structure-dsl':
        return 'Lock the storyline, slide roles, and speaking structure.';
      case 'design-system-dsl':
        return 'Strengthen design tokens, typography, and visual hierarchy.';
      case 'asset-dsl':
        return 'Add SVG, Mermaid, and Formula assets for high-value slides.';
      case 'polish-dsl':
      default:
        return 'Polish density, consistency, and final delivery quality.';
    }
  }
}
