import { SlideSpec } from '../../slides/slide.types';

interface PptSlideLike {
  addText: (...args: any[]) => unknown;
}

export function renderCoverTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.title, {
    x: 0.7,
    y: 1.0,
    w: 11.0,
    h: 1.0,
    fontSize: 24,
    bold: true,
    color: '0F172A',
  });
  slide.addText(spec.subtitle ?? '', {
    x: 0.7,
    y: 2.1,
    w: 11.0,
    h: 1.4,
    fontSize: 14,
    color: '475569',
    breakLine: false,
  });
}
