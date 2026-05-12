export type PptDslVersion = 'ppt-dsl-v1';

export type PptDslUnit = 'in';

export type PptDslSlideRole =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'content'
  | 'comparison'
  | 'process'
  | 'quote'
  | 'summary'
  | 'closing';

export type PptDslComposition =
  | 'freeform'
  | 'stacked'
  | 'hero-left'
  | 'hero-right'
  | 'split'
  | 'asymmetric-split'
  | 'balanced-split'
  | 'grid'
  | 'timeline'
  | 'comparison-grid'
  | 'centered-statement'
  | 'closing-focus';

export type PptDslElementKind =
  | 'text'
  | 'rich-text'
  | 'list'
  | 'statement'
  | 'quote'
  | 'table'
  | 'code'
  | 'formula'
  | 'mermaid'
  | 'svg'
  | 'shape'
  | 'connector'
  | 'badge'
  | 'card'
  | 'group';

export type PptDslTextRole =
  | 'eyebrow'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'takeaway'
  | 'label'
  | 'speaker-note';

export type PptDslConstraint =
  | 'keep-within-safe-area'
  | 'avoid-overlap'
  | 'preserve-reading-order'
  | 'prefer-single-primary-idea'
  | 'fit-text'
  | 'preserve-aspect-ratio'
  | 'allow-downscale'
  | 'allow-wrap'
  | 'no-real-image';

export interface PptDslDocument {
  system: PptDslVersion;
  canvas: PptDslCanvas;
  deck: PptDslDeckMeta;
  design: PptDslDesignLanguage;
  slides: PptDslSlide[];
  assets?: PptDslAsset[];
  constraints: PptDslConstraint[];
}

export interface PptDslCanvas {
  width: number;
  height: number;
  unit: PptDslUnit;
  safeArea: PptDslInsets;
}

export interface PptDslInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PptDslDeckMeta {
  title: string;
  audience: string;
  narrativeArc: string[];
  talkTrack: string;
  density: 'low' | 'medium' | 'high';
}

export interface PptDslDesignLanguage {
  theme?: {
    name: string;
    style: string;
    rationale?: string;
  };
  intent: string;
  tokens: {
    color: Record<string, string>;
    typography: Record<string, PptDslTypographyToken>;
    spacing: Record<string, number>;
    radius: Record<string, number>;
    stroke: Record<string, number>;
  };
  rhythm: {
    opening: string;
    middle: string;
    closing: string;
  };
}

export interface PptDslTypographyToken {
  font: string;
  size: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  lineHeight?: number;
  colorToken?: string;
}

export interface PptDslSlide {
  id: string;
  index: number;
  role: PptDslSlideRole;
  intent: string;
  sourceRefs: string[];
  layout: PptDslLayout;
  elements: PptDslElement[];
  speakerNotes?: string;
  refinementState?: {
    round: number;
    objective: string;
    locked: Array<'narrative' | 'layout' | 'content' | 'visuals'>;
  };
}

export interface PptDslLayout {
  composition: PptDslComposition;
  frame: {
    direction: 'vertical' | 'horizontal' | 'grid' | 'hero' | 'absolute';
    padding: PptDslInsets;
    gap: number;
    align: 'start' | 'center' | 'end' | 'stretch';
    columns?: number;
  };
  slots: Record<string, PptDslSlot>;
}

export interface PptDslSlot {
  region:
    | 'top'
    | 'top-left'
    | 'top-right'
    | 'center'
    | 'center-left'
    | 'center-right'
    | 'left-main'
    | 'right-main'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right'
    | 'full-bleed';
  weight: 'primary' | 'secondary' | 'accent' | 'supporting';
  fit: 'contain' | 'fill' | 'text-flow';
  constraints: PptDslConstraint[];
}

export type PptDslElement =
  | PptDslTextElement
  | PptDslListElement
  | PptDslTableElement
  | PptDslCodeElement
  | PptDslFormulaElement
  | PptDslMermaidElement
  | PptDslSvgElement
  | PptDslShapeElement
  | PptDslGroupElement;

export interface PptDslBaseElement {
  id: string;
  kind: PptDslElementKind;
  slot?: string;
  layer: number;
  style?: PptDslElementStyle;
  constraints: PptDslConstraint[];
}

export interface PptDslElementStyle {
  colorToken?: string;
  backgroundToken?: string;
  typographyToken?: string;
  radiusToken?: string;
  strokeToken?: string;
  opacity?: number;
}

export interface PptDslTextElement extends PptDslBaseElement {
  kind: 'text' | 'rich-text' | 'statement' | 'quote' | 'badge';
  textRole: PptDslTextRole;
  text: string;
}

export interface PptDslListElement extends PptDslBaseElement {
  kind: 'list';
  ordered: boolean;
  items: string[];
}

export interface PptDslTableElement extends PptDslBaseElement {
  kind: 'table';
  headers?: string[];
  rows: string[][];
}

export interface PptDslCodeElement extends PptDslBaseElement {
  kind: 'code';
  language?: string;
  code: string;
}

export interface PptDslFormulaElement extends PptDslBaseElement {
  kind: 'formula';
  formula: string;
}

export interface PptDslMermaidElement extends PptDslBaseElement {
  kind: 'mermaid';
  definition: string;
}

export interface PptDslSvgElement extends PptDslBaseElement {
  kind: 'svg';
  assetId?: string;
  svg?: string;
  generationPrompt?: string;
}

export interface PptDslShapeElement extends PptDslBaseElement {
  kind: 'shape' | 'connector' | 'card';
  shape: 'rect' | 'roundRect' | 'ellipse' | 'line' | 'arrow';
  text?: string;
}

export interface PptDslGroupElement extends PptDslBaseElement {
  kind: 'group';
  children: PptDslElement[];
}

export interface PptDslAsset {
  id: string;
  type: 'svg' | 'mermaid-rendered' | 'formula-rendered';
  slideId: string;
  elementId: string;
  path: string;
  source: 'generated' | 'rendered';
}
