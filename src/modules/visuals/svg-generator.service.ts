import { Injectable } from '@nestjs/common';

import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { SlideSpec } from '../slides/slide.types';
import { GeneratedAsset, VisualPlan } from './visual.types';

@Injectable()
export class SvgGeneratorService {
  createVisualPlan(deckPlan: DeckPlan, analysis: PresentationAnalysis): VisualPlan {
    const palette = {
      background: '#F3F6FB',
      surface: '#FFFFFF',
      surfaceAlt: '#EEF4FF',
      text: '#102033',
      mutedText: '#5B6B7D',
      border: '#D9E3F0',
      accent: '#0F766E',
      accentSoft: '#D7F3EE',
    };

    return {
      theme: 'editorial-soft',
      palette,
      slides: deckPlan.slides.map((slide) => {
        if (slide.layoutHint === 'cover') {
          return {
            slideNumber: slide.slideNumber,
            layout: slide.layoutHint,
            visualType: 'cover-accent',
            goal: `Introduce ${analysis.mainTopic} with a confident editorial hero composition.`,
            composition: 'hero',
            density: 'low',
            accentTone: 'teal',
          };
        }

        const assetFile = `slide-${String(slide.slideNumber).padStart(3, '0')}.svg`;
        const visualType =
          slide.layoutHint === 'comparison'
            ? 'comparison-card'
            : slide.layoutHint === 'title-bullets'
              ? 'summary-graphic'
              : 'diagram';

        return {
          slideNumber: slide.slideNumber,
          layout: slide.layoutHint,
          visualType,
          goal: this.buildGoal(slide.title, slide.keyPoint, visualType),
          composition: slide.layoutHint === 'title-bullets' ? 'center-panel' : 'right-panel',
          density: slide.layoutHint === 'comparison' ? 'high' : 'medium',
          accentTone: this.pickAccentTone(slide.slideNumber),
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
    if (slide.visualType === 'comparison-card') {
      return this.buildComparisonSvg(slide);
    }

    if (slide.visualType === 'summary-graphic') {
      return this.buildSummarySvg(slide);
    }

    return this.buildDiagramSvg(slide, goal);
  }

  private buildDiagramSvg(slide: SlideSpec, goal: string): string {
    const accent = this.resolveAccent(slide.accentTone);
    const nodes = slide.bullets.slice(0, 3);
    const nodeMarkup = nodes
      .map((bullet, index) => {
        const x = 160 + index * 280;
        return [
          `<circle cx="${x}" cy="388" r="66" fill="${accent.soft}" />`,
          `<circle cx="${x}" cy="388" r="47" fill="${accent.base}" fill-opacity="0.17" />`,
          `<rect x="${x - 96}" y="482" width="192" height="74" rx="22" fill="#FFFFFF" stroke="#D7E2EF" />`,
          `<text x="${x}" y="528" text-anchor="middle" font-size="18" font-weight="600" fill="#18324A">${this.escape(
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
      '<stop offset="0%" stop-color="#F7FAFF" />',
      '<stop offset="100%" stop-color="#EEF6F8" />',
      '</linearGradient>',
      '</defs>',
      '<rect width="1280" height="720" fill="url(#bg)" />',
      '<circle cx="1088" cy="120" r="150" fill="#D9F1EC" />',
      `<circle cx="1018" cy="186" r="88" fill="${accent.soft}" />`,
      '<rect x="72" y="68" width="1136" height="584" rx="36" fill="#FFFFFF" stroke="#D9E3F0" />',
      `<rect x="98" y="98" width="184" height="36" rx="18" fill="${accent.soft}" />`,
      `<text x="190" y="121" text-anchor="middle" font-size="16" font-weight="700" fill="${accent.base}">${this.escape(
        slide.sectionLabel ?? 'INSIGHT',
      )}</text>`,
      `<text x="100" y="184" font-size="42" font-weight="700" fill="#102033">${this.escape(
        slide.title,
      )}</text>`,
      `<text x="100" y="226" font-size="20" fill="#5B6B7D">${this.escape(this.compact(goal, 74))}</text>`,
      connectorMarkup,
      nodeMarkup,
      '</svg>',
    ].join('');
  }

  private buildComparisonSvg(slide: SlideSpec): string {
    const accent = this.resolveAccent(slide.accentTone);
    const columns = slide.bullets.slice(0, 4);
    const cards = columns
      .map((bullet, index) => {
        const x = 122 + (index % 2) * 286;
        const y = 218 + Math.floor(index / 2) * 164;
        return [
          `<rect x="${x}" y="${y}" width="242" height="126" rx="26" fill="#FFFFFF" stroke="#D9E3F0" />`,
          `<rect x="${x + 22}" y="${y + 22}" width="46" height="10" rx="5" fill="${accent.base}" fill-opacity="0.22" />`,
          `<text x="${x + 22}" y="${y + 76}" font-size="22" font-weight="700" fill="#18324A">${String(
            index + 1,
          ).padStart(2, '0')}</text>`,
          `<text x="${x + 22}" y="${y + 104}" font-size="18" fill="#425466">${this.escape(
            this.compact(bullet, 26),
          )}</text>`,
        ].join('');
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<rect width="1280" height="720" fill="#F4F8FC" />',
      `<circle cx="1016" cy="182" r="126" fill="${accent.soft}" />`,
      '<rect x="72" y="68" width="1136" height="584" rx="36" fill="#FFFFFF" stroke="#D9E3F0" />',
      `<text x="108" y="164" font-size="40" font-weight="700" fill="#102033">${this.escape(
        slide.title,
      )}</text>`,
      `<path d="M 786 214 C 860 166, 958 166, 1032 214 S 1178 262, 1190 232" stroke="${accent.base}" stroke-width="6" fill="none" stroke-linecap="round" stroke-opacity="0.5" />`,
      cards,
      '</svg>',
    ].join('');
  }

  private buildSummarySvg(slide: SlideSpec): string {
    const accent = this.resolveAccent(slide.accentTone);
    const bullets = slide.bullets.slice(0, 4);
    const ringMarkup = bullets
      .map((bullet, index) => {
        const angle = (-90 + index * 90) * (Math.PI / 180);
        const cx = 640 + Math.cos(angle) * 190;
        const cy = 360 + Math.sin(angle) * 150;
        return [
          `<circle cx="${cx}" cy="${cy}" r="64" fill="#FFFFFF" stroke="#D9E3F0" />`,
          `<circle cx="${cx}" cy="${cy}" r="38" fill="${accent.soft}" />`,
          `<text x="${cx}" y="${cy + 92}" text-anchor="middle" font-size="18" fill="#425466">${this.escape(
            this.compact(bullet, 18),
          )}</text>`,
        ].join('');
      })
      .join('');

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
      '<rect width="1280" height="720" fill="#F4F8FC" />',
      '<rect x="72" y="68" width="1136" height="584" rx="36" fill="#FFFFFF" stroke="#D9E3F0" />',
      `<circle cx="640" cy="360" r="172" fill="${accent.soft}" />`,
      `<circle cx="640" cy="360" r="110" fill="${accent.base}" fill-opacity="0.14" />`,
      `<text x="640" y="348" text-anchor="middle" font-size="18" font-weight="700" fill="${accent.base}">SUMMARY</text>`,
      `<text x="640" y="382" text-anchor="middle" font-size="30" font-weight="700" fill="#102033">${this.escape(
        this.compact(slide.title, 18),
      )}</text>`,
      ringMarkup,
      '</svg>',
    ].join('');
  }

  private buildGoal(title: string, keyPoint: string, visualType: string): string {
    if (visualType === 'comparison-card') {
      return `Use modular comparison cards to clarify the structure behind ${title}.`;
    }

    if (visualType === 'summary-graphic') {
      return `Create a centered recap motif that reinforces ${title}.`;
    }

    return `Translate "${keyPoint}" into a clean process-style visual for ${title}.`;
  }

  private pickAccentTone(slideNumber: number): 'teal' | 'blue' | 'amber' {
    const tones: Array<'teal' | 'blue' | 'amber'> = ['teal', 'blue', 'amber'];
    return tones[(slideNumber - 1) % tones.length];
  }

  private resolveAccent(accentTone: SlideSpec['accentTone']): { base: string; soft: string } {
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
