import path from 'node:path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { ensureDir } from '../../common/utils/file.util';
import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import { DesignPlan } from '../design/design.types';
import { SlideLayoutMeta, SlideLayoutSlot, SlideSpec } from '../slides/slide.types';

interface RegionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

@Injectable()
export class PptxRendererService {
  async render(
    filePath: string,
    title: string,
    slides: SlideSpec[],
    designPlan?: DesignPlan,
  ): Promise<void> {
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
      pptx.subject = title;
      pptx.title = title;
      pptx.theme = {
        headFontFace: designPlan?.typographyTokens.displayFont ?? 'Aptos Display',
        bodyFontFace: designPlan?.typographyTokens.bodyFont ?? 'Aptos',
      };

      for (const spec of slides) {
        const slide = pptx.addSlide();
        this.renderSlide(slide, spec, designPlan);

        if (spec.notes) {
          slide.addNotes(spec.notes);
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
  }

  private renderSlide(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    designPlan?: DesignPlan,
  ): void {
    const colors = this.getColors(designPlan);
    const fonts = this.getFonts(designPlan);
    const isInverse = spec.layout === 'cover' || spec.layout === 'section-divider';
    const background = isInverse ? colors.inverseBackground : colors.background;
    const primaryText = isInverse ? colors.inverseText : colors.textPrimary;
    const secondaryText = isInverse ? colors.accentSoft : colors.textSecondary;

    slide.background = { color: this.toPptxColor(background, isInverse ? '0B1F33' : 'F6F8FC') };
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
      fill: { color: this.toPptxColor(background, 'F6F8FC') },
      line: { color: this.toPptxColor(background, 'F6F8FC') },
    });

    this.renderAccentLayer(slide, spec, colors, isInverse);
    this.renderTextRegions(slide, spec, colors, fonts, primaryText, secondaryText, isInverse);
    this.renderVisualRegion(slide, spec, colors, isInverse);
  }

  private renderTextRegions(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
    primaryText: string,
    secondaryText: string,
    isInverse: boolean,
  ): void {
    const eyebrow = this.resolveSlotBox(spec, 'eyebrow', { x: 0.7, y: 0.45, w: 2.8, h: 0.3 });
    const title = this.resolveSlotBox(spec, 'title', { x: 0.7, y: 0.82, w: 10.6, h: 0.8 });
    const content = this.resolveSlotBox(spec, 'content', { x: 0.7, y: 1.75, w: 6.4, h: 4.5 });
    const quote = this.resolveSlotBox(spec, 'quote', content);
    const steps = this.resolveSlotBox(spec, 'steps', content);
    const takeaway = this.resolveSlotBox(spec, 'takeaway', {
      x: 7.7,
      y: 1.85,
      w: 4.6,
      h: 3.4,
    });

    slide.addText(spec.eyebrow ?? this.defaultEyebrow(spec), {
      ...this.fitBox(eyebrow, 0.34),
      fontSize: 11,
      bold: true,
      color: this.toPptxColor(isInverse ? colors.accentSoft : colors.accent, '0F766E'),
      fontFace: fonts.body,
      fit: 'shrink',
    });

    slide.addText(spec.title, {
      ...this.fitBox(title, Math.max(0.72, title.h)),
      fontSize: spec.title.length > 32 ? 23 : 27,
      bold: true,
      color: this.toPptxColor(primaryText, '102033'),
      fontFace: fonts.display,
      fit: 'shrink',
      breakLine: true,
    });

    if (spec.subtitle) {
      slide.addText(spec.subtitle, {
        x: title.x,
        y: Math.min(title.y + title.h + 0.18, 4.25),
        w: Math.min(7.2, title.w),
        h: 1.0,
        fontSize: 14,
        color: this.toPptxColor(secondaryText, '5B6B7F'),
        fontFace: fonts.body,
        fit: 'shrink',
        breakLine: true,
      });
    }

    if (spec.layout === 'quote') {
      this.renderQuote(slide, spec, quote, colors, fonts, primaryText, secondaryText, isInverse);
      return;
    }

    if (spec.layout === 'process') {
      this.renderSteps(slide, spec, steps, colors, fonts, isInverse);
      this.renderTakeaway(slide, spec, takeaway, colors, fonts, primaryText, isInverse);
      return;
    }

    if (spec.layout === 'agenda') {
      this.renderAgenda(slide, spec, content, colors, fonts);
      this.renderTakeaway(slide, spec, takeaway, colors, fonts, primaryText, isInverse);
      return;
    }

    this.renderContentPanel(slide, spec, content, colors, fonts, isInverse);
    this.renderTakeaway(slide, spec, takeaway, colors, fonts, primaryText, isInverse);
  }

