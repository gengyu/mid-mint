import { Injectable } from '@nestjs/common';
import katex from 'katex';
import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';

import { DesignPlan } from '../design/design.types';
import { ParsedDocument } from '../parser/types/parsed-document.type';
import { resolveVisualDecision } from '../pipeline/layout-rules';
import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { SlideSpec } from '../slides/slide.types';
import { GeneratedAsset, VisualPlan, VisualPlanSlide } from './visual.types';

type SvgPalette = VisualPlan['palette'];

@Injectable()
export class SvgGeneratorService {
  createVisualPlan(
    deckPlan: DeckPlan,
    analysis: PresentationAnalysis,
    document: ParsedDocument,
    designPlan?: DesignPlan,
  ): VisualPlan {
    const palette = {
      background: designPlan?.colorTokens.background ?? '#F3F6FB',
      surface: designPlan?.colorTokens.surface ?? '#FFFFFF',
      surfaceAlt: designPlan?.colorTokens.surfaceAlt ?? '#EEF4FF',
      text: designPlan?.colorTokens.textPrimary ?? '#102033',
      mutedText: designPlan?.colorTokens.textSecondary ?? '#5B6B7D',
      border: designPlan?.colorTokens.border ?? '#D9E3F0',
      accent: designPlan?.colorTokens.accent ?? '#0F766E',
      accentSoft: designPlan?.colorTokens.accentSoft ?? '#D7F3EE',
    };

    return {
      theme: designPlan?.themeName ?? 'editorial-soft',
      palette,
      slides: deckPlan.slides.map((slide) => {
        const matchedSection = document.sections.find(
          (section) => section.title === slide.sourceSectionTitle,
        );
        const decision = resolveVisualDecision(
          slide.layoutHint,
          slide.slideNumber,
          {
            title: slide.title,
            keyPoint: slide.keyPoint,
            body: matchedSection?.body ?? slide.keyPoint,
            bullets: matchedSection?.bullets ?? [],
            tableRows: matchedSection?.tableData?.rows,
            formulaText: matchedSection?.formulas?.[0],
            mermaidDefinition: matchedSection?.mermaidDefinitions?.[0],
            codeBlockContent: matchedSection?.codeBlocks?.[0]?.content,
          },
          slide.role,
        );

        return {
          slideNumber: slide.slideNumber,
          role:
            slide.layoutHint === 'cover'
              ? 'cover'
              : slide.layoutHint === 'section-divider'
                ? 'section'
                : slide.role === 'closing'
                  ? 'closing'
                  : 'content',
          layout: slide.layoutHint,
          visualType: decision.visualType,
          visualTechnique: decision.visualTechnique,
          textTechnique: decision.textTechnique,
          visualPriority: decision.visualPriority,
          assetPriority: decision.assetPriority,
          recommendedEnhancementRound: decision.recommendedEnhancementRound,
          assetVariant: decision.assetVariant,
          goal: decision.goal,
          composition: decision.composition,
          density: decision.density,
          accentTone: decision.accentTone,
          contentBalance: decision.contentBalance,
          textBudget: decision.textBudget,
          mustGenerateVisual: decision.mustGenerateVisual,
          requiresAsset: decision.requiresAsset,
          assetFile: decision.requiresAsset
            ? this.buildAssetFileName(slide.slideNumber, decision.visualTechnique)
            : undefined,
        };
      }),
    };
  }

  async generate(slides: SlideSpec[], visualPlan: VisualPlan): Promise<GeneratedAsset[]> {
    const assets = await Promise.all(
      visualPlan.slides
        .filter((plan) => Boolean(plan.assetFile))
        .map(async (plan) => {
          const slide = slides.find((item) => item.slideNumber === plan.slideNumber);
          if (!slide || !plan.assetFile) {
            return null;
          }

          const svg = await this.buildSvg(slide, plan, visualPlan.palette);
          if (!svg) {
            return null;
          }

          return {
            slideNumber: slide.slideNumber,
            fileName: plan.assetFile,
            svg,
          };
        }),
    );

    return assets.filter((asset): asset is GeneratedAsset => asset !== null);
  }

