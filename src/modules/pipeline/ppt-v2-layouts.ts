import { DocumentSection } from '../parser/types/document-section.type';
import { SlideLayout, SlideRole } from '../slides/slide.types';
import { StoryArcPhase } from './pipeline.types';
import {
  AccentTone,
  TextTechnique,
  VisualComposition,
  VisualDensity,
  VisualPriority,
  VisualTechnique,
} from '../visuals/visual.types';

type VisualType = 'none' | 'cover-accent' | 'diagram' | 'comparison-card' | 'summary-graphic';
type VisualFocus = 'text' | 'visual' | 'mixed';
type ContentBalance = 'text-first' | 'visual-first' | 'balanced';

export interface LayoutSignal {
  title: string;
  keyPoint?: string;
  body?: string;
  bullets?: string[];
  tableRows?: string[][];
  formulaText?: string;
  mermaidDefinition?: string;
  codeBlockContent?: string;
}

export interface VisualDecision {
  visualType: VisualType;
  visualTechnique: VisualTechnique;
  textTechnique: TextTechnique;
  visualPriority: VisualPriority;
  composition: VisualComposition;
  density: VisualDensity;
  contentBalance: ContentBalance;
  textBudget: number;
  mustGenerateVisual: boolean;
  requiresAsset: boolean;
  accentTone: AccentTone;
  goal: string;
}

const PROCESS_KEYWORDS = [
  'process',
  'workflow',
  'pipeline',
  'roadmap',
  'steps',
  'journey',
  'lifecycle',
  'framework',
  'flow',
  'route',
  'step 1',
  'step 2',
  'step 3',
  'first step',
  'next step',
  'final step',
];

const COMPARISON_KEYWORDS = [
  'compare',
  'comparison',
  'versus',
  'vs',
  'before',
  'after',
  'tradeoff',
  'trade-off',
  'pros',
  'cons',
  'option',
  'difference',
];

const SUMMARY_KEYWORDS = [
  'summary',
  'takeaway',
  'takeaways',
  'conclusion',
  'closing',
  'next step',
  'next steps',
];