  private renderVisualRegion(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    colors: ReturnType<PptxRendererService['getColors']>,
    isInverse: boolean,
  ): void {
    if (!spec.assetPath) {
      return;
    }

    const visual = this.resolveSlotBox(
      spec,
      spec.layout === 'cover' ? 'heroVisual' : 'visual',
      spec.layout === 'cover'
        ? { x: 8.2, y: 1.55, w: 4.1, h: 3.8 }
        : { x: 7.2, y: 1.75, w: 4.9, h: 4.3 },
    );
    const fill = isInverse ? colors.surface : colors.surface;
    const border = isInverse ? colors.accentSoft : colors.border;

    if (visual.w > SLIDE_W - 0.1 || visual.h > SLIDE_H - 0.1) {
      slide.addImage({
        path: spec.assetPath,
        x: visual.x + 0.3,
        y: visual.y + 0.3,
        w: Math.max(1, visual.w - 0.6),
        h: Math.max(1, visual.h - 0.6),
      });
      return;
    }

    slide.addShape('roundRect', {
      x: visual.x,
      y: visual.y,
      w: visual.w,
      h: visual.h,
      rectRadius: 0.12,
      fill: { color: this.toPptxColor(fill, 'FFFFFF'), transparency: isInverse ? 88 : 0 },
      line: { color: this.toPptxColor(border, 'D9E3F0'), width: 1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: visual.x + 0.22,
      y: visual.y + 0.22,
      w: Math.max(1, visual.w - 0.44),
      h: Math.max(1, visual.h - 0.58),
    });
  }

  private renderContentPanel(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    box: RegionBox,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
    isInverse: boolean,
  ): void {
    const panelFill = isInverse ? colors.inverseBackground : colors.surface;
    const panelBorder = isInverse ? colors.accent : colors.border;
    const textColor = isInverse ? colors.inverseText : colors.textPrimary;
    const mutedColor = isInverse ? colors.accentSoft : colors.textSecondary;

    slide.addShape('roundRect', {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rectRadius: 0.12,
      fill: { color: this.toPptxColor(panelFill, 'FFFFFF'), transparency: isInverse ? 100 : 0 },
      line: { color: this.toPptxColor(panelBorder, 'D9E3F0'), width: isInverse ? 0 : 1 },
    });

    if (spec.paragraph) {
      slide.addText(spec.paragraph, {
        x: box.x + 0.3,
        y: box.y + 0.28,
        w: Math.max(1, box.w - 0.6),
        h: spec.bullets.length > 0 ? Math.max(0.7, box.h * 0.34) : Math.max(1, box.h - 0.7),
        fontSize: 14,
        color: this.toPptxColor(mutedColor, '5B6B7F'),
        fontFace: fonts.body,
        fit: 'shrink',
        breakLine: true,
      });
    }

    if (spec.bullets.length > 0) {
      const bulletY = box.y + (spec.paragraph ? Math.max(1.1, box.h * 0.4) : 0.35);
      slide.addText(
        spec.bullets.slice(0, spec.layoutMeta?.densityRules.maxBullets ?? 5).map((bullet) => ({
          text: bullet,
          options: { bullet: { indent: 14 } },
        })),
        {
          x: box.x + 0.3,
          y: bulletY,
          w: Math.max(1, box.w - 0.65),
          h: Math.max(1, box.y + box.h - bulletY - 0.35),
          fontSize: 14,
          color: this.toPptxColor(textColor, '102033'),
          breakLine: true,
          paraSpaceAfter: 8,
          fit: 'shrink',
          fontFace: fonts.body,
        },
      );
    }
  }

  private renderAgenda(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    box: RegionBox,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
  ): void {
    const items = spec.bullets.slice(0, 6);
    const rowH = Math.min(0.74, Math.max(0.48, (box.h - 0.2) / Math.max(1, items.length)));

    items.forEach((item, index) => {
      const y = box.y + index * rowH;
      slide.addShape('roundRect', {
        x: box.x,
        y,
        w: box.w,
        h: rowH - 0.12,
        rectRadius: 0.08,
        fill: { color: this.toPptxColor(index % 2 === 0 ? colors.surface : colors.surfaceAlt, 'FFFFFF') },
        line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 0.8 },
      });
      slide.addText(String(index + 1).padStart(2, '0'), {
        x: box.x + 0.22,
        y: y + 0.12,
        w: 0.48,
        h: 0.24,
        fontSize: 10,
        bold: true,
        color: this.toPptxColor(colors.accent, '0F766E'),
        fontFace: fonts.body,
      });
      slide.addText(item, {
        x: box.x + 0.86,
        y: y + 0.08,
        w: Math.max(1, box.w - 1.2),
        h: rowH - 0.24,
        fontSize: 14,
        bold: true,
        color: this.toPptxColor(colors.textPrimary, '102033'),
        fit: 'shrink',
        fontFace: fonts.body,
      });
    });
  }

