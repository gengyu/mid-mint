export const SLIDE_LAYOUTS = [
  'cover',
  'agenda',
  'section-divider',
  'text-visual',
  'comparison',
  'process',
  'quote',
  'summary-closing',
] as const;

export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export function isSlideLayout(value: unknown): value is SlideLayout {
  return typeof value === 'string' && (SLIDE_LAYOUTS as readonly string[]).includes(value);
}

export type SlideRole =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'content'
  | 'summary'
  | 'closing';

export interface SlideTableData {
  headers?: string[];
  rows: string[][];
}

export interface SlideCodeBlock {
  language?: string;
  content: string;
}

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
  visualTechnique?: 'none' | 'svg' | 'mermaid' | 'table' | 'code-block' | 'formula';
  textTechnique?: 'none' | 'statement' | 'short-bullets' | 'two-column-summary' | 'agenda-list';
  visualPriority?: 'low' | 'medium' | 'high';
  visualType?: 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
  visualComposition?: 'none' | 'hero' | 'full-bleed' | 'left-panel' | 'right-panel' | 'center-panel' | 'two-column';
  density?: 'low' | 'medium' | 'high';
  accentTone?: 'teal' | 'blue' | 'amber';
  contentBalance?: 'text-first' | 'visual-first' | 'balanced';
  textBudget?: number;
  mustGenerateVisual?: boolean;
  tableData?: SlideTableData;
  codeBlock?: SlideCodeBlock;
  formulaText?: string;
  mermaidDefinition?: string;
  assetPath?: string;
}
