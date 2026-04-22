import { SlideSpec } from '../../slides/slide.types';
import { THEME, splitBullets } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderComparisonTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.eyebrow ?? 'Comparison', {
    x: 0.7,
    y: 0.45,
    w: 2.8,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.teal,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 0.8,
    w: 10.2,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });

  const [leftBullets, rightBullets] = splitBullets(spec.bullets);
  slide.addShape('roundRect', {
    x: 0.7,
    y: 1.8,
    w: 3.0,
    h: 3.9,
    rectRadius: 0.12,
    fill: { color: THEME.white },
    line: { color: THEME.sky, width: 1.1 },
  });
  slide.addText(leftBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
    x: 0.95,
    y: 2.1,
    w: 2.45,
    h: 3.2,
    fontSize: 15,
    color: THEME.text,
    breakLine: true,
    fontFace: 'Aptos',
  });
  slide.addShape('roundRect', {
    x: 4.0,
    y: 1.8,
    w: 3.0,
    h: 3.9,
    rectRadius: 0.12,
    fill: { color: THEME.pale },
    line: { color: THEME.sky, width: 1.1 },
  });
  slide.addText(rightBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
    x: 4.25,
    y: 2.1,
    w: 2.45,
    h: 3.2,
    fontSize: 15,
    color: THEME.text,
    breakLine: true,
    fontFace: 'Aptos',
  });

  if (spec.assetPath) {
    slide.addShape('roundRect', {
      x: 7.4,
      y: 1.9,
      w: 4.7,
      h: 3.7,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: 7.65,
      y: 2.15,
      w: 4.15,
      h: 3.15,
    });
  } else if (spec.highlight) {
    slide.addText(spec.highlight, {
      x: 7.6,
      y: 2.5,
      w: 3.9,
      h: 1.2,
      fontSize: 18,
      bold: true,
      color: THEME.ink,
      valign: 'mid',
      fontFace: 'Aptos Display',
    });
  }
}
