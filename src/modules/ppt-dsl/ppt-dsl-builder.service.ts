import { Injectable } from '@nestjs/common';

import { DocumentSection } from '../parser/types/document-section.type';
import { ParsedDocument } from '../parser/types/parsed-document.type';
import { PresentationAnalysis } from '../pipeline/pipeline.types';
import {
  PptDslConstraint,
  PptDslDocument,
  PptDslElement,
  PptDslElementKind,
  PptDslSlide,
  PptDslSlideRole,
} from './ppt-dsl.types';

interface BuildFallbackInput {
  document: ParsedDocument;
  analysis: PresentationAnalysis;
}

@Injectable()
export class PptDslBuilderService {
  buildFallback(input: BuildFallbackInput): PptDslDocument {
    const contentSections = input.document.sections.filter(
      (section) => section.title.trim() || section.body.trim() || section.bullets.length > 0,
    );
    const selectedSections = contentSections.slice(0, this.estimateContentSlideCount(input.document));
    const includeAgenda = selectedSections.length >= 3;
    const slides: PptDslSlide[] = [];

    slides.push(
      this.buildSlide({
        index: 1,
        role: 'cover',
        title: input.document.title,
        subtitle: this.compact(input.analysis.summary, 120),
        intent: 'Establish the topic, promise, and narrative frame.',
        sourceRefs: [input.document.title],
        composition: 'hero-right',
        visualPrompt: `Abstract SVG system visual for ${input.document.title}.`,
        speakerNotes: `Open the presentation by framing ${input.document.title}.`,
      }),
    );

    if (includeAgenda) {
      slides.push(
        this.buildSlide({
          index: slides.length + 1,
          role: 'agenda',
          title: 'Agenda',
          subtitle: input.analysis.storyArc?.join(' -> ') ?? 'Context -> Key ideas -> Action',
          bullets: selectedSections.map((section) => this.compact(section.title, 42)).slice(0, 6),
          intent: 'Show the audience the talk flow before entering the argument.',
          sourceRefs: selectedSections.map((section) => section.title).slice(0, 6),
          composition: 'stacked',
          speakerNotes: 'Briefly preview the structure and pacing.',
        }),
      );
    }

    selectedSections.forEach((section, index) => {
      const role = this.pickSectionRole(section, index, selectedSections.length);
      slides.push(
        this.buildSlide({
          index: slides.length + 1,
          role,
          title: this.compact(section.title || `Section ${index + 1}`, 80),
          subtitle: role === 'section-divider' ? this.compact(section.body || section.bullets[0] || '', 120) : undefined,
          paragraph: this.compact(section.body, role === 'quote' ? 260 : 220),
          bullets: role === 'quote' ? [] : section.bullets.slice(0, this.pickBulletLimit(role)),
          intent: this.compact(section.body || section.bullets[0] || section.title, 180),
          sourceRefs: [section.title],
          composition: this.pickComposition(role, index),
          table: section.tableData,
          code: section.codeBlocks?.[0],
          formula: section.formulas?.[0],
          mermaid: section.mermaidDefinitions?.[0],
          visualPrompt: this.shouldAddSvg(role, section)
            ? `Create a concise SVG explanation for: ${section.title}.`
            : undefined,
          speakerNotes: this.compact(section.body || section.bullets.join(' / '), 220),
        }),
      );
    });

    slides.push(
      this.buildSlide({
        index: slides.length + 1,
        role: 'closing',
        title: 'Closing Thought',
        paragraph: this.compact(input.analysis.summary, 180),
        bullets: input.analysis.keyMessages.slice(0, 4),
        intent: 'Close with a clear takeaway and action frame.',
        sourceRefs: ['Summary'],
        composition: 'closing-focus',
        visualPrompt: `Closing SVG visual for ${input.analysis.mainTopic}.`,
        speakerNotes: 'Summarize the argument and leave the audience with one practical next step.',
      }),
    );

    return this.normalize({
      system: 'ppt-dsl-v1',
      canvas: {
        width: 13.333,
        height: 7.5,
        unit: 'in',
        safeArea: {
          top: 0.48,
          right: 0.62,
          bottom: 0.48,
          left: 0.62,
        },
      },
      deck: {
        title: input.document.title,
        audience: input.analysis.audience ?? 'General audience',
        narrativeArc: input.analysis.storyArc?.length
          ? input.analysis.storyArc
          : ['Context', 'Key ideas', 'Action'],
        talkTrack: input.analysis.summary,
        density: this.pickDensity(input.document),
      },
      design: this.buildDefaultDesign(input.analysis, input.document),
      slides,
      assets: [],
      constraints: [
        'keep-within-safe-area',
        'avoid-overlap',
        'preserve-reading-order',
        'prefer-single-primary-idea',
        'no-real-image',
      ],
    });
  }

