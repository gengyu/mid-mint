import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
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
    slide.addShape('roundRect', {
      x: 6.1,
      y: 1.7,
      w: 5.4,
      h: 4.5,
      rectRadius: 0.12,
      fill: { color: THEME.pale },
      line: { color: THEME.pale },
    });
    slide.addText('Visual area', {
      x: 7.95,
      y: 3.6,
      w: 1.8,
      h: 0.3,
      fontSize: 16,
      bold: true,
      color: THEME.muted,
      align: 'center',
      fontFace: 'Aptos',
    });
  }
}
