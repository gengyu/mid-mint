import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

interface PptSlideLikeWithImage extends PptSlideLike {
  addImage: (...args: any[]) => unknown;
}

export function renderSummaryClosingTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  const isClosing = spec.role === 'closing';

  // 深色背景营造结束感 — closing uses darker accent, summary uses navy
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: isClosing ? '081622' : THEME.navy },
    line: { color: isClosing ? '081622' : THEME.navy },
  });

  // 顶部装饰条 — closing uses teal+gold dual accent
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: isClosing ? 8.0 : 13.33,
    h: 0.15,
    fill: { color: THEME.teal },
    line: { color: THEME.teal },
  });
  if (isClosing) {
    slide.addShape('rect', {
      x: 8.0,
      y: 0,
      w: 5.33,
      h: 0.15,
      fill: { color: THEME.gold },
      line: { color: THEME.gold },
    });
  }

  // Eyebrow
  slide.addText(spec.eyebrow ?? 'Summary', {
    x: 0.8,
    y: 0.6,
    w: 3.0,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.sky,
    fontFace: 'Aptos',
  });

  // 主标题
  slide.addText(spec.title, {
    x: 0.8,
    y: 1.1,
    w: 11.5,
    h: 0.8,
    fontSize: spec.title.length > 36 ? 22 : 26,
    bold: true,
    color: THEME.white,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });

  // Visual asset support for summary-closing slides (PPT_V2_LAYOUTS.md Iteration C)
  if (spec.assetPath && 'addImage' in slide) {
    const imgSlide = slide as PptSlideLikeWithImage;
    // Left: takeaway cards; Right: visual asset
    const takeaways = spec.bullets.slice(0, 3);
    const cardWidth = 3.0;
    const gap = 0.3;

    takeaways.forEach((bullet, index) => {
      const x = 0.8 + index * (cardWidth + gap);
      const y = 2.2;

      slide.addShape('roundRect', {
        x,
        y,
        w: cardWidth,
        h: 2.0,
        rectRadius: 0.1,
        fill: { color: '1A2B3C' },
        line: { color: THEME.teal, width: 1.0 },
      });
      slide.addText(String(index + 1), {
        x: x + 0.2,
        y: y + 0.25,
        w: 0.3,
        h: 0.25,
        fontSize: 12,
        bold: true,
        color: THEME.teal,
        fontFace: 'Aptos',
      });
      slide.addText(bullet, {
        x: x + 0.2,
        y: y + 0.6,
        w: cardWidth - 0.4,
        h: 1.1,
        fontSize: 13,
        color: THEME.white,
        valign: 'mid',
        align: 'left',
        fit: 'shrink',
        fontFace: 'Aptos',
      });
    });

    // Right: visual asset
    slide.addShape('roundRect', {
      x: 7.6,
      y: 2.0,
      w: 5.0,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.0 },
    });
    imgSlide.addImage({
      path: spec.assetPath,
      x: 7.85,
      y: 2.25,
      w: 4.5,
      h: 3.5,
    });
  } else {
    // Standard card layout without visual asset
    const takeaways = spec.bullets.slice(0, 3);
    const cardWidth = 3.5;
    const gap = 0.4;
    const startX = (13.33 - (takeaways.length * cardWidth + (takeaways.length - 1) * gap)) / 2;

    takeaways.forEach((bullet, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = 2.4;

      slide.addShape('roundRect', {
        x,
        y,
        w: cardWidth,
        h: 3.2,
        rectRadius: 0.12,
        fill: { color: '1A2B3C' },
        line: { color: THEME.teal, width: 1.5 },
      });

      slide.addShape('ellipse', {
        x: x + cardWidth / 2 - 0.25,
        y: y + 0.35,
        w: 0.5,
        h: 0.5,
        fill: { color: THEME.teal },
        line: { color: THEME.teal },
      });
      slide.addText(String(index + 1), {
        x: x + cardWidth / 2 - 0.15,
        y: y + 0.45,
        w: 0.3,
        h: 0.3,
        fontSize: 14,
        bold: true,
        color: THEME.white,
        align: 'center',
        fontFace: 'Aptos',
      });

      slide.addText(bullet, {
        x: x + 0.25,
        y: y + 1.1,
        w: cardWidth - 0.5,
        h: 1.8,
        fontSize: 14,
        color: THEME.white,
        valign: 'mid',
        align: 'center',
        fit: 'shrink',
        fontFace: 'Aptos',
      });
    });
  }

  // 底部行动号召或高亮
  if (spec.highlight) {
    slide.addShape('roundRect', {
      x: 3.5,
      y: 6.0,
      w: 6.33,
      h: 0.9,
      rectRadius: 0.1,
      fill: { color: isClosing ? THEME.gold : THEME.teal },
      line: { color: isClosing ? THEME.gold : THEME.teal },
    });
    slide.addText(spec.highlight, {
      x: 3.5,
      y: 6.25,
      w: 6.33,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: isClosing ? THEME.navy : THEME.white,
      align: 'center',
      valign: 'mid',
      fit: 'shrink',
      fontFace: 'Aptos Display',
    });
  }
}
