import { SlideLayout } from '../slides/slide.types';

export type DesignDensity = 'low' | 'medium' | 'high';
export type DesignVisualStyle = 'editorial' | 'technical' | 'executive' | 'warm-minimal';

export interface DesignPlan {
  themeName: string;
  designIntent: string;
  audience: string;
  tone: string;
  density: DesignDensity;
  visualStyle: DesignVisualStyle;
  colorTokens: {
    background: string;
    surface: string;
    surfaceAlt: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentSoft: string;
    border: string;
    inverseBackground: string;
    inverseText: string;
    warning: string;
  };
  typographyTokens: {
    displayFont: string;
    bodyFont: string;
    monoFont: string;
    titleSize: number;
    subtitleSize: number;
    bodySize: number;
    captionSize: number;
  };
  spacingTokens: {
    pageMarginX: number;
    pageMarginY: number;
    sectionGap: number;
    itemGap: number;
  };
  shapeTokens: {
    cardRadius: number;
    panelRadius: number;
    lineWidth: number;
  };
  slideRhythm: {
    opening: string;
    middle: string;
    closing: string;
  };
}

export type LayoutSlot =
  | 'eyebrow'
  | 'title'
  | 'subtitle'
  | 'content'
  | 'visual'
  | 'heroVisual'
  | 'leftPanel'
  | 'rightPanel'
  | 'steps'
  | 'quote'
  | 'takeaway'
  | 'footer';

export type LayoutComposition =
  | 'hero-left'
  | 'hero-right'
  | 'stacked'
  | 'asymmetric-split'
  | 'balanced-split'
  | 'centered-statement'
  | 'timeline'
  | 'comparison-grid'
  | 'closing-focus';

export interface LayoutFrame {
  direction: 'vertical' | 'horizontal' | 'grid' | 'hero';
  padding: {
    x: number;
    y: number;
  };
  gap: number;
  align: 'start' | 'center' | 'end' | 'stretch';
  columns?: number;
}

export interface LayoutSlotSpec {
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
  fit?: 'contain' | 'fill' | 'text-flow';
}

export interface LayoutPlanSlide {
  slideNumber: number;
  layout: SlideLayout;
  role: string;
  composition: LayoutComposition;
  intent: string;
  frame: LayoutFrame;
  slots: Partial<Record<LayoutSlot, LayoutSlotSpec>>;
  constraints: string[];
  densityRules: {
    maxBullets: number;
    maxParagraphChars: number;
    visualWeight: 'none' | 'light' | 'medium' | 'strong';
  };
}

export interface LayoutPlan {
  system: 'generative-slot-layout-v1';
  canvas: {
    width: number;
    height: number;
    unit: 'in';
  };
  slides: LayoutPlanSlide[];
}