  normalize(input: unknown, fallback?: PptDslDocument): PptDslDocument {
    if (!this.isObject(input)) {
      return fallback ?? this.emptyDocument();
    }

    const candidate = input as Partial<PptDslDocument>;
    const base = fallback ?? this.emptyDocument();
    const slides = Array.isArray(candidate.slides)
      ? candidate.slides.map((slide, index) => this.normalizeSlide(slide, index + 1)).filter(Boolean)
      : base.slides;

    return {
      system: 'ppt-dsl-v1',
      canvas: {
        width: this.numberOr(candidate.canvas?.width, base.canvas.width),
        height: this.numberOr(candidate.canvas?.height, base.canvas.height),
        unit: 'in',
        safeArea: this.normalizeInsets(candidate.canvas?.safeArea, base.canvas.safeArea),
      },
      deck: {
        title: this.stringOr(candidate.deck?.title, base.deck.title),
        audience: this.stringOr(candidate.deck?.audience, base.deck.audience),
        narrativeArc: this.stringArrayOr(candidate.deck?.narrativeArc, base.deck.narrativeArc),
        talkTrack: this.stringOr(candidate.deck?.talkTrack, base.deck.talkTrack),
        density: ['low', 'medium', 'high'].includes(candidate.deck?.density ?? '')
          ? candidate.deck!.density
          : base.deck.density,
      },
      design: {
        theme: candidate.design?.theme ?? base.design.theme,
        intent: this.stringOr(candidate.design?.intent, base.design.intent),
        tokens: {
          color: { ...base.design.tokens.color, ...candidate.design?.tokens?.color },
          typography: { ...base.design.tokens.typography, ...candidate.design?.tokens?.typography },
          spacing: { ...base.design.tokens.spacing, ...candidate.design?.tokens?.spacing },
          radius: { ...base.design.tokens.radius, ...candidate.design?.tokens?.radius },
          stroke: { ...base.design.tokens.stroke, ...candidate.design?.tokens?.stroke },
        },
        rhythm: {
          opening: this.stringOr(candidate.design?.rhythm?.opening, base.design.rhythm.opening),
          middle: this.stringOr(candidate.design?.rhythm?.middle, base.design.rhythm.middle),
          closing: this.stringOr(candidate.design?.rhythm?.closing, base.design.rhythm.closing),
        },
      },
      slides: slides.length > 0 ? slides.filter((s): s is PptDslSlide => s !== null) : base.slides,
      assets: Array.isArray(candidate.assets) ? candidate.assets : base.assets,
      constraints: this.constraintsOr(candidate.constraints, base.constraints),
    };
  }

  markRefinement(
    dsl: PptDslDocument,
    round: number,
    stage: string,
    objective: string,
  ): PptDslDocument {
    return {
      ...dsl,
      slides: dsl.slides.map((slide) => ({
        ...slide,
        refinementState: {
          round,
          objective,
          locked: this.lockedScopes(round),
        },
      })),
      design: {
        ...dsl.design,
        rhythm: this.applyStageRhythm(dsl.design.rhythm, stage),
      },
    };
  }

