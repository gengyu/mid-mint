import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../parser/types/parsed-document.type';
import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { SlideSpec } from '../slides/slide.types';
import { LlmService } from './llm.service';

@Injectable()
export class LlmJsonService {
  constructor(private readonly llmService: LlmService) {}

  async analyzeDocument(document: ParsedDocument): Promise<PresentationAnalysis> {
    const fallback = this.buildFallbackAnalysis(document);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Analyze this presentation source and return JSON.',
      JSON.stringify({
        title: document.title,
        sections: document.sections,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<PresentationAnalysis>(prompt);
    return this.isValidAnalysis(result) ? result : fallback;
  }

  async planDeck(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    requestedSlides?: number,
  ): Promise<DeckPlan> {
    const fallback = this.buildFallbackDeckPlan(document, analysis, requestedSlides);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a presentation deck plan and return JSON only.',
      JSON.stringify({
        title: document.title,
        summary: analysis.summary,
        keyMessages: analysis.keyMessages,
        sections: document.sections,
        requestedSlides: requestedSlides ?? null,
      }),
      'Return shape: {"title": string, "totalSlides": number, "slides": [{ "slideNumber": number, "title": string, "keyPoint": string, "sourceSectionTitle": string, "layoutHint": "cover" | "title-bullets" | "text-visual" | "comparison" }]}',
    ].join('\n\n');

    const result = await this.llmService.generateJson<DeckPlan>(prompt);
    return this.isValidDeckPlan(result) ? result : fallback;
  }

  async polishSlides(slides: SlideSpec[]): Promise<SlideSpec[]> {
    return slides;
  }

  private buildFallbackAnalysis(document: ParsedDocument): PresentationAnalysis {
    const contentSections = this.getContentSections(document);
    const summarySource =
      contentSections.map((section) => section.body.trim()).find(Boolean) ??
      document.paragraphs.find((paragraph) => paragraph.trim().includes(' ')) ??
      document.rawText.slice(0, 240);
    const keyMessages = Array.from(
      new Set(
        contentSections
          .flatMap((section) => section.bullets)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ).slice(0, 5);

    return {
      mainTopic: document.title,
      summary: summarySource,
      keyMessages:
        keyMessages.length > 0
          ? keyMessages
          : contentSections.map((section) => section.title).slice(0, 5),
    };
  }

  private buildFallbackDeckPlan(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    requestedSlides?: number,
  ): DeckPlan {
    const keyMessages = Array.isArray(analysis.keyMessages) ? analysis.keyMessages : [];
    const requestedTotal = Math.max(3, Math.min(requestedSlides ?? 6, 10));
    const contentSections = this.getContentSections(document).slice(
      0,
      Math.max(1, requestedTotal - 2),
    );
    const slides = [
      {
        slideNumber: 1,
        title: document.title,
        keyPoint: analysis.summary,
        sourceSectionTitle: contentSections[0]?.title ?? document.title,
        layoutHint: 'cover' as const,
      },
      ...contentSections.map((section, index) => ({
        slideNumber: index + 2,
        title: section.title,
        keyPoint: section.body || section.bullets[0] || keyMessages[index] || section.title,
        sourceSectionTitle: section.title,
        layoutHint: section.bullets.length >= 4 ? ('comparison' as const) : ('text-visual' as const),
      })),
      {
        slideNumber: contentSections.length + 2,
        title: 'Summary',
        keyPoint: keyMessages.slice(0, 3).join(' / ') || analysis.summary || document.title,
        sourceSectionTitle: 'Summary',
        layoutHint: 'title-bullets' as const,
      },
    ].slice(0, requestedTotal);

    return {
      title: document.title,
      totalSlides: slides.length,
      slides,
    };
  }

  private isValidAnalysis(value: unknown): value is PresentationAnalysis {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<PresentationAnalysis>;
    return (
      typeof candidate.mainTopic === 'string' &&
      typeof candidate.summary === 'string' &&
      Array.isArray(candidate.keyMessages) &&
      candidate.keyMessages.every((item) => typeof item === 'string')
    );
  }

  private isValidDeckPlan(value: unknown): value is DeckPlan {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<DeckPlan>;
    return (
      typeof candidate.title === 'string' &&
      typeof candidate.totalSlides === 'number' &&
      Array.isArray(candidate.slides) &&
      candidate.slides.every(
        (slide) =>
          slide &&
          typeof slide.slideNumber === 'number' &&
          typeof slide.title === 'string' &&
          typeof slide.keyPoint === 'string' &&
          typeof slide.sourceSectionTitle === 'string' &&
          ['cover', 'title-bullets', 'text-visual', 'comparison'].includes(slide.layoutHint),
      )
    );
  }

  private getContentSections(document: ParsedDocument): ParsedDocument['sections'] {
    const sections = document.sections.filter(
      (section) =>
        section.title.trim().toLowerCase() !== document.title.trim().toLowerCase() &&
        (section.body.trim().length > 0 || section.bullets.length > 0),
    );

    return sections.length > 0 ? sections : document.sections;
  }
}
