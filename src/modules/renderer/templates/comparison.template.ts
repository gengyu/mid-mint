import { SlideSpec } from '../../slides/slide.types';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderComparisonTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.title, {
    x: 0.6,
    y: 0.4,
    w: 11.2,
    h: 0.8,
    fontSize: 20,
    bold: true,
    color: '0F172A',
  });

  const midpoint = Math.max(1, Math.ceil(spec.bullets.length / 2));
  slide.addText(spec.bullets.slice(0, midpoint).join('\n'), {
    x: 0.7,
    y: 1.5,
    w: 2.8,
    h: 3.8,
    fontSize: 15,
    color: '1F2937',
  });
  slide.addText(spec.bullets.slice(midpoint).join('\n'), {
    x: 3.9,
    y: 1.5,
    w: 2.8,
    h: 3.8,
    fontSize: 15,
    color: '1F2937',
  });

  if (spec.assetPath) {
    slide.addImage({
      path: spec.assetPath,
      x: 7.0,
      y: 1.3,
      w: 4.2,
      h: 3.7,
    });
  }
}
