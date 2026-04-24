import { Injectable } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import { DeckPlan, PlannedSlide, PresentationAnalysis } from '../pipeline/pipeline.types';
import { SlideLayout } from '../slides/slide.types';
import {
  DesignPlan,
  LayoutComposition,
  LayoutFrame,
  LayoutPlan,
  LayoutPlanSlide,
  LayoutSlot,
  LayoutSlotSpec,
} from './design.types';

@Injectable()
export class DesignService {
  constructor(private readonly llmService: LlmService) {}

  async createDesignPlan(analysis: PresentationAnalysis, deckPlan: DeckPlan): Promise<DesignPlan> {
    const fallback = this.buildFallbackDesignPlan(analysis, deckPlan);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a presentation design plan and return JSON only.',
      'Use mature product-design principles: design tokens, consistent typography, controlled density, and slide rhythm.',
      'Do not describe individual slide content. Describe the global design system for the whole deck.',
      'Use hex colors with leading #.',
      JSON.stringify({
        expectedShape: fallback,
        analysis,
        deckTitle: deckPlan.title,
        slides: deckPlan.slides.map((slide) => ({
          slideNumber: slide.slideNumber,
          title: slide.title,
          layoutHint: slide.layoutHint,
          role: slide.role,
          objective: slide.objective,
        })),
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<DesignPlan>(prompt);
    return this.isValidDesignPlan(result) ? this.normalizeDesignPlan(result, fallback) : fallback;
  }

  async createLayoutPlan(designPlan: DesignPlan, deckPlan: DeckPlan): Promise<LayoutPlan> {
    const fallback = this.buildFallbackLayoutPlan(designPlan, deckPlan);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a per-slide presentation layout plan and return JSON only.',
      'This is not a fixed template library. Design each slide structure independently using a constrained slot layout DSL.',
      'Do not change slideNumber, slide count, role, or layout family from the deck plan.',
      'You may vary composition, slot regions, slot weights, frame direction, gap, alignment, density rules, and constraints.',
      'Keep padding x/y between 0.35 and 0.9, gap between 0.1 and 0.55, maxBullets between 0 and 6, and maxParagraphChars between 80 and 360.',
      JSON.stringify({
        expectedShape: fallback,
        designPlan,
        deckPlan,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<LayoutPlan>(prompt);
    return this.normalizeLayoutPlan(result, fallback, deckPlan);
  }

  private buildFallbackDesignPlan(
    analysis: PresentationAnalysis,
    deckPlan: DeckPlan,
  ): DesignPlan {
    const hasTechnicalLayouts = deckPlan.slides.some((slide) =>
      ['process', 'comparison'].includes(slide.layoutHint),
    );
    const density = deckPlan.totalSlides >= 9 ? 'high' : deckPlan.totalSlides >= 6 ? 'medium' : 'low';
    const visualStyle = hasTechnicalLayouts ? 'technical' : 'editorial';

    return {
      themeName: hasTechnicalLayouts ? 'technical-editorial' : 'editorial-soft',
      designIntent:
        'Create a calm, structured presentation that turns source material into a clear talkable narrative.',
      audience: analysis.audience ?? 'General business audience',
      tone: analysis.tone ?? 'Confident and practical',
      density,
      visualStyle,
      colorTokens: {
        background: '#F6F8FC',
        surface: '#FFFFFF',
        surfaceAlt: '#E8EEF5',
        textPrimary: '#102033',
        textSecondary: '#5B6B7F',
        accent: '#0F766E',
        accentSoft: '#D9F2F5',
        border: '#D9E3F0',
        inverseBackground: '#0B1F33',
        inverseText: '#FFFFFF',
        warning: '#F59E0B',
      },
      typographyTokens: {
        displayFont: 'Aptos Display',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        titleSize: density === 'low' ? 34 : 31,
        subtitleSize: 18,
        bodySize: density === 'high' ? 13 : 15,
        captionSize: 9,
      },
      spacingTokens: {
        pageMarginX: 0.62,
        pageMarginY: 0.48,
        sectionGap: 0.32,
        itemGap: 0.16,
      },
      shapeTokens: {
        cardRadius: 0.1,
        panelRadius: 0.16,
        lineWidth: 1.1,
      },
      slideRhythm: {
        opening: 'Strong cover promise with one hero visual moment.',
        middle: 'Alternate text-visual, process, comparison, and quote layouts to avoid repetition.',
        closing: 'End with a concise final takeaway and clear action frame.',
      },
    };
  }

  private buildFallbackLayoutPlan(designPlan: DesignPlan, deckPlan: DeckPlan): LayoutPlan {
    return {
      system: 'generative-slot-layout-v1',
      canvas: {
        width: 13.333,
        height: 7.5,
        unit: 'in',
      },
      slides: deckPlan.slides.map((slide, index) =>
        this.buildFallbackLayoutSlide(slide, index, designPlan),
      ),
    };
  }

  private buildFallbackLayoutSlide(
    slide: PlannedSlide,
    index: number,
    designPlan: DesignPlan,
  ): LayoutPlanSlide {
    const maxBullets = designPlan.density === 'high' ? 6 : designPlan.density === 'medium' ? 5 : 4;
    const maxParagraphChars =
      designPlan.density === 'high' ? 320 : designPlan.density === 'medium' ? 240 : 180;
    const baseFrame: Omit<LayoutFrame, 'direction'> = {
      padding: {
        x: designPlan.spacingTokens.pageMarginX,
        y: designPlan.spacingTokens.pageMarginY,
      },
      gap: designPlan.spacingTokens.sectionGap,
      align: 'start' as const,
    };
    const layout = slide.layoutHint;
    const composition = this.pickComposition(slide, index);

    switch (layout) {
      case 'cover':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Open the deck with a clear promise and strong first visual signal.',
          frame: { ...baseFrame, direction: 'hero' },
          slots: {
            eyebrow: this.slot('top-left', 'supporting'),
            title: this.slot('center-left', 'primary'),
            subtitle: this.slot('center-left', 'secondary', 'text-flow'),
            heroVisual: this.slot(composition === 'hero-right' ? 'right-main' : 'full-bleed', 'primary', 'contain'),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Keep the title dominant.', 'Use one strong statement only.'],
          densityRules: { maxBullets: 0, maxParagraphChars: 140, visualWeight: 'strong' },
        };
      case 'agenda':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Preview the story arc and set audience expectations.',
          frame: { ...baseFrame, direction: 'vertical' },
          slots: {
            eyebrow: this.slot('top-left', 'supporting'),
            title: this.slot('top-left', 'primary'),
            content: this.slot('center', 'primary', 'text-flow'),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Keep agenda items short.', 'Avoid detailed explanation.'],
          densityRules: { maxBullets: 5, maxParagraphChars: 120, visualWeight: 'light' },
        };
      case 'section-divider':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Create a chapter break with one focused transition message.',
          frame: { ...baseFrame, direction: 'hero' },
          slots: {
            eyebrow: this.slot('top-left', 'supporting'),
            title: this.slot('center-left', 'primary'),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Use minimal copy.', 'Do not add dense bullets.'],
          densityRules: { maxBullets: 0, maxParagraphChars: 120, visualWeight: 'medium' },
        };
      case 'comparison':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Help the audience compare two options, states, or tradeoffs.',
          frame: { ...baseFrame, direction: composition === 'comparison-grid' ? 'grid' : 'horizontal', columns: 2 },
          slots: {
            title: this.slot('top-left', 'primary'),
            leftPanel: this.slot('left-main', 'primary', 'text-flow'),
            rightPanel: this.slot('right-main', 'primary', 'text-flow'),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Balance both sides.', 'End with a decision frame.'],
          densityRules: { maxBullets, maxParagraphChars, visualWeight: 'medium' },
        };
      case 'process':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Explain a sequence, workflow, or system path.',
          frame: { ...baseFrame, direction: composition === 'timeline' ? 'horizontal' : 'grid', columns: 3 },
          slots: {
            title: this.slot('top-left', 'primary'),
            steps: this.slot('center', 'primary', 'text-flow'),
            visual: this.slot('right-main', 'secondary', 'contain'),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Keep steps sequential.', 'Prefer 3 to 5 steps.'],
          densityRules: { maxBullets: 5, maxParagraphChars, visualWeight: 'strong' },
        };
      case 'quote':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Pause the deck with one memorable statement.',
          frame: { ...baseFrame, direction: 'vertical', align: 'center' },
          slots: {
            eyebrow: this.slot('top', 'supporting'),
            quote: this.slot('center', 'primary', 'text-flow'),
            takeaway: this.slot('bottom', 'accent'),
          },
          constraints: ['Use one quote-like idea.', 'Keep supporting text short.'],
          densityRules: { maxBullets: 0, maxParagraphChars: 220, visualWeight: 'light' },
        };
      case 'summary-closing':
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Close the deck with the final takeaway and next action.',
          frame: { ...baseFrame, direction: 'vertical' },
          slots: {
            title: this.slot('top-left', 'primary'),
            content: this.slot('center', 'secondary', 'text-flow'),
            takeaway: this.slot('bottom-left', 'primary'),
          },
          constraints: ['Use a clear final message.', 'Avoid introducing new ideas.'],
          densityRules: { maxBullets: 4, maxParagraphChars: 160, visualWeight: 'medium' },
        };
      case 'text-visual':
      default:
        return {
          slideNumber: slide.slideNumber,
          layout,
          role: slide.role,
          composition,
          intent: 'Combine a clear explanation with a supporting visual idea.',
          frame: { ...baseFrame, direction: 'horizontal' },
          slots: {
            title: this.slot('top-left', 'primary'),
            content: this.slot(
              composition === 'asymmetric-split' ? 'left-main' : 'center-left',
              'secondary',
              'text-flow',
            ),
            visual: this.slot(
              composition === 'asymmetric-split' ? 'right-main' : 'center-right',
              'primary',
              'contain',
            ),
            takeaway: this.slot('bottom-left', 'accent'),
          },
          constraints: ['Keep one primary idea.', 'Let the visual clarify rather than decorate.'],
          densityRules: { maxBullets, maxParagraphChars, visualWeight: 'medium' },
        };
    }
  }

  private pickComposition(slide: PlannedSlide, index: number): LayoutComposition {
    switch (slide.layoutHint) {
      case 'cover':
        return index % 2 === 0 ? 'hero-right' : 'hero-left';
      case 'agenda':
        return 'stacked';
      case 'section-divider':
        return 'centered-statement';
      case 'comparison':
        return 'comparison-grid';
      case 'process':
        return 'timeline';
      case 'quote':
        return 'centered-statement';
      case 'summary-closing':
        return 'closing-focus';
      case 'text-visual':
      default:
        return slide.visualFocus === 'visual' || index % 2 === 0
          ? 'asymmetric-split'
          : 'balanced-split';
    }
  }

  private slot(
    region: LayoutSlotSpec['region'],
    weight: LayoutSlotSpec['weight'],
    fit?: LayoutSlotSpec['fit'],
  ): LayoutSlotSpec {
    return fit ? { region, weight, fit } : { region, weight };
  }

  private isValidDesignPlan(value: unknown): value is DesignPlan {
    const candidate = value as DesignPlan;
    return (
      Boolean(candidate) &&
      typeof candidate.themeName === 'string' &&
      typeof candidate.designIntent === 'string' &&
      typeof candidate.colorTokens?.background === 'string' &&
      typeof candidate.typographyTokens?.displayFont === 'string' &&
      typeof candidate.spacingTokens?.pageMarginX === 'number'
    );
  }

  private normalizeDesignPlan(plan: DesignPlan, fallback: DesignPlan): DesignPlan {
    return {
      ...fallback,
      ...plan,
      colorTokens: { ...fallback.colorTokens, ...plan.colorTokens },
      typographyTokens: { ...fallback.typographyTokens, ...plan.typographyTokens },
      spacingTokens: { ...fallback.spacingTokens, ...plan.spacingTokens },
      shapeTokens: { ...fallback.shapeTokens, ...plan.shapeTokens },
      slideRhythm: { ...fallback.slideRhythm, ...plan.slideRhythm },
    };
  }

  private normalizeLayoutPlan(
    plan: unknown,
    fallback: LayoutPlan,
    deckPlan: DeckPlan,
  ): LayoutPlan {
    if (!this.isValidLayoutPlan(plan, deckPlan)) {
      return fallback;
    }

    const candidate = plan as LayoutPlan;
    const fallbackBySlide = new Map(
      fallback.slides.map((slide) => [slide.slideNumber, slide]),
    );

    return {
      ...fallback,
      system: 'generative-slot-layout-v1',
      slides: deckPlan.slides.map((plannedSlide) => {
        const generatedSlide = candidate.slides.find(
          (slide) => slide.slideNumber === plannedSlide.slideNumber,
        );
        const fallbackSlide = fallbackBySlide.get(plannedSlide.slideNumber)!;

        if (!generatedSlide) {
          return fallbackSlide;
        }

        return {
          ...fallbackSlide,
          ...generatedSlide,
          slideNumber: plannedSlide.slideNumber,
          layout: plannedSlide.layoutHint,
          role: plannedSlide.role,
          frame: this.normalizeFrame(generatedSlide.frame, fallbackSlide.frame),
          slots: this.normalizeSlots(generatedSlide.slots, fallbackSlide.slots),
          densityRules: {
            maxBullets: this.clampNumber(
              generatedSlide.densityRules?.maxBullets,
              0,
              6,
              fallbackSlide.densityRules.maxBullets,
            ),
            maxParagraphChars: this.clampNumber(
              generatedSlide.densityRules?.maxParagraphChars,
              80,
              360,
              fallbackSlide.densityRules.maxParagraphChars,
            ),
            visualWeight:
              generatedSlide.densityRules?.visualWeight ?? fallbackSlide.densityRules.visualWeight,
          },
        };
      }),
    };
  }

  private isValidLayoutPlan(value: unknown, deckPlan: DeckPlan): value is LayoutPlan {
    const candidate = value as LayoutPlan;
    if (!candidate || !Array.isArray(candidate.slides)) {
      return false;
    }

    return deckPlan.slides.every((plannedSlide) => {
      const slide = candidate.slides.find(
        (item) => item?.slideNumber === plannedSlide.slideNumber,
      );

      return (
        Boolean(slide) &&
        slide?.layout === plannedSlide.layoutHint &&
        Boolean(slide?.frame) &&
        Boolean(slide?.slots?.title) &&
        Array.isArray(slide?.constraints)
      );
    });
  }

  private normalizeFrame(frame: LayoutFrame | undefined, fallback: LayoutFrame): LayoutFrame {
    if (!frame) {
      return fallback;
    }

    return {
      ...fallback,
      ...frame,
      padding: {
        x: this.clampNumber(frame.padding?.x, 0.35, 0.9, fallback.padding.x),
        y: this.clampNumber(frame.padding?.y, 0.3, 0.8, fallback.padding.y),
      },
      gap: this.clampNumber(frame.gap, 0.1, 0.55, fallback.gap),
      columns: frame.columns ? this.clampNumber(frame.columns, 1, 4, fallback.columns ?? 1) : undefined,
    };
  }

  private normalizeSlots(
    slots: Partial<Record<LayoutSlot, LayoutSlotSpec>> | undefined,
    fallback: Partial<Record<LayoutSlot, LayoutSlotSpec>>,
  ): Partial<Record<LayoutSlot, LayoutSlotSpec>> {
    return {
      ...fallback,
      ...(slots ?? {}),
    };
  }

  private clampNumber(
    value: number | undefined,
    min: number,
    max: number,
    fallback: number,
  ): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  }
}
