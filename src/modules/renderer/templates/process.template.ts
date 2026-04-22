import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderProcessTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.eyebrow ?? 'Process', {
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
    w: 8.7,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });
  slide.addText(spec.highlight ?? spec.paragraph ?? '', {
    x: 0.7,
    y: 1.45,
    w: 9.5,
    h: 0.5,
    fontSize: 14,
    color: THEME.muted,
    fontFace: 'Aptos',
  });

  if (spec.assetPath) {
    slide.addShape('roundRect', {
      x: 0.7,
      y: 2.0,
      w: 11.3,
      h: 2.6,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: 0.95,
      y: 2.2,
      w: 10.8,
      h: 2.2,
    });

    const steps = spec.bullets.slice(0, 5);
    const cardWidth = steps.length <= 3 ? 3.3 : 2.12;
    const gap = 0.18;
    const startX = 0.82;

    steps.forEach((step, index) => {
      const x = startX + index * (cardWidth + gap);
      slide.addShape('roundRect', {
        x,
        y: 4.95,
        w: cardWidth,
        h: 1.15,
        rectRadius: 0.1,
        fill: { color: index % 2 === 0 ? THEME.white : THEME.pale },
        line: { color: THEME.sky, width: 1 },
      });
      slide.addText(String(index + 1).padStart(2, '0'), {
        x: x + 0.12,
        y: 5.15,
        w: 0.42,
        h: 0.2,
        fontSize: 11,
        bold: true,
        color: THEME.cyan,
        fontFace: 'Aptos',
      });
      slide.addText(step, {
        x: x + 0.12,
        y: 5.42,
        w: cardWidth - 0.24,
        h: 0.45,
        fontSize: 13,
        bold: true,
        color: THEME.ink,
        valign: 'mid',
        fontFace: 'Aptos',
      });
    });
    return;
  }

  const steps = spec.bullets.slice(0, 5);
  const cardWidth = steps.length <= 3 ? 3.4 : 2.35;
  const gap = 0.22;
  const startX = 0.8;

  steps.forEach((step, index) => {
    const x = startX + index * (cardWidth + gap);
    slide.addShape('roundRect', {
      x,
      y: 2.5,
      w: cardWidth,
      h: 2.3,
      rectRadius: 0.12,
      fill: { color: index % 2 === 0 ? THEME.white : THEME.pale },
      line: { color: THEME.sky, width: 1.2 },
    });
    slide.addText(String(index + 1).padStart(2, '0'), {
      x: x + 0.2,
      y: 2.75,
      w: 0.5,
      h: 0.25,
      fontSize: 12,
      bold: true,
      color: THEME.cyan,
      fontFace: 'Aptos',
    });
    slide.addText(step, {
      x: x + 0.2,
      y: 3.15,
      w: cardWidth - 0.4,
      h: 1.15,
      fontSize: 16,
      bold: true,
      color: THEME.ink,
      valign: 'mid',
      fontFace: 'Aptos',
    });

    if (index < steps.length - 1) {
      slide.addShape('chevron', {
        x: x + cardWidth - 0.05,
        y: 3.45,
        w: 0.22,
        h: 0.32,
        fill: { color: THEME.gold },
        line: { color: THEME.gold },
      });
    }
  });
}
