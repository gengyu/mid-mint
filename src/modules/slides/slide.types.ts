export type SlideLayout =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'title-bullets'
  | 'text-visual'
  | 'comparison'
  | 'process'
  | 'quote';

export type SlideRole =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'content'
  | 'summary'
  | 'closing';

export interface SlideSpec {
  slideNumber: number;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  sectionLabel?: string;
  layout: SlideLayout;
  role?: SlideRole;
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
