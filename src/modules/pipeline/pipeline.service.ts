import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { AssetService } from '../assets/asset.service';
import { LlmJsonService } from '../llm/llm-json.service';
import { LlmService } from '../llm/llm.service';
import { PptxRendererService } from '../renderer/pptx-renderer.service';
import { ProjectStorageService } from '../storage/project-storage.service';
import { DocumentParserTool } from '../tools/document-parser/document-parser.tool';
import { ParsedDocument } from '../tools/document-parser/types/parsed-document.type';
import { PptDslDocument } from '../ppt-dsl/ppt-dsl.types';
import {
  GeneratePipelineOptions,
  PipelineEnhancementStage,
  PipelineIteration,
  PipelineResult,
  PresentationAnalysis,
} from './pipeline.types';

type ProjectInput = Awaited<ReturnType<ProjectStorageService['readInput']>>;

const PipelineStateAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  options: Annotation<GeneratePipelineOptions>(),
  refinementRounds: Annotation<1 | 2 | 3 | 4>(),
  input: Annotation<ProjectInput | undefined>(),
  parsedDocument: Annotation<ParsedDocument | undefined>(),
  analysis: Annotation<PresentationAnalysis | undefined>(),
  pptDsl: Annotation<PptDslDocument | undefined>(),
  iterations: Annotation<PipelineIteration[]>(),
  outputFiles: Annotation<string[]>(),
  outputFile: Annotation<string | undefined>(),
  title: Annotation<string | undefined>(),
});

type PipelineGraphState = typeof PipelineStateAnnotation.State;

@Injectable()
export class PipelineService {
  constructor(
    private readonly documentParserTool: DocumentParserTool,
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
    const graph = this.buildGraph();

    const state = await graph.invoke({
      projectId,
      options,
      refinementRounds,
      iterations: [],
      outputFiles: [],
    });
    const pptDsl = this.requireStateValue(state.pptDsl, 'pptDsl');
    const outputFile = this.requireStateValue(state.outputFile, 'outputFile');

    return {
      projectId,
      title: pptDsl.deck.title,
      pptDsl,
      outputFile,
      outputFiles: state.outputFiles,
      iterations: state.iterations,
    };
  }

  private buildGraph(): {
    invoke(input: Partial<PipelineGraphState>): Promise<PipelineGraphState>;
  } {
    return new StateGraph(PipelineStateAnnotation)
      .addNode('read-input', this.readInputNode)
      .addNode('parse-document', this.parseDocumentNode)
      .addNode('analyze-content', this.analyzeContentNode)
      .addNode('draft-dsl', this.draftDslNode)
      .addNode('refine-and-render-rounds', this.refineAndRenderRoundsNode)
      .addNode('finalize-output', this.finalizeOutputNode)
      .addEdge(START, 'read-input')
      .addEdge('read-input', 'parse-document')
      .addEdge('parse-document', 'analyze-content')
      .addEdge('analyze-content', 'draft-dsl')
      .addEdge('draft-dsl', 'refine-and-render-rounds')
      .addEdge('refine-and-render-rounds', 'finalize-output')
      .addEdge('finalize-output', END)
      .compile();
  }

  private readonly readInputNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const input = await this.projectStorageService.readInput(state.projectId);
    return { input };
  };

  private readonly parseDocumentNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const input = this.requireStateValue(state.input, 'input');
    const parsedDocument = await this.documentParserTool.parse(input.content, input.sourceType);
    await this.projectStorageService.writeArtifact(
      state.projectId,
      'parsed-document.json',
      parsedDocument,
    );
    return { parsedDocument };
  };

  private readonly analyzeContentNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const parsedDocument = this.requireStateValue(state.parsedDocument, 'parsedDocument');
    const analysis = await this.llmJsonService.analyzeDocument(parsedDocument);
    await this.projectStorageService.writeArtifact(state.projectId, 'content-analysis.json', analysis);
    return { analysis };
  };

  private readonly draftDslNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const parsedDocument = this.requireStateValue(state.parsedDocument, 'parsedDocument');
    const analysis = this.requireStateValue(state.analysis, 'analysis');
    const pptDsl = await this.llmJsonService.generatePptDsl(parsedDocument, analysis);
    return { pptDsl };
  };

  private readonly refineAndRenderRoundsNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const analysis = this.requireStateValue(state.analysis, 'analysis');
    let pptDsl = this.requireStateValue(state.pptDsl, 'pptDsl');
    const iterations: PipelineIteration[] = [];
    const outputFiles: string[] = [];

    for (let round = 1; round <= state.refinementRounds; round += 1) {
      const stage = this.getIterationStage(round);
      const objective = this.getIterationObjective(stage);

      pptDsl = await this.llmJsonService.refinePptDsl({
        dsl: pptDsl,
        analysis,
        round,
        totalRounds: state.refinementRounds,
        stage,
        objective,
      });

      const assetResults = await this.assetService.generateAssets(pptDsl);
      for (const assetResult of assetResults) {
        await this.projectStorageService.writeAsset(
          state.projectId,
          assetResult.fileName,
          assetResult.svg,
        );
      }
      pptDsl = this.assetService.applyAssetsToDsl(pptDsl, assetResults);

      const roundOutputFile = this.projectStorageService.getIterationOutputPptxPath(
        state.projectId,
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
        state.projectId,
        round,
        'ppt-dsl.json',
        pptDsl,
      );
      await this.projectStorageService.writeIterationArtifact(state.projectId, round, 'objective.json', {
        round,
        stage,
        objective,
        changes: [],
      });
    }

    return { pptDsl, iterations, outputFiles };
  };

  private readonly finalizeOutputNode = async (
    state: PipelineGraphState,
  ): Promise<Partial<PipelineGraphState>> => {
    const pptDsl = this.requireStateValue(state.pptDsl, 'pptDsl');
    await this.projectStorageService.writeArtifact(state.projectId, 'ppt-dsl.json', pptDsl);

    const outputFile = this.projectStorageService.getOutputPptxPath(
      state.projectId,
      pptDsl.deck.title,
    );
    await this.pptxRendererService.renderFromDsl(outputFile, pptDsl);
    await this.projectStorageService.updateGeneratedProject(state.projectId, outputFile);

    return {
      outputFile,
      title: pptDsl.deck.title,
    };
  };

  private requireStateValue<T>(value: T | undefined, key: string): T {
    if (value === undefined) {
      throw new Error(`Pipeline graph state is missing required value: ${key}`);
    }

    return value;
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
