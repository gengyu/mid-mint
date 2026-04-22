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

export function renderTextVisualTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.eyebrow ?? 'Insight', {
    x: 0.7,
    y: 0.45,
    w: 2.5,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.teal,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 0.8,
    w: 10.4,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });

  // ── Code-block rendering ──────────────────────────────
  if (spec.visualTechnique === 'code-block' && spec.codeBlock?.content) {
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.7,
      w: 4.3,
      h: 4.7,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(spec.paragraph ?? spec.highlight ?? '', {
      x: 1.0,
      y: 2.0,
      w: 3.7,
      h: 2.3,
      fontSize: 15,
      color: THEME.text,
      valign: 'top',
      fontFace: 'Aptos',
    });
    slide.addShape('roundRect', {
      x: 5.35,
      y: 1.7,
      w: 6.15,
      h: 4.7,
      rectRadius: 0.12,
      fill: { color: '102033' },
      line: { color: '102033', width: 1.1 },
    });
    slide.addText((spec.codeBlock.language || 'CODE').toUpperCase(), {
      x: 5.7,
      y: 2.0,
      w: 1.8,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: 'D9F2F5',
      fontFace: 'Aptos',
    });
    slide.addText(
      spec.codeBlock.content
        .split('\n')
        .slice(0, 10)
        .map((line) => line.replace(/\t/g, '  '))
        .join('\n'),
      {
        x: 5.7,
        y: 2.45,
        w: 5.4,
        h: 3.5,
        fontSize: 12,
        color: 'F8FAFC',
        breakLine: true,
        margin: 0.03,
        valign: 'top',
        fontFace: 'Courier New',
      },
    );
    return;
  }

  // ── Mermaid rendering ─────────────────────────────────
  if (spec.visualTechnique === 'mermaid' && spec.assetPath) {
    const accent = resolveAccentColor(spec.accentTone);

    // Left: text content
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.7,
      w: 4.6,
      h: 4.7,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(spec.paragraph ?? spec.highlight ?? '', {
      x: 1.0,
      y: 2.0,
      w: 3.9,
      h: 2.2,
      fontSize: 15,
      color: THEME.text,
      valign: 'top',
      fontFace: 'Aptos',
    });
    if (spec.bullets.length > 0) {
      slide.addText(
        spec.bullets.slice(0, 3).map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })),
        {
          x: 1.0,
          y: 4.1,
          w: 3.9,
          h: 1.6,
          fontSize: 13,
          color: THEME.text,
          breakLine: true,
          fontFace: 'Aptos',
        },
      );
    }

    // Right: mermaid diagram
    slide.addShape('roundRect', {
      x: 5.65,
      y: 1.7,
      w: 6.15,
      h: 4.7,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('DIAGRAM', {
      x: 5.95,
      y: 1.95,
      w: 1.4,
      h: 0.22,
      fontSize: 10,
      bold: true,
      color: accent,
      fontFace: 'Aptos',
    });
    slide.addImage({
      path: spec.assetPath,
      x: 5.9,
      y: 2.3,
      w: 5.6,
      h: 3.7,
    });
    return;
  }

  // ── Formula rendering ─────────────────────────────────
  if (spec.visualTechnique === 'formula' && spec.assetPath) {
    const accent = resolveAccentColor(spec.accentTone);

    // Top: formula image
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.7,
      w: 11.3,
      h: 2.5,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('FORMULA', {
      x: 1.0,
      y: 1.85,
      w: 1.4,
      h: 0.22,
      fontSize: 10,
      bold: true,
      color: accent,
      fontFace: 'Aptos',
    });
    slide.addImage({
      path: spec.assetPath,
      x: 0.95,
      y: 2.15,
      w: 10.7,
      h: 1.8,
    });

    // Bottom: explanation
    slide.addShape('roundRect', {
      x: 0.7,
      y: 4.45,
      w: 11.3,
      h: 2.0,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(spec.paragraph ?? spec.highlight ?? '', {
      x: 1.0,
      y: 4.7,
      w: 7.5,
      h: 1.4,
      fontSize: 15,
      color: THEME.text,
      valign: 'top',
      fontFace: 'Aptos',
    });
    if (spec.bullets.length > 0) {
      slide.addText(
        spec.bullets.slice(0, 3).map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })),
        {
          x: 8.8,
          y: 4.7,
          w: 2.8,
          h: 1.4,
          fontSize: 13,
          color: THEME.text,
          breakLine: true,
          fontFace: 'Aptos',
        },
      );
    }
    return;
  }

  slide.addShape('roundRect', {
    x: 0.7,
    y: 1.7,
    w: 5.0,
    h: 4.5,
    rectRadius: 0.12,
    fill: { color: THEME.white },
    line: { color: THEME.sky, width: 1.1 },
  });
  slide.addText(spec.paragraph ?? spec.bullets.join('\n'), {
    x: 1.0,
    y: 2.0,
    w: 4.35,
    h: 2.2,
    fontSize: 15,
    color: THEME.text,
    valign: 'top',
    fontFace: 'Aptos',
  });
  if (spec.highlight) {
    slide.addText(spec.highlight, {
      x: 1.0,
      y: 4.95,
      w: 4.1,
      h: 0.8,
      fontSize: 13,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
  }

  if (spec.assetPath) {
    slide.addShape('roundRect', {
      x: 6.1,
      y: 1.7,
      w: 5.4,
      h: 4.5,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: 6.35,
      y: 1.95,
      w: 4.9,
      h: 3.6,
    });
  } else {
    // Full-width content layout when no visual asset — avoids empty placeholder
    // Expand left card and add a right-side accent panel with key insight
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.7,
      w: 7.2,
      h: 4.5,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(spec.paragraph ?? spec.bullets.join('\n'), {
      x: 1.0,
      y: 2.0,
      w: 6.55,
      h: spec.bullets.length > 0 ? 2.2 : 3.5,
      fontSize: 15,
      color: THEME.text,
      valign: 'top',
      fontFace: 'Aptos',
    });
    if (spec.bullets.length > 0) {
      slide.addText(
        spec.bullets.slice(0, 4).map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })),
        {
          x: 1.0,
          y: 4.1,
          w: 6.55,
          h: 1.6,
          fontSize: 14,
          color: THEME.text,
          breakLine: true,
          fontFace: 'Aptos',
        },
      );
    }
    if (spec.highlight) {
      slide.addText(spec.highlight, {
        x: 1.0,
        y: 5.6,
        w: 6.55,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: THEME.teal,
        fontFace: 'Aptos',
      });
    }

    // Right accent panel with key number or insight
    slide.addShape('roundRect', {
      x: 8.25,
      y: 1.7,
      w: 3.75,
      h: 4.5,
      rectRadius: 0.12,
      fill: { color: THEME.pale },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('KEY INSIGHT', {
      x: 8.55,
      y: 2.0,
      w: 3.1,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
    slide.addText(spec.highlight ?? spec.paragraph ?? spec.title, {
      x: 8.55,
      y: 2.5,
      w: 3.1,
      h: 3.2,
      fontSize: 18,
      bold: true,
      color: THEME.ink,
      valign: 'mid',
      fit: 'shrink',
      fontFace: 'Aptos Display',
    });
  }
}
