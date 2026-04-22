import { SlideLayout } from '../slides/slide.types';

export interface GeneratedAsset {
  slideNumber: number;
  fileName: string;
  svg: string;
}

export type VisualComposition = 'none' | 'hero' | 'right-panel' | 'center-panel';
export type VisualDensity = 'low' | 'medium' | 'high';
export type AccentTone = 'teal' | 'blue' | 'amber';

export interface VisualPlanSlide {
  slideNumber: number;
  layout: SlideLayout;
  visualType: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  goal: string;
  composition: VisualComposition;
  density: VisualDensity;
  accentTone: AccentTone;
  assetFile?: string;
}

export interface VisualPlan {
  theme: string;
  palette: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    mutedText: string;
    border: string;
    accent: string;
    accentSoft: string;
  };
  slides: VisualPlanSlide[];
}
