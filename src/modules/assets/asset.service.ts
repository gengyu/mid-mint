import { Injectable } from '@nestjs/common';

import katex from 'katex';
import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';

import {
  PptDslAsset,
  PptDslDocument,
  PptDslElement,
  PptDslFormulaElement,
  PptDslMermaidElement,
  PptDslSvgElement,
} from '../ppt-dsl/ppt-dsl.types';

export interface AssetGenerationResult {
  asset: PptDslAsset;
  fileName: string;
  svg: string;
}

@Injectable()
export class AssetService {
  async generateAssets(dsl: PptDslDocument): Promise<AssetGenerationResult[]> {
    const results: AssetGenerationResult[] = [];

    for (const slide of dsl.slides) {
      for (const element of slide.elements) {
        const result = await this.generateElementAsset(slide.id, element, dsl);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  applyAssetsToDsl(dsl: PptDslDocument, assets: AssetGenerationResult[]): PptDslDocument {
    const assetByElementId = new Map(assets.map((a) => [a.asset.elementId, a]));

    return {
      ...dsl,
      slides: dsl.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((element) => {
          const assetResult = assetByElementId.get(element.id);
          if (!assetResult) return element;

          if (element.kind === 'svg') {
            return {
              ...element,
              svg: assetResult.svg,
              assetId: assetResult.asset.id,
            } as PptDslSvgElement;
          }

          if (element.kind === 'mermaid') {
            return {
              ...element,
              assetId: assetResult.asset.id,
            } as PptDslMermaidElement;
          }

          if (element.kind === 'formula') {
            return {
              ...element,
              assetId: assetResult.asset.id,
            } as PptDslFormulaElement;
          }

          return element;
        }),
      })),
      assets: assets.map((a) => a.asset),
    };
  }

  private async generateElementAsset(
    slideId: string,
    element: PptDslElement,
    dsl: PptDslDocument,
  ): Promise<AssetGenerationResult | null> {
    if (element.kind === 'mermaid') {
      return this.generateMermaidAsset(slideId, element, dsl);
    }

    if (element.kind === 'formula') {
      return this.generateFormulaAsset(slideId, element, dsl);
    }

    if (element.kind === 'svg' && element.generationPrompt) {
      return this.generateSvgAsset(slideId, element, dsl);
    }

    return null;
  }

  private async generateMermaidAsset(
    slideId: string,
    element: PptDslMermaidElement,
    _dsl: PptDslDocument,
  ): Promise<AssetGenerationResult | null> {
    try {
      const svg = await this.renderMermaidSvg(element.definition, slideId);
      const assetId = `${slideId}-${element.id}-mermaid`;
      const fileName = `${slideId}-mermaid.svg`;

      return {
        asset: {
          id: assetId,
          type: 'mermaid-rendered',
          slideId,
          elementId: element.id,
          path: `assets/${fileName}`,
          source: 'rendered',
        },
        fileName,
        svg,
      };
    } catch {
      return null;
    }
  }

  private generateFormulaAsset(
    slideId: string,
    element: PptDslFormulaElement,
    _dsl: PptDslDocument,
  ): AssetGenerationResult | null {
    try {
      const svg = this.renderFormulaSvg(element.formula);
      const assetId = `${slideId}-${element.id}-formula`;
      const fileName = `${slideId}-formula.svg`;

      return {
        asset: {
          id: assetId,
          type: 'formula-rendered',
          slideId,
          elementId: element.id,
          path: `assets/${fileName}`,
          source: 'rendered',
        },
        fileName,
        svg,
      };
    } catch {
      return null;
    }
  }

  private generateSvgAsset(
    slideId: string,
    element: PptDslSvgElement,
    dsl: PptDslDocument,
  ): AssetGenerationResult {
    const svg = this.buildPlaceholderSvg(element, dsl);
    const assetId = `${slideId}-${element.id}-svg`;
    const fileName = `${slideId}.svg`;

    return {
      asset: {
        id: assetId,
        type: 'svg',
        slideId,
        elementId: element.id,
        path: `assets/${fileName}`,
        source: 'generated',
      },
      fileName,
      svg,
    };
  }

