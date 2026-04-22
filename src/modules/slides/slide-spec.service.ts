import { Injectable } from '@nestjs/common';

import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { ParsedDocument } from '../parser/types/parsed-document.type';
import { SlideSpec } from './slide.types';

@Injectable()
export class SlideSpecService {
  createSlides(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    deckPlan: DeckPlan,
  ): SlideSpec[] {
    return deckPlan.slides.map((plannedSlide) => {
      const matchedSection = document.sections.find(
        (section) => section.title === plannedSlide.sourceSectionTitle,
      );

      if (plannedSlide.layoutHint === 'cover') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          subtitle: analysis.summary,
          eyebrow: analysis.tone || 'Presentation',
          layout: 'cover',
          role: plannedSlide.role,
          bullets: [],
          highlight: analysis.mainTopic,
          notes: `Opening slide for ${document.title}`,
        };
      }

      if (plannedSlide.sourceSectionTitle === 'Agenda') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: 'Talk flow',
          layout: 'agenda',
          role: plannedSlide.role,
          bullets: document.sections.map((section) => section.title).slice(0, 5),
          paragraph: analysis.summary,
          highlight: analysis.storyArc?.join(' -> ') || analysis.summary,
          notes: 'Agenda overview',
        };
      }

      if (plannedSlide.sourceSectionTitle === 'Summary') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: plannedSlide.role === 'closing' ? 'Final message' : 'Summary',
          layout: 'title-bullets',
          role: plannedSlide.role,
          bullets: analysis.keyMessages.slice(0, 5),
          paragraph: analysis.summary,
          highlight: analysis.summary,
          notes: plannedSlide.keyPoint,
        };
      }

      const bullets =
        matchedSection?.bullets.slice(0, 4) ??
        analysis.keyMessages.slice(0, 4).map((message) => message.trim());

      return {
        slideNumber: plannedSlide.slideNumber,
        title: plannedSlide.title,
        layout: plannedSlide.layoutHint,
        role: plannedSlide.role,
        eyebrow: matchedSection ? 'Section insight' : 'Insight',
        bullets: bullets.length > 0 ? bullets : [plannedSlide.keyPoint],
        paragraph: matchedSection?.body || matchedSection?.bullets.join('\n') || plannedSlide.keyPoint,
        highlight: plannedSlide.objective,
        notes: plannedSlide.keyPoint,
      };
    });
  }
}
