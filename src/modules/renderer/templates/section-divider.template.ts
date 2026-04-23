import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

function resolveAccentColor(accentTone?: string): string {
  if (accentTone === 'blue') return '2563EB';
  if (accentTone === 'amber') return 'D97706';
  return THEME.teal;
}

export function renderSectionDividerTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const accent = resolveAccentColor(spec.accentTone);
  // Dark background for chapter-break feel from the layout guidance
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: THEME.navy },
    line: { color: THEME.navy },
  });

  // Left accent bar — gives strong visual anchor for chapter transitions
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 0.15,
    h: 7.5,
    fill: { color: accent },
    line: { color: accent },
  });

  // Section label (e.g. "SECTION 03 / 08")
  slide.addText(spec.sectionLabel ?? spec.eyebrow ?? 'Section', {
    x: 1.0,
    y: 1.5,
    w: 4.0,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: accent,
    fontFace: 'Aptos',
  });

  // Chapter title — large, confident
  slide.addText(spec.title, {
    x: 1.0,
    y: 2.1,
    w: 9.0,
    h: 1.2,
    fontSize: spec.title.length > 30 ? 24 : 28,
    bold: true,
    color: THEME.white,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });

  // Transition text — why this section matters
  slide.addText(spec.highlight ?? spec.paragraph ?? '', {
    x: 1.0,
    y: 3.5,
    w: 8.0,
    h: 1.0,
    fontSize: 16,
    color: THEME.sky,
    fontFace: 'Aptos',
  });

  // Decorative bottom line — reinforces the chapter-break feel
  slide.addShape('rect', {
    x: 1.0,
    y: 5.6,
    w: 3.0,
    h: 0.06,
    fill: { color: accent },
    line: { color: accent },
  });
}