  private renderSteps(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    box: RegionBox,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
    isInverse: boolean,
  ): void {
    const steps = spec.bullets.slice(0, 5);
    if (steps.length === 0) {
      this.renderContentPanel(slide, spec, box, colors, fonts, isInverse);
      return;
    }

    const cardW = Math.max(1.4, (box.w - (steps.length - 1) * 0.16) / steps.length);
    steps.forEach((step, index) => {
      const x = box.x + index * (cardW + 0.16);
      slide.addShape('roundRect', {
        x,
        y: box.y,
        w: cardW,
        h: box.h,
        rectRadius: 0.12,
        fill: { color: this.toPptxColor(index % 2 === 0 ? colors.surface : colors.surfaceAlt, 'FFFFFF') },
        line: { color: this.toPptxColor(colors.border, 'D9E3F0'), width: 1 },
      });
      slide.addText(String(index + 1).padStart(2, '0'), {
        x: x + 0.18,
        y: box.y + 0.24,
        w: 0.52,
        h: 0.28,
        fontSize: 11,
        bold: true,
        color: this.toPptxColor(colors.accent, '0F766E'),
        fontFace: fonts.body,
      });
      slide.addText(step, {
        x: x + 0.18,
        y: box.y + 0.82,
        w: Math.max(0.8, cardW - 0.36),
        h: Math.max(0.8, box.h - 1.08),
        fontSize: 13,
        bold: true,
        color: this.toPptxColor(colors.textPrimary, '102033'),
        valign: 'middle',
        fit: 'shrink',
        fontFace: fonts.body,
      });
    });
  }

  private renderQuote(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    box: RegionBox,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
    primaryText: string,
    secondaryText: string,
    isInverse: boolean,
  ): void {
    slide.addShape('roundRect', {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rectRadius: 0.14,
      fill: {
        color: this.toPptxColor(isInverse ? colors.inverseBackground : colors.surface, 'FFFFFF'),
        transparency: isInverse ? 100 : 0,
      },
      line: { color: this.toPptxColor(isInverse ? colors.accent : colors.border, 'D9E3F0'), width: isInverse ? 0 : 1 },
    });
    slide.addText(spec.paragraph ?? spec.highlight ?? spec.title, {
      x: box.x + 0.35,
      y: box.y + 0.35,
      w: Math.max(1, box.w - 0.7),
      h: Math.max(1, box.h - 1.0),
      fontSize: 22,
      bold: true,
      color: this.toPptxColor(primaryText, '102033'),
      valign: 'middle',
      fit: 'shrink',
      fontFace: fonts.display,
      breakLine: true,
    });
    if (spec.highlight) {
      slide.addText(spec.highlight, {
        x: box.x + 0.35,
        y: box.y + box.h - 0.52,
        w: Math.max(1, box.w - 0.7),
        h: 0.28,
        fontSize: 11,
        bold: true,
        color: this.toPptxColor(secondaryText, '5B6B7F'),
        fontFace: fonts.body,
        fit: 'shrink',
      });
    }
  }