  private buildSlide(input: {
    index: number;
    role: PptDslSlideRole;
    title: string;
    subtitle?: string;
    paragraph?: string;
    bullets?: string[];
    intent: string;
    sourceRefs: string[];
    composition: PptDslSlide['layout']['composition'];
    table?: DocumentSection['tableData'];
    code?: { language?: string; content: string };
    formula?: string;
    mermaid?: string;
    visualPrompt?: string;
    speakerNotes?: string;
  }): PptDslSlide {
    const id = this.slideId(input.index);
    const elements: PptDslElement[] = [
      this.textElement(id, 'eyebrow', 'text', 'eyebrow', this.roleLabel(input.role), 'eyebrow', 10),
      this.textElement(id, 'title', 'text', 'title', input.title, 'title', 20),
    ];

    if (input.subtitle) {
      elements.push(this.textElement(id, 'subtitle', 'text', 'subtitle', input.subtitle, 'subtitle', 30));
    }

    if (input.paragraph) {
      elements.push(this.textElement(id, 'body', 'rich-text', 'body', input.paragraph, 'content', 40));
    }

    if (input.bullets?.length) {
      elements.push({
        id: `${id}-list`,
        kind: 'list',
        slot: input.role === 'process' ? 'steps' : 'content',
        layer: 50,
        ordered: input.role === 'process' || input.role === 'agenda',
        items: input.bullets,
        style: {
          typographyToken: 'body',
          colorToken: 'textSecondary',
        },
        constraints: ['fit-text', 'allow-wrap', 'preserve-reading-order'],
      });
    }

    elements.push(
      this.textElement(id, 'takeaway', 'statement', 'takeaway', this.compact(input.intent, 90), 'takeaway', 60),
    );

    if (input.table) {
      elements.push({
        id: `${id}-table`,
        kind: 'table',
        slot: 'content',
        layer: 70,
        headers: input.table.headers,
        rows: input.table.rows,
        constraints: ['fit-text', 'keep-within-safe-area'],
      });
    }

    if (input.code) {
      elements.push({
        id: `${id}-code`,
        kind: 'code',
        slot: 'content',
        layer: 72,
        language: input.code.language,
        code: input.code.content,
        style: {
          typographyToken: 'mono',
          backgroundToken: 'surfaceAlt',
        },
        constraints: ['fit-text', 'allow-wrap', 'keep-within-safe-area'],
      });
    }

    if (input.formula) {
      elements.push({
        id: `${id}-formula`,
        kind: 'formula',
        slot: 'visual',
        layer: 80,
        formula: input.formula,
        constraints: ['preserve-aspect-ratio', 'keep-within-safe-area'],
      });
    }

    if (input.mermaid) {
      elements.push({
        id: `${id}-mermaid`,
        kind: 'mermaid',
        slot: 'visual',
        layer: 82,
        definition: input.mermaid,
        constraints: ['preserve-aspect-ratio', 'keep-within-safe-area'],
      });
    }

    if (input.visualPrompt) {
      elements.push({
        id: `${id}-visual`,
        kind: 'svg',
        slot: input.role === 'cover' ? 'heroVisual' : 'visual',
        layer: 90,
        generationPrompt: input.visualPrompt,
        constraints: ['no-real-image', 'preserve-aspect-ratio', 'keep-within-safe-area'],
      });
    }

    return {
      id,
      index: input.index,
      role: input.role,
      intent: input.intent,
      sourceRefs: input.sourceRefs,
      layout: {
        composition: input.composition,
        frame: {
          direction: input.composition.includes('grid') ? 'grid' : input.composition.includes('hero') ? 'hero' : 'vertical',
          padding: {
            top: 0.48,
            right: 0.62,
            bottom: 0.48,
            left: 0.62,
          },
          gap: 0.32,
          align: input.role === 'cover' || input.role === 'closing' ? 'center' : 'start',
          columns: input.composition.includes('grid') ? 2 : undefined,
        },
        slots: this.defaultSlots(input.role),
      },
      elements,
      speakerNotes: input.speakerNotes,
    };
  }

  private normalizeSlide(slide: unknown, fallbackIndex: number): PptDslSlide | null {
    if (!this.isObject(slide)) {
      return null;
    }
    const candidate = slide as Partial<PptDslSlide>;
    const role = this.isRole(candidate.role) ? candidate.role : 'content';
    return {
      id: this.stringOr(candidate.id, this.slideId(candidate.index ?? fallbackIndex)),
      index: this.numberOr(candidate.index, fallbackIndex),
      role,
      intent: this.stringOr(candidate.intent, role),
      sourceRefs: this.stringArrayOr(candidate.sourceRefs, []),
      layout: {
        composition: candidate.layout?.composition ?? this.pickComposition(role, fallbackIndex),
        frame: {
          direction: candidate.layout?.frame?.direction ?? 'vertical',
          padding: this.normalizeInsets(candidate.layout?.frame?.padding, {
            top: 0.48,
            right: 0.62,
            bottom: 0.48,
            left: 0.62,
          }),
          gap: this.numberOr(candidate.layout?.frame?.gap, 0.32),
          align: candidate.layout?.frame?.align ?? 'start',
          columns: candidate.layout?.frame?.columns,
        },
        slots: Object.keys(candidate.layout?.slots ?? {}).length
          ? candidate.layout!.slots
          : this.defaultSlots(role),
      },
      elements: Array.isArray(candidate.elements)
        ? candidate.elements.filter((element): element is PptDslElement => this.isObject(element))
        : [],
      speakerNotes: candidate.speakerNotes,
      refinementState: candidate.refinementState,
    };
  }

