export type SlideLayout = 'cover' | 'title-bullets' | 'text-visual' | 'comparison';

export interface SlideSpec {
  slideNumber: number;
  title: string;
  subtitle?: string;
  layout: SlideLayout;
  bullets: string[];
  paragraph?: string;
  notes?: string;
  visualGoal?: string;
  visualType?: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  assetPath?: string;
}
