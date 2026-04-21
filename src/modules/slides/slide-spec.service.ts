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
      if (plannedSlide.layoutHint === 'cover') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          subtitle: analysis.summary,
          layout: 'cover',
          bullets: [],
          notes: `Opening slide for ${document.title}`,
          visualGoal: 'Use a minimal title accent and keep the opening slide clean.',
          visualType: 'cover-accent',
        };
      }

      const matchedSection = document.sections.find(
        (section) => section.title === plannedSlide.sourceSectionTitle,
      );
      const bullets =
        matchedSection?.bullets.slice(0, 4) ??
        analysis.keyMessages.slice(0, 4).map((message) => message.trim());

      return {
        slideNumber: plannedSlide.slideNumber,
        title: plannedSlide.title,
        layout: plannedSlide.layoutHint,
        bullets: bullets.length > 0 ? bullets : [plannedSlide.keyPoint],
        paragraph: matchedSection?.body || plannedSlide.keyPoint,
        notes: plannedSlide.keyPoint,
        visualGoal: plannedSlide.keyPoint,
        visualType:
          plannedSlide.layoutHint === 'comparison'
            ? 'comparison-card'
            : plannedSlide.layoutHint === 'title-bullets'
              ? 'summary-graphic'
              : 'diagram',
      };
    });
  }
}
