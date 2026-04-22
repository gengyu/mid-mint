import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderAgendaTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: THEME.navy }, line: { color: THEME.navy } });
  slide.addText(spec.eyebrow ?? 'Agenda', {
    x: 0.7,
    y: 0.28,
    w: 3.0,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.sky,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 1.15,
    w: 7.2,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });
  slide.addText(spec.paragraph ?? '', {
    x: 0.7,
    y: 1.9,
    w: 5.8,
    h: 1.0,
    fontSize: 14,
    color: THEME.muted,
    fit: 'shrink',
    fontFace: 'Aptos',
  });

  spec.bullets.slice(0, 5).forEach((bullet, index) => {
    const y = 3 + index * 0.8;
    slide.addShape('roundRect', {
      x: 0.9,
      y,
      w: 0.5,
      h: 0.38,
      rectRadius: 0.08,
      fill: { color: THEME.cyan },
      line: { color: THEME.cyan },
    });
    slide.addText(String(index + 1), {
      x: 1.04,
      y: y + 0.05,
      w: 0.18,
      h: 0.18,
      fontSize: 10,
      bold: true,
      color: THEME.white,
      align: 'center',
      fontFace: 'Aptos',
    });
    slide.addText(bullet, {
      x: 1.7,
      y: y - 0.02,
      w: 6.4,
      h: 0.35,
      fontSize: 18,
      color: THEME.text,
      bold: index === 0,
      fit: 'shrink',
      fontFace: 'Aptos',
    });
  });

  if (spec.highlight) {
    slide.addShape('roundRect', {
      x: 8.8,
      y: 1.7,
      w: 3.6,
      h: 3.3,
      rectRadius: 0.14,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.2 },
    });
    slide.addText('Narrative arc', {
      x: 9.1,
      y: 2.0,
      w: 2.5,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
    slide.addText(spec.highlight, {
      x: 9.1,
      y: 2.45,
      w: 2.7,
      h: 1.7,
      fontSize: 16,
      color: THEME.ink,
      bold: true,
      valign: 'mid',
      fit: 'shrink',
      fontFace: 'Aptos Display',
    });
  }
}
