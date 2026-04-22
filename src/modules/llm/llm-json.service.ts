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
      'Create a PPT deck plan and return JSON only.',
      'Keep the response compact and practical for a first-version presentation generator.',
      JSON.stringify({
        title: document.title,
        requestedSlides,
        sections: document.sections.map((section) => ({
          title: section.title,
          level: section.level,
          body: section.body,
          bullets: section.bullets,
        })),
        analysis,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<DeckPlan>(prompt);
    return this.isValidDeckPlan(result) ? result : fallback;
  }

  async polishSlides(
    slides: SlideSpec[],
    analysis: PresentationAnalysis,
    round: number,
    totalRounds: number,
  ): Promise<SlideSpec[]> {
    const fallback = this.buildFallbackPolishedSlides(slides, analysis, round, totalRounds);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Refine these slide specs for a presentation. Return JSON only.',
      `This is refinement round ${round} of ${totalRounds}.`,
      'Focus on making the slides more presentation-ready, more visually differentiated, and better for speaking aloud.',
      JSON.stringify({
        analysis,
        slides,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<SlideSpec[]>(prompt);
    return this.isValidSlideSpecs(result) ? result : fallback;
  }

  private buildFallbackAnalysis(document: ParsedDocument): PresentationAnalysis {
    const sectionTitles = document.sections.map((section) => section.title).slice(0, 5);
    const sectionSummary = document.sections
      .map((section) => section.body.trim() || section.bullets.slice(0, 2).join(' '))
      .find((value) => value.length > 0);
    const summarySource =
      sectionSummary ||
      document.paragraphs
        .filter((paragraph) => paragraph !== document.title && !sectionTitles.includes(paragraph))
        .slice(0, 3)
        .join(' ');
    return {
      mainTopic: document.title,
      summary: summarySource || document.rawText.slice(0, 240),
      keyMessages: sectionTitles.length > 0 ? sectionTitles : document.paragraphs.slice(0, 5),
      audience: 'General business audience',
      tone: 'Confident and practical',
      storyArc: ['Context', 'Key ideas', 'Action'],
    };
  }

  private buildFallbackDeckPlan(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    requestedSlides?: number,
  ): DeckPlan {
    const keyMessages = Array.isArray(analysis.keyMessages) ? analysis.keyMessages : [];
    const requestedTotal = Math.max(3, Math.min(requestedSlides ?? 6, 10));
    const contentSections = document.sections
      .filter((section) => !this.isTitleOnlySection(section, document.title))
      .slice(0, Math.max(1, requestedTotal - 2));
    const includeAgendaSlide = requestedTotal >= 5 && contentSections.length >= 2;
    const agendaSlide = includeAgendaSlide
      ? [
          {
            slideNumber: 2,
            title: 'Agenda',
            keyPoint: keyMessages.slice(0, 4).join(' / ') || analysis.summary || document.title,
            sourceSectionTitle: 'Agenda',
            layoutHint: 'agenda' as const,
            role: 'agenda' as const,
            visualFocus: 'text' as const,
            objective: 'Show the audience the talk structure and set expectations.',
          },
        ]
      : [];
    const contentStartNumber = includeAgendaSlide ? 3 : 2;
    const contentCapacity = requestedTotal - 2 - agendaSlide.length;
    const selectedSections = contentSections.slice(0, Math.max(1, contentCapacity));

    const slides = [
      {
        slideNumber: 1,
        title: document.title,
        keyPoint: analysis.summary,
        sourceSectionTitle: document.sections[0]?.title ?? document.title,
        layoutHint: 'cover' as const,
        role: 'cover' as const,
        visualFocus: 'visual' as const,
        objective: 'Open with a clear promise and establish the talk narrative.',
      },
      ...agendaSlide,
      ...selectedSections.map((section, index) => ({
        slideNumber: index + contentStartNumber,
        title: section.title,
        keyPoint: section.body || section.bullets[0] || keyMessages[index] || section.title,
        sourceSectionTitle: section.title,
        layoutHint: this.pickLayoutHint(section),
        role: 'content' as const,
        visualFocus: this.pickVisualFocus(section),
        objective: this.buildSlideObjective(section.title),
      })),
      {
        slideNumber: selectedSections.length + contentStartNumber,
        title: requestedTotal >= 6 ? 'Closing Takeaways' : 'Summary',
        keyPoint: keyMessages.slice(0, 3).join(' / ') || analysis.summary || document.title,
        sourceSectionTitle: 'Summary',
        layoutHint: 'title-bullets' as const,
        role: requestedTotal >= 6 ? ('closing' as const) : ('summary' as const),
        visualFocus: 'text' as const,
        objective: 'Land the presentation with memorable takeaways and a clear next step.',
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
          typeof slide.objective === 'string' &&
          ['cover', 'agenda', 'section-divider', 'title-bullets', 'text-visual', 'comparison', 'process', 'quote'].includes(slide.layoutHint),
      )
    );
  }

  private isValidSlideSpecs(value: unknown): value is SlideSpec[] {
    return (
      Array.isArray(value) &&
      value.every(
        (slide) =>
          slide &&
          typeof slide.slideNumber === 'number' &&
          typeof slide.title === 'string' &&
          Array.isArray(slide.bullets) &&
          typeof slide.layout === 'string',
      )
    );
  }

  private isTitleOnlySection(
    section: ParsedDocument['sections'][number],
    documentTitle: string,
  ): boolean {
    const normalizedSectionTitle = section.title.trim().toLowerCase();
    const normalizedDocumentTitle = documentTitle.trim().toLowerCase();
    const body = section.body.trim();

    return (
      normalizedSectionTitle === normalizedDocumentTitle &&
      (body.length === 0 || body === section.title) &&
      section.bullets.length <= 1
    );
  }

  private pickLayoutHint(section: ParsedDocument['sections'][number]): DeckPlan['slides'][number]['layoutHint'] {
    const title = section.title.toLowerCase();
    if (
      ['process', 'workflow', 'pipeline', 'roadmap', 'steps', 'framework', 'journey'].some((keyword) =>
        title.includes(keyword),
      ) &&
      section.bullets.length >= 3
    ) {
      return 'process';
    }

    if (section.bullets.length <= 1 && section.body.trim().length > 80) {
      return 'quote';
    }

    if (section.bullets.length >= 4) {
      return 'comparison';
    }

    return 'text-visual';
  }

  private pickVisualFocus(
    section: ParsedDocument['sections'][number],
  ): DeckPlan['slides'][number]['visualFocus'] {
    if (section.bullets.length >= 3) {
      return 'mixed';
    }

    if (section.body.trim().length > 80) {
      return 'text';
    }

    return 'visual';
  }

  private buildSlideObjective(sectionTitle: string): string {
    return `Explain why "${sectionTitle}" matters and make the audience remember the core message.`;
  }

  private buildFallbackPolishedSlides(
    slides: SlideSpec[],
    analysis: PresentationAnalysis,
    round: number,
    totalRounds: number,
  ): SlideSpec[] {
    return slides.map((slide) => {
      const trimmedBullets = slide.bullets
        .map((bullet) => bullet.trim())
        .filter((bullet) => bullet.length > 0)
        .slice(0, slide.layout === 'process' ? 5 : 4);
      const highlight =
        slide.highlight ||
        (slide.layout === 'cover'
          ? analysis.mainTopic
          : trimmedBullets[0] || slide.paragraph || analysis.summary);

      const baseNotes = this.stripSpeakerCue(slide.notes || slide.paragraph || highlight || slide.title);
      const speakingPrompt =
        round === totalRounds
          ? 'Close with conviction and a next action.'
          : round === 1
            ? 'Tighten the story and reduce repetition.'
            : 'Increase contrast between insight, evidence, and action.';

      return {
        ...slide,
        bullets: trimmedBullets,
        highlight,
        eyebrow: slide.eyebrow || this.buildEyebrow(slide),
        notes: `${baseNotes}\n\nSpeaker cue: ${speakingPrompt}`,
        paragraph:
          slide.layout === 'quote'
            ? this.shortenText(slide.paragraph || baseNotes, 180)
            : this.shortenText(slide.paragraph || '', slide.layout === 'text-visual' ? 220 : 140),
      };
    });
  }

  private buildEyebrow(slide: SlideSpec): string {
    switch (slide.role) {
      case 'cover':
        return 'Presentation';
      case 'agenda':
        return 'Agenda';
      case 'closing':
        return 'Closing';
      case 'summary':
        return 'Key Takeaways';
      default:
        return 'Core Idea';
    }
  }

  private shortenText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trim()}...`;
  }

  private stripSpeakerCue(value: string): string {
    return value
      .split('\n')
      .filter((line) => !line.trim().startsWith('Speaker cue:'))
      .join('\n')
      .trim();
  }
}
