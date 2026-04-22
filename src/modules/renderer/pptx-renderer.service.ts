import path from 'node:path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { ensureDir } from '../../common/utils/file.util';
import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import { SlideSpec } from '../slides/slide.types';

type AccentTone = NonNullable<SlideSpec['accentTone']>;

@Injectable()
export class PptxRendererService {
  async render(filePath: string, title: string, slides: SlideSpec[]): Promise<void> {
    await ensureDir(path.dirname(filePath));

    const pptx = new PptxGenJS();
    pptx.layout = PPT_LAYOUT;
    pptx.author = PPT_AUTHOR;
    pptx.company = 'mid-mint';
    pptx.subject = title;
    pptx.title = title;
    pptx.theme = {
      headFontFace: 'Aptos Display',
      bodyFontFace: 'Aptos',
    };

    for (const spec of slides) {
      const slide = pptx.addSlide();
      this.applyBaseStyle(slide, spec);

      switch (spec.layout) {
        case 'cover':
          this.renderCover(slide, spec);
          break;
        case 'comparison':
          this.renderComparison(slide, spec);
          break;
        case 'title-bullets':
          this.renderTitleBullets(slide, spec);
          break;
        case 'text-visual':
        default:
          this.renderTextVisual(slide, spec);
          break;
      }
    }

    await pptx.writeFile({ fileName: filePath, compression: true });
  }

