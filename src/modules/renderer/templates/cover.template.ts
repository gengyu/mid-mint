import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderCoverTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: THEME.navy },
    line: { color: THEME.navy },
  });
  slide.addShape('rect', {
    x: 9.6,
    y: 0,
    w: 3.73,
    h: 7.5,
    fill: { color: THEME.teal, transparency: 18 },
    line: { color: THEME.teal, transparency: 100 },
  });
  slide.addText(spec.eyebrow ?? 'Presentation', {
    x: 0.8,
    y: 0.9,
    w: 3.0,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: THEME.sky,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.8,
    y: 1.45,
    w: 8.1,
    h: 1.2,
    fontSize: spec.title.length > 32 ? 24 : 28,
    bold: true,
    color: THEME.white,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });
  slide.addText(spec.subtitle ?? '', {
    x: 0.8,
    y: 2.9,
    w: 6.8,
    h: 1.2,
    fontSize: 15,
    color: THEME.sky,
    breakLine: true,
    fit: 'shrink',
    fontFace: 'Aptos',
  });
  if (spec.highlight) {
    slide.addText(spec.highlight, {
      x: 0.8,
      y: 5.75,
      w: 4.2,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: THEME.gold,
      fontFace: 'Aptos',
    });
  }
}
