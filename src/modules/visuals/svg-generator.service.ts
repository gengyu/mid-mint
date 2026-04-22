import { Injectable } from '@nestjs/common';

import { SlideSpec } from '../slides/slide.types';
import { GeneratedAsset } from './visual.types';

@Injectable()
export class SvgGeneratorService {
  generate(slides: SlideSpec[]): GeneratedAsset[] {
    return slides
      .filter(
        (slide) =>
          slide.layout === 'text-visual' ||
          slide.layout === 'comparison' ||
          slide.layout === 'process',
      )
      .map((slide) => ({
        slideNumber: slide.slideNumber,
        fileName: `slide-${String(slide.slideNumber).padStart(3, '0')}.svg`,
        svg: this.buildSvg(slide),
      }));
  }

  private buildSvg(slide: SlideSpec): string {
    const title = this.escape(slide.title);
    const bullets = slide.bullets.slice(0, 4);
    const bulletMarkup = bullets
      .map(
        (bullet, index) =>
          `<text x="70" y="${160 + index * 70}" font-size="24" fill="#e2e8f0">• ${this.escape(
            bullet,
          )}</text>`,
      )
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<rect width="1280" height="720" fill="#0f172a" />',
      '<rect x="48" y="48" width="1184" height="624" rx="28" fill="#111827" stroke="#334155" />',
      `<text x="70" y="110" font-size="38" font-weight="700" fill="#f8fafc">${title}</text>`,
      bulletMarkup,
      '</svg>',
    ].join('');
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
