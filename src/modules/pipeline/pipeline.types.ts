import { PptDslDocument } from '../ppt-dsl/ppt-dsl.types';

export interface PresentationAnalysis {
  mainTopic: string;
  summary: string;
  keyMessages: string[];
  audience?: string;
  tone?: string;
  storyArc?: string[];
}

export type PipelineEnhancementStage =
  | 'structure-dsl'
  | 'design-system-dsl'
  | 'asset-dsl'
  | 'polish-dsl';

export interface GeneratePipelineOptions {
  refinementRounds?: number;
}

export interface PipelineIteration {
  round: number;
  stage: PipelineEnhancementStage;
  objective: string;
  pptDsl: PptDslDocument;
  changes: string[];
  outputFile: string;
}

export interface PipelineResult {
  projectId: string;
  title: string;
  pptDsl: PptDslDocument;
  outputFile: string;
  outputFiles: string[];
  iterations: PipelineIteration[];
}