  private renderTakeaway(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    box: RegionBox,
    colors: ReturnType<PptxRendererService['getColors']>,
    fonts: ReturnType<PptxRendererService['getFonts']>,
    primaryText: string,
    isInverse: boolean,
  ): void {
    if (!spec.highlight || box.w < 1.2 || box.h < 0.35) {
      return;
    }

    const fill = isInverse ? colors.accent : colors.surfaceAlt;
    const color = isInverse ? colors.inverseBackground : primaryText;
    slide.addShape('roundRect', {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rectRadius: 0.1,
      fill: { color: this.toPptxColor(fill, 'E8EEF5') },
      line: { color: this.toPptxColor(isInverse ? colors.accent : colors.border, 'D9E3F0'), width: 0.8 },
    });
    slide.addText(spec.highlight, {
      x: box.x + 0.25,
      y: box.y + 0.08,
      w: Math.max(0.8, box.w - 0.5),
      h: Math.max(0.24, box.h - 0.16),
      fontSize: 13,
      bold: true,
      color: this.toPptxColor(color, '102033'),
      fit: 'shrink',
      valign: 'middle',
      fontFace: fonts.body,
    });
  }

  private renderAccentLayer(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    colors: ReturnType<PptxRendererService['getColors']>,
    isInverse: boolean,
  ): void {
    if (spec.layout === 'cover') {
      slide.addShape('rect', {
        x: 9.6,
        y: 0,
        w: 3.73,
        h: SLIDE_H,
        fill: { color: this.toPptxColor(colors.accent, '0F766E'), transparency: 18 },
        line: { color: this.toPptxColor(colors.accent, '0F766E'), transparency: 100 },
      });
      return;
    }

    if (!isInverse) {
      slide.addShape('rect', {
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: 0.08,
        fill: { color: this.toPptxColor(colors.accent, '0F766E') },
        line: { color: this.toPptxColor(colors.accent, '0F766E') },
      });
    }
  }

  private resolveSlotBox(spec: SlideSpec, slotName: string, fallback: RegionBox): RegionBox {
    const meta = spec.layoutMeta;
    const slot = meta?.slots?.[slotName];
    if (!meta || !slot) {
      return fallback;
    }

    return this.boxForSlot(meta, slot, fallback);
  }

  private boxForSlot(meta: SlideLayoutMeta, slot: SlideLayoutSlot, fallback: RegionBox): RegionBox {
    const padding = meta.frame.padding;
    const left = padding.x;
    const top = padding.y;
    const right = SLIDE_W - padding.x;
    const bottom = SLIDE_H - padding.y;
    const contentW = right - left;
    const contentH = bottom - top;
    const gap = meta.frame.gap;
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
        return fallback;
    }
  }

  private fitBox(box: RegionBox, maxHeight: number): RegionBox {
    return {
      ...box,
      h: Math.min(box.h, maxHeight),
    };
  }

  private defaultEyebrow(spec: SlideSpec): string {
    switch (spec.layout) {
      case 'cover':
        return 'Presentation';
      case 'agenda':
        return 'Talk flow';
      case 'section-divider':
        return 'Section';
      case 'summary-closing':
        return 'Final message';
      case 'process':
        return 'Process';
      case 'comparison':
        return 'Comparison';
      case 'quote':
        return 'Key idea';
      default:
        return 'Insight';
    }
  }

  private getColors(designPlan?: DesignPlan) {
    return {
      background: designPlan?.colorTokens.background ?? '#F6F8FC',
      surface: designPlan?.colorTokens.surface ?? '#FFFFFF',
      surfaceAlt: designPlan?.colorTokens.surfaceAlt ?? '#E8EEF5',
      textPrimary: designPlan?.colorTokens.textPrimary ?? '#102033',
      textSecondary: designPlan?.colorTokens.textSecondary ?? '#5B6B7F',
      accent: designPlan?.colorTokens.accent ?? '#0F766E',
      accentSoft: designPlan?.colorTokens.accentSoft ?? '#D9F2F5',
      border: designPlan?.colorTokens.border ?? '#D9E3F0',
      inverseBackground: designPlan?.colorTokens.inverseBackground ?? '#0B1F33',
      inverseText: designPlan?.colorTokens.inverseText ?? '#FFFFFF',
      warning: designPlan?.colorTokens.warning ?? '#F59E0B',
    };
  }

  private getFonts(designPlan?: DesignPlan) {
    return {
      display: designPlan?.typographyTokens.displayFont ?? 'Aptos Display',
      body: designPlan?.typographyTokens.bodyFont ?? 'Aptos',
      mono: designPlan?.typographyTokens.monoFont ?? 'Courier New',
    };
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
    if (!value) {
      return fallback;
    }

    const normalized = value.trim().replace(/^#/, '').toUpperCase();
    return /^[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
  }
}