const CODE_PATTERNS = [
  /```/,
  /\b(const|let|var|function|class|return|import|export)\s+[A-Za-z]/,
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i,
  /\b(curl|npm|pnpm|yarn|python3?)\s+/,
  /<\/?[a-z][a-z0-9]*(\s+[a-z-]+=|\s*\/?)>/i,
];

const FORMULA_PATTERNS = [
  /\$[^$\n]+\$/,
  /\$\$[\s\S]+?\$\$/,
  /\\(sum|frac|hat|alpha|beta|gamma|theta|lambda|cdot|times|leq|geq|sqrt)\b/,
  /\b[A-Za-z][A-Za-z0-9_]*\s*=\s*[-(]?[A-Za-z0-9\\]/,
  /\b(loss|objective|probability|variance|precision|recall|f1|accuracy)\b/i,
];

const SEQUENCE_PATTERNS = [
  /^\d+[.)]\s+/,
  /^(first|second|third|then|next|finally|last|before|after|start|end)\b/i,
];

// Implicit sequential verb patterns for process-like bullets
const PROCESS_VERB_PATTERNS = [
  /^\s*(collect|gather|extract|parse|ingest|load|fetch)\b/i,
  /^\s*(clean|normalize|preprocess|transform|chunk|split)\b/i,
  /^\s*(build|create|generate|compute|train|embed|index)\b/i,
  /^\s*(retrieve|search|query|rank|rerank|filter|select)\b/i,
  /^\s*(evaluate|review|test|validate|measure|verify)\b/i,
  /^\s*(generate|produce|output|return|deliver|ship)\b/i,
  /^\s*(analyze|summarize|synthesize|aggregate)\b/i,
];

export function pickLayoutHintForSection(
  section: DocumentSection,
  recentLayouts: SlideLayout[] = [],
): SlideLayout {
  const signal = normalizeSignal(toSignal(section));
  const preferred = inferPreferredLayout(signal);
  const previous = recentLayouts[recentLayouts.length - 1];
  const beforePrevious = recentLayouts[recentLayouts.length - 2];

  if (!(preferred === previous && preferred === beforePrevious)) {
    return preferred;
  }

  const candidates: SlideLayout[] = ['text-visual', 'process', 'comparison', 'quote'];
  return (
    candidates.find((candidate) => candidate !== preferred && canUseLayout(candidate, signal)) ??
    'text-visual'
  );
}

export function pickVisualFocusForSection(section: DocumentSection): VisualFocus {
  const signal = normalizeSignal(toSignal(section));

  if (shouldGenerateVisual(signal)) {
    return signal.bullets.length >= 3 ? 'mixed' : 'visual';
  }

  if (signal.body.length > 120 || signal.bullets.length >= 4) {
    return 'text';
  }

  return 'mixed';
}

export function assignStoryArcPhase(
  section: DocumentSection,
  index: number,
  totalSections: number,
  storyArc: string[] | undefined,
): StoryArcPhase {
  const combined = `${section.title} ${section.body}`.toLowerCase();
  const arcKeywords = storyArc?.map((item) => item.toLowerCase()) ?? [];

  if (arcKeywords[0] && combined.includes(arcKeywords[0])) {
    return 'context';
  }

  if (arcKeywords[1] && combined.includes(arcKeywords[1])) {
    return 'key-ideas';
  }

  if (arcKeywords[2] && combined.includes(arcKeywords[2])) {
    return 'action';
  }

  if (totalSections <= 2) {
    return index === totalSections - 1 ? 'action' : 'context';
  }

  const ratio = totalSections <= 1 ? 1 : index / Math.max(1, totalSections - 1);
  if (ratio < 0.34) {
    return 'context';
  }

  if (ratio < 0.76) {
    return 'key-ideas';
  }

  return 'action';
}

export function scoreSection(section: DocumentSection): number {
  const signal = normalizeSignal(toSignal(section));
  let score = 0;

  score += Math.max(0, 4 - section.level) * 1.2;
  score += Math.min(4, signal.bullets.length * 0.6);
  score += Math.min(4, signal.body.length / 90);

  if (looksProcessLike(signal) || looksComparisonLike(signal)) {
    score += 1.5;
  }

  if (signal.tableRows.length > 0 || signal.codeBlockContent.length > 0 || signal.formulaText.length > 0) {
    score += 1;
  }

  return Number(score.toFixed(2));
}

export function pickDividerInsertion(
  sections: DocumentSection[],
  requestedTotal: number,
  storyArc: string[] | undefined,
  layouts: SlideLayout[],
): { index: number; reason?: 'story-arc' | 'section-weight' | 'layout-balance' } {
  if (requestedTotal < 7 || sections.length < 3) {
    return { index: -1 };
  }

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestReason: 'story-arc' | 'section-weight' | 'layout-balance' | undefined;

  for (let index = 1; index < sections.length; index += 1) {
    const previousSection = sections[index - 1];
    const nextSection = sections[index];
    if (previousSection.title === nextSection.title) {
      continue;
    }

    const previousPhase = assignStoryArcPhase(previousSection, index - 1, sections.length, storyArc);
    const nextPhase = assignStoryArcPhase(nextSection, index, sections.length, storyArc);
    const previousLayout = layouts[index - 1];
    const nextLayout = layouts[index];
    let score = scoreSection(nextSection);
    let reason: 'story-arc' | 'section-weight' | 'layout-balance' = 'section-weight';

    if (previousPhase !== nextPhase) {
      score += 5;
      reason = 'story-arc';
    }

    if (previousLayout === 'process' || previousLayout === 'comparison') {
      score += 2.5;
      reason = reason === 'story-arc' ? reason : 'layout-balance';
    }

    if (nextLayout === 'process' || nextLayout === 'comparison') {
      score += 1.5;
      reason = reason === 'story-arc' ? reason : 'layout-balance';
    }

    if (index === 1) {
      score -= 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
      bestReason = reason;
    }
  }

  if (bestScore < 3.5) {
    return { index: -1 };
  }

  return {
    index: bestIndex,
    reason: bestReason,
  };
}

export function buildSlideObjective(sectionTitle: string, layout: SlideLayout): string {
  switch (layout) {
    case 'process':
      return `Explain the sequence behind "${sectionTitle}" and make the audience remember the path.`;
    case 'comparison':
      return `Clarify the tradeoffs inside "${sectionTitle}" without forcing the audience to read dense text.`;
    case 'quote':
      return `Turn "${sectionTitle}" into a memorable single judgment.`;
    default:
      return `Explain why "${sectionTitle}" matters and make the audience remember the core message.`;
  }
}

export function resolveVisualDecision(
  layout: SlideLayout,
  slideNumber: number,
  signal: LayoutSignal,
  role?: SlideRole,
): VisualDecision {
  const normalized = normalizeSignal(signal);
  const accentTone = pickAccentTone(slideNumber);
  const visualTechnique = pickVisualTechnique(layout, normalized);
  const mustGenerateVisual = pickMustGenerateVisual(layout, normalized, role);

  return {
    visualType: pickVisualType(layout),
    visualTechnique,
    textTechnique: pickTextTechnique(layout),
    visualPriority: pickVisualPriority(layout, visualTechnique),
    composition: pickComposition(layout, slideNumber, visualTechnique),
    density: pickDensity(layout, visualTechnique),
    contentBalance: pickContentBalance(layout, role),
    textBudget: pickTextBudget(layout),
    mustGenerateVisual,
    requiresAsset: visualTechnique === 'svg' || visualTechnique === 'mermaid' || visualTechnique === 'formula' || (layout === 'cover' && mustGenerateVisual),
    accentTone,
    goal: buildVisualGoal(layout, normalized, role),
  };
}

function inferPreferredLayout(signal: ReturnType<typeof normalizeSignal>): SlideLayout {
  // PPT_V2_LAYOUTS.md: "3 到 5 条存在明确顺序 → process" — require BOTH
  // sequential bullet patterns AND process keywords.
  // Exception: mermaid definitions always imply process layout.
  if (signal.mermaidDefinition.length > 0) {
    return 'process';
  }

  if (looksProcessLike(signal) && hasSequentialBullets(signal.bullets)) {
    return 'process';
  }

  if (looksComparisonLike(signal)) {
    return 'comparison';
  }

  if (looksQuoteLike(signal)) {
    return 'quote';
  }

  return 'text-visual';
}

function canUseLayout(layout: SlideLayout, signal: ReturnType<typeof normalizeSignal>): boolean {
  switch (layout) {
    case 'process':
      return looksProcessLike(signal);
    case 'comparison':
      return looksComparisonLike(signal);
    case 'quote':
      return looksQuoteLike(signal);
    case 'text-visual':
      return true;
    default:
      return false;
  }
}

function pickVisualTechnique(
  layout: SlideLayout,
  signal: ReturnType<typeof normalizeSignal>,
): VisualTechnique {
  if (layout === 'cover') {
    return 'image';
  }

  if (layout === 'agenda' || layout === 'section-divider') {
    return 'none';
  }

  if (layout === 'quote') {
    return signal.formulaText.length > 0 || looksFormulaLike(signal) ? 'formula' : 'none';
  }

  if (layout === 'comparison') {
    return signal.tableRows.length > 0 || looksTableLike(signal) ? 'table' : 'svg';
  }

  if (layout === 'process') {
    return signal.mermaidDefinition.length > 0 || looksProcessLike(signal) ? 'mermaid' : 'svg';
  }

  if (layout === 'summary-closing') {
    return 'svg';
  }

  if (signal.formulaText.length > 0 || looksFormulaLike(signal)) {
    return 'formula';
  }

  // PPT_V2_LAYOUTS.md: table can be an internal expression technique for text-visual
  if (signal.tableRows.length > 0 || looksTableLike(signal)) {
    return 'table';
  }

  if (signal.codeBlockContent.length > 0 || looksCodeLike(signal)) {
    return 'code-block';
  }

  if (signal.mermaidDefinition.length > 0 || looksProcessLike(signal)) {
    return 'mermaid';
  }

  if (shouldUseImage(signal)) {
    return 'image';
  }

  return 'svg';
}

function pickVisualType(layout: SlideLayout): VisualType {
  if (layout === 'cover') {
    return 'cover-accent';
  }

  if (layout === 'comparison') {
    return 'comparison-card';
  }

  if (layout === 'summary-closing') {
    return 'summary-graphic';
  }

  if (layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
    return 'none';
  }

  return 'diagram';
}

function pickTextTechnique(layout: SlideLayout): TextTechnique {
  if (layout === 'agenda') {
    return 'agenda-list';
  }

  if (layout === 'comparison') {
    return 'two-column-summary';
  }

  if (layout === 'quote' || layout === 'cover') {
    return 'statement';
  }

  if (layout === 'section-divider') {
    return 'none';
  }

  return 'short-bullets';
}

function pickVisualPriority(layout: SlideLayout, technique: VisualTechnique): VisualPriority {
  if (layout === 'cover' || layout === 'process' || technique === 'mermaid' || technique === 'image') {
    return 'high';
  }

  if (layout === 'text-visual' || layout === 'comparison' || layout === 'summary-closing') {
    return 'medium';
  }

  return 'low';
}

function pickComposition(
  layout: SlideLayout,
  slideNumber: number,
  technique: VisualTechnique,
): VisualComposition {
  if (layout === 'cover') {
    return 'hero';
  }

  if (layout === 'comparison') {
    return 'two-column';
  }

  if (layout === 'process') {
    return technique === 'mermaid' ? 'center-panel' : 'right-panel';
  }

  if (layout === 'summary-closing') {
    return 'center-panel';
  }

  if (layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
    return 'none';
  }

  return slideNumber % 2 === 0 ? 'left-panel' : 'right-panel';
}

function pickDensity(layout: SlideLayout, technique: VisualTechnique): VisualDensity {
  if (layout === 'comparison' || technique === 'table' || technique === 'code-block') {
    return 'high';
  }

  if (layout === 'cover' || layout === 'agenda' || layout === 'quote' || layout === 'section-divider') {
    return 'low';
  }

  return 'medium';
}

function pickContentBalance(layout: SlideLayout, role?: SlideRole): ContentBalance {
  if (layout === 'cover' || layout === 'process') {
    return 'visual-first';
  }

  if (
    layout === 'agenda' ||
    layout === 'section-divider' ||
    layout === 'summary-closing' ||
    role === 'summary' ||
    role === 'closing'
  ) {
    return 'text-first';
  }

  return 'balanced';
}

function pickMustGenerateVisual(
  layout: SlideLayout,
  signal: ReturnType<typeof normalizeSignal>,
  role?: SlideRole,
): boolean {
  if (layout === 'agenda' || layout === 'section-divider' || layout === 'quote') {
    return false;
  }

  if (layout === 'cover') {
    return true;
  }

  // PPT_V2_LAYOUTS.md Iteration C: closing slides benefit from a visual
  // asset to create a strong ending moment
  if (layout === 'summary-closing' && role === 'closing') {
    return true;
  }

  if (layout === 'summary-closing') {
    return false;
  }

  return layout === 'text-visual' || layout === 'comparison' || layout === 'process' || shouldGenerateVisual(signal);
}

function pickTextBudget(layout: SlideLayout): number {
  switch (layout) {
    case 'cover':
      return 20;
    case 'agenda':
      return 28;
    case 'section-divider':
      return 16;
    case 'quote':
      return 24;
    case 'process':
      return 40;
    case 'comparison':
      return 52;
    case 'summary-closing':
      return 34;
    default:
      return 56;
  }
}

function buildVisualGoal(
  layout: SlideLayout,
  signal: ReturnType<typeof normalizeSignal>,
  role?: SlideRole,
): string {
  if (layout === 'cover') {
    return `Introduce ${signal.title} with a confident opening composition and one clear promise.`;
  }

  if (layout === 'agenda') {
    return 'Show the talk structure clearly and avoid distracting visuals.';
  }

  if (layout === 'section-divider') {
    return `Create a clean chapter break for ${signal.title}.`;
  }

  if (layout === 'comparison') {
    return `Use side-by-side structure to make the contrast in ${signal.title} obvious.`;
  }

  if (layout === 'process') {
    return `Turn ${signal.title} into a clear sequence the audience can follow at a glance.`;
  }

  if (layout === 'quote') {
    return `Give ${signal.title} a strong single-line emphasis without extra clutter.`;
  }

  if (layout === 'summary-closing' || role === 'summary' || role === 'closing') {
    return `Reinforce the final takeaway from ${signal.title} and leave the audience with a next step.`;
  }

  return `Balance one conclusion, one explanation, and one visual on ${signal.title}.`;
}

function shouldGenerateVisual(signal: ReturnType<typeof normalizeSignal>): boolean {
  return (
    looksProcessLike(signal) ||
    looksComparisonLike(signal) ||
    hasSequentialBullets(signal.bullets) ||
    signal.bullets.length > 4 ||
    ['architecture', 'system', 'map', 'relationship', 'structure'].some((keyword) =>
      signal.combined.includes(keyword),
    )
  );
}

function shouldUseImage(signal: ReturnType<typeof normalizeSignal>): boolean {
  return signal.bullets.length <= 2 && signal.body.length <= 100 && !looksCodeLike(signal) && !looksFormulaLike(signal);
}

function looksProcessLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  // PPT_V2_LAYOUTS.md: process requires sequential order signals,
  // not just keyword presence + bullet count.
  return (
    (PROCESS_KEYWORDS.some((keyword) => signal.combined.includes(keyword)) &&
      (hasSequentialBullets(signal.bullets) || signal.bullets.length >= 3)) ||
    (signal.mermaidDefinition.length > 0 && signal.bullets.length >= 2) ||
    hasSequentialBullets(signal.bullets)
  );
}

function looksComparisonLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  return (
    COMPARISON_KEYWORDS.some((keyword) => signal.combined.includes(keyword)) ||
    looksTableLike(signal) ||
    signal.bullets.length >= 4
  );
}

function looksQuoteLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  return (
    signal.bullets.length <= 1 &&
    (signal.body.length >= 90 || signal.title.length >= 18) &&
    !looksCodeLike(signal)
  );
}

function looksTableLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  return (
    signal.tableRows.length > 0 ||
    /\|.+\|/.test(signal.body) ||
    signal.bullets.filter((bullet) => bullet.includes(':') || bullet.includes(' vs ')).length >= 2
  );
}

function looksCodeLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  return CODE_PATTERNS.some((pattern) => pattern.test(signal.body) || pattern.test(signal.codeBlockContent));
}

function looksFormulaLike(signal: ReturnType<typeof normalizeSignal>): boolean {
  return FORMULA_PATTERNS.some(
    (pattern) => pattern.test(signal.body) || pattern.test(signal.formulaText),
  );
}

function hasSequentialBullets(bullets: string[]): boolean {
  if (bullets.length < 3) return false;
  if (bullets.some((bullet) => SEQUENCE_PATTERNS.some((pattern) => pattern.test(bullet)))) return true;
  // Detect implicit sequential patterns: when most bullets start with
  // process-stage verbs (ingest, clean, build, retrieve, evaluate, ...)
  const verbMatches = bullets.filter((bullet) =>
    PROCESS_VERB_PATTERNS.some((pattern) => pattern.test(bullet)),
  );
  return verbMatches.length >= 2 && verbMatches.length >= bullets.length * 0.5;
}

function pickAccentTone(slideNumber: number): AccentTone {
  const tones: AccentTone[] = ['teal', 'blue', 'amber'];
  return tones[(slideNumber - 1) % tones.length];
}

function toSignal(section: DocumentSection): LayoutSignal {
  return {
    title: section.title,
    body: section.body,
    bullets: section.bullets,
    tableRows: section.tableData?.rows,
    formulaText: section.formulas?.[0],
    mermaidDefinition: section.mermaidDefinitions?.[0],
    codeBlockContent: section.codeBlocks?.[0]?.content,
  };
}

function normalizeSignal(signal: LayoutSignal) {
  const title = signal.title.trim();
  const body = (signal.body || signal.keyPoint || '').replace(/\s+/g, ' ').trim();
  const bullets = (signal.bullets || []).map((bullet) => bullet.trim()).filter(Boolean);
  const tableRows = signal.tableRows ?? [];
  const formulaText = (signal.formulaText || '').trim();
  const mermaidDefinition = (signal.mermaidDefinition || '').trim();
  const codeBlockContent = (signal.codeBlockContent || '').trim();
  const combined = [title, body, bullets.join(' '), formulaText, mermaidDefinition, codeBlockContent]
    .join(' ')
    .toLowerCase();

  return {
    title,
    body,
    bullets,
    tableRows,
    formulaText,
    mermaidDefinition,
    codeBlockContent,
    combined,
  };
}

export function isSummaryLikeTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return SUMMARY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