  private async buildSvg(
    slide: SlideSpec,
    plan: VisualPlanSlide,
    palette: SvgPalette,
  ): Promise<string | null> {
    if (slide.visualTechnique === 'mermaid' && slide.mermaidDefinition) {
      try {
        return await this.renderMermaidSvg(slide.mermaidDefinition, slide.slideNumber);
      } catch {
        if (slide.visualType !== 'none') {
          return this.buildSvgGraphic(slide, plan, palette);
        }

        return null;
      }
    }

    if (slide.visualTechnique === 'formula' && slide.formulaText) {
      try {
        return this.renderFormulaSvg(slide.formulaText, slide.title);
      } catch {
        if (slide.visualType !== 'none') {
          return this.buildSvgGraphic(slide, plan, palette);
        }

        return null;
      }
    }

    return this.buildSvgGraphic(slide, plan, palette);
  }

  private buildSvgGraphic(
    slide: SlideSpec,
    plan: VisualPlanSlide,
    palette: SvgPalette,
  ): string {
    if (plan.assetVariant === 'hero') {
      if (slide.visualType === 'cover-accent') {
        return this.buildCoverAccentSvg(slide, palette);
      }

      return this.buildHeroSceneSvg(slide, plan.goal, palette);
    }

    if (slide.visualType === 'comparison-card') {
      return this.buildComparisonSvg(slide, palette);
    }

    if (slide.visualType === 'summary-graphic') {
      return this.buildSummarySvg(slide, palette);
    }

    return this.buildDiagramSvg(slide, plan.goal, palette);
  }

