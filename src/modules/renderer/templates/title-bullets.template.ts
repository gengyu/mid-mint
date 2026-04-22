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

export function renderTitleBulletsTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const accent = resolveAccentColor(spec.accentTone);

  slide.addText(spec.eyebrow ?? 'Key takeaways', {
    x: 0.7,
    y: 0.45,
    w: 2.8,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: accent,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 0.8,
    w: spec.assetPath ? 5.6 : 7.2,
    h: 0.8,
    fontSize: spec.title.length > 26 ? 22 : 24,
    bold: true,
    color: THEME.ink,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });

  if (spec.assetPath) {
    // Left: text content panel + Right: visual asset panel (consistent with text-visual layout)
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.65,
      w: 5.8,
      h: 4.4,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(
      spec.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 14 } } })),
      {
        x: 1.0,
        y: 1.95,
        w: 5.1,
        h: spec.paragraph ? 2.0 : 3.8,
        fontSize: 15,
        color: THEME.text,
        breakLine: true,
        paraSpaceAfterPt: 10,
        fit: 'shrink',
        fontFace: 'Aptos',
      },
    );
    if (spec.paragraph) {
      slide.addText(spec.paragraph, {
        x: 1.0,
        y: 4.0,
        w: 5.1,
        h: 1.5,
        fontSize: 14,
        color: THEME.muted,
        valign: 'top',
        fontFace: 'Aptos',
      });
    }
    if (spec.highlight) {
      slide.addText(spec.highlight, {
        x: 1.0,
        y: 5.5,
        w: 5.1,
        h: 0.35,
        fontSize: 13,
        bold: true,
        color: accent,
        fontFace: 'Aptos',
      });
    }

    // Right: visual asset panel
    slide.addShape('roundRect', {
      x: 6.85,
      y: 1.65,
      w: 5.15,
      h: 4.4,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: 7.1,
      y: 1.9,
      w: 4.6,
      h: 3.7,
    });
  } else {
    // Standard layout without visual asset
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.65,
      w: 7.1,
      h: 4.4,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(
      spec.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 14 } } })),
      {
        x: 1.0,
        y: 2.0,
        w: 6.3,
        h: 3.8,
        fontSize: 15,
        color: THEME.text,
        breakLine: true,
        paraSpaceAfterPt: 10,
        fit: 'shrink',
        fontFace: 'Aptos',
      },
    );

    if (spec.highlight && spec.highlight.length <= 90) {
      slide.addShape('roundRect', {
        x: 8.4,
        y: 1.9,
        w: 3.6,
        h: 2.9,
        rectRadius: 0.12,
        fill: { color: THEME.pale },
        line: { color: THEME.pale },
      });
      slide.addText('KEY INSIGHT', {
        x: 8.7,
        y: 2.2,
        w: 2.4,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: accent,
        fontFace: 'Aptos',
      });
      slide.addText(spec.highlight, {
        x: 8.7,
        y: 2.65,
        w: 2.7,
        h: 1.35,
        fontSize: 16,
        bold: true,
        color: THEME.ink,
        valign: 'mid',
        fit: 'shrink',
        fontFace: 'Aptos Display',
      });
    }
  }
}
