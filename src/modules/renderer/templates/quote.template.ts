import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderQuoteTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addShape('roundRect', {
    x: 0.8,
    y: 1.0,
    w: 11.6,
    h: 4.7,
    rectRadius: 0.14,
    fill: { color: THEME.white },
    line: { color: THEME.sky, width: 1.2 },
  });
  slide.addText(spec.eyebrow ?? 'Key message', {
    x: 1.2,
    y: 1.35,
    w: 2.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.teal,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 1.2,
    y: 1.75,
    w: 9.4,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });
  slide.addText(`“${spec.paragraph ?? spec.highlight ?? spec.title}”`, {
    x: 1.4,
    y: 2.45,
    w: 9.8,
    h: 1.8,
    fontSize: 26,
    italic: true,
    color: THEME.text,
    valign: 'mid',
    fontFace: 'Georgia',
  });
  if (spec.highlight) {
    slide.addText(spec.highlight, {
      x: 1.4,
      y: 4.75,
      w: 8.0,
      h: 0.4,
      fontSize: 14,
      color: THEME.muted,
      fontFace: 'Aptos',
    });
  }
}
