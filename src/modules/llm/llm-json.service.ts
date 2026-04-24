import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../parser/types/parsed-document.type';
import { PptDslDocument, PptDslSlideRole } from '../ppt-dsl/ppt-dsl.types';
import { LlmService } from './llm.service';

interface DeckPlanSlide {
  slideNumber: number;
  title: string;
  keyPoint: string;
  sourceSectionTitle: string;
  layoutHint: string;
  role: string;
  visualFocus: string;
  objective: string;
  sourceCoverage: string[];
  structureReason: string;
  contentWeight: string;
}

interface DeckPlan {
  title: string;
  totalSlides: number;
  slides: DeckPlanSlide[];
}

interface AnalysisResult {
  mainTopic: string;
  summary: string;
  keyMessages: string[];
  audience?: string;
  tone?: string;
  storyArc?: string[];
}

interface DslRefinementResult {
  dsl: PptDslDocument;
  changes: string[];
}

@Injectable()
export class LlmJsonService {
  constructor(private readonly llmService: LlmService) {}

  async analyzeDocument(document: ParsedDocument): Promise<AnalysisResult> {
    const fallback: AnalysisResult = {
      mainTopic: document.title,
      summary: this.compact(document.rawText, 300),
      keyMessages: document.sections
        .filter((section) => section.bullets.length > 0)
        .flatMap((section) => section.bullets.slice(0, 2))
        .slice(0, 6),
      audience: 'General audience',
      tone: 'Confident and practical',
      storyArc: ['Context', 'Key ideas', 'Action'],
    };

    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Analyze the following document and return a JSON object with these fields:',
      '- mainTopic: the central topic (string)',
      '- summary: a concise summary in 2-3 sentences (string)',
      '- keyMessages: an array of 3-6 key messages (string[])',
      '- audience: the likely target audience (string)',
      '- tone: the appropriate presentation tone (string)',
      '- storyArc: an array of 3-5 narrative arc phases (string[])',
      'Return valid JSON only.',
      '',
      'Document:',
      document.rawText.slice(0, 6000),
    ].join('\n');

    const result = await this.llmService.generateJson<AnalysisResult>(prompt);
    if (!result || typeof result.mainTopic !== 'string' || typeof result.summary !== 'string') {
      return fallback;
    }

