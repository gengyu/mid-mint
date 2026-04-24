import path from 'node:path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { ensureDir } from '../../common/utils/file.util';
import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import {
  PptDslDocument,
  PptDslElement,
  PptDslListElement,
  PptDslSlide,
  PptDslSlideRole,
  PptDslSvgElement,
  PptDslTableElement,
  PptDslCodeElement,
  PptDslFormulaElement,
  PptDslMermaidElement,
  PptDslTextElement,
  PptDslShapeElement,
  PptDslGroupElement,
} from '../ppt-dsl/ppt-dsl.types';

interface RegionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.locked = false;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

@Injectable()
export class PptxRendererService {
  private readonly renderMutex = new AsyncMutex();

  async renderFromDsl(filePath: string, dsl: PptDslDocument): Promise<void> {
    return this.renderMutex.runExclusive(async () => {
      await ensureDir(path.dirname(filePath));

      const globalScope = globalThis as any;
      const previousValues = {
        window: globalScope.window,
        document: globalScope.document,
        navigator: globalScope.navigator,
        XMLHttpRequest: globalScope.XMLHttpRequest,
        FileReader: globalScope.FileReader,
      };

      this.clearBrowserGlobals(globalScope);

      try {
        const pptx = new PptxGenJS();
        pptx.layout = PPT_LAYOUT;
        pptx.author = PPT_AUTHOR;
        pptx.company = 'mid-mint';
        pptx.subject = dsl.deck.title;
        pptx.title = dsl.deck.title;

        const displayFont = dsl.design.tokens.typography.display?.font ?? 'Aptos Display';
        const bodyFont = dsl.design.tokens.typography.body?.font ?? 'Aptos';
        pptx.theme = {
          headFontFace: displayFont,
          bodyFontFace: bodyFont,
        };

        for (const slide of dsl.slides) {
          const pptSlide = pptx.addSlide();
          this.renderDslSlide(pptSlide, slide, dsl);

          if (slide.speakerNotes) {
            pptSlide.addNotes(slide.speakerNotes);
          }
        }

        await pptx.writeFile({ fileName: filePath, compression: true });
      } finally {
        this.restoreGlobalValue(globalScope, 'window', previousValues.window);
        this.restoreGlobalValue(globalScope, 'document', previousValues.document);
        this.restoreGlobalValue(globalScope, 'navigator', previousValues.navigator);
        this.restoreGlobalValue(globalScope, 'XMLHttpRequest', previousValues.XMLHttpRequest);
        this.restoreGlobalValue(globalScope, 'FileReader', previousValues.FileReader);
      }
    });
  }

  private renderDslSlide(pptSlide: PptxGenJS.Slide, slide: PptDslSlide, dsl: PptDslDocument): void {
    const colors = this.resolveColors(dsl);
    const fonts = this.resolveFonts(dsl);
    const isInverse = slide.role === 'cover' || slide.role === 'section-divider';
    const background = isInverse ? colors.inverseBackground : colors.background;
    const primaryText = isInverse ? colors.inverseText : colors.textPrimary;
    const secondaryText = isInverse ? colors.accentSoft : colors.textSecondary;

    pptSlide.background = { color: this.toPptxColor(background, 'F6F8FC') };
    pptSlide.addShape('rect', {
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      fill: { color: this.toPptxColor(background, 'F6F8FC') },
      line: { color: this.toPptxColor(background, 'F6F8FC') },
    });

    this.renderAccentLayer(pptSlide, slide, colors, isInverse);

    const sortedElements = [...slide.elements].sort((a, b) => a.layer - b.layer);
    for (const element of sortedElements) {
      this.renderElement(pptSlide, element, slide, dsl, colors, fonts, primaryText, secondaryText, isInverse);
    }
  }

