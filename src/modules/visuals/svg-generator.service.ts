import { Injectable } from '@nestjs/common';

import { SlideSpec } from '../slides/slide.types';
import { GeneratedAsset, VisualPlan } from './visual.types';

@Injectable()
export class SvgGeneratorService {
  createVisualPlan(slides: SlideSpec[]): VisualPlan {
    return {
      theme: 'clean-light',
      slides: slides.map((slide) => {
        if (slide.layout === 'cover') {
          return {
            slideNumber: slide.slideNumber,
            layout: slide.layout,
            visualType: 'cover-accent',
            goal: slide.visualGoal ?? 'Create a clear opening visual accent for the title slide.',
          };
        }

        const assetFile = `slide-${String(slide.slideNumber).padStart(3, '0')}.svg`;
        const visualType =
          slide.layout === 'comparison'
            ? 'comparison-card'
            : slide.layout === 'title-bullets'
              ? 'summary-graphic'
              : 'diagram';

        return {
          slideNumber: slide.slideNumber,
          layout: slide.layout,
          visualType,
          goal: slide.visualGoal ?? `Support slide ${slide.slideNumber} with one simple visual.`,
          assetFile,
        };
      }),
    };
  }

  generate(slides: SlideSpec[], visualPlan: VisualPlan): GeneratedAsset[] {
    return visualPlan.slides
      .filter((plan) => Boolean(plan.assetFile))
      .map((plan) => {
        const slide = slides.find((item) => item.slideNumber === plan.slideNumber);
        if (!slide || !plan.assetFile) {
          return null;
        }

        return {
          slideNumber: slide.slideNumber,
          fileName: plan.assetFile,
          svg: this.buildSvg(slide, plan.goal),
        };
      })
      .filter((asset): asset is GeneratedAsset => asset !== null);
  }

  private buildSvg(slide: SlideSpec, goal: string): string {
    const title = this.escape(slide.title);
    const goalText = this.escape(goal);
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
      `<text x="70" y="155" font-size="18" fill="#94a3b8">${goalText}</text>`,
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