  private textElement(
    slideId: string,
    key: string,
    kind: Extract<PptDslElementKind, 'text' | 'rich-text' | 'statement' | 'quote' | 'badge'>,
    textRole: 'eyebrow' | 'title' | 'subtitle' | 'body' | 'caption' | 'takeaway' | 'label' | 'speaker-note',
    text: string,
    slot: string,
    layer: number,
  ): PptDslElement {
    return {
      id: `${slideId}-${key}`,
      kind,
      slot,
      layer,
      textRole,
      text,
      style: {
        typographyToken: textRole === 'title' ? 'title' : textRole === 'subtitle' ? 'subtitle' : 'body',
        colorToken: textRole === 'title' ? 'textPrimary' : 'textSecondary',
      },
      constraints: ['fit-text', 'allow-wrap', 'preserve-reading-order'],
    };
  }

  private buildDefaultDesign(
    analysis: PresentationAnalysis,
    document?: ParsedDocument,
  ): PptDslDocument['design'] {
    const theme = this.pickTheme(analysis, document);

    return {
      theme: {
        name: theme.name,
        style: theme.style,
        rationale: theme.rationale,
      },
      intent: theme.intent.replace('{topic}', analysis.mainTopic),
      tokens: {
        color: {
          ...theme.color,
        },
        typography: {
          display: { font: theme.displayFont, size: 36, weight: 'semibold', colorToken: 'textPrimary' },
          title: { font: theme.displayFont, size: 31, weight: 'semibold', colorToken: 'textPrimary' },
          subtitle: { font: theme.bodyFont, size: 16, colorToken: 'textSecondary' },
          body: { font: theme.bodyFont, size: 14, colorToken: 'textSecondary' },
          caption: { font: theme.bodyFont, size: 9, colorToken: 'textSecondary' },
          mono: { font: theme.monoFont, size: 12, colorToken: 'textPrimary' },
        },
        spacing: {
          ...theme.spacing,
        },
        radius: {
          ...theme.radius,
        },
        stroke: {
          default: theme.stroke,
        },
      },
      rhythm: theme.rhythm,
    };
  }

  private pickTheme(
    analysis: PresentationAnalysis,
    document?: ParsedDocument,
  ): ReturnType<PptDslBuilderService['themePresets']>[number] {
    const text = [
      analysis.mainTopic,
      analysis.summary,
      analysis.audience,
      analysis.tone,
      ...(analysis.keyMessages ?? []),
      ...(analysis.storyArc ?? []),
      document?.rawText.slice(0, 4000),
    ].join(' ').toLowerCase();
    const presets = this.themePresets();

    if (/market|growth|launch|startup|brand|product|用户|增长|发布|品牌/.test(text)) {
      return presets.find((preset) => preset.name === 'startup-bold')!;
    }
    if (/finance|board|executive|strategy|risk|投资|董事会|战略|风险/.test(text)) {
      return presets.find((preset) => preset.name === 'executive-ink')!;
    }
    if (/research|paper|academic|study|education|课程|研究|论文|教学/.test(text)) {
      return presets.find((preset) => preset.name === 'warm-paper')!;
    }
    if (/data|metric|dashboard|platform|architecture|rag|ai|llm|system|工程|架构|数据|平台/.test(text)) {
      return presets.find((preset) => preset.name === 'data-dashboard')!;
    }
    return presets.find((preset) => preset.name === 'academic-clean')!;
  }

