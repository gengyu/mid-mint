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

export function renderProcessTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const accent = resolveAccentColor(spec.accentTone);
  slide.addText(spec.eyebrow ?? 'Process', {
    x: 0.7,
    y: 0.45,
    w: 2.5,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: accent,
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
    const isMermaid = spec.visualTechnique === 'mermaid';
    const diagramLabel = isMermaid ? 'FLOW DIAGRAM' : 'DIAGRAM';

    slide.addShape('roundRect', {
      x: 0.7,
      y: 2.0,
      w: 11.3,
      h: 2.6,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(diagramLabel, {
      x: 1.0,
      y: 2.05,
      w: 1.8,
      h: 0.2,
      fontSize: 9,
      bold: true,
      color: accent,
      fontFace: 'Aptos',
    });
    slide.addImage({
      path: spec.assetPath,
      x: 0.95,
      y: 2.3,
      w: 10.8,
      h: 2.1,
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
        color: accent,
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

      // Arrow connector between step cards (PPT_V2_LAYOUTS.md: directional flow)
      if (index < steps.length - 1) {
        slide.addShape('rightArrow', {
          x: x + cardWidth + 0.02,
          y: 5.35,
          w: gap - 0.04,
          h: 0.22,
          fill: { color: THEME.gold },
          line: { color: THEME.gold },
        });
      }
    });
    return;
  }

  const steps = spec.bullets.slice(0, 5);

  // PPT_V2_LAYOUTS.md density budget: 3-5 steps with compact rendering for 4+ steps
  if (steps.length <= 3) {
    const cardWidth = 3.4;
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
        color: accent,
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

      // Arrow connector between step cards (PPT_V2_LAYOUTS.md: process needs directional flow)
      if (index < steps.length - 1) {
        const arrowX = x + cardWidth;
        const arrowY = 3.5;
        slide.addShape('rightArrow', {
          x: arrowX + 0.02,
          y: arrowY,
          w: gap - 0.04,
          h: 0.3,
          fill: { color: THEME.gold },
          line: { color: THEME.gold },
        });
      }
    });
  } else {
    // Compact horizontal step bar for 4-5 steps (avoids card overflow)
    const barWidth = 11.3;
    const stepWidth = barWidth / steps.length;

    steps.forEach((step, index) => {
      const x = 0.7 + index * stepWidth;
      const isFirst = index === 0;
      const isLast = index === steps.length - 1;

      // Connector line
      if (index < steps.length - 1) {
        slide.addShape('rect', {
          x: x + stepWidth - 0.12,
          y: 3.75,
          w: 0.24,
          h: 0.06,
          fill: { color: THEME.gold },
          line: { color: THEME.gold },
        });
      }

      // Step circle
      slide.addShape('ellipse', {
        x: x + stepWidth / 2 - 0.28,
        y: 3.2,
        w: 0.56,
        h: 0.56,
        fill: { color: THEME.teal },
        line: { color: THEME.teal },
      });
      slide.addText(String(index + 1), {
        x: x + stepWidth / 2 - 0.16,
        y: 3.35,
        w: 0.32,
        h: 0.28,
        fontSize: 13,
        bold: true,
        color: THEME.white,
        align: 'center',
        fontFace: 'Aptos',
      });

      // Step text
      slide.addText(step, {
        x: x + 0.08,
        y: 4.0,
        w: stepWidth - 0.16,
        h: 1.0,
        fontSize: 13,
        bold: true,
        color: THEME.ink,
        valign: 'top',
        align: 'center',
        fit: 'shrink',
        fontFace: 'Aptos',
      });
    });
  }
}
