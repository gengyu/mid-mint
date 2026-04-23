import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

function resolveAccentColor(accentTone?: string): string {
  if (accentTone === 'blue') return '2563EB';
  if (accentTone === 'amber') return 'D97706';
  return THEME.teal;
}

export function renderQuoteTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const hasFormulaAsset = spec.visualTechnique === 'formula' && !!spec.assetPath;
  const accent = resolveAccentColor(spec.accentTone);
  slide.addShape('roundRect', {
    x: 0.8,
    y: 1.0,
    w: 11.6,
    h: 4.7,
    rectRadius: 0.14,
    fill: { color: THEME.white },
    line: { color: THEME.sky, width: 1.2 },
  });

  // Left accent bar — visually marks this as a quote/key-idea slide
  slide.addShape('rect', {
    x: 0.8,
    y: 1.0,
    w: 0.1,
    h: 4.7,
    fill: { color: accent },
    line: { color: accent },
  });

  slide.addText(spec.eyebrow ?? 'Key message', {
    x: 1.2,
    y: 1.35,
    w: 2.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: accent,
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
    // Large decorative opening quote mark for emphasis
    slide.addText('\u201C', {
      x: 1.1,
      y: 2.0,
      w: 1.2,
      h: 1.4,
      fontSize: 72,
      color: THEME.pale,
      fontFace: 'Georgia',
      valign: 'top',
    });
    slide.addText(`\u201C${spec.paragraph ?? spec.highlight ?? spec.title}\u201D`, {
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