  private themePresets(): Array<{
    name: string;
    style: string;
    rationale: string;
    intent: string;
    displayFont: string;
    bodyFont: string;
    monoFont: string;
    color: Record<string, string>;
    spacing: Record<string, number>;
    radius: Record<string, number>;
    stroke: number;
    rhythm: PptDslDocument['design']['rhythm'];
  }> {
    return [
      {
        name: 'data-dashboard',
        style: 'Dark analytical dashboard with electric cyan accents and dense system panels.',
        rationale: 'Best for technical, AI, data, architecture, and platform documents.',
        intent: 'Create a high-contrast analytical deck for {topic}, like a polished command center.',
        displayFont: 'Aptos Display',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        color: {
          background: '#07111F',
          surface: '#0E1B2D',
          surfaceAlt: '#14243A',
          textPrimary: '#EAF2FF',
          textSecondary: '#93A9C8',
          accent: '#38BDF8',
          accentSoft: '#123C55',
          border: '#24415F',
          inverseBackground: '#EAF2FF',
          inverseText: '#07111F',
          warning: '#FBBF24',
        },
        spacing: { pageMarginX: 0.58, pageMarginY: 0.44, sectionGap: 0.28, itemGap: 0.14 },
        radius: { card: 0.08, panel: 0.12 },
        stroke: 1.2,
        rhythm: {
          opening: 'Open like a system dashboard with a sharp thesis.',
          middle: 'Alternate architecture, evidence, and decision panels.',
          closing: 'End with a clear operating recommendation.',
        },
      },
      {
        name: 'executive-ink',
        style: 'Premium dark executive briefing with restrained gold accents.',
        rationale: 'Best for strategy, finance, risk, leadership, and board-level material.',
        intent: 'Create a premium executive briefing for {topic}, restrained and decisive.',
        displayFont: 'Georgia',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        color: {
          background: '#11100E',
          surface: '#1B1915',
          surfaceAlt: '#252119',
          textPrimary: '#F7F1E5',
          textSecondary: '#B8AA95',
          accent: '#D6A84F',
          accentSoft: '#3A2D15',
          border: '#3A3428',
          inverseBackground: '#F7F1E5',
          inverseText: '#11100E',
          warning: '#EAB308',
        },
        spacing: { pageMarginX: 0.7, pageMarginY: 0.56, sectionGap: 0.36, itemGap: 0.18 },
        radius: { card: 0.04, panel: 0.08 },
        stroke: 0.9,
        rhythm: {
          opening: 'Open with a boardroom thesis.',
          middle: 'Use fewer, stronger claims with deliberate contrast.',
          closing: 'Close on a decisive recommendation.',
        },
      },
      {
        name: 'warm-paper',
        style: 'Warm editorial paper system with clay, ink, and soft annotation blocks.',
        rationale: 'Best for research, education, essays, and explanatory writing.',
        intent: 'Create a warm editorial explanation deck for {topic}, thoughtful and readable.',
        displayFont: 'Georgia',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        color: {
          background: '#F7EFE3',
          surface: '#FFF9EF',
          surfaceAlt: '#ECDDC9',
          textPrimary: '#2B2118',
          textSecondary: '#756455',
          accent: '#B85C38',
          accentSoft: '#F1CDBA',
          border: '#DBC7AE',
          inverseBackground: '#2B2118',
          inverseText: '#FFF9EF',
          warning: '#C47A1C',
        },
        spacing: { pageMarginX: 0.72, pageMarginY: 0.52, sectionGap: 0.34, itemGap: 0.18 },
        radius: { card: 0.18, panel: 0.26 },
        stroke: 0.8,
        rhythm: {
          opening: 'Open like an editorial argument.',
          middle: 'Alternate explanation, annotation, and synthesis.',
          closing: 'End with a memorable distilled insight.',
        },
      },
      {
        name: 'startup-bold',
        style: 'Bold launch deck with energetic coral, cream, and oversized type.',
        rationale: 'Best for product, growth, startup, brand, and launch narratives.',
        intent: 'Create a bold launch-style deck for {topic}, energetic and memorable.',
        displayFont: 'Aptos Display',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        color: {
          background: '#FFF7ED',
          surface: '#FFFFFF',
          surfaceAlt: '#FFE1CF',
          textPrimary: '#27140C',
          textSecondary: '#7A4B35',
          accent: '#F05A28',
          accentSoft: '#FFD4BE',
          border: '#F4B99A',
          inverseBackground: '#27140C',
          inverseText: '#FFF7ED',
          warning: '#F59E0B',
        },
        spacing: { pageMarginX: 0.58, pageMarginY: 0.42, sectionGap: 0.3, itemGap: 0.14 },
        radius: { card: 0.24, panel: 0.32 },
        stroke: 1.4,
        rhythm: {
          opening: 'Open with a launch-poster moment.',
          middle: 'Keep claims punchy with bold visual breaks.',
          closing: 'Close with momentum and a concrete next step.',
        },
      },
      {
        name: 'academic-clean',
        style: 'Clean academic whiteboard with blue-gray structure and quiet emphasis.',
        rationale: 'Good default for general explanatory content.',
        intent: 'Create a clean academic explanation deck for {topic}, calm and precise.',
        displayFont: 'Aptos Display',
        bodyFont: 'Aptos',
        monoFont: 'Aptos Mono',
        color: {
          background: '#F8FAFC',
          surface: '#FFFFFF',
          surfaceAlt: '#E2E8F0',
          textPrimary: '#172033',
          textSecondary: '#64748B',
          accent: '#2563EB',
          accentSoft: '#DBEAFE',
          border: '#CBD5E1',
          inverseBackground: '#172033',
          inverseText: '#FFFFFF',
          warning: '#D97706',
        },
        spacing: { pageMarginX: 0.64, pageMarginY: 0.48, sectionGap: 0.32, itemGap: 0.16 },
        radius: { card: 0.12, panel: 0.18 },
        stroke: 1,
        rhythm: {
          opening: 'Open with a clear learning objective.',
          middle: 'Build understanding step by step.',
          closing: 'End with a concise synthesis.',
        },
      },
    ];
  }