  private async renderMermaidSvg(definition: string, slideNumber: number): Promise<string> {
    return this.withMermaidEnvironment(async () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'neutral',
        fontFamily: 'Aptos, Arial, sans-serif',
      });
      const { svg } = await mermaid.render(`slide-${slideNumber}-${Date.now()}`, definition);
      return svg
        .replace(/height="[^"]*"/, 'height="720"')
        .replace(/width="[^"]*"/, 'width="1280"')
        .replace(/style="max-width:\s*[^;"]+;?"/g, '')
        .replace('<svg ', '<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" ');
    });
  }

  private renderFormulaSvg(formula: string, title: string): string {
    const rendered = katex.renderToString(this.stripFormulaDelimiters(formula), {
      throwOnError: false,
      displayMode: true,
      output: 'html',
      strict: 'ignore',
    });
    const safeTitle = this.escape(title);
    const safeFormula = this.escape(this.stripFormulaDelimiters(formula));

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<rect width="1280" height="720" fill="#F4F8FC" />',
      '<rect x="72" y="68" width="1136" height="584" rx="36" fill="#FFFFFF" stroke="#D9E3F0" />',
      `<text x="110" y="156" font-size="18" font-weight="700" fill="#0F766E">${safeTitle}</text>`,
      '<foreignObject x="120" y="210" width="1040" height="300">',
      '<div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;height:100%;align-items:center;justify-content:center;padding:24px;color:#102033;font-size:32px;">',
      rendered,
      '</div>',
      '</foreignObject>',
      `<text x="640" y="610" text-anchor="middle" font-size="24" fill="#5B6B7D">${safeFormula}</text>`,
      '</svg>',
    ].join('');
  }

  private async withMermaidEnvironment<T>(fn: () => Promise<T>): Promise<T> {
    const dom = new JSDOM('<div id="mermaid-root"></div>');
    const globalScope = globalThis as any;
    const previousValues = {
      window: globalScope.window,
      document: globalScope.document,
      navigator: globalScope.navigator,
      HTMLElement: globalScope.HTMLElement,
      SVGElement: globalScope.SVGElement,
      Node: globalScope.Node,
      DOMPurify: globalScope.DOMPurify,
    };

    globalScope.window = dom.window;
    globalScope.document = dom.window.document;
    globalScope.navigator = dom.window.navigator;
    globalScope.HTMLElement = dom.window.HTMLElement;
    globalScope.SVGElement = dom.window.SVGElement;
    globalScope.Node = dom.window.Node;
    globalScope.DOMPurify = {
      sanitize: (value: string) => value,
    };

    try {
      return await fn();
    } finally {
      this.restoreGlobalValue(globalScope, 'window', previousValues.window);
      this.restoreGlobalValue(globalScope, 'document', previousValues.document);
      this.restoreGlobalValue(globalScope, 'navigator', previousValues.navigator);
      this.restoreGlobalValue(globalScope, 'HTMLElement', previousValues.HTMLElement);
      this.restoreGlobalValue(globalScope, 'SVGElement', previousValues.SVGElement);
      this.restoreGlobalValue(globalScope, 'Node', previousValues.Node);
      this.restoreGlobalValue(globalScope, 'DOMPurify', previousValues.DOMPurify);
    }
  }

  private buildAssetFileName(slideNumber: number, visualTechnique: SlideSpec['visualTechnique']): string {
    const base = `slide-${String(slideNumber).padStart(3, '0')}`;
    if (visualTechnique === 'mermaid') {
      return `${base}-mermaid.svg`;
    }

    if (visualTechnique === 'formula') {
      return `${base}-formula.svg`;
    }

    return `${base}.svg`;
  }

  private stripFormulaDelimiters(formula: string): string {
    return formula.replace(/^\$\$?/, '').replace(/\$\$?$/, '').trim();
  }

  private restoreGlobalValue(globalScope: any, key: string, value: unknown): void {
    if (typeof value === 'undefined') {
      delete globalScope[key];
      return;
    }

    globalScope[key] = value;
  }

  private buildDiagramSvg(slide: SlideSpec, goal: string, palette: SvgPalette): string {
    const accent = this.resolveAccent(slide.accentTone, palette);
    const nodes = slide.bullets.slice(0, 3);
    const nodeMarkup = nodes
      .map((bullet, index) => {
        const x = 160 + index * 280;
        return [
          `<circle cx="${x}" cy="388" r="66" fill="${accent.soft}" />`,
          `<circle cx="${x}" cy="388" r="47" fill="${accent.base}" fill-opacity="0.17" />`,
          `<rect x="${x - 96}" y="482" width="192" height="74" rx="22" fill="${palette.surface}" stroke="${palette.border}" />`,
          `<text x="${x}" y="528" text-anchor="middle" font-size="18" font-weight="600" fill="${palette.text}">${this.escape(
            this.compact(bullet, 24),
          )}</text>`,
        ].join('');
      })
      .join('');
    const connectorMarkup = nodes
      .slice(1)
      .map((_, index) => {
        const start = 160 + index * 280 + 66;
        const end = 160 + (index + 1) * 280 - 66;
        return `<path d="M ${start} 388 C ${start + 55} 328, ${end - 55} 448, ${end} 388" stroke="${accent.base}" stroke-width="5" fill="none" stroke-linecap="round" stroke-opacity="0.55" />`;
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<defs>',
      '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
      `<stop offset="0%" stop-color="${palette.background}" />`,
      `<stop offset="100%" stop-color="${palette.surfaceAlt}" />`,
      '</linearGradient>',
      '</defs>',
      '<rect width="1280" height="720" fill="url(#bg)" />',
      `<circle cx="1088" cy="120" r="150" fill="${palette.accentSoft}" />`,
      `<circle cx="1018" cy="186" r="88" fill="${accent.soft}" />`,
      `<rect x="72" y="68" width="1136" height="584" rx="36" fill="${palette.surface}" stroke="${palette.border}" />`,
      `<rect x="98" y="98" width="184" height="36" rx="18" fill="${accent.soft}" />`,
      `<text x="190" y="121" text-anchor="middle" font-size="16" font-weight="700" fill="${accent.base}">${this.escape(
        slide.sectionLabel ?? 'INSIGHT',
      )}</text>`,
      `<text x="100" y="184" font-size="42" font-weight="700" fill="${palette.text}">${this.escape(
        slide.title,
      )}</text>`,
      `<text x="100" y="226" font-size="20" fill="${palette.mutedText}">${this.escape(this.compact(goal, 74))}</text>`,
      connectorMarkup,
      nodeMarkup,
      '</svg>',
    ].join('');
  }

  private buildCoverAccentSvg(slide: SlideSpec, palette: SvgPalette): string {
    const accent = this.resolveAccent(slide.accentTone, palette);
    const safeTitle = this.escape(slide.title ?? 'Presentation');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="420" viewBox="0 0 480 420">',
      '<rect width="480" height="420" rx="24" fill="#0B1F33" />',
      `<circle cx="380" cy="90" r="180" fill="${accent.soft}" fill-opacity="0.18" />`,
      `<circle cx="100" cy="340" r="120" fill="${accent.base}" fill-opacity="0.12" />`,
      `<rect x="36" y="36" width="56" height="4" rx="2" fill="${accent.base}" />`,
      `<text x="36" y="80" font-size="28" font-weight="700" fill="#FFFFFF">${safeTitle}</text>`,
      '<line x1="36" y1="100" x2="444" y2="100" stroke="#1A3A52" stroke-width="1" />',
      `<circle cx="240" cy="220" r="64" fill="${accent.base}" fill-opacity="0.2" />`,
      `<circle cx="240" cy="220" r="40" fill="${accent.base}" fill-opacity="0.35" />`,
      '<text x="240" y="228" text-anchor="middle" font-size="22" font-weight="700" fill="#FFFFFF">&#9658;</text>',
      `<rect x="60" y="310" width="160" height="6" rx="3" fill="${accent.soft}" fill-opacity="0.4" />`,
      `<rect x="60" y="330" width="120" height="6" rx="3" fill="${accent.soft}" fill-opacity="0.25" />`,
      `<rect x="60" y="350" width="80" height="6" rx="3" fill="${accent.soft}" fill-opacity="0.15" />`,
      '</svg>',
    ].join('');
  }

  private buildHeroSceneSvg(slide: SlideSpec, goal: string, palette: SvgPalette): string {
    const accent = this.resolveAccent(slide.accentTone, palette);
    const bullets = slide.bullets.slice(0, 3);
    const statCards = bullets
      .map((bullet, index) => {
        const x = 720 + index * 152;
        const y = 180 + (index % 2) * 150;
        return [
          `<rect x="${x}" y="${y}" width="132" height="120" rx="24" fill="${palette.surface}" stroke="${accent.soft}" />`,
          `<rect x="${x + 18}" y="${y + 18}" width="42" height="8" rx="4" fill="${accent.base}" fill-opacity="0.22" />`,
          `<text x="${x + 18}" y="${y + 64}" font-size="24" font-weight="700" fill="${palette.text}">${String(index + 1).padStart(2, '0')}</text>`,
          `<text x="${x + 18}" y="${y + 92}" font-size="15" fill="${palette.mutedText}">${this.escape(this.compact(bullet, 18))}</text>`,
        ].join('');
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<defs>',
      '<linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">',
      `<stop offset="0%" stop-color="${palette.background}" />`,
      `<stop offset="100%" stop-color="${palette.surfaceAlt}" />`,
      '</linearGradient>',
      '</defs>',
      '<rect width="1280" height="720" fill="url(#hero-bg)" />',
      `<circle cx="1050" cy="120" r="170" fill="${accent.soft}" />`,
      `<circle cx="1118" cy="208" r="96" fill="${accent.base}" fill-opacity="0.14" />`,
      `<rect x="72" y="68" width="1136" height="584" rx="40" fill="${palette.surface}" stroke="${palette.border}" />`,
      `<rect x="96" y="96" width="180" height="36" rx="18" fill="${accent.soft}" />`,
      `<text x="186" y="120" text-anchor="middle" font-size="15" font-weight="700" fill="${accent.base}">${this.escape(
        slide.sectionLabel ?? 'HERO',
      )}</text>`,
      `<text x="96" y="190" font-size="46" font-weight="700" fill="${palette.text}">${this.escape(this.compact(slide.title, 28))}</text>`,
      `<text x="96" y="236" font-size="21" fill="${palette.mutedText}">${this.escape(this.compact(goal, 76))}</text>`,
      `<rect x="96" y="284" width="500" height="250" rx="32" fill="${accent.soft}" fill-opacity="0.6" />`,
      `<circle cx="252" cy="408" r="84" fill="${accent.base}" fill-opacity="0.16" />`,
      `<circle cx="252" cy="408" r="46" fill="${accent.base}" fill-opacity="0.28" />`,
      `<path d="M 360 340 C 430 300, 500 300, 560 352" stroke="${accent.base}" stroke-width="7" fill="none" stroke-linecap="round" stroke-opacity="0.5" />`,
      `<path d="M 360 410 C 430 370, 500 370, 560 422" stroke="${accent.base}" stroke-width="7" fill="none" stroke-linecap="round" stroke-opacity="0.35" />`,
      `<rect x="388" y="458" width="150" height="54" rx="20" fill="${palette.surface}" stroke="${accent.base}" stroke-opacity="0.2" />`,
      `<text x="463" y="492" text-anchor="middle" font-size="18" font-weight="700" fill="${palette.text}">${this.escape(
        this.compact(slide.highlight ?? 'Key idea', 18),
      )}</text>`,
      statCards,
      '</svg>',
    ].join('');
  }

  private buildComparisonSvg(slide: SlideSpec, palette: SvgPalette): string {
    const accent = this.resolveAccent(slide.accentTone, palette);
    const columns = slide.bullets.slice(0, 4);
    const cards = columns
      .map((bullet, index) => {
        const x = 122 + (index % 2) * 286;
        const y = 218 + Math.floor(index / 2) * 164;
        return [
          `<rect x="${x}" y="${y}" width="242" height="126" rx="26" fill="${palette.surface}" stroke="${palette.border}" />`,
          `<rect x="${x + 22}" y="${y + 22}" width="46" height="10" rx="5" fill="${accent.base}" fill-opacity="0.22" />`,
          `<text x="${x + 22}" y="${y + 76}" font-size="22" font-weight="700" fill="${palette.text}">${String(
            index + 1,
          ).padStart(2, '0')}</text>`,
          `<text x="${x + 22}" y="${y + 104}" font-size="18" fill="${palette.mutedText}">${this.escape(
            this.compact(bullet, 26),
          )}</text>`,
        ].join('');
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      `<rect width="1280" height="720" fill="${palette.background}" />`,
      `<circle cx="1016" cy="182" r="126" fill="${accent.soft}" />`,
      `<rect x="72" y="68" width="1136" height="584" rx="36" fill="${palette.surface}" stroke="${palette.border}" />`,
      `<text x="108" y="164" font-size="40" font-weight="700" fill="${palette.text}">${this.escape(
        slide.title,
      )}</text>`,
      `<path d="M 786 214 C 860 166, 958 166, 1032 214 S 1178 262, 1190 232" stroke="${accent.base}" stroke-width="6" fill="none" stroke-linecap="round" stroke-opacity="0.5" />`,
      cards,
      '</svg>',
    ].join('');
  }

  private buildSummarySvg(slide: SlideSpec, palette: SvgPalette): string {
    const accent = this.resolveAccent(slide.accentTone, palette);
    const bullets = slide.bullets.slice(0, 4);
    const ringMarkup = bullets
      .map((bullet, index) => {
        const angle = (-90 + index * 90) * (Math.PI / 180);
        const cx = 640 + Math.cos(angle) * 190;
        const cy = 360 + Math.sin(angle) * 150;
        return [
          `<circle cx="${cx}" cy="${cy}" r="64" fill="${palette.surface}" stroke="${palette.border}" />`,
          `<circle cx="${cx}" cy="${cy}" r="38" fill="${accent.soft}" />`,
          `<text x="${cx}" y="${cy + 92}" text-anchor="middle" font-size="18" fill="${palette.mutedText}">${this.escape(
            this.compact(bullet, 18),
          )}</text>`,
        ].join('');
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      `<rect width="1280" height="720" fill="${palette.background}" />`,
      `<rect x="72" y="68" width="1136" height="584" rx="36" fill="${palette.surface}" stroke="${palette.border}" />`,
      `<circle cx="640" cy="360" r="172" fill="${accent.soft}" />`,
      `<circle cx="640" cy="360" r="110" fill="${accent.base}" fill-opacity="0.14" />`,
      `<text x="640" y="348" text-anchor="middle" font-size="18" font-weight="700" fill="${accent.base}">SUMMARY</text>`,
      `<text x="640" y="382" text-anchor="middle" font-size="30" font-weight="700" fill="${palette.text}">${this.escape(
        this.compact(slide.title, 18),
      )}</text>`,
      ringMarkup,
      '</svg>',
    ].join('');
  }

  private resolveAccent(
    accentTone: SlideSpec['accentTone'],
    palette?: SvgPalette,
  ): { base: string; soft: string } {
    if ((!accentTone || accentTone === 'teal') && palette) {
      return { base: palette.accent, soft: palette.accentSoft };
    }

    if (accentTone === 'blue') {
      return { base: '#2563EB', soft: '#DBEAFE' };
    }

    if (accentTone === 'amber') {
      return { base: '#D97706', soft: '#FDE7C7' };
    }

    return { base: '#0F766E', soft: '#D7F3EE' };
  }

  private compact(value: string, maxLength: number): string {
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3).trim()}...` : trimmed;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
