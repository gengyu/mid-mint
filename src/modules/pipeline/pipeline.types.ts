import { SlideLayout, SlideSpec } from '../slides/slide.types';

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
}

export interface DeckPlan {
  title: string;
  totalSlides: number;
  slides: PlannedSlide[];
}

export interface PipelineIteration {
  round: number;
  objective: string;
  slideSpecs: SlideSpec[];
}

export interface PipelineResult {
  projectId: string;
  title: string;
  deckPlan: DeckPlan;
  slideSpecs: SlideSpec[];
  outputFile: string;
  iterations: PipelineIteration[];
}