  private renderElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslElement,
    slide: PptDslSlide,
    dsl: PptDslDocument,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
    primaryText: string,
    secondaryText: string,
    isInverse: boolean,
  ): void {
    switch (element.kind) {
      case 'text':
      case 'rich-text':
      case 'statement':
      case 'quote':
      case 'badge':
        this.renderTextElement(pptSlide, element as PptDslTextElement, slide, colors, fonts, primaryText, secondaryText, isInverse);
        break;
      case 'list':
        this.renderListElement(pptSlide, element as PptDslListElement, slide, colors, fonts, primaryText, secondaryText);
        break;
      case 'table':
        this.renderTableElement(pptSlide, element as PptDslTableElement, slide, colors, fonts);
        break;
      case 'code':
        this.renderCodeElement(pptSlide, element as PptDslCodeElement, slide, colors, fonts);
        break;
      case 'formula':
      case 'mermaid':
        this.renderAssetElement(pptSlide, element as PptDslFormulaElement | PptDslMermaidElement, slide, dsl, colors, isInverse);
        break;
      case 'svg':
        this.renderSvgElement(pptSlide, element as PptDslSvgElement, slide, dsl, colors, isInverse);
        break;
      case 'shape':
      case 'connector':
      case 'card':
        this.renderShapeElement(pptSlide, element as PptDslShapeElement, slide, colors, isInverse);
        break;
      case 'group':
        this.renderGroupElement(pptSlide, element as PptDslGroupElement, slide, dsl, colors, fonts, primaryText, secondaryText, isInverse);
        break;
    }
  }

  private renderTextElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslTextElement,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
    primaryText: string,
    secondaryText: string,
    isInverse: boolean,
  ): void {
    const box = this.resolveSlotBox(slide, element.slot ?? 'content');
    if (!box) return;

    const fontSize = this.resolveFontSize(element);
    const color = this.resolveElementColor(element, primaryText, secondaryText, colors, isInverse);
    const isBold = element.textRole === 'title' || element.textRole === 'eyebrow' || element.textRole === 'takeaway';

    if (element.textRole === 'eyebrow') {
      pptSlide.addText(element.text, {
        x: box.x, y: box.y, w: box.w, h: Math.min(0.34, box.h),
        fontSize: 11, bold: true,
        color: this.toPptxColor(isInverse ? colors.accentSoft : colors.accent, '0F766E'),
        fontFace: fonts.body, fit: 'shrink',
      });
    } else if (element.textRole === 'title') {
      pptSlide.addText(element.text, {
        x: box.x, y: box.y, w: box.w, h: Math.max(0.72, box.h),
        fontSize: element.text.length > 32 ? 23 : 27, bold: true,
        color: this.toPptxColor(color, '102033'),
        fontFace: fonts.display, fit: 'shrink', breakLine: true,
      });
    } else if (element.textRole === 'subtitle') {
      pptSlide.addText(element.text, {
        x: box.x, y: box.y, w: Math.min(7.2, box.w), h: 1.0,
        fontSize: 14,
        color: this.toPptxColor(color, '5B6B7F'),
        fontFace: fonts.body, fit: 'shrink', breakLine: true,
      });
    } else if (element.textRole === 'takeaway') {
      const fill = isInverse ? colors.accent : colors.surfaceAlt;
      const textColor = isInverse ? colors.inverseBackground : primaryText;
      pptSlide.addShape('roundRect', {
        x: box.x, y: box.y, w: box.w, h: Math.min(0.74, box.h),
        rectRadius: 0.1,
        fill: { color: this.toPptxColor(fill, 'E8EEF5') },
        line: { color: this.toPptxColor(isInverse ? colors.accent : colors.border, 'D9E3F0'), width: 0.8 },
      });
      pptSlide.addText(element.text, {
        x: box.x + 0.25, y: box.y + 0.08,
        w: Math.max(0.8, box.w - 0.5), h: Math.max(0.24, Math.min(0.74, box.h) - 0.16),
        fontSize: 13, bold: true,
        color: this.toPptxColor(textColor, '102033'),
        fit: 'shrink', valign: 'middle', fontFace: fonts.body,
      });
    } else if (element.kind === 'quote') {
      pptSlide.addShape('roundRect', {
        x: box.x, y: box.y, w: box.w, h: box.h,
        rectRadius: 0.14,
        fill: { color: this.toPptxColor(isInverse ? colors.inverseBackground : colors.surface, 'FFFFFF'), transparency: isInverse ? 100 : 0 },
        line: { color: this.toPptxColor(isInverse ? colors.accent : colors.border, 'D9E3F0'), width: isInverse ? 0 : 1 },
      });
      pptSlide.addText(element.text, {
        x: box.x + 0.35, y: box.y + 0.35,
        w: Math.max(1, box.w - 0.7), h: Math.max(1, box.h - 1.0),
        fontSize: 22, bold: true,
        color: this.toPptxColor(primaryText, '102033'),
        valign: 'middle', fit: 'shrink', fontFace: fonts.display, breakLine: true,
      });
    } else {
      pptSlide.addText(element.text, {
        x: box.x, y: box.y, w: box.w, h: box.h,
        fontSize: fontSize || 14,
        color: this.toPptxColor(color, '5B6B7F'),
        fontFace: fonts.body, fit: 'shrink', breakLine: true,
      });
    }
  }

  private renderListElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslListElement,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
    primaryText: string,
    _secondaryText: string,
  ): void {
    const box = this.resolveSlotBox(slide, element.slot ?? 'content');
    if (!box) return;

    if (slide.role === 'process') {
      const steps = element.items.slice(0, 5);
      if (steps.length === 0) return;
      const cardW = Math.max(1.4, (box.w - (steps.length - 1) * 0.16) / steps.length);
      steps.forEach((step, index) => {
        const x = box.x + index * (cardW + 0.16);
        pptSlide.addShape('roundRect', {
          x, y: box.y, w: cardW, h: box.h, rectRadius: 0.12,
          fill: { color: this.toPptxColor(index % 2 === 0 ? colors.surface : colors.surfaceAlt, 'FFFFFF') },
          line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 1 },
        });
        pptSlide.addText(String(index + 1).padStart(2, '0'), {
          x: x + 0.18, y: box.y + 0.24, w: 0.52, h: 0.28,
          fontSize: 11, bold: true,
          color: this.toPptxColor(colors.accent, '0F766E'), fontFace: fonts.body,
        });
        pptSlide.addText(step, {
          x: x + 0.18, y: box.y + 0.82,
          w: Math.max(0.8, cardW - 0.36), h: Math.max(0.8, box.h - 1.08),
          fontSize: 13, bold: true,
          color: this.toPptxColor(primaryText, '102033'),
          valign: 'middle', fit: 'shrink', fontFace: fonts.body,
        });
      });
      return;
    }

    if (slide.role === 'agenda') {
      const items = element.items.slice(0, 6);
      const rowH = Math.min(0.74, Math.max(0.48, (box.h - 0.2) / Math.max(1, items.length)));
      items.forEach((item, index) => {
        const y = box.y + index * rowH;
        pptSlide.addShape('roundRect', {
          x: box.x, y, w: box.w, h: rowH - 0.12, rectRadius: 0.08,
          fill: { color: this.toPptxColor(index % 2 === 0 ? colors.surface : colors.surfaceAlt, 'FFFFFF') },
          line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 0.8 },
        });
        pptSlide.addText(String(index + 1).padStart(2, '0'), {
          x: box.x + 0.22, y: y + 0.12, w: 0.48, h: 0.24,
          fontSize: 10, bold: true,
          color: this.toPptxColor(colors.accent, '0F766E'), fontFace: fonts.body,
        });
        pptSlide.addText(item, {
          x: box.x + 0.86, y: y + 0.08,
          w: Math.max(1, box.w - 1.2), h: rowH - 0.24,
          fontSize: 14, bold: true,
          color: this.toPptxColor(primaryText, '102033'),
          fit: 'shrink', fontFace: fonts.body,
        });
      });
      return;
    }

    pptSlide.addText(
      element.items.slice(0, 5).map((item) => ({
        text: item,
        options: { bullet: { indent: 14 } },
      })),
      {
        x: box.x, y: box.y, w: box.w, h: box.h,
        fontSize: 14,
        color: this.toPptxColor(primaryText, '102033'),
        breakLine: true, paraSpaceAfter: 8, fit: 'shrink', fontFace: fonts.body,
      },
    );
  }

  private renderTableElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslTableElement,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
  ): void {
    const box = this.resolveSlotBox(slide, element.slot ?? 'content');
    if (!box) return;

    const rows = element.headers ? [element.headers, ...element.rows] : element.rows;
    pptSlide.addTable(
      rows.map((row, rowIndex) =>
        row.map((cell) => ({
          text: cell,
          options: {
            fontSize: 12,
            bold: rowIndex === 0 && Boolean(element.headers),
            color: rowIndex === 0 ? colors.accent : colors.textPrimary,
            fill: { color: this.toPptxColor(rowIndex % 2 === 0 ? colors.surface : colors.surfaceAlt, 'FFFFFF') },
            fontFace: fonts.body,
          },
        })),
      ),
      {
        x: box.x, y: box.y, w: box.w,
        fontSize: 12, fontFace: fonts.body,
        border: { type: 'solid', pt: 0.5, color: this.toPptxColor(colors.border, 'D9E3F0') },
        colW: box.w / Math.max(1, (element.headers?.length ?? element.rows[0]?.length ?? 1)),
      },
    );
  }

  private renderCodeElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslCodeElement,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
  ): void {
    const box = this.resolveSlotBox(slide, element.slot ?? 'content');
    if (!box) return;

    pptSlide.addShape('roundRect', {
      x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.12,
      fill: { color: this.toPptxColor(colors.surfaceAlt, 'E8EEF5') },
      line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 1 },
    });
    pptSlide.addText(element.code, {
      x: box.x + 0.22, y: box.y + 0.22,
      w: Math.max(1, box.w - 0.44), h: Math.max(1, box.h - 0.44),
      fontSize: 11,
      color: this.toPptxColor(colors.textPrimary, '102033'),
      fontFace: fonts.mono, fit: 'shrink', breakLine: true,
      valign: 'top',
    });
  }

  private renderAssetElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslFormulaElement | PptDslMermaidElement,
    slide: PptDslSlide,
    dsl: PptDslDocument,
    colors: ReturnType<typeof this.resolveColors>,
    isInverse: boolean,
  ): void {
    const asset = dsl.assets?.find((a) => a.elementId === element.id);
    if (!asset) return;

    const box = this.resolveSlotBox(slide, element.slot ?? 'visual');
    if (!box) return;

    const fill = isInverse ? colors.surface : colors.surface;
    const border = isInverse ? colors.accentSoft : colors.border;

    pptSlide.addShape('roundRect', {
      x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.12,
      fill: { color: this.toPptxColor(fill, 'FFFFFF'), transparency: isInverse ? 88 : 0 },
      line: { color: this.toPptxColor(border, 'D9E3F0'), width: 1 },
    });

    const label = element.kind === 'formula' ? 'Formula' : 'Diagram';
    pptSlide.addText(label, {
      x: box.x + 0.22, y: box.y + 0.22,
      w: Math.max(1, box.w - 0.44), h: Math.max(0.4, (box.h - 0.44) / 2),
      fontSize: 11, bold: true,
      color: this.toPptxColor(colors.accent, '0F766E'),
      fontFace: 'Aptos', valign: 'middle',
    });

    const content = element.kind === 'formula'
      ? (element as PptDslFormulaElement).formula
      : (element as PptDslMermaidElement).definition;
    if (content) {
      pptSlide.addText(this.compact(content, 120), {
        x: box.x + 0.22, y: box.y + 0.72,
        w: Math.max(1, box.w - 0.44), h: Math.max(0.8, box.h - 1.16),
        fontSize: 10,
        color: this.toPptxColor(colors.textSecondary, '5B6B7F'),
        fontFace: 'Aptos Mono', fit: 'shrink', breakLine: true, valign: 'top',
      });
    }
  }

  private renderSvgElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslSvgElement,
    slide: PptDslSlide,
    dsl: PptDslDocument,
    colors: ReturnType<typeof this.resolveColors>,
    isInverse: boolean,
  ): void {
    const asset = dsl.assets?.find((a) => a.elementId === element.id);
    if (!asset) return;

    const box = this.resolveSlotBox(slide, element.slot ?? (slide.role === 'cover' ? 'heroVisual' : 'visual'));
    if (!box) return;

    const fill = isInverse ? colors.surface : colors.surface;
    const border = isInverse ? colors.accentSoft : colors.border;

    if (box.w > SLIDE_W - 0.1 || box.h > SLIDE_H - 0.1) {
      pptSlide.addShape('roundRect', {
        x: box.x + 0.3, y: box.y + 0.3,
        w: Math.max(1, box.w - 0.6), h: Math.max(1, box.h - 0.6),
        rectRadius: 0.12,
        fill: { color: this.toPptxColor(fill, 'FFFFFF'), transparency: isInverse ? 88 : 0 },
        line: { color: this.toPptxColor(border, 'D9E3F0'), width: 1 },
      });

      const prompt = element.generationPrompt ?? 'Visual';
      pptSlide.addText(this.compact(prompt, 80), {
        x: box.x + 0.52, y: box.y + 0.52,
        w: Math.max(1, box.w - 1.04), h: Math.max(0.8, box.h - 1.2),
        fontSize: 12,
        color: this.toPptxColor(colors.textSecondary, '5B6B7F'),
        fontFace: 'Aptos', fit: 'shrink', valign: 'middle', align: 'center',
      });
      return;
    }

    pptSlide.addShape('roundRect', {
      x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.12,
      fill: { color: this.toPptxColor(fill, 'FFFFFF'), transparency: isInverse ? 88 : 0 },
      line: { color: this.toPptxColor(border, 'D9E3F0'), width: 1 },
    });

    const prompt = element.generationPrompt ?? 'Visual';
    pptSlide.addText(this.compact(prompt, 80), {
      x: box.x + 0.22, y: box.y + 0.22,
      w: Math.max(1, box.w - 0.44), h: Math.max(0.8, box.h - 0.58),
      fontSize: 12,
      color: this.toPptxColor(colors.textSecondary, '5B6B7F'),
      fontFace: 'Aptos', fit: 'shrink', valign: 'middle', align: 'center',
    });
  }

  private renderShapeElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslShapeElement,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    _isInverse: boolean,
  ): void {
    const box = this.resolveSlotBox(slide, element.slot ?? 'content');
    if (!box) return;

    pptSlide.addShape('roundRect', {
      x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.12,
      fill: { color: this.toPptxColor(colors.surfaceAlt, 'E8EEF5') },
      line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 1 },
    });

    if (element.text) {
      pptSlide.addText(element.text, {
        x: box.x + 0.18, y: box.y + 0.18,
        w: Math.max(0.8, box.w - 0.36), h: Math.max(0.8, box.h - 0.36),
        fontSize: 13, bold: true,
        color: this.toPptxColor(colors.textPrimary, '102033'),
        valign: 'middle', fit: 'shrink', fontFace: 'Aptos',
      });
    }
  }

  private renderGroupElement(
    pptSlide: PptxGenJS.Slide,
    element: PptDslGroupElement,
    slide: PptDslSlide,
    dsl: PptDslDocument,
    colors: ReturnType<typeof this.resolveColors>,
    fonts: ReturnType<typeof this.resolveFonts>,
    primaryText: string,
    secondaryText: string,
    isInverse: boolean,
  ): void {
    for (const child of element.children) {
      this.renderElement(pptSlide, child, slide, dsl, colors, fonts, primaryText, secondaryText, isInverse);
    }
  }

  private renderAccentLayer(
    pptSlide: PptxGenJS.Slide,
    slide: PptDslSlide,
    colors: ReturnType<typeof this.resolveColors>,
    isInverse: boolean,
  ): void {
    if (slide.role === 'cover') {
      pptSlide.addShape('rect', {
        x: 9.6, y: 0, w: 3.73, h: SLIDE_H,
        fill: { color: this.toPptxColor(colors.accent, '0F766E'), transparency: 18 },
        line: { color: this.toPptxColor(colors.accent, '0F766E'), transparency: 100 },
      });
      return;
    }

    if (!isInverse) {
      pptSlide.addShape('rect', {
        x: 0, y: 0, w: SLIDE_W, h: 0.08,
        fill: { color: this.toPptxColor(colors.accent, '0F766E') },
        line: { color: this.toPptxColor(colors.accent, '0F766E') },
      });
    }
  }

  private resolveSlotBox(slide: PptDslSlide, slotName: string): RegionBox | null {
    const slot = slide.layout.slots[slotName];
    if (!slot) return null;

    const padding = slide.layout.frame.padding;
    const left = padding.left;
    const top = padding.top;
    const right = SLIDE_W - padding.right;
    const bottom = SLIDE_H - padding.bottom;
    const contentW = right - left;
    const contentH = bottom - top;
    const gap = slide.layout.frame.gap;
    const halfW = (contentW - gap) / 2;
    const titleH = Math.min(1.0, Math.max(0.58, contentH * 0.16));
    const footerH = Math.min(0.74, Math.max(0.42, contentH * 0.1));

    switch (slot.region) {
      case 'top':
        return { x: left, y: top, w: contentW, h: titleH };
      case 'top-left':
        return { x: left, y: top, w: halfW, h: titleH };
      case 'top-right':
        return { x: left + halfW + gap, y: top, w: halfW, h: titleH };
      case 'center':
        return { x: left, y: top + titleH + gap, w: contentW, h: contentH - titleH - footerH - gap * 2 };
      case 'center-left':
      case 'left-main':
        return { x: left, y: top + titleH + gap, w: halfW, h: contentH - titleH - footerH - gap * 2 };
      case 'center-right':
      case 'right-main':
        return { x: left + halfW + gap, y: top + titleH + gap, w: halfW, h: contentH - titleH - footerH - gap * 2 };
      case 'bottom':
        return { x: left, y: bottom - footerH, w: contentW, h: footerH };
      case 'bottom-left':
        return { x: left, y: bottom - footerH, w: halfW, h: footerH };
      case 'bottom-right':
        return { x: left + halfW + gap, y: bottom - footerH, w: halfW, h: footerH };
      case 'full-bleed':
        return { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H };
      default:
        return null;
    }
  }

  private resolveColors(dsl: PptDslDocument) {
    return {
      background: dsl.design.tokens.color.background ?? '#F6F8FC',
      surface: dsl.design.tokens.color.surface ?? '#FFFFFF',
      surfaceAlt: dsl.design.tokens.color.surfaceAlt ?? '#E8EEF5',
      textPrimary: dsl.design.tokens.color.textPrimary ?? '#102033',
      textSecondary: dsl.design.tokens.color.textSecondary ?? '#5B6B7F',
      accent: dsl.design.tokens.color.accent ?? '#0F766E',
      accentSoft: dsl.design.tokens.color.accentSoft ?? '#D9F2F5',
      border: dsl.design.tokens.color.border ?? '#D9E3F0',
      inverseBackground: dsl.design.tokens.color.inverseBackground ?? '#0B1F33',
      inverseText: dsl.design.tokens.color.inverseText ?? '#FFFFFF',
      warning: dsl.design.tokens.color.warning ?? '#F59E0B',
    };
  }

  private resolveFonts(dsl: PptDslDocument) {
    return {
      display: dsl.design.tokens.typography.display?.font ?? 'Aptos Display',
      body: dsl.design.tokens.typography.body?.font ?? 'Aptos',
      mono: dsl.design.tokens.typography.mono?.font ?? 'Courier New',
    };
  }

  private resolveFontSize(element: PptDslTextElement): number {
    switch (element.textRole) {
      case 'title': return 27;
      case 'subtitle': return 14;
      case 'eyebrow': return 11;
      case 'takeaway': return 13;
      case 'caption': return 9;
      default: return 14;
    }
  }

  private resolveElementColor(
    element: PptDslTextElement,
    primaryText: string,
    secondaryText: string,
    _colors: ReturnType<typeof this.resolveColors>,
    _isInverse: boolean,
  ): string {
    switch (element.textRole) {
      case 'title':
      case 'takeaway':
        return primaryText;
      default:
        return secondaryText;
    }
  }

  private clearBrowserGlobals(globalScope: any): void {
    delete globalScope.window;
    delete globalScope.document;
    delete globalScope.navigator;
    delete globalScope.XMLHttpRequest;
    delete globalScope.FileReader;
  }

  private restoreGlobalValue(globalScope: any, key: string, value: unknown): void {
    if (typeof value === 'undefined') {
      delete globalScope[key];
      return;
    }
    globalScope[key] = value;
  }

  private toPptxColor(value: string | undefined, fallback: string): string {
    if (!value) return fallback;
    const normalized = value.trim().replace(/^#/, '').toUpperCase();
    return /^[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
  }

  private compact(value: string, maxLength: number): string {
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3).trim()}...` : trimmed;
  }
}
