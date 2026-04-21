import { SlideSpec } from '../../slides/slide.types';

interface PptSlideLike {
  addText: (...args: any[]) => unknown;
}

export function renderTitleBulletsTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.title, {
    x: 0.6,
    y: 0.4,
    w: 11.2,
    h: 0.8,
    fontSize: 20,
    bold: true,
    color: '0F172A',
  });

  slide.addText(
    spec.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 14 } } })),
    {
      x: 0.8,
      y: 1.4,
      w: 10.8,
      h: 4.5,
      fontSize: 16,
      color: '1F2937',
      breakLine: true,
    },
  );
}
