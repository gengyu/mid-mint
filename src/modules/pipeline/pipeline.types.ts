import { PptDslDocument } from '../ppt-dsl/ppt-dsl.types';

export interface PresentationAnalysis {
  mainTopic: string;
  summary: string;
  keyMessages: string[];
  audience?: string;
  tone?: string;
  storyArc?: string[];
}

export interface DeckPlanSlide {
  slideNumber: number;
  title: string;
  keyPoint: string;
  sourceSectionTitle: string;
  layoutHint: string;
  role: string;
  visualFocus: string;
  objective: string;
  sourceCoverage: string[];
  structureReason: string;
  contentWeight: string;
}

export interface DeckPlan {
  title: string;
  totalSlides: number;
  slides: DeckPlanSlide[];
}

export type StoryArcPhase = 'context' | 'key-ideas' | 'action';

export type PlannedSlide = DeckPlanSlide;

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
