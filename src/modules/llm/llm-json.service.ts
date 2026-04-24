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
} from '../pipeline/layout-rules';
import {
  DeckPlan,
  PipelineEnhancementStage,
  PresentationAnalysis,
} from '../pipeline/pipeline.types';
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
  ): Promise<DeckPlan> {
    const fallback = this.buildFallbackDeckPlan(document, analysis);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a PPT deck plan and return JSON only.',
      'Keep the response compact and practical for a presentation generator.',
      'Use only these layoutHint values: cover, agenda, section-divider, text-visual, comparison, process, quote, summary-closing.',
      'Follow the current PPT rule: decide page role/layout first, then leave internal visual technique decisions to the visual plan stage.',
      'Pagination must be designed from content, not by evenly slicing sections.',
      'Decide the slide count yourself from the source content. Do not rely on a user-provided target slide count.',
      'Use enough slides to preserve the argument. Long documents should become longer decks, usually 10-20 slides when the content density requires it.',
      'Merge thin sections when needed, split dense sections when needed, and avoid compressing unrelated ideas into one slide.',
      'Favor a talkable deck: each slide should have one clear job, and long sections can legitimately become multiple slides if the content density requires it.',
      'For each slide, include sourceCoverage, structureReason, and contentWeight when possible.',
      JSON.stringify({
        title: document.title,
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
    stage: PipelineEnhancementStage,
  ): Promise<SlideSpec[]> {
    const fallback = this.buildFallbackPolishedSlides(slides, analysis, round, totalRounds, stage);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Refine these slide specs for a presentation. Return JSON only.',
      `This is refinement round ${round} of ${totalRounds}.`,
      `Current stage: ${stage}.`,
      this.getStagePrompt(stage),
      'Keep layout values unchanged unless the current layout clearly breaks the page objective.',
      'Do not invent external assets or file paths. Improve the content and speaking quality of the slides you receive.',
      JSON.stringify({
        analysis,
        slides,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<SlideSpec[]>(prompt);
    const refinedSlides = this.isValidSlideSpecs(result) ? result : fallback;
    return this.applyStageAdjustments(refinedSlides, analysis, stage, round, totalRounds);
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
  ): DeckPlan {
    const keyMessages = Array.isArray(analysis.keyMessages) ? analysis.keyMessages : [];
    const requestedTotal = this.estimateSlideCount(document);
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
        sourceCoverage: [document.title],
        structureReason: 'Use the document title and summary as the opening promise.',
        contentWeight: 'low',
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
        sourceCoverage: selectedSections.map((section) => section.title).slice(0, 5),
        structureReason: 'Summarize the selected sections before moving into content slides.',
        contentWeight: 'low',
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
          sourceCoverage: [section.title],
          structureReason: `Insert a divider before ${section.title} to improve narrative pacing.`,
          contentWeight: this.toContentWeight(sectionWeight),
          transitionReason: dividerPlacement.reason,
        });
        // section-divider resets layout repetition tracking
        recentLayouts.length = 0;
      }

      let layoutHint = isSummaryLikeTitle(section.title)
        ? 'summary-closing'
        : pickLayoutHintForSection(section, recentLayouts);

      // After process or comparison, prefer switching
      // to text-visual / quote / section-divider to avoid visual monotony
      const lastLayout = recentLayouts[recentLayouts.length - 1];
      if (lastLayout === 'process' || lastLayout === 'comparison') {
        if (layoutHint === lastLayout) {
          layoutHint = 'text-visual';
        }
        // Also avoid the same layout twice after a heavy-visual page
        const beforeLast = recentLayouts[recentLayouts.length - 2];
        if (beforeLast !== 'process' && beforeLast !== 'comparison' && layoutHint === beforeLast) {
          layoutHint = 'text-visual';
        }
      }

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
        sourceCoverage: [section.title],
        structureReason: this.buildStructureReason(section.title, layoutHint, sectionWeight),
        contentWeight: this.toContentWeight(sectionWeight),
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
      sourceCoverage: ['Summary'],
      structureReason: 'Add a closing slide so the deck ends with a clear takeaway.',
      contentWeight: 'medium',
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

  private estimateSlideCount(document: ParsedDocument): number {
    const contentSections = this.getContentSections(document);
    const textLength = document.rawText.replace(/\s+/g, '').length;
    const sectionScore = contentSections.length + 2;
    const lengthScore = Math.ceil(textLength / 850) + 2;
    const structuralBonus = contentSections.filter(
      (section) =>
        section.bullets.length >= 4 ||
        section.tableData ||
        (section.codeBlocks?.length ?? 0) > 0 ||
        (section.mermaidDefinitions?.length ?? 0) > 0 ||
        (section.formulas?.length ?? 0) > 0,
    ).length;

    return Math.max(4, Math.min(20, Math.max(sectionScore, lengthScore) + structuralBonus));
  }

  private buildFallbackPolishedSlides(
    slides: SlideSpec[],
    analysis: PresentationAnalysis,
    round: number,
    totalRounds: number,
    stage: PipelineEnhancementStage,
  ): SlideSpec[] {
    const baseSlides = slides.map((slide) => {
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

      const speakingPrompt = this.getStageSpeakerCue(stage, round, totalRounds);

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

    return this.applyStageAdjustments(baseSlides, analysis, stage, round, totalRounds);
  }

  private toContentWeight(score: number): 'low' | 'medium' | 'high' {
    if (score >= 8) {
      return 'high';
    }

    if (score >= 4) {
      return 'medium';
    }

    return 'low';
  }

  private buildStructureReason(title: string, layout: string, sectionWeight: number): string {
    const weight = this.toContentWeight(sectionWeight);
    if (layout === 'process') {
      return `Map ${title} to a process slide because the source content is sequence-oriented and ${weight} weight.`;
    }

    if (layout === 'comparison') {
      return `Map ${title} to a comparison slide because the source content contains contrast or tabular structure.`;
    }

    if (layout === 'quote') {
      return `Map ${title} to a quote-style slide to isolate one memorable message.`;
    }

    if (layout === 'summary-closing') {
      return `Map ${title} to a closing slide because the section reads as synthesis or next steps.`;
    }

    return `Map ${title} to a text-visual slide to keep one clear idea with supporting visual space.`;
  }

  private getStagePrompt(stage: PipelineEnhancementStage): string {
    switch (stage) {
      case 'structure':
        return [
          'Focus on storyline coherence, page role clarity, and removing repeated messages.',
          'Keep this version visibly draft-like: sparse copy, structural labels, no polished rhetoric, and minimal visual ambition.',
        ].join(' ');
      case 'foundation-visuals':
        return [
          'Focus on low-cost visual clarity.',
          'Strengthen hierarchy, sharpen bullets, and make text-visual/comparison/process slides feel more distinct while keeping the copy practical.',
        ].join(' ');
      case 'key-assets':
        return [
          'Focus on preparing high-value slides for stronger assets.',
          'Clarify hero lines, visual goals, and short supporting text so key visuals can land cleanly. Make cover and key message slides feel more editorial and punchy.',
        ].join(' ');
      case 'specialized-polish':
      default:
        return [
          'Focus on specialized pages and final delivery quality.',
          'Compress any remaining verbose text and make closing or technical slides feel deliberate, resolved, and presentation-ready.',
        ].join(' ');
    }
  }

  private getStageSpeakerCue(
    stage: PipelineEnhancementStage,
    round: number,
    totalRounds: number,
  ): string {
    if (totalRounds === 1) {
      return 'Create a clean first-pass deck with a coherent storyline.';
    }

    switch (stage) {
      case 'structure':
        return 'Tighten the story structure, clarify slide roles, and reduce repetition.';
      case 'foundation-visuals':
        return 'Strengthen hierarchy and make each slide easier to scan and present.';
      case 'key-assets':
        return 'Prepare key slides for stronger assets by clarifying the hero message and visual goal.';
      case 'specialized-polish':
      default:
        return 'Polish the deck for delivery, tighten technical slides, and strengthen the closing moment.';
    }
  }

  private applyStageAdjustments(
    slides: SlideSpec[],
    analysis: PresentationAnalysis,
    stage: PipelineEnhancementStage,
    round: number,
    totalRounds: number,
  ): SlideSpec[] {
    return slides.map((slide) => {
      switch (stage) {
        case 'structure':
          return this.applyStructureDraftAdjustments(slide, analysis, round, totalRounds);
        case 'foundation-visuals':
          return this.applyFoundationAdjustments(slide, analysis);
        case 'key-assets':
          return this.applyKeyAssetAdjustments(slide, analysis);
        case 'specialized-polish':
        default:
          return this.applySpecializedPolishAdjustments(slide, analysis);
      }
    });
  }

  private applyStructureDraftAdjustments(
    slide: SlideSpec,
    analysis: PresentationAnalysis,
    round: number,
    totalRounds: number,
  ): SlideSpec {
    const workingMessage = this.shortenText(
      slide.highlight || slide.paragraph || slide.title,
      slide.layout === 'cover' ? 56 : 48,
    );

    return {
      ...slide,
      eyebrow: this.getDraftEyebrow(slide),
      sectionLabel: `ROUND ${String(round).padStart(2, '0')} / STRUCTURE`,
      subtitle:
        slide.layout === 'cover'
          ? this.shortenText(slide.subtitle || analysis.summary || slide.title, 84)
          : slide.subtitle,
      bullets: this.limitBulletsForStage(slide, 'structure'),
      paragraph: this.limitParagraphForStage(slide, 'structure'),
      highlight: slide.layout === 'cover' ? 'Draft opening' : `Working message: ${workingMessage}`,
      notes: `${this.stripSpeakerCue(slide.notes || '')}\n\nSpeaker cue: ${this.getStageSpeakerCue(
        'structure',
        round,
        totalRounds,
      )}`,
    };
  }

  private applyFoundationAdjustments(slide: SlideSpec, analysis: PresentationAnalysis): SlideSpec {
    const hierarchyHighlight =
      slide.layout === 'cover'
        ? this.shortenText(slide.highlight || analysis.mainTopic, 36)
        : this.shortenText(slide.highlight || slide.paragraph || slide.title, 64);

    return {
      ...slide,
      eyebrow: slide.role === 'content' ? 'Core insight' : slide.eyebrow,
      sectionLabel:
        slide.layout === 'cover'
          ? slide.sectionLabel
          : `FOUNDATION / ${String(slide.slideNumber).padStart(2, '0')}`,
      bullets: this.limitBulletsForStage(slide, 'foundation-visuals'),
      paragraph: this.limitParagraphForStage(slide, 'foundation-visuals'),
      highlight: hierarchyHighlight,
    };
  }

  private applyKeyAssetAdjustments(slide: SlideSpec, analysis: PresentationAnalysis): SlideSpec {
    const heroLine =
      slide.layout === 'cover'
        ? this.toDeclarativeLine(slide.title, analysis.summary)
        : this.toDeclarativeLine(slide.title, slide.highlight || slide.paragraph || analysis.summary);

    const isKeyVisualSlide =
      slide.layout === 'cover' ||
      slide.visualPriority === 'high' ||
      slide.visualComposition === 'hero' ||
      slide.layout === 'summary-closing';

    return {
      ...slide,
      eyebrow: isKeyVisualSlide ? 'Key moment' : slide.eyebrow,
      sectionLabel:
        slide.layout === 'cover'
          ? slide.sectionLabel
          : `KEY ASSET / ${String(slide.slideNumber).padStart(2, '0')}`,
      subtitle:
        slide.layout === 'cover'
          ? this.shortenText(heroLine, 70)
          : slide.subtitle,
      bullets: this.limitBulletsForStage(slide, 'key-assets'),
      paragraph: this.limitParagraphForStage(slide, 'key-assets'),
      highlight: this.shortenText(heroLine, slide.layout === 'cover' ? 40 : 58),
    };
  }

  private applySpecializedPolishAdjustments(
    slide: SlideSpec,
    analysis: PresentationAnalysis,
  ): SlideSpec {
    const polishedClosing =
      slide.layout === 'summary-closing'
        ? this.shortenText(
            slide.highlight || slide.paragraph || analysis.keyMessages[0] || analysis.summary,
            52,
          )
        : slide.highlight;

    return {
      ...slide,
      eyebrow:
        slide.layout === 'process'
          ? 'Execution flow'
          : slide.layout === 'comparison'
            ? 'Decision frame'
            : slide.layout === 'summary-closing'
              ? 'Final takeaway'
              : slide.eyebrow,
      sectionLabel:
        slide.layout === 'cover'
          ? slide.sectionLabel
          : `FINAL / ${String(slide.slideNumber).padStart(2, '0')}`,
      bullets: this.limitBulletsForStage(slide, 'specialized-polish'),
      paragraph: this.limitParagraphForStage(slide, 'specialized-polish'),
      highlight: polishedClosing,
    };
  }

  private limitBulletsForStage(
    slide: SlideSpec,
    stage: PipelineEnhancementStage,
  ): string[] {
    if (slide.layout === 'quote' || slide.layout === 'section-divider') {
      return [];
    }

    const source = slide.bullets.map((bullet) => bullet.trim()).filter(Boolean);
    const limit =
      stage === 'structure'
        ? slide.layout === 'agenda'
          ? 3
          : slide.layout === 'process'
            ? 4
            : 2
        : stage === 'foundation-visuals'
          ? slide.layout === 'process'
            ? 4
            : slide.layout === 'comparison' || slide.layout === 'summary-closing'
              ? 3
              : 3
          : stage === 'key-assets'
            ? slide.layout === 'process'
              ? 4
              : slide.layout === 'comparison' || slide.layout === 'summary-closing'
                ? 3
                : 2
            : slide.layout === 'process'
              ? 5
              : slide.layout === 'comparison' || slide.layout === 'summary-closing'
                ? 4
                : 3;

    const maxLength =
      stage === 'structure'
        ? 22
        : stage === 'foundation-visuals'
          ? 26
          : stage === 'key-assets'
            ? 24
            : 28;

    return source.map((bullet) => this.shortenText(bullet, maxLength)).slice(0, limit);
  }

  private limitParagraphForStage(
    slide: SlideSpec,
    stage: PipelineEnhancementStage,
  ): string | undefined {
    const base = (slide.paragraph || '').trim();
    if (!base) {
      return base;
    }

    const maxLength =
      stage === 'structure'
        ? slide.layout === 'cover'
          ? 72
          : 88
        : stage === 'foundation-visuals'
          ? 120
          : stage === 'key-assets'
            ? slide.layout === 'cover'
              ? 70
              : 96
            : slide.layout === 'process' || slide.layout === 'comparison'
              ? 80
              : 110;

    return this.shortenText(base, maxLength);
  }

  private getDraftEyebrow(slide: SlideSpec): string {
    switch (slide.role) {
      case 'cover':
        return 'Draft opening';
      case 'agenda':
        return 'Draft flow';
      case 'closing':
      case 'summary':
        return 'Draft close';
      case 'section-divider':
        return 'Draft section';
      default:
        return 'Draft point';
    }
  }

  private toDeclarativeLine(title: string, fallback: string): string {
    const normalized = (fallback || title).replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return title;
    }

    if (normalized.length <= 72) {
      return normalized;
    }

    const shortTitle = this.shortenText(title, 28);
    const shortFallback = this.shortenText(normalized, 42);
    return `${shortTitle}: ${shortFallback}`;
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