  private defaultSlots(role: PptDslSlideRole): PptDslSlide['layout']['slots'] {
    if (role === 'cover') {
      return {
        eyebrow: this.slot('top-left', 'supporting', 'text-flow'),
        title: this.slot('center-left', 'primary', 'text-flow'),
        subtitle: this.slot('center-left', 'secondary', 'text-flow'),
        heroVisual: this.slot('right-main', 'primary', 'contain'),
        takeaway: this.slot('bottom-left', 'accent', 'text-flow'),
      };
    }

    if (role === 'closing') {
      return {
        title: this.slot('top-left', 'primary', 'text-flow'),
        content: this.slot('center-left', 'secondary', 'text-flow'),
        takeaway: this.slot('center-right', 'accent', 'text-flow'),
        visual: this.slot('bottom-right', 'supporting', 'contain'),
      };
    }

    return {
      eyebrow: this.slot('top-left', 'supporting', 'text-flow'),
      title: this.slot('top-left', 'primary', 'text-flow'),
      subtitle: this.slot('top-left', 'secondary', 'text-flow'),
      content: this.slot('left-main', 'secondary', 'text-flow'),
      steps: this.slot('center', 'secondary', 'text-flow'),
      quote: this.slot('center', 'primary', 'text-flow'),
      visual: this.slot('right-main', 'primary', 'contain'),
      takeaway: this.slot('bottom-left', 'accent', 'text-flow'),
    };
  }

  private slot(
    region: PptDslSlide['layout']['slots'][string]['region'],
    weight: PptDslSlide['layout']['slots'][string]['weight'],
    fit: PptDslSlide['layout']['slots'][string]['fit'],
  ): PptDslSlide['layout']['slots'][string] {
    const constraints: PptDslConstraint[] = ['keep-within-safe-area', 'avoid-overlap'];
    if (fit === 'text-flow') {
      constraints.push('fit-text', 'allow-wrap');
    }
    if (fit === 'contain') {
      constraints.push('preserve-aspect-ratio');
    }
    return { region, weight, fit, constraints };
  }

  private pickSectionRole(section: DocumentSection, index: number, total: number): PptDslSlideRole {
    if (index === total - 1 && /summary|conclusion|结论|总结|收尾/.test(section.title.toLowerCase())) {
      return 'summary';
    }
    if (section.tableData) {
      return 'comparison';
    }
    if (section.codeBlocks?.length || section.formulas?.length || section.mermaidDefinitions?.length) {
      return 'content';
    }
    if (section.bullets.length >= 4 && /process|workflow|flow|步骤|流程|路径/.test(`${section.title} ${section.body}`.toLowerCase())) {
      return 'process';
    }
    if (section.body.length < 180 && section.bullets.length <= 2) {
      return 'quote';
    }
    if (index > 0 && index % 5 === 0) {
      return 'section-divider';
    }
    return 'content';
  }

  private pickComposition(role: PptDslSlideRole, index: number): PptDslSlide['layout']['composition'] {
    switch (role) {
      case 'cover':
        return 'hero-right';
      case 'agenda':
        return 'stacked';
      case 'section-divider':
      case 'quote':
        return 'centered-statement';
      case 'comparison':
        return 'comparison-grid';
      case 'process':
        return 'timeline';
      case 'closing':
      case 'summary':
        return 'closing-focus';
      default:
        return index % 2 === 0 ? 'balanced-split' : 'asymmetric-split';
    }
  }

