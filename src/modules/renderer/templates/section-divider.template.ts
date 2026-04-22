import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderSectionDividerTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  // Dark background for chapter-break feel (PPT_V2_LAYOUTS.md Iteration C)
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
    fill: { color: THEME.teal },
    line: { color: THEME.teal },
  });

  // Section label (e.g. "SECTION 03 / 08")
  slide.addText(spec.sectionLabel ?? spec.eyebrow ?? 'Section', {
    x: 1.0,
    y: 1.5,
    w: 4.0,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.teal,
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
    fill: { color: THEME.teal },
    line: { color: THEME.teal },
  });
}
