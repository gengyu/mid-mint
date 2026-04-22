export type SlideLayout = 'cover' | 'title-bullets' | 'text-visual' | 'comparison';

export interface SlideSpec {
  slideNumber: number;
  title: string;
  subtitle?: string;
  sectionLabel?: string;
  layout: SlideLayout;
  bullets: string[];
  paragraph?: string;
  highlight?: string;
  notes?: string;
  visualGoal?: string;
  visualType?: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  visualComposition?: 'none' | 'hero' | 'right-panel' | 'center-panel';
  accentTone?: 'teal' | 'blue' | 'amber';
  assetPath?: string;
}
