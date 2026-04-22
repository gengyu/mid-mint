import { Injectable } from '@nestjs/common';

import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { ParsedDocument } from '../parser/types/parsed-document.type';
import { VisualPlan } from '../visuals/visual.types';
import { SlideSpec } from './slide.types';

@Injectable()
export class SlideSpecService {
  createSlides(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    deckPlan: DeckPlan,
    visualPlan: VisualPlan,
  ): SlideSpec[] {
    return deckPlan.slides.map((plannedSlide) => {
      const plannedVisual = visualPlan.slides.find(
        (visualSlide) => visualSlide.slideNumber === plannedSlide.slideNumber,
      );

      if (plannedSlide.layoutHint === 'cover') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          subtitle: analysis.summary,
          sectionLabel: analysis.mainTopic.toUpperCase(),
          layout: 'cover',
          bullets: [],
          notes: `Opening slide for ${document.title}`,
          visualGoal: 'Use a minimal title accent and keep the opening slide clean.',
          visualType: plannedVisual?.visualType ?? 'cover-accent',
          visualComposition: plannedVisual?.composition ?? 'hero',
          accentTone: plannedVisual?.accentTone ?? 'teal',
        };
      }

      const matchedSection = document.sections.find(
        (section) => section.title === plannedSlide.sourceSectionTitle,
      );
      const bullets = this.pickBullets(matchedSection?.bullets, analysis.keyMessages, plannedSlide.keyPoint);
      const paragraph = this.pickParagraph(matchedSection?.body, plannedSlide.keyPoint);
      const highlight = this.pickHighlight(bullets, paragraph, plannedSlide.keyPoint);

      return {
        slideNumber: plannedSlide.slideNumber,
        title: plannedSlide.title,
        sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
        layout: plannedSlide.layoutHint,
        bullets,
        paragraph,
        highlight,
        notes: plannedSlide.keyPoint,
        visualGoal: plannedVisual?.goal ?? plannedSlide.keyPoint,
        visualType: plannedVisual?.visualType ?? this.defaultVisualType(plannedSlide.layoutHint),
        visualComposition:
          plannedVisual?.composition ??
          (plannedSlide.layoutHint === 'title-bullets' ? 'center-panel' : 'right-panel'),
        accentTone: plannedVisual?.accentTone ?? this.pickAccentTone(plannedSlide.slideNumber),
      };
    });
  }

  private pickBullets(
    sectionBullets: string[] | undefined,
    keyMessages: string[],
    keyPoint: string,
  ): string[] {
    const candidates = [
      ...(sectionBullets ?? []),
      ...keyMessages.map((message) => message.trim()),
      keyPoint,
    ]
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(candidates)).slice(0, 4);
  }

  private pickParagraph(sectionBody: string | undefined, keyPoint: string): string {
    const paragraph = (sectionBody || keyPoint).trim();
    return paragraph.length > 180 ? `${paragraph.slice(0, 177).trim()}...` : paragraph;
  }

  private pickHighlight(bullets: string[], paragraph: string, keyPoint: string): string {
    const source = bullets[0] || paragraph || keyPoint;
    const compact = source.trim();
    return compact.length > 72 ? `${compact.slice(0, 69).trim()}...` : compact;
  }

  private buildSectionLabel(slideNumber: number, totalSlides: number): string {
    return `SECTION ${String(slideNumber).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }

  private defaultVisualType(layout: SlideSpec['layout']): SlideSpec['visualType'] {
    if (layout === 'comparison') {
      return 'comparison-card';
    }

    if (layout === 'title-bullets') {
      return 'summary-graphic';
    }

    return 'diagram';
  }

  private pickAccentTone(slideNumber: number): SlideSpec['accentTone'] {
    const tones: Array<NonNullable<SlideSpec['accentTone']>> = ['teal', 'blue', 'amber'];
    return tones[(slideNumber - 1) % tones.length];
  }
}
