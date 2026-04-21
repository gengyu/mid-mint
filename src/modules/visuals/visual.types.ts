import { SlideLayout } from '../slides/slide.types';

export interface GeneratedAsset {
  slideNumber: number;
  fileName: string;
  svg: string;
}

export interface VisualPlanSlide {
  slideNumber: number;
  layout: SlideLayout;
  visualType: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  goal: string;
  assetFile?: string;
}

export interface VisualPlan {
  theme: string;
  slides: VisualPlanSlide[];
}
