import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../parser/types/parsed-document.type';
import {
  assignStoryArcPhase,
  buildSlideObjective,
  isSummaryLikeTitle,
  pickDividerInsertion,
  pickLayoutHintForSection,
  pickVisualFocusForSection,
  scoreSection,
} from '../pipeline/ppt-v2-layouts';
import { DeckPlan, PresentationAnalysis } from '../pipeline/pipeline.types';
import { isSlideLayout, SlideSpec } from '../slides/slide.types';
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
      'Keep the response compact and practical for a presentation generator.',
      'Use only these layoutHint values: cover, agenda, section-divider, text-visual, comparison, process, quote, summary-closing.',
      'Follow the PPT v2 rule: decide page role/layout first, then leave internal visual technique decisions to the visual plan stage.',
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
      'Focus on improving speaking flow, visual differentiation, and reducing repetition.',
      JSON.stringify({
        analysis,
        slides,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<SlideSpec[]>(prompt);
    return this.isValidSlideSpecs(result) ? result : fallback;
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
    const contentSections = this.getContentSections(document).slice(
      0,
      Math.max(1, requestedTotal - 2),
    );
    const includeAgendaSlide = requestedTotal >= 5 && contentSections.length >= 2;
    const availableContentSlots = requestedTotal - 2 - (includeAgendaSlide ? 1 : 0);
    const contentCapacity = Math.max(1, availableContentSlots - (requestedTotal >= 7 ? 1 : 0));
    const selectedSections = contentSections.slice(0, contentCapacity);
    const selectedSectionLayouts = selectedSections.map((section, index) =>
      isSummaryLikeTitle(section.title)
        ? 'summary-closing'
        : pickLayoutHintForSection(
            section,
            selectedSections
              .slice(0, index)
              .map((previousSection) =>
                isSummaryLikeTitle(previousSection.title)
                  ? 'summary-closing'
                  : pickLayoutHintForSection(previousSection),
              ),
          ),
    );
    const dividerPlacement = pickDividerInsertion(
      selectedSections,
      requestedTotal,
      analysis.storyArc,
      selectedSectionLayouts,
    );

    const slides: DeckPlan['slides'] = [
      {
        slideNumber: 1,
        title: document.title,
        keyPoint: analysis.summary,
        sourceSectionTitle: selectedSections[0]?.title ?? document.title,
        layoutHint: 'cover',
        role: 'cover',
        visualFocus: 'visual',
        objective: 'Open with a clear promise and establish the talk narrative.',
      },
    ];

    if (includeAgendaSlide) {
      slides.push({
        slideNumber: slides.length + 1,
        title: 'Agenda',
        keyPoint: keyMessages.slice(0, 4).join(' / ') || analysis.summary || document.title,
        sourceSectionTitle: 'Agenda',
        layoutHint: 'agenda',
        role: 'agenda',
        visualFocus: 'text',
        objective: 'Show the audience the talk structure and set expectations.',
      });
    }

    const recentLayouts: Array<DeckPlan['slides'][number]['layoutHint']> = [];

    selectedSections.forEach((section, index) => {
      const storyArcPhase = assignStoryArcPhase(
        section,
        index,
        selectedSections.length,
        analysis.storyArc,
      );
      const sectionWeight = scoreSection(section);

      if (index === dividerPlacement.index) {
        slides.push({
          slideNumber: slides.length + 1,
          title: section.title,
          keyPoint: section.body || section.bullets[0] || section.title,
          sourceSectionTitle: section.title,
          layoutHint: 'section-divider',
          role: 'section-divider',
          visualFocus: 'text',
          objective: `Transition into ${section.title} with a clear chapter break.`,
          storyArcPhase,
          sectionWeight,
          transitionReason: dividerPlacement.reason,
        });
      }

      const layoutHint = isSummaryLikeTitle(section.title)
        ? 'summary-closing'
        : pickLayoutHintForSection(section, recentLayouts);
      recentLayouts.push(layoutHint);

      slides.push({
        slideNumber: slides.length + 1,
        title: section.title,
        keyPoint: section.body || section.bullets[0] || keyMessages[index] || section.title,
        sourceSectionTitle: section.title,
        layoutHint,
        role: 'content',
        visualFocus: pickVisualFocusForSection(section),
        objective: buildSlideObjective(section.title, layoutHint),
        storyArcPhase,
        sectionWeight,
      });
    });

    slides.push({
      slideNumber: slides.length + 1,
      title: requestedTotal >= 6 ? 'Closing Takeaways' : 'Summary',
      keyPoint: keyMessages.slice(0, 3).join(' / ') || analysis.summary || document.title,
      sourceSectionTitle: 'Summary',
      layoutHint: 'summary-closing',
      role: requestedTotal >= 6 ? 'closing' : 'summary',
      visualFocus: 'text',
      objective: 'Land the presentation with memorable takeaways and a clear next step.',
      storyArcPhase: 'action',
    });

    const normalizedSlides = slides.slice(0, requestedTotal).map((slide, index) => ({
      ...slide,
      slideNumber: index + 1,
    }));

    return {
      title: document.title,
      totalSlides: normalizedSlides.length,
      slides: normalizedSlides,
    };
  }

  private buildFallbackPolishedSlides(
    slides: SlideSpec[],
    analysis: PresentationAnalysis,
    round: number,
    totalRounds: number,
  ): SlideSpec[] {
    return slides.map((slide) => {
      const trimmedBullets = slide.bullets
        .map((bullet) => this.shortenText(bullet.trim(), this.maxBulletLength(slide.layout)))
        .filter((bullet) => bullet.length > 0)
        .slice(0, this.maxBulletCount(slide.layout));
      const highlight =
        slide.highlight ||
        (slide.layout === 'cover'
          ? analysis.mainTopic
          : trimmedBullets[0] || slide.paragraph || analysis.summary);

      const baseNotes = this.stripSpeakerCue(
        slide.notes || slide.paragraph || highlight || slide.title,
      );
      const speakingPrompt =
        round === totalRounds
          ? 'Close with conviction and a next action.'
          : round === 1
            ? 'Tighten the story and reduce repetition.'
            : 'Increase contrast between insight, evidence, and action.';

      return {
        ...slide,
        bullets:
          slide.layout === 'quote' || slide.layout === 'section-divider' ? [] : trimmedBullets,
        highlight: slide.layout === 'quote' && slide.visualTechnique === 'formula' ? undefined : highlight,
        eyebrow: slide.eyebrow || this.buildEyebrow(slide),
        notes: `${baseNotes}\n\nSpeaker cue: ${speakingPrompt}`,
        paragraph:
          slide.layout === 'quote' || slide.layout === 'section-divider'
            ? this.shortenText(slide.paragraph || baseNotes || highlight, 160)
            : this.shortenText(slide.paragraph || '', this.maxParagraphLength(slide.layout)),
      };
    });
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
          isSlideLayout(slide.layoutHint),
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

  private getContentSections(document: ParsedDocument): ParsedDocument['sections'] {
    const sections = document.sections.filter(
      (section) =>
        section.title.trim().toLowerCase() !== document.title.trim().toLowerCase() &&
        (section.body.trim().length > 0 || section.bullets.length > 0),
    );

    return sections.length > 0 ? sections : document.sections;
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
      case 'section-divider':
        return 'Section';
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

  private maxBulletCount(layout: SlideSpec['layout']): number {
    switch (layout) {
      case 'process':
        return 5;
      case 'comparison':
      case 'agenda':
      case 'summary-closing':
        return 4;
      case 'quote':
      case 'section-divider':
        return 0;
      default:
        return 3;
    }
  }

  private maxBulletLength(layout: SlideSpec['layout']): number {
    switch (layout) {
      case 'process':
        return 24;
      case 'comparison':
      case 'summary-closing':
        return 28;
      default:
        return 36;
    }
  }

  private maxParagraphLength(layout: SlideSpec['layout']): number {
    switch (layout) {
      case 'cover':
        return 140;
      case 'text-visual':
        return 180;
      case 'quote':
        return 120;
      case 'summary-closing':
      case 'agenda':
        return 120;
      case 'section-divider':
        return 100;
      default:
        return 140;
    }
  }
}
