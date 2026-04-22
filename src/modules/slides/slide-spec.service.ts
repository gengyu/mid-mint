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
      const matchedSection = document.sections.find(
        (section) => section.title === plannedSlide.sourceSectionTitle,
      );

      if (plannedSlide.layoutHint === 'cover') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          subtitle: analysis.summary,
          eyebrow: analysis.tone || 'Presentation',
          sectionLabel: analysis.mainTopic.toUpperCase(),
          layout: 'cover',
          role: plannedSlide.role,
          bullets: [],
          highlight: analysis.mainTopic,
          notes: `Opening slide for ${document.title}`,
          visualGoal: 'Use a minimal title accent and keep the opening slide clean.',
          visualTechnique: plannedVisual?.visualTechnique ?? 'image',
          textTechnique: plannedVisual?.textTechnique ?? 'statement',
          visualPriority: plannedVisual?.visualPriority ?? 'high',
          visualType: plannedVisual?.visualType ?? 'cover-accent',
          visualComposition: plannedVisual?.composition ?? 'hero',
          density: plannedVisual?.density ?? 'low',
          accentTone: plannedVisual?.accentTone ?? 'teal',
        };
      }

      if (plannedSlide.sourceSectionTitle === 'Agenda') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: 'Talk flow',
          sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
          layout: 'agenda',
          role: plannedSlide.role,
          bullets: document.sections.map((section) => section.title).slice(0, 5),
          paragraph: analysis.summary,
          highlight: analysis.storyArc?.join(' -> ') || analysis.summary,
          notes: 'Agenda overview',
          visualGoal: plannedVisual?.goal ?? 'Show the audience the talk structure and set expectations.',
          visualTechnique: plannedVisual?.visualTechnique ?? 'none',
          textTechnique: plannedVisual?.textTechnique ?? 'agenda-list',
          visualPriority: plannedVisual?.visualPriority ?? 'low',
          visualType: plannedVisual?.visualType ?? 'none',
          visualComposition: plannedVisual?.composition ?? 'none',
          density: plannedVisual?.density ?? 'low',
          accentTone: plannedVisual?.accentTone ?? 'teal',
        };
      }

      if (plannedSlide.sourceSectionTitle === 'Summary') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: plannedSlide.role === 'closing' ? 'Final message' : 'Summary',
          sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
          layout: 'summary-closing',
          role: plannedSlide.role,
          bullets: analysis.keyMessages.slice(0, 5),
          paragraph: analysis.summary,
          highlight: analysis.summary,
          notes: plannedSlide.keyPoint,
          visualGoal: plannedVisual?.goal ?? plannedSlide.objective,
          visualTechnique: plannedVisual?.visualTechnique ?? 'svg',
          textTechnique: plannedVisual?.textTechnique ?? 'short-bullets',
          visualPriority: plannedVisual?.visualPriority ?? 'medium',
          visualType: plannedVisual?.visualType ?? 'summary-graphic',
          visualComposition: plannedVisual?.composition ?? 'center-panel',
          density: plannedVisual?.density ?? 'medium',
          accentTone: plannedVisual?.accentTone ?? this.pickAccentTone(plannedSlide.slideNumber),
        };
      }

      const bullets = this.pickBullets(
        matchedSection?.bullets,
        analysis.keyMessages,
        plannedSlide.keyPoint,
      );
      const paragraph = this.pickParagraph(matchedSection?.body, plannedSlide.keyPoint);
      const highlight = plannedSlide.objective || this.pickHighlight(bullets, paragraph, plannedSlide.keyPoint);

      return {
        slideNumber: plannedSlide.slideNumber,
        title: plannedSlide.title,
        eyebrow: matchedSection ? 'Section insight' : 'Insight',
        sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
        layout: plannedSlide.layoutHint,
        role: plannedSlide.role,
        bullets,
        paragraph,
        highlight,
        notes: plannedSlide.keyPoint,
        visualGoal: plannedVisual?.goal ?? plannedSlide.keyPoint,
        visualTechnique: plannedVisual?.visualTechnique ?? this.defaultVisualTechnique(plannedSlide.layoutHint),
        textTechnique: plannedVisual?.textTechnique ?? this.defaultTextTechnique(plannedSlide.layoutHint),
        visualPriority: plannedVisual?.visualPriority ?? this.defaultVisualPriority(plannedSlide.layoutHint),
        visualType: plannedVisual?.visualType ?? this.defaultVisualType(plannedSlide.layoutHint),
        visualComposition: plannedVisual?.composition ?? this.defaultComposition(plannedSlide.layoutHint),
        density: plannedVisual?.density ?? this.defaultDensity(plannedSlide.layoutHint),
        accentTone: plannedVisual?.accentTone ?? this.pickAccentTone(plannedSlide.slideNumber),
      };
    });
  }

  private pickBullets(
    sectionBullets: string[] | undefined,
    keyMessages: string[],
    keyPoint: string,
  ): string[] {
    const candidates = [...(sectionBullets ?? []), ...keyMessages.map((message) => message.trim()), keyPoint]
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(candidates)).slice(0, 5);
  }

  private pickParagraph(sectionBody: string | undefined, keyPoint: string): string {
    const paragraph = (sectionBody || keyPoint).trim();
    return paragraph.length > 220 ? `${paragraph.slice(0, 217).trim()}...` : paragraph;
  }

  private pickHighlight(bullets: string[], paragraph: string, keyPoint: string): string {
    const source = bullets[0] || paragraph || keyPoint;
    const compact = source.trim();
    return compact.length > 90 ? `${compact.slice(0, 87).trim()}...` : compact;
  }

  private buildSectionLabel(slideNumber: number, totalSlides: number): string {
    return `SECTION ${String(slideNumber).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }

  private defaultVisualType(layout: SlideSpec['layout']): SlideSpec['visualType'] {
    if (layout === 'comparison') {
      return 'comparison-card';
    }

    if (layout === 'summary-closing') {
      return 'summary-graphic';
    }

    if (layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
      return 'none';
    }

    return 'diagram';
  }

  private defaultVisualTechnique(layout: SlideSpec['layout']): SlideSpec['visualTechnique'] {
    if (layout === 'text-visual' || layout === 'comparison' || layout === 'process' || layout === 'summary-closing') {
      return 'svg';
    }

    if (layout === 'cover') {
      return 'image';
    }

    return 'none';
  }

  private defaultTextTechnique(layout: SlideSpec['layout']): SlideSpec['textTechnique'] {
    if (layout === 'agenda') {
      return 'agenda-list';
    }

    if (layout === 'comparison') {
      return 'two-column-summary';
    }

    if (layout === 'quote' || layout === 'cover') {
      return 'statement';
    }

    if (layout === 'section-divider') {
      return 'none';
    }

    return 'short-bullets';
  }

  private defaultVisualPriority(layout: SlideSpec['layout']): SlideSpec['visualPriority'] {
    if (layout === 'cover' || layout === 'process') {
      return 'high';
    }

    if (layout === 'text-visual' || layout === 'comparison' || layout === 'summary-closing') {
      return 'medium';
    }

    return 'low';
  }

  private defaultComposition(layout: SlideSpec['layout']): NonNullable<SlideSpec['visualComposition']> {
    if (layout === 'cover') {
      return 'hero';
    }

    if (layout === 'comparison') {
      return 'two-column';
    }

    if (layout === 'summary-closing') {
      return 'center-panel';
    }

    if (layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
      return 'none';
    }

    return 'right-panel';
  }

  private defaultDensity(layout: SlideSpec['layout']): NonNullable<SlideSpec['density']> {
    if (layout === 'comparison') {
      return 'high';
    }

    if (layout === 'cover' || layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
      return 'low';
    }

    return 'medium';
  }

  private pickAccentTone(slideNumber: number): SlideSpec['accentTone'] {
    const tones: Array<NonNullable<SlideSpec['accentTone']>> = ['teal', 'blue', 'amber'];
    return tones[(slideNumber - 1) % tones.length];
  }
}