  private shouldAddSvg(role: PptDslSlideRole, section: DocumentSection): boolean {
    return (
      role === 'cover' ||
      role === 'closing' ||
      role === 'process' ||
      role === 'comparison' ||
      Boolean(section.mermaidDefinitions?.length || section.formulas?.length)
    );
  }

  private estimateContentSlideCount(document: ParsedDocument): number {
    const sectionCount = document.sections.length;
    const textCount = document.rawText.length;
    return Math.min(18, Math.max(3, Math.ceil(sectionCount * 0.85), Math.ceil(textCount / 900)));
  }

  private pickDensity(document: ParsedDocument): 'low' | 'medium' | 'high' {
    if (document.rawText.length > 9000) {
      return 'high';
    }
    if (document.rawText.length < 2600) {
      return 'low';
    }
    return 'medium';
  }

  private pickBulletLimit(role: PptDslSlideRole): number {
    return role === 'process' ? 5 : 4;
  }

  private applyStageRhythm(
    rhythm: PptDslDocument['design']['rhythm'],
    stage: string,
  ): PptDslDocument['design']['rhythm'] {
    if (stage === 'design-system-dsl') {
      return { ...rhythm, middle: `${rhythm.middle} Keep visual hierarchy explicit.` };
    }
    if (stage === 'polish-dsl') {
      return { ...rhythm, closing: `${rhythm.closing} Keep final slides decisive.` };
    }
    return rhythm;
  }

  private lockedScopes(round: number): Array<'narrative' | 'layout' | 'content' | 'visuals'> {
    if (round <= 1) {
      return ['narrative'];
    }
    if (round === 2) {
      return ['narrative', 'layout'];
    }
    if (round === 3) {
      return ['narrative', 'layout', 'content'];
    }
    return ['narrative', 'layout', 'content', 'visuals'];
  }

  private roleLabel(role: PptDslSlideRole): string {
    return role.replace('-', ' ').toUpperCase();
  }

  private slideId(index: number): string {
    return `slide-${String(index).padStart(3, '0')}`;
  }

  private compact(value: string | undefined, max = 120): string {
    const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
  }

  private emptyDocument(): PptDslDocument {
    return {
      system: 'ppt-dsl-v1',
      canvas: {
        width: 13.333,
        height: 7.5,
        unit: 'in',
        safeArea: { top: 0.48, right: 0.62, bottom: 0.48, left: 0.62 },
      },
      deck: {
        title: 'Untitled Presentation',
        audience: 'General audience',
        narrativeArc: ['Context', 'Key ideas', 'Action'],
        talkTrack: 'A concise presentation.',
        density: 'medium',
      },
      design: this.buildDefaultDesign({
        mainTopic: 'Untitled Presentation',
        summary: 'A concise presentation.',
        keyMessages: [],
      }),
      slides: [],
      assets: [],
      constraints: ['keep-within-safe-area', 'avoid-overlap', 'no-real-image'],
    };
  }

  private isRole(value: unknown): value is PptDslSlideRole {
    return (
      typeof value === 'string' &&
      ['cover', 'agenda', 'section-divider', 'content', 'comparison', 'process', 'quote', 'summary', 'closing'].includes(value)
    );
  }

  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
  }

  private numberOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private stringOr(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private stringArrayOr(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : fallback;
  }

  private constraintsOr(value: unknown, fallback: PptDslConstraint[]): PptDslConstraint[] {
    const allowed: PptDslConstraint[] = [
      'keep-within-safe-area',
      'avoid-overlap',
      'preserve-reading-order',
      'prefer-single-primary-idea',
      'fit-text',
      'preserve-aspect-ratio',
      'allow-downscale',
      'allow-wrap',
      'no-real-image',
    ];
    return Array.isArray(value)
      ? value.filter((item): item is PptDslConstraint => allowed.includes(item))
      : fallback;
  }

  private normalizeInsets(value: unknown, fallback: PptDslDocument['canvas']['safeArea']): PptDslDocument['canvas']['safeArea'] {
    const source = this.isObject(value) ? value : {};
    return {
      top: this.numberOr(source.top, fallback.top),
      right: this.numberOr(source.right, fallback.right),
      bottom: this.numberOr(source.bottom, fallback.bottom),
      left: this.numberOr(source.left, fallback.left),
    };
  }
}