  private applyBaseStyle(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    const accent = this.getAccent(spec.accentTone);
    slide.background = { color: 'F4F7FB' };

    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      line: { color: 'F4F7FB', pt: 0 },
      fill: { color: 'F4F7FB' },
    });

    slide.addShape('roundRect', {
      x: 0.44,
      y: 0.42,
      w: 12.45,
      h: 6.62,
      line: { color: 'D8E2EF', pt: 1 },
      fill: { color: 'FFFFFF' },
      shadow: {
        type: 'outer',
        color: 'CFD9E5',
        blur: 1,
        angle: 45,
        opacity: 0.12,
      },
    });

    slide.addShape('rect', {
      x: 0.78,
      y: 0.66,
      w: 0.78,
      h: 0.08,
      line: { color: accent.base, pt: 0 },
      fill: { color: accent.base },
    });

    slide.addText('mid-mint', {
      x: 11.55,
      y: 0.63,
      w: 1.0,
      h: 0.18,
      fontFace: 'Aptos',
      fontSize: 8,
      color: accent.base,
      bold: true,
      margin: 0,
      align: 'right',
    });
  }

  private renderCover(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    const accent = this.getAccent(spec.accentTone);

    slide.addShape('roundRect', {
      x: 7.45,
      y: 1.02,
      w: 4.78,
      h: 4.78,
      rectRadius: 0.18,
      line: { color: 'D7E5F0', pt: 1 },
      fill: { color: 'EEF7F5' },
    });

    slide.addShape('ellipse', {
      x: 8.15,
      y: 1.42,
      w: 2.25,
      h: 2.25,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addShape('ellipse', {
      x: 9.35,
      y: 2.5,
      w: 1.55,
      h: 1.55,
      line: { color: accent.base, pt: 0 },
      fill: { color: accent.base, transparency: 76 },
    });
    slide.addShape('arc', {
      x: 8.05,
      y: 1.62,
      w: 2.95,
      h: 2.95,
      line: { color: accent.base, pt: 2.5, transparency: 24 },
      fill: { color: 'FFFFFF', transparency: 100 },
    });

    slide.addText(spec.sectionLabel ?? 'PRESENTATION', {
      x: 0.94,
      y: 1.24,
      w: 2.65,
      h: 0.28,
      fontFace: 'Aptos',
      fontSize: 10,
      color: accent.base,
      bold: true,
      margin: 0,
    });

    slide.addText(spec.title, {
      x: 0.92,
      y: 1.7,
      w: 5.72,
      h: 1.32,
      fontFace: 'Aptos Display',
      bold: true,
      fontSize: 24,
      color: '102033',
      margin: 0,
      fit: 'shrink',
      valign: 'mid' as PptxGenJS.VAlign,
    });

    slide.addText(spec.subtitle ?? '', {
      x: 0.95,
      y: 3.15,
      w: 5.35,
      h: 1.28,
      fontFace: 'Aptos',
      fontSize: 13.5,
      color: '5B6B7D',
      margin: 0,
      valign: 'top',
    });

    slide.addShape('roundRect', {
      x: 0.95,
      y: 5.24,
      w: 2.05,
      h: 0.52,
      rectRadius: 0.08,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addText('Editorial deck system', {
      x: 1.14,
      y: 5.39,
      w: 1.7,
      h: 0.14,
      fontFace: 'Aptos',
      fontSize: 8.5,
      color: accent.base,
      bold: true,
      margin: 0,
      align: 'center',
    });

    if (spec.assetPath) {
      slide.addImage({
        path: spec.assetPath,
        x: 7.68,
        y: 1.22,
        w: 4.34,
        h: 4.4,
      });
    }
  }

  private renderTextVisual(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    const accent = this.getAccent(spec.accentTone);
    this.addSectionHeader(slide, spec);
    this.addTitle(slide, spec.title);

    slide.addText(spec.paragraph ?? spec.bullets.join('\n'), {
      x: 0.92,
      y: 1.68,
      w: 5.18,
      h: 1.14,
      fontFace: 'Aptos',
      fontSize: 14.5,
      color: '334155',
      margin: 0,
      breakLine: true,
      valign: 'top',
      fit: 'shrink',
    });

    this.addHighlightCard(slide, spec.highlight ?? spec.bullets[0] ?? spec.title, accent);

    slide.addText(this.toBulletRuns(spec.bullets), {
      x: 1.02,
      y: 4.02,
      w: 4.88,
      h: 1.62,
      fontFace: 'Aptos',
      fontSize: 13.2,
      color: '425466',
      breakLine: true,
      margin: 0,
      paraSpaceAfter: 8,
      valign: 'top',
      fit: 'shrink',
    });

    this.addVisualPanel(slide, spec, { x: 7.05, y: 1.48, w: 4.86, h: 4.82 });
  }

  private renderTitleBullets(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    const accent = this.getAccent(spec.accentTone);
    this.addSectionHeader(slide, spec);
    this.addTitle(slide, spec.title);

    slide.addShape('roundRect', {
      x: 0.96,
      y: 1.78,
      w: 4.55,
      h: 3.98,
      rectRadius: 0.12,
      line: { color: 'DCE6F2', pt: 1 },
      fill: { color: 'FAFCFE' },
    });

    slide.addText(this.toBulletRuns(spec.bullets), {
      x: 1.18,
      y: 2.08,
      w: 4.1,
      h: 3.42,
      fontFace: 'Aptos',
      fontSize: 15,
      color: '334155',
      breakLine: true,
      margin: 0,
      paraSpaceAfter: 10,
      valign: 'top',
      fit: 'shrink',
    });

    slide.addShape('roundRect', {
      x: 6.6,
      y: 1.56,
      w: 5.2,
      h: 4.92,
      rectRadius: 0.18,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    this.addVisualPanel(slide, spec, { x: 7.05, y: 1.96, w: 4.3, h: 4.1 });
  }

  private renderComparison(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    this.addSectionHeader(slide, spec);
    this.addTitle(slide, spec.title);

    const midpoint = Math.max(1, Math.ceil(spec.bullets.length / 2));
    this.addColumnCard(slide, 0.95, 1.72, 2.6, 3.65, spec.bullets.slice(0, midpoint), spec.accentTone);
    this.addColumnCard(slide, 3.78, 1.72, 2.6, 3.65, spec.bullets.slice(midpoint), spec.accentTone);
    this.addVisualPanel(slide, spec, { x: 7.02, y: 1.62, w: 4.85, h: 4.82 });
  }

  private addSectionHeader(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    const accent = this.getAccent(spec.accentTone);
    slide.addShape('roundRect', {
      x: 0.92,
      y: 0.95,
      w: 1.85,
      h: 0.34,
      rectRadius: 0.06,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addText(spec.sectionLabel ?? `SLIDE ${String(spec.slideNumber).padStart(2, '0')}`, {
      x: 1.02,
      y: 1.04,
      w: 1.62,
      h: 0.12,
      fontFace: 'Aptos',
      fontSize: 8.5,
      color: accent.base,
      bold: true,
      margin: 0,
      align: 'center',
    });
  }

  private addTitle(slide: PptxGenJS.Slide, title: string): void {
    slide.addText(title, {
      x: 0.92,
      y: 1.28,
      w: 5.55,
      h: 0.55,
      fontFace: 'Aptos Display',
      bold: true,
      fontSize: 21,
      color: '102033',
      margin: 0,
      fit: 'shrink',
    });
  }

  private addHighlightCard(slide: PptxGenJS.Slide, value: string, accent: ReturnType<typeof this.getAccent>): void {
    slide.addShape('roundRect', {
      x: 0.95,
      y: 2.98,
      w: 5.18,
      h: 0.72,
      rectRadius: 0.08,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addText(value, {
      x: 1.15,
      y: 3.15,
      w: 4.76,
      h: 0.26,
      fontFace: 'Aptos',
      fontSize: 12.5,
      color: accent.deep,
      bold: true,
      margin: 0,
      align: 'center',
      fit: 'shrink',
    });
  }

  private addColumnCard(
    slide: PptxGenJS.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    bullets: string[],
    accentTone: SlideSpec['accentTone'],
  ): void {
    const accent = this.getAccent(accentTone);

    slide.addShape('roundRect', {
      x,
      y,
      w,
      h,
      rectRadius: 0.14,
      line: { color: 'DCE6F2', pt: 1 },
      fill: { color: 'FBFDFF' },
    });

    slide.addShape('rect', {
      x: x + 0.18,
      y: y + 0.18,
      w: w - 0.36,
      h: 0.06,
      line: { color: accent.base, pt: 0 },
      fill: { color: accent.base },
    });

    slide.addText(this.toBulletRuns(bullets), {
      x: x + 0.24,
      y: y + 0.42,
      w: w - 0.48,
      h: h - 0.6,
      fontFace: 'Aptos',
      fontSize: 13.2,
      color: '425466',
      margin: 0,
      breakLine: true,
      paraSpaceAfter: 8,
      valign: 'top',
      fit: 'shrink',
    });
  }

  private addVisualPanel(
    slide: PptxGenJS.Slide,
    spec: SlideSpec,
    frame: { x: number; y: number; w: number; h: number },
  ): void {
    const accent = this.getAccent(spec.accentTone);

    slide.addShape('roundRect', {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      rectRadius: 0.18,
      line: { color: 'DCE6F2', pt: 1 },
      fill: { color: 'F7FAFD' },
    });

    slide.addShape('roundRect', {
      x: frame.x + 0.18,
      y: frame.y + 0.18,
      w: frame.w - 0.36,
      h: 0.34,
      rectRadius: 0.05,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addText((spec.visualGoal ?? spec.title).slice(0, 48), {
      x: frame.x + 0.32,
      y: frame.y + 0.28,
      w: frame.w - 0.64,
      h: 0.11,
      fontFace: 'Aptos',
      fontSize: 8,
      color: accent.base,
      bold: true,
      margin: 0,
      align: 'center',
      fit: 'shrink',
    });

    if (spec.assetPath) {
      slide.addImage({
        path: spec.assetPath,
        x: frame.x + 0.23,
        y: frame.y + 0.66,
        w: frame.w - 0.46,
        h: frame.h - 0.89,
      });
      return;
    }

    slide.addShape('ellipse', {
      x: frame.x + 1.5,
      y: frame.y + 1.3,
      w: 1.8,
      h: 1.8,
      line: { color: accent.soft, pt: 0 },
      fill: { color: accent.soft },
    });
    slide.addShape('ellipse', {
      x: frame.x + 2.3,
      y: frame.y + 2.3,
      w: 0.95,
      h: 0.95,
      line: { color: accent.base, pt: 0 },
      fill: { color: accent.base, transparency: 74 },
    });
  }

  private toBulletRuns(lines: string[]): Array<{ text: string; options: Record<string, unknown> }> {
    return lines.map((line) => ({
      text: line,
      options: {
        bullet: { indent: 14 },
        hanging: 2,
        breakLine: true,
      },
    }));
  }

  private getAccent(accentTone: SlideSpec['accentTone']): {
    base: string;
    soft: string;
    deep: string;
  } {
    const tone: AccentTone = accentTone ?? 'teal';

    if (tone === 'blue') {
      return {
        base: '2563EB',
        soft: 'DBEAFE',
        deep: '1D4ED8',
      };
    }

    if (tone === 'amber') {
      return {
        base: 'D97706',
        soft: 'FDE7C7',
        deep: 'B45309',
      };
    }

    return {
      base: '0F766E',
      soft: 'D7F3EE',
      deep: '115E59',
    };
  }
}
