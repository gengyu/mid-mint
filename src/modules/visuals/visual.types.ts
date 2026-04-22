import { SlideLayout } from '../slides/slide.types';

export interface GeneratedAsset {
  slideNumber: number;
  fileName: string;
  svg: string;
}

export type VisualTechnique = 'none' | 'svg' | 'mermaid' | 'table' | 'code-block' | 'formula' | 'image';
export type TextTechnique = 'none' | 'statement' | 'short-bullets' | 'two-column-summary' | 'agenda-list';
export type VisualPriority = 'low' | 'medium' | 'high';
export type VisualComposition =
  | 'none'
  | 'hero'
  | 'full-bleed'
  | 'left-panel'
  | 'right-panel'
  | 'center-panel'
  | 'two-column';
export type VisualDensity = 'low' | 'medium' | 'high';
export type AccentTone = 'teal' | 'blue' | 'amber';

export interface VisualPlanSlide {
  slideNumber: number;
  role: 'cover' | 'section' | 'content' | 'closing';
  layout: SlideLayout;
  visualType: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  visualTechnique: VisualTechnique;
  textTechnique: TextTechnique;
  visualPriority: VisualPriority;
  goal: string;
  composition: VisualComposition;
  density: VisualDensity;
  accentTone: AccentTone;
  requiresAsset: boolean;
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
