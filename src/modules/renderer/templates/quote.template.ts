import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderQuoteTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const hasFormulaAsset = spec.visualTechnique === 'formula' && !!spec.assetPath;
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
    w: 10.0,
    h: 0.9,
    fontSize: spec.title.length > 42 ? 20 : 24,
    bold: true,
    color: THEME.ink,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });
  if (hasFormulaAsset) {
    slide.addImage({
      path: spec.assetPath,
      x: 1.45,
      y: 2.35,
      w: 9.7,
      h: 2.2,
    });
  } else {
    slide.addText(`“${spec.paragraph ?? spec.highlight ?? spec.title}”`, {
      x: 1.4,
      y: 2.45,
      w: 9.8,
      h: 1.55,
      fontSize: 22,
      italic: true,
      color: THEME.text,
      valign: 'mid',
      fit: 'shrink',
      fontFace: 'Georgia',
    });
  }
  if (spec.highlight && !hasFormulaAsset) {
    slide.addText(spec.highlight, {
      x: 1.4,
      y: 4.75,
      w: 8.0,
      h: 0.55,
      fontSize: 13,
      color: THEME.muted,
      fit: 'shrink',
      fontFace: 'Aptos',
    });
  }
}
