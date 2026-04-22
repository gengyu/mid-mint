import { Injectable } from '@nestjs/common';

import { DocumentSection } from '../parser/types/document-section.type';
import { resolveVisualDecision } from '../pipeline/ppt-v2-layouts';
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
      const fallbackDecision = resolveVisualDecision(
        plannedSlide.layoutHint,
        plannedSlide.slideNumber,
        {
          title: plannedSlide.title,
          keyPoint: plannedSlide.keyPoint,
          body: matchedSection?.body ?? plannedSlide.keyPoint,
          bullets: matchedSection?.bullets ?? [],
          tableRows: matchedSection?.tableData?.rows,
          formulaText: this.extractFormulaText(matchedSection, plannedSlide.keyPoint),
          mermaidDefinition: this.extractMermaidDefinition(matchedSection, plannedSlide.keyPoint),
          codeBlockContent: matchedSection?.codeBlocks?.[0]?.content,
        },
        plannedSlide.role,
      );

      if (plannedSlide.layoutHint === 'cover') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          subtitle: this.pickCoverSubtitle(analysis.summary, plannedSlide.keyPoint),
          eyebrow: analysis.tone || 'Presentation',
          sectionLabel: this.compact(analysis.mainTopic.toUpperCase(), 64),
          layout: 'cover',
          role: plannedSlide.role,
          bullets: [],
          highlight: this.compact(analysis.mainTopic, 56),
          notes: `Opening slide for ${document.title}`,
          visualGoal: plannedVisual?.goal ?? fallbackDecision.goal,
          visualTechnique: plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique,
          textTechnique: plannedVisual?.textTechnique ?? fallbackDecision.textTechnique,
          visualPriority: plannedVisual?.visualPriority ?? fallbackDecision.visualPriority,
          visualType: plannedVisual?.visualType ?? fallbackDecision.visualType,
          visualComposition: plannedVisual?.composition ?? fallbackDecision.composition,
          density: plannedVisual?.density ?? fallbackDecision.density,
          accentTone: plannedVisual?.accentTone ?? fallbackDecision.accentTone,
          contentBalance: plannedVisual?.contentBalance ?? fallbackDecision.contentBalance,
          textBudget: plannedVisual?.textBudget ?? fallbackDecision.textBudget,
          mustGenerateVisual: plannedVisual?.mustGenerateVisual ?? fallbackDecision.mustGenerateVisual,
        };
      }

      if (plannedSlide.layoutHint === 'agenda') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: 'Talk flow',
          sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
          layout: 'agenda',
          role: plannedSlide.role,
          bullets: document.sections.map((section) => this.compact(section.title, 30)).slice(0, 5),
          paragraph: this.pickParagraph(analysis.summary, analysis.summary, 120),
          highlight: analysis.storyArc?.join(' -> ') || analysis.summary,
          notes: 'Agenda overview',
          visualGoal: plannedVisual?.goal ?? fallbackDecision.goal,
          visualTechnique: plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique,
          textTechnique: plannedVisual?.textTechnique ?? fallbackDecision.textTechnique,
          visualPriority: plannedVisual?.visualPriority ?? fallbackDecision.visualPriority,
          visualType: plannedVisual?.visualType ?? fallbackDecision.visualType,
          visualComposition: plannedVisual?.composition ?? fallbackDecision.composition,
          density: plannedVisual?.density ?? fallbackDecision.density,
          accentTone: plannedVisual?.accentTone ?? fallbackDecision.accentTone,
          contentBalance: plannedVisual?.contentBalance ?? fallbackDecision.contentBalance,
          textBudget: plannedVisual?.textBudget ?? fallbackDecision.textBudget,
          mustGenerateVisual: plannedVisual?.mustGenerateVisual ?? fallbackDecision.mustGenerateVisual,
        };
      }

      if (plannedSlide.layoutHint === 'section-divider') {
        return {
          slideNumber: plannedSlide.slideNumber,
          title: plannedSlide.title,
          eyebrow: 'Section',
          sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
          layout: 'section-divider',
          role: plannedSlide.role,
          bullets: [],
          paragraph: this.pickParagraph(matchedSection?.body, plannedSlide.keyPoint, 110),
          highlight: this.pickHighlight(
            matchedSection?.bullets ?? [],
            matchedSection?.body ?? '',
            plannedSlide.keyPoint,
            72,
          ),
          notes: plannedSlide.objective,
          visualGoal: plannedVisual?.goal ?? fallbackDecision.goal,
          visualTechnique: plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique,
          textTechnique: plannedVisual?.textTechnique ?? fallbackDecision.textTechnique,
          visualPriority: plannedVisual?.visualPriority ?? fallbackDecision.visualPriority,
          visualType: plannedVisual?.visualType ?? fallbackDecision.visualType,
          visualComposition: plannedVisual?.composition ?? fallbackDecision.composition,
          density: plannedVisual?.density ?? fallbackDecision.density,
          accentTone: plannedVisual?.accentTone ?? fallbackDecision.accentTone,
          contentBalance: plannedVisual?.contentBalance ?? fallbackDecision.contentBalance,
          textBudget: plannedVisual?.textBudget ?? fallbackDecision.textBudget,
          mustGenerateVisual: plannedVisual?.mustGenerateVisual ?? fallbackDecision.mustGenerateVisual,
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
          bullets: this.pickSummaryBullets(matchedSection, analysis, 4),
          paragraph: this.pickParagraph(analysis.summary, plannedSlide.keyPoint, 120),
          highlight: this.pickHighlight(analysis.keyMessages, analysis.summary, plannedSlide.keyPoint, 64),
          notes: plannedSlide.keyPoint,
          visualGoal: plannedVisual?.goal ?? fallbackDecision.goal,
          visualTechnique: plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique,
          textTechnique: plannedVisual?.textTechnique ?? fallbackDecision.textTechnique,
          visualPriority: plannedVisual?.visualPriority ?? fallbackDecision.visualPriority,
          visualType: plannedVisual?.visualType ?? fallbackDecision.visualType,
          visualComposition: plannedVisual?.composition ?? fallbackDecision.composition,
          density: plannedVisual?.density ?? fallbackDecision.density,
          accentTone: plannedVisual?.accentTone ?? fallbackDecision.accentTone,
          contentBalance: plannedVisual?.contentBalance ?? fallbackDecision.contentBalance,
          textBudget: plannedVisual?.textBudget ?? fallbackDecision.textBudget,
          mustGenerateVisual: plannedVisual?.mustGenerateVisual ?? fallbackDecision.mustGenerateVisual,
        };
      }

      const bullets = this.pickBullets(
        plannedSlide.layoutHint,
        matchedSection?.bullets,
        analysis.keyMessages,
        plannedSlide.keyPoint,
      );
      const paragraph = this.pickParagraph(matchedSection?.body, plannedSlide.keyPoint);
      const highlight = this.pickHighlight(
        bullets,
        paragraph,
        plannedSlide.keyPoint,
        plannedSlide.layoutHint === 'quote' ? 110 : 90,
      );
      const isFormulaSlide =
        (plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique) === 'formula';

      return {
        slideNumber: plannedSlide.slideNumber,
        title: plannedSlide.title,
        eyebrow: plannedSlide.layoutHint === 'quote' ? 'Key idea' : matchedSection ? 'Section insight' : 'Insight',
        sectionLabel: this.buildSectionLabel(plannedSlide.slideNumber, deckPlan.totalSlides),
        layout: plannedSlide.layoutHint,
        role: plannedSlide.role,
        bullets: plannedSlide.layoutHint === 'quote' ? [] : bullets,
        paragraph:
          plannedSlide.layoutHint === 'quote'
            ? this.pickQuoteParagraph(matchedSection?.body, plannedSlide.keyPoint)
            : paragraph,
        highlight:
          plannedSlide.layoutHint === 'quote'
            ? isFormulaSlide
              ? undefined
              : this.pickHighlight(
                  matchedSection?.bullets ?? [],
                  matchedSection?.body ?? plannedSlide.keyPoint,
                  plannedSlide.keyPoint,
                  68,
                )
            : plannedSlide.objective || highlight,
        notes: plannedSlide.keyPoint,
        visualGoal: plannedVisual?.goal ?? fallbackDecision.goal,
        visualTechnique: plannedVisual?.visualTechnique ?? fallbackDecision.visualTechnique,
        textTechnique: plannedVisual?.textTechnique ?? fallbackDecision.textTechnique,
        visualPriority: plannedVisual?.visualPriority ?? fallbackDecision.visualPriority,
        visualType: plannedVisual?.visualType ?? fallbackDecision.visualType,
        visualComposition: plannedVisual?.composition ?? fallbackDecision.composition,
        density: plannedVisual?.density ?? fallbackDecision.density,
        accentTone: plannedVisual?.accentTone ?? fallbackDecision.accentTone,
        contentBalance: plannedVisual?.contentBalance ?? fallbackDecision.contentBalance,
        textBudget: plannedVisual?.textBudget ?? fallbackDecision.textBudget,
        mustGenerateVisual: plannedVisual?.mustGenerateVisual ?? fallbackDecision.mustGenerateVisual,
        tableData: matchedSection?.tableData,
        codeBlock: matchedSection?.codeBlocks?.[0],
        formulaText: this.extractFormulaText(matchedSection, plannedSlide.keyPoint),
        mermaidDefinition: this.extractMermaidDefinition(matchedSection, plannedSlide.keyPoint),
      };
    });
  }

  private pickBullets(
    layout: SlideSpec['layout'],
    sectionBullets: string[] | undefined,
    keyMessages: string[],
    keyPoint: string,
  ): string[] {
    // PPT_V2_LAYOUTS.md: bullets should come from the source section,
    // not cross-contaminated with analysis-level keyMessages.
    // Only fall back to keyMessages when the section has no bullets.
    const sectionOnly = (sectionBullets ?? []).map((item) => item.trim()).filter(Boolean);
    const fallback = keyMessages.map((message) => message.trim()).filter(Boolean);
    const candidates = sectionOnly.length > 0 ? sectionOnly : [...fallback, keyPoint.trim()];
    const limit =
      layout === 'process' ? 5 : layout === 'comparison' || layout === 'summary-closing' ? 4 : 3;

    return Array.from(new Set(candidates)).slice(0, limit);
  }

  private pickParagraph(
    sectionBody: string | undefined,
    keyPoint: string,
    maxLength = 220,
  ): string {
    const paragraph = (sectionBody || keyPoint).replace(/\s+/g, ' ').trim();
    return paragraph.length > maxLength ? `${paragraph.slice(0, maxLength - 3).trim()}...` : paragraph;
  }

  private pickHighlight(bullets: string[], paragraph: string, keyPoint: string, maxLength = 90): string {
    const source = bullets[0] || paragraph || keyPoint;
    const compact = source.trim();
    return compact.length > maxLength ? `${compact.slice(0, maxLength - 3).trim()}...` : compact;
  }

  private buildSectionLabel(slideNumber: number, totalSlides: number): string {
    return `SECTION ${String(slideNumber).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }

  private pickCoverSubtitle(summary: string, fallback: string): string {
    const normalized = (summary || fallback).replace(/\s+/g, ' ').trim();
    const sentences = normalized
      .split(/(?<=[。！？.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const candidate = sentences.slice(0, 2).join(' ');
    return this.compact(candidate || normalized, 140);
  }

  private pickQuoteParagraph(sectionBody: string | undefined, keyPoint: string): string {
    const normalized = (sectionBody || keyPoint).replace(/\s+/g, ' ').trim();
    const sentences = normalized
      .split(/(?<=[。！？.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const candidate = sentences[0] || normalized;
    return this.compact(candidate, 120);
  }

  private compact(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trim()}...`;
  }

  private pickSummaryBullets(
    section: DocumentSection | undefined,
    analysis: PresentationAnalysis,
    limit: number,
  ): string[] {
    // Prefer bullets from the actual Summary section in the source document
    const sectionBullets = (section?.bullets ?? []).map((item) => item.trim()).filter(Boolean);
    if (sectionBullets.length > 0) {
      return sectionBullets.map((b) => this.compact(b, 32)).slice(0, limit);
    }
    // Fallback to analysis keyMessages, but avoid bullets that clearly belong to non-summary sections
    return analysis.keyMessages
      .filter((msg) => !/^(ingest|clean|build|retrieve|generate|fetch|parse|load)\b/i.test(msg.trim()))
      .map((item) => this.compact(item, 32))
      .slice(0, limit);
  }

  private extractFormulaText(section: DocumentSection | undefined, fallback: string): string | undefined {
    const formula = section?.formulas?.find((item) => item.trim().length > 0) ?? this.matchFormula(fallback);
    return formula?.trim() || undefined;
  }

  private extractMermaidDefinition(
    section: DocumentSection | undefined,
    fallback: string,
  ): string | undefined {
    const explicit = section?.mermaidDefinitions?.find((item) => item.trim().length > 0);
    if (explicit) {
      return explicit;
    }

    const bullets = section?.bullets?.filter(Boolean) ?? [];
    if (bullets.length >= 3) {
      const nodes = bullets.slice(0, 5);
      const edges = nodes
        .map((bullet, index) => `N${index}["${this.escapeMermaidLabel(bullet)}"]`)
        .join('\n');
      const flows = nodes
        .slice(1)
        .map((_, index) => `N${index} --> N${index + 1}`)
        .join('\n');

      return `flowchart LR\n${edges}\n${flows}`;
    }

    if (fallback.trim()) {
      return `flowchart LR\nA["${this.escapeMermaidLabel(section?.title || 'Idea')}"] --> B["${this.escapeMermaidLabel(
        fallback,
      )}"]`;
    }

    return undefined;
  }

  private matchFormula(value: string): string | undefined {
    return value.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/)?.[0];
  }

  private escapeMermaidLabel(value: string): string {
    return value.replace(/"/g, '\\"');
  }
}
