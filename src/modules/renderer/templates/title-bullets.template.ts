import { SlideSpec } from '../../slides/slide.types';
import { THEME } from './rendering-theme';

interface PptSlideLike {
  addShape: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderTitleBulletsTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.eyebrow ?? 'Key takeaways', {
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
    w: 7.2,
    h: 0.8,
    fontSize: spec.title.length > 26 ? 22 : 24,
    bold: true,
    color: THEME.ink,
    fit: 'shrink',
    fontFace: 'Aptos Display',
  });

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
    slide.addText('Speaker emphasis', {
      x: 8.7,
      y: 2.2,
      w: 2.4,
      h: 0.25,
      fontSize: 12,
      bold: true,
      color: THEME.teal,
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
