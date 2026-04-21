import path from 'node:path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { ensureDir } from '../../common/utils/file.util';
import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import { SlideSpec } from '../slides/slide.types';

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
      this.applyBaseStyle(slide);

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

  private applyBaseStyle(slide: PptxGenJS.Slide): void {
    slide.background = { color: 'F8FAFC' };
    slide.addShape('rect', {
      x: 0.35,
      y: 0.35,
      w: 12.63,
      h: 6.8,
      line: { color: 'E2E8F0', pt: 1 },
      fill: { color: 'FFFFFF' },
    });
  }

  private renderCover(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    slide.addShape('rect', {
      x: 0.7,
      y: 0.95,
      w: 0.18,
      h: 2.1,
      line: { color: '0F766E', pt: 0 },
      fill: { color: '0F766E' },
    });
    slide.addText(spec.title, {
      x: 1.1,
      y: 1.0,
      w: 10.4,
      h: 1.1,
      fontFace: 'Aptos Display',
      bold: true,
      fontSize: 25,
      color: '0F172A',
      margin: 0,
    });
    slide.addText(spec.subtitle ?? '', {
      x: 1.1,
      y: 2.2,
      w: 10.0,
      h: 1.2,
      fontFace: 'Aptos',
      fontSize: 14,
      color: '475569',
      margin: 0,
    });
  }

  private renderTitleBullets(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    this.addTitle(slide, spec.title);
    slide.addText(this.toBulletRuns(spec.bullets), {
      x: 0.9,
      y: 1.55,
      w: 5.8,
      h: 4.8,
      fontFace: 'Aptos',
      fontSize: 17,
      color: '1E293B',
      breakLine: true,
      margin: 0.08,
      paraSpaceAfter: 10,
      valign: 'top',
    });
    this.addAsset(slide, spec.assetPath, { x: 7.25, y: 1.45, w: 4.7, h: 3.9 });
  }

  private renderTextVisual(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    this.addTitle(slide, spec.title);
    slide.addText(spec.paragraph ?? spec.bullets.join('\n'), {
      x: 0.9,
      y: 1.5,
      w: 5.6,
      h: 2.2,
      fontFace: 'Aptos',
      fontSize: 17,
      color: '1E293B',
      margin: 0.05,
      breakLine: true,
      valign: 'top',
    });
    slide.addText(this.toBulletRuns(spec.bullets), {
      x: 0.95,
      y: 3.95,
      w: 5.45,
      h: 2.0,
      fontFace: 'Aptos',
      fontSize: 14,
      color: '334155',
      breakLine: true,
      margin: 0,
      paraSpaceAfter: 8,
      valign: 'top',
    });
    this.addAsset(slide, spec.assetPath, { x: 7.0, y: 1.4, w: 4.7, h: 4.2 });
  }

  private renderComparison(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    this.addTitle(slide, spec.title);
    const midpoint = Math.max(1, Math.ceil(spec.bullets.length / 2));
    this.addColumnCard(slide, 0.85, 1.55, 2.55, 3.9, spec.bullets.slice(0, midpoint));
    this.addColumnCard(slide, 3.7, 1.55, 2.55, 3.9, spec.bullets.slice(midpoint));
    this.addAsset(slide, spec.assetPath, { x: 7.0, y: 1.55, w: 4.6, h: 3.9 });
  }

  private addTitle(slide: PptxGenJS.Slide, title: string): void {
    slide.addText(title, {
      x: 0.8,
      y: 0.6,
      w: 10.8,
      h: 0.7,
      fontFace: 'Aptos Display',
      bold: true,
      fontSize: 21,
      color: '0F172A',
      margin: 0,
    });
  }

  private addColumnCard(
    slide: PptxGenJS.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    bullets: string[],
  ): void {
    slide.addShape('roundRect', {
      x,
      y,
      w,
      h,
      line: { color: 'CBD5E1', pt: 1 },
      fill: { color: 'F8FAFC' },
    });
    slide.addText(this.toBulletRuns(bullets), {
      x: x + 0.22,
      y: y + 0.24,
      w: w - 0.44,
      h: h - 0.48,
      fontFace: 'Aptos',
      fontSize: 14,
      color: '334155',
      margin: 0,
      breakLine: true,
      paraSpaceAfter: 8,
      valign: 'top',
    });
  }

  private addAsset(
    slide: PptxGenJS.Slide,
    assetPath: string | undefined,
    frame: { x: number; y: number; w: number; h: number },
  ): void {
    slide.addShape('roundRect', {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      line: { color: 'CBD5E1', pt: 1 },
      fill: { color: 'F8FAFC' },
    });

    if (!assetPath) {
      return;
    }

    slide.addImage({
      path: assetPath,
      ...frame,
    });
  }

  private toBulletRuns(lines: string[]): Array<{ text: string; options: Record<string, unknown> }> {
    return lines.map((line) => ({
      text: line,
      options: {
        bullet: { indent: 16 },
        breakLine: true,
      },
    }));
  }
}