  private async renderMermaidSvg(definition: string, slideId: string): Promise<string> {
    return this.withMermaidEnvironment(async () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'neutral',
        fontFamily: 'Aptos, Arial, sans-serif',
      });
      const { svg } = await mermaid.render(`${slideId}-${Date.now()}`, definition);
      return svg
        .replace(/height="[^"]*"/, 'height="720"')
        .replace(/width="[^"]*"/, 'width="1280"')
        .replace(/style="max-width:\s*[^;"]+;?"/g, '')
        .replace('<svg ', '<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" ');
    });
  }

  private renderFormulaSvg(formula: string): string {
    const rendered = katex.renderToString(this.stripFormulaDelimiters(formula), {
      throwOnError: false,
      displayMode: true,
      output: 'html',
      strict: 'ignore',
    });
    const safeFormula = this.escape(this.stripFormulaDelimiters(formula));

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<rect width="1280" height="720" fill="#F4F8FC" />',
      '<rect x="72" y="68" width="1136" height="584" rx="36" fill="#FFFFFF" stroke="#D9E3F0" />',
      '<foreignObject x="120" y="210" width="1040" height="300">',
      '<div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;height:100%;align-items:center;justify-content:center;padding:24px;color:#102033;font-size:32px;">',
      rendered,
      '</div>',
      '</foreignObject>',
      `<text x="640" y="610" text-anchor="middle" font-size="24" fill="#5B6B7D">${safeFormula}</text>`,
      '</svg>',
    ].join('');
  }

  private buildPlaceholderSvg(element: PptDslSvgElement, dsl: PptDslDocument): string {
    const accent = dsl.design.tokens.color.accent ?? '#0F766E';
    const accentSoft = dsl.design.tokens.color.accentSoft ?? '#D9F2F5';
    const text = dsl.design.tokens.color.textPrimary ?? '#102033';
    const mutedText = dsl.design.tokens.color.textSecondary ?? '#5B6B7F';
    const background = dsl.design.tokens.color.background ?? '#F6F8FC';
    const surface = dsl.design.tokens.color.surface ?? '#FFFFFF';
    const border = dsl.design.tokens.color.border ?? '#D9E3F0';
    const prompt = element.generationPrompt ?? 'Visual';

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<defs>',
      '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
      `<stop offset="0%" stop-color="${background}" />`,
      `<stop offset="100%" stop-color="${accentSoft}" />`,
      '</linearGradient>',
      '</defs>',
      '<rect width="1280" height="720" fill="url(#bg)" />',
      `<circle cx="1050" cy="120" r="170" fill="${accentSoft}" />`,
      `<circle cx="1118" cy="208" r="96" fill="${accent}" fill-opacity="0.14" />`,
      `<rect x="72" y="68" width="1136" height="584" rx="40" fill="${surface}" stroke="${border}" />`,
      `<rect x="96" y="96" width="180" height="36" rx="18" fill="${accentSoft}" />`,
      `<text x="186" y="120" text-anchor="middle" font-size="15" font-weight="700" fill="${accent}">VISUAL</text>`,
      `<text x="96" y="190" font-size="46" font-weight="700" fill="${text}">${this.escape(this.compact(prompt, 28))}</text>`,
      `<rect x="96" y="284" width="500" height="250" rx="32" fill="${accentSoft}" fill-opacity="0.6" />`,
      `<circle cx="252" cy="408" r="84" fill="${accent}" fill-opacity="0.16" />`,
      `<circle cx="252" cy="408" r="46" fill="${accent}" fill-opacity="0.28" />`,
      `<text x="640" y="680" text-anchor="middle" font-size="16" fill="${mutedText}">${this.escape(this.compact(prompt, 76))}</text>`,
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
    globalScope.DOMPurify = { sanitize: (value: string) => value };

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

  private restoreGlobalValue(globalScope: any, key: string, value: unknown): void {
    if (typeof value === 'undefined') {
      delete globalScope[key];
      return;
    }
    globalScope[key] = value;
  }

  private stripFormulaDelimiters(formula: string): string {
    return formula.replace(/^\$\$?/, '').replace(/\$\$?$/, '').trim();
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private compact(value: string, maxLength: number): string {
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3).trim()}...` : trimmed;
  }
}
