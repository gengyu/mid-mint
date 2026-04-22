import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderSectionDividerTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: THEME.navy },
    line: { color: THEME.navy },
  });
  slide.addText(spec.eyebrow ?? 'Section', {
    x: 0.9,
    y: 1.5,
    w: 2.8,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: THEME.sky,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.9,
    y: 2.1,
    w: 8.8,
    h: 1.0,
    fontSize: 28,
    bold: true,
    color: THEME.white,
    fontFace: 'Aptos Display',
  });
  slide.addText(spec.highlight ?? spec.paragraph ?? '', {
    x: 0.9,
    y: 3.35,
    w: 7.0,
    h: 1.0,
    fontSize: 16,
    color: THEME.sky,
    fontFace: 'Aptos',
  });
}
