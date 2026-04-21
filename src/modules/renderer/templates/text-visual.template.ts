import { SlideSpec } from '../../slides/slide.types';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderTextVisualTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.title, {
    x: 0.6,
    y: 0.4,
    w: 11.2,
    h: 0.8,
    fontSize: 20,
    bold: true,
    color: '0F172A',
  });
  slide.addText(spec.paragraph ?? spec.bullets.join('\n'), {
    x: 0.7,
    y: 1.4,
    w: 5.0,
    h: 4.8,
    fontSize: 15,
    color: '1F2937',
    valign: 'top',
  });

  if (spec.assetPath) {
    slide.addImage({
      path: spec.assetPath,
      x: 6.2,
      y: 1.3,
      w: 5.2,
      h: 3.8,
    });
  }
}
