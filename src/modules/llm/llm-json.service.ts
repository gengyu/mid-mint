import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../tools/document-parser/types/parsed-document.type';
import { PptDslBuilderService } from '../ppt-dsl/ppt-dsl-builder.service';
import { PptDslDocument } from '../ppt-dsl/ppt-dsl.types';
import { PipelineEnhancementStage, PresentationAnalysis } from '../pipeline/pipeline.types';
import { LlmService } from './llm.service';

@Injectable()
export class LlmJsonService {
  constructor(
    private readonly llmService: LlmService,
    private readonly pptDslBuilderService: PptDslBuilderService,
  ) {}

  async analyzeDocument(document: ParsedDocument): Promise<PresentationAnalysis> {
    const fallback = this.buildFallbackAnalysis(document);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Analyze this presentation source and return JSON only.',
      'Do not generate slides here. Only analyze the source.',
      'Return this shape: { "mainTopic": string, "summary": string, "audience": string, "tone": string, "keyMessages": string[], "storyArc": string[] }.',
      JSON.stringify({
        title: document.title,
        sourceType: document.sourceType,
        sections: document.sections,
        rawTextPreview: document.rawText.slice(0, 12000),
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<PresentationAnalysis>(prompt);
    return this.isValidAnalysis(result) ? result : fallback;
  }

  async generatePptDsl(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
  ): Promise<PptDslDocument> {
    const fallback = this.pptDslBuilderService.buildFallback({ document, analysis });
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a complete PPT DSL document and return JSON only.',
      'The output must use system "ppt-dsl-v1".',
      'Do not use fixed templates. Do not use real images. Use SVG/Mermaid/Formula elements when visual expression is needed.',
      'Decide slide count from content. Long documents should become longer decks, usually 10-20 slides when needed.',
      'Every slide must have: id, index, role, intent, sourceRefs, layout, elements.',
      'Every layout must have: composition, frame, slots.',
      'Every element must have: id, kind, slot, layer, constraints.',
      'Use design.tokens for style. Slides should reference token names, not hard-coded local styling everywhere.',
      'You must choose a distinct visual theme based on the content and audience. Do not always use calm technical teal.',
      'Allowed theme directions include: executive-ink, warm-paper, data-dashboard, startup-bold, academic-clean, technical-editorial.',
      'Set design.theme = { name, style, rationale }. Make color, typography, spacing, and rhythm visibly match that theme.',
      'If the content is technical, you may choose data-dashboard or executive-ink instead of default technical-editorial when it would create a stronger deck.',
      'Supported element kinds: text, rich-text, list, statement, quote, table, code, formula, mermaid, svg, shape, connector, badge, card, group.',
      'Supported constraints: keep-within-safe-area, avoid-overlap, preserve-reading-order, prefer-single-primary-idea, fit-text, preserve-aspect-ratio, allow-downscale, allow-wrap, no-real-image.',
      'Use inches for canvas units. Standard widescreen canvas is width 13.333 and height 7.5.',
      JSON.stringify({
        expectedShape: fallback,
        analysis,
        document: {
          title: document.title,
          sourceType: document.sourceType,
          sections: document.sections,
          paragraphs: document.paragraphs.slice(0, 80),
          rawTextPreview: document.rawText.slice(0, 18000),
        },
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<PptDslDocument>(prompt);
    return this.pptDslBuilderService.normalize(result, fallback);
  }

  async refinePptDsl(input: {
    dsl: PptDslDocument;
    analysis: PresentationAnalysis;
    round: number;
    totalRounds: number;
    stage: PipelineEnhancementStage;
    objective: string;
  }): Promise<PptDslDocument> {
    const fallback = this.pptDslBuilderService.markRefinement(
      input.dsl,
      input.round,
      input.stage,
      input.objective,
    );
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Refine this PPT DSL and return JSON only.',
      `Round ${input.round} of ${input.totalRounds}.`,
      `Stage: ${input.stage}.`,
      `Objective: ${input.objective}.`,
      this.getStageInstruction(input.stage),
      'Keep the same DSL shape. Do not invent real image URLs. Prefer SVG/Mermaid/Formula elements for visual needs.',
      'For design-system-dsl, reconsider the visual theme and make the style tokens meaningfully different if the current deck feels generic.',
      'A theme change must update design.theme, color tokens, typography tokens, spacing/radius rhythm, and slide visual hierarchy together.',
      'Preserve slide ids where possible. Only change slide count if the current story is clearly compressed or redundant.',
      JSON.stringify({
        analysis: input.analysis,
        dsl: input.dsl,
      }),
    ].join('\n\n');

    const result = await this.llmService.generateJson<PptDslDocument>(prompt);
    return this.pptDslBuilderService.markRefinement(
      this.pptDslBuilderService.normalize(result, fallback),
      input.round,
      input.stage,
      input.objective,
    );
  }

  private buildFallbackAnalysis(document: ParsedDocument): PresentationAnalysis {
    const sections = document.sections.filter(
      (section) => section.title.trim() || section.body.trim() || section.bullets.length > 0,
    );
    const summary =
      sections.map((section) => section.body.trim()).find(Boolean) ??
      document.paragraphs.find((paragraph) => paragraph.trim().length > 40) ??
      document.rawText.slice(0, 240);
    const keyMessages = Array.from(
      new Set(
        sections
          .flatMap((section) => [section.title, ...section.bullets])
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ).slice(0, 6);

    return {
      mainTopic: document.title,
      summary,
      keyMessages: keyMessages.length ? keyMessages : [document.title],
      audience: 'General audience',
      tone: 'Confident and practical',
      storyArc: ['Context', 'Key ideas', 'Action'],
    };
  }

  private isValidAnalysis(value: unknown): value is PresentationAnalysis {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as PresentationAnalysis;
    return (
      typeof candidate.mainTopic === 'string' &&
      typeof candidate.summary === 'string' &&
      Array.isArray(candidate.keyMessages)
    );
  }

  private getStageInstruction(stage: PipelineEnhancementStage): string {
    switch (stage) {
      case 'structure-dsl':
        return 'Focus on story structure, slide count, slide roles, source coverage, and clear intent. Keep visuals lightweight.';
      case 'design-system-dsl':
        return 'Focus on selecting a distinctive design.theme, then update design.tokens, component consistency, layout rhythm, and visual hierarchy.';
      case 'asset-dsl':
        return 'Focus on adding or clarifying SVG/Mermaid/Formula asset requirements only for high-value slides.';
      case 'polish-dsl':
      default:
        return 'Focus on density control, repeated rhythm, clearer closing, and final consistency.';
    }
  }
}
