import { SlideLayout, SlideSpec } from '../slides/slide.types';
import { DesignPlan, LayoutPlan } from '../design/design.types';
import { VisualPlan } from '../visuals/visual.types';

export type StoryArcPhase = 'context' | 'key-ideas' | 'action';

export interface PresentationAnalysis {
  mainTopic: string;
  summary: string;
  keyMessages: string[];
  audience?: string;
  tone?: string;
  storyArc?: string[];
}

export interface PlannedSlide {
  slideNumber: number;
  title: string;
  keyPoint: string;
  sourceSectionTitle: string;
  layoutHint: SlideLayout;
  role:
    | 'cover'
    | 'agenda'
    | 'section-divider'
    | 'content'
    | 'summary'
    | 'closing';
  visualFocus: 'text' | 'visual' | 'mixed';
  objective: string;
  storyArcPhase?: StoryArcPhase;
  sectionWeight?: number;
  sourceCoverage?: string[];
  structureReason?: string;
  contentWeight?: 'low' | 'medium' | 'high';
  transitionReason?: 'story-arc' | 'section-weight' | 'layout-balance';
}

export interface DeckPlan {
  title: string;
  totalSlides: number;
  slides: PlannedSlide[];
}

export type PipelineEnhancementStage =
  | 'structure'
  | 'foundation-visuals'
  | 'key-assets'
  | 'specialized-polish';

export interface GeneratePipelineOptions {
  refinementRounds?: number;
}

export interface PipelineIteration {
  round: number;
  stage: PipelineEnhancementStage;
  objective: string;
  designPlan: DesignPlan;
  layoutPlan: LayoutPlan;
  visualPlan: VisualPlan;
  slideSpecs: SlideSpec[];
  outputFile: string;
}

export interface PipelineResult {
  projectId: string;
  title: string;
  deckPlan: DeckPlan;
  designPlan: DesignPlan;
  layoutPlan: LayoutPlan;
  visualPlan: VisualPlan;
  slideSpecs: SlideSpec[];
  outputFile: string;
  outputFiles: string[];
  iterations: PipelineIteration[];
}
