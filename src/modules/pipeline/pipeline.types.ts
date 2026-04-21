import { SlideLayout, SlideSpec } from '../slides/slide.types';
import { VisualPlan } from '../visuals/visual.types';

export interface PresentationAnalysis {
  mainTopic: string;
  summary: string;
  keyMessages: string[];
}

export interface PlannedSlide {
  slideNumber: number;
  title: string;
  keyPoint: string;
  sourceSectionTitle: string;
  layoutHint: SlideLayout;
}

export interface DeckPlan {
  title: string;
  totalSlides: number;
  slides: PlannedSlide[];
}

export interface PipelineResult {
  projectId: string;
  title: string;
  deckPlan: DeckPlan;
  visualPlan: VisualPlan;
  slideSpecs: SlideSpec[];
  outputFile: string;
}