    return {
      mainTopic: result.mainTopic || fallback.mainTopic,
      summary: result.summary || fallback.summary,
      keyMessages: Array.isArray(result.keyMessages) && result.keyMessages.length > 0
        ? result.keyMessages.filter((m) => typeof m === 'string')
        : fallback.keyMessages,
      audience: result.audience || fallback.audience,
      tone: result.tone || fallback.tone,
      storyArc: Array.isArray(result.storyArc) && result.storyArc.length > 0
        ? result.storyArc.filter((s) => typeof s === 'string')
        : fallback.storyArc,
    };
  }

  async planDeck(document: ParsedDocument, analysis: AnalysisResult): Promise<DeckPlan> {
    const fallback = this.buildFallbackDeckPlan(document, analysis);
    if (!this.llmService.isConfigured()) {
      return fallback;
    }

    const prompt = [
      'Create a presentation deck plan and return JSON only.',
      'Decide the slide count, narrative order, and per-slide intent based on the document content.',
      'Do not use a fixed template. Let the content determine the structure.',
      'Each slide should have: slideNumber, title, keyPoint, sourceSectionTitle, layoutHint, role, visualFocus, objective, sourceCoverage, structureReason, contentWeight.',
      'layoutHint must be one of: cover, agenda, section-divider, text-visual, comparison, process, quote, summary-closing.',
      'role must be one of: cover, agenda, section-divider, content, summary, closing.',
      'visualFocus must be one of: text, visual, mixed.',
      'contentWeight must be one of: low, medium, high.',
      JSON.stringify({
        expectedShape: fallback,
        documentTitle: document.title,
        sections: document.sections.map((section) => ({
          title: section.title,
          level: section.level,
          bulletCount: section.bullets.length,
          bodyLength: section.body.length,
        })),
        analysis,
      }),
    ].join('\n');

    const result = await this.llmService.generateJson<DeckPlan>(prompt);
    if (!this.isValidDeckPlan(result)) {
      return fallback;
    }

    return result;
  }

  async refineDsl(
    dsl: PptDslDocument,
    round: number,
    stage: string,
    objective: string,
  ): Promise<DslRefinementResult> {
    if (!this.llmService.isConfigured()) {
      return { dsl, changes: [] };
    }

    const stageDescriptions: Record<string, string> = {
      'structure-dsl': 'Focus on slide roles, narrative order, and speaking structure. Do not change design tokens or visual elements.',
      'design-system-dsl': 'Focus on design tokens, typography, colors, spacing, and visual hierarchy. Do not change slide roles or narrative order.',
      'asset-dsl': 'Focus on adding or refining SVG, Mermaid, and Formula elements for high-value slides. Do not change the narrative structure.',
      'polish-dsl': 'Focus on density, consistency, rhythm, and final quality. Fix any remaining issues.',
    };

    const stageGuidance = stageDescriptions[stage] || 'Improve the DSL based on the objective.';

    const prompt = [
      `You are refining a PPT DSL document. This is round ${round} of refinement.`,
      `Stage: ${stage}`,
      `Objective: ${objective}`,
      `Guidance: ${stageGuidance}`,
      '',
      'Return a JSON object with two fields:',
      '- dsl: the complete refined PptDslDocument (must have the same structure as the input)',
      '- changes: an array of strings describing what you changed and why',
      '',
      'Current DSL:',
      JSON.stringify(dsl, null, 2).slice(0, 12000),
    ].join('\n');

    const result = await this.llmService.generateJson<DslRefinementResult>(prompt);
    if (!result || !result.dsl || !Array.isArray(result.dsl.slides)) {
      return { dsl, changes: [] };
    }

    return {
      dsl: result.dsl,
      changes: Array.isArray(result.changes) ? result.changes.filter((c) => typeof c === 'string') : [],
    };
  }

  private buildFallbackDeckPlan(document: ParsedDocument, analysis: AnalysisResult): DeckPlan {
    const contentSections = document.sections.filter(
      (section) => section.title.trim() || section.body.trim() || section.bullets.length > 0,
    );
    const maxContentSlides = Math.min(18, Math.max(3, Math.ceil(contentSections.length * 0.85)));
    const selectedSections = contentSections.slice(0, maxContentSlides);
    const includeAgenda = selectedSections.length >= 3;

    const slides: DeckPlanSlide[] = [];
    let slideNumber = 1;

    slides.push({
      slideNumber: slideNumber++,
      title: document.title,
      keyPoint: analysis.summary,
      sourceSectionTitle: document.title,
      layoutHint: 'cover',
      role: 'cover',
      visualFocus: 'visual',
      objective: 'Open with a clear promise and establish the talk narrative.',
      sourceCoverage: [document.title],
      structureReason: 'Use the title section as the opening promise.',
      contentWeight: 'low',
    });

    if (includeAgenda) {
      slides.push({
        slideNumber: slideNumber++,
        title: 'Agenda',
        keyPoint: analysis.storyArc?.join(' -> ') ?? 'Context -> Key ideas -> Action',
        sourceSectionTitle: 'Agenda',
        layoutHint: 'agenda',
        role: 'agenda',
        visualFocus: 'text',
        objective: 'Show the audience the talk flow before entering the argument.',
        sourceCoverage: selectedSections.map((s) => s.title).slice(0, 6),
        structureReason: 'Preview the story arc for the audience.',
        contentWeight: 'low',
      });
    }

    selectedSections.forEach((section, index) => {
      const layoutHint = this.inferLayoutHint(section, index);
      const role = this.inferRole(layoutHint, index, selectedSections.length);
      slides.push({
        slideNumber: slideNumber++,
        title: section.title || `Section ${index + 1}`,
        keyPoint: section.body || section.bullets[0] || section.title,
        sourceSectionTitle: section.title,
        layoutHint,
        role,
        visualFocus: layoutHint === 'process' || layoutHint === 'comparison' ? 'visual' : 'mixed',
        objective: `Explain why "${section.title}" matters and make the audience remember the core message.`,
        sourceCoverage: [section.title],
        structureReason: `Content section mapped to ${layoutHint} layout.`,
        contentWeight: section.bullets.length >= 4 ? 'high' : 'medium',
      });
    });

    slides.push({
      slideNumber: slideNumber++,
      title: 'Closing Thought',
      keyPoint: analysis.summary,
      sourceSectionTitle: 'Summary',
      layoutHint: 'summary-closing',
      role: 'closing',
      visualFocus: 'text',
      objective: 'Close with a clear takeaway and action frame.',
      sourceCoverage: ['Summary'],
      structureReason: 'Final slide to reinforce the main message.',
      contentWeight: 'low',
    });

    return {
      title: document.title,
      totalSlides: slides.length,
      slides,
    };
  }

  private inferLayoutHint(section: { title: string; body: string; bullets: string[]; tableData?: any; codeBlocks?: any[]; formulas?: string[]; mermaidDefinitions?: string[] }, index: number): string {
    const combined = `${section.title} ${section.body}`.toLowerCase();

    if (section.mermaidDefinitions?.length) return 'process';
    if (section.tableData) return 'comparison';
    if (/process|workflow|pipeline|步骤|流程/.test(combined) && section.bullets.length >= 3) return 'process';
    if (/compare|versus|vs|对比|比较/.test(combined)) return 'comparison';
    if (section.bullets.length <= 1 && section.body.length < 180) return 'quote';
    if (index > 0 && index % 5 === 0) return 'section-divider';
    return 'text-visual';
  }

  private inferRole(layoutHint: string, index: number, total: number): string {
    if (layoutHint === 'cover') return 'cover';
    if (layoutHint === 'agenda') return 'agenda';
    if (layoutHint === 'section-divider') return 'section-divider';
    if (layoutHint === 'summary-closing') return 'closing';
    if (index === total - 1) return 'summary';
    return 'content';
  }

  private isValidDeckPlan(value: unknown): value is DeckPlan {
    const candidate = value as DeckPlan;
    return (
      Boolean(candidate) &&
      typeof candidate.title === 'string' &&
      typeof candidate.totalSlides === 'number' &&
      Array.isArray(candidate.slides) &&
      candidate.slides.length > 0 &&
      typeof candidate.slides[0]?.slideNumber === 'number'
    );
  }

  private compact(value: string, max: number): string {
    const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
  }
}
